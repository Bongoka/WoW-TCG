-- ============================================================================
-- REGEL-ENGINE (engine.js 1838–2240) – Schaden (Erhöhung, Verhinderung, Schilde, Rüstung, Anwenden),
-- engine-weite Reaktionen, allgemeine Fortsetzungen (Abwerfen, Ressourcen, unter das Deck …), Ins-Spiel-bringen, Tokens
-- ============================================================================
local ADDON, ns = ...
local E = ns.E
if setfenv then setfenv(1, E) else _ENV = E end

-- ---------------------------------------------------------------- Schaden
-- dealDamage: Schritt einreihen. o = {src, tgt, amt, dt, combat, ability, weapon, unprev, after={k,a}}
DMG_PRE = {}   -- (s, o) => void: Schaden vor dem Einreihen umschreiben
function dealDamage(s, o)
    for _, f in ipairs(DMG_PRE) do f(s, o) end
    -- Schaden "mit einer Fähigkeit": die gerade auflösende Fähigkeit merken (Moonkin Form, Arcane Power …)
    local rc = (o.ability and s.resolvingCard) or nil
    q(s, assign({ op = "dmg", abilityId = rc and rc.id or nil, abilityUid = rc and rc.uid or nil }, o))
end
function srcHeroPid(s, srcUid) local c = findCharacter(s, srcUid) return (c and c.type == "Hero") and ctrlOf(s, c) or nil end
local function afterCall(s, o, dealt) if o.after then q(s, { op = "call", k = o.after.k, a = assign({}, o.after.a, { dealt = dealt }) }) end end
function dmgStep(s, o)
    local tl = locate(s, o.tgt)
    if not tl or not isInPlayZone(tl.zone) or not isChar(tl.c) or s.gameOver then afterCall(s, o, 0); return end
    -- 0) Umleitung (Ersatzeffekt): "it's dealt to your hero instead" (Blessing of Sacrifice, Intervene)
    if not o.redirected then
        local iv = find(tl.c.tm or {}, function(m) return m.k == "intervene" and m.turn == s.turn and not m.used end)
        local to = iv and getPlayer(s, iv.pid).hero.uid or auraAny(s, "redirect", tl.c, o)
        if to and to ~= tl.c.uid then
            if iv and not iv.all then iv.used = true end
            L(s, tr("↪ Schaden an {0} geht an {1}.", tl.c.name, nameOf(s, to)))
            o = assign({}, o, { tgt = to, redirected = true })
            tl = locate(s, to) if not tl then return end
        end
    end
    local t = tl.c
    local tp = getPlayer(s, tl.pid)
    local src = o.src and findCharacter(s, o.src) or nil
    local sl = src and locate(s, src.uid) or nil
    local sp = sl and sl.pid or o.srcPl
    local amt = math.max(0, o.amt or 0)
    local heroSrc = src ~= nil and src.type == "Hero"
    -- 1a) Erhöhungen durch Dauereffekte und Spieler-Effekte
    if amt > 0 then
        amt = amt + auraSum(s, "dmgOut", src, t, o, sp)
        amt = amt + auraSum(s, "dmgIn", t, src, o, tp.id)
        if heroSrc and o.dt == "Nature" then local m = find(pes(s, sp, "stormstrike"), function(x) return not x.used end) if m then m.used = true; amt = amt + 2 end end   -- Stormstrike
        if heroSrc and o.abilityUid then for _, m in ipairs(pes(s, sp, "abilityPlus")) do if m.uid == o.abilityUid then amt = amt + m.v end end end   -- Arcane Power
        amt = math.max(0, amt)
    end
    -- 1) Erhöhungen
    if heroSrc and amt > 0 then
        local pp = getPlayer(s, sp)
        amt = amt + #unattachedOngoing(pp, 136)                                         -- Berserker Stance (verursacht)
        if o.dt == "Ranged" then amt = amt + #unattachedOngoing(pp, 34) end             -- Aspect of the Hawk
        if o.dt == "Shadow" then amt = amt + #unattachedOngoing(pp, 88) end             -- Shadowform
        if o.ability then amt = amt + countCtrl(s, sp, 282) end                         -- Chromatic Cloak
    end
    if t.type == "Hero" and amt > 0 then amt = amt + #unattachedOngoing(tp, 136) end   -- Berserker Stance (erhalten)
    -- Verdoppeln zuletzt: die Erhöhungen wählt der Verursacher (CR 717.4a) – erst alle +N, dann ×2
    if heroSrc and amt > 0 and o.dt == "Fire" then for i = 1, #unattachedOngoing(getPlayer(s, sp), 61) do amt = amt * 2 end end   -- World in Flames
    -- 2) Verhinderung
    local amtPre = amt
    local unprev = o.unprev and true or false
    if heroSrc and countCtrl(s, sp, 297) > 0 then unprev = true end                    -- Lionheart Helm
    if src and hasTM(s, src, "unprevOut") then unprev = true end
    if o.weapon and o.combat then local w = findCharacter(s, o.weapon) if w and w.id == 312 then unprev = true end end   -- Annihilator
    if not unprev and auraAny(s, "unprev", src, t, o) then unprev = true end
    if amt > 0 and hasTM(s, t, "invincible") then amt = 0 end
    if not unprev and amt > 0 then
        local function all() amt = 0 end
        if o.combat and src and hasTM(s, src, "noCombatDmgOut") then all() end         -- Turn Aside / Katsin Bloodoath
        if o.combat and hasTM(s, t, "noCombatDmgIn") then all() end
        if o.combat and src and some(tms(s, src, "noCombatDmgTo"), function(m) return m.uid == t.uid end) then all() end
        if src and hasTM(s, src, "noDmgOut") then all() end
        if o.dt and some(tms(s, t, "noDtIn"), function(m) return m.dt == o.dt end) then all() end
        if amt > 0 then local pv = auraSum(s, "prevent", t, src, o, amt) if pv > 0 then amt = math.max(0, amt - pv) end end
        if amt > 0 and FX[t.id] and FX[t.id].selfPrevent and active(s, t) then amt = math.max(0, amt - (FX[t.id].selfPrevent(s, t, tp.id, src, o, amt) or 0)) end   -- Miandra, Shelly
        if src and #attachedTo(s, src.uid, 63) > 0 then all() end                        -- Blessing of Protection (verursacht von)
        if #attachedTo(s, t.uid, 63) > 0 then all() end                                  -- Blessing of Protection (an)
        if hasTM(s, t, "preventAll") then all() end                                      -- Bestial Wrath / Snapjaw / Divine Shield
        if t.type == "Hero" and o.combat and hasTM(s, t, "kayleitha") and hasStealth(s, t) then all() end
        if heroSrc then amt = math.max(0, amt - #unattachedOngoing(getPlayer(s, sp), 139)) end   -- Defensive Stance (verursacht)
        if t.type == "Hero" then amt = math.max(0, amt - #unattachedOngoing(tp, 139)) end         -- Defensive Stance (erhalten)
        amt = math.max(0, amt - #unattachedOngoing(tp, 66))                              -- Devotion Aura
    end
    dmgShields(s, { o = assign({}, o, { pre = (o.pre == nil) and amtPre or o.pre }), tgt = t.uid, amt = amt, unprev = unprev, sp = sp, tp = tp.id, heroSrc = heroSrc, src = src and src.uid or nil, reflect = 0 })
end
-- "Prevent the next N"-Schilde. Welcher zuerst verbraucht wird, wählt der Besitzer des Ziels (CR 717.4b) – gefragt
-- wird der Mensch nur, wenn es einen Unterschied macht.
local function shieldSig(x) local c = assign({}, x); c.v = 0; c.sid = 0 return serialize(c) end
function dmgShields(s, c)
    local t, tp = findCharacter(s, c.tgt), getPlayer(s, c.tp)
    local src = c.src and findCharacter(s, c.src) or nil
    local o = c.o
    if t and not c.unprev then
        local function ok(m) return m.v > 0 and not (m.srcUid and m.srcUid ~= c.src) and not (m.allyCombat and not (o.combat and src and isAllyLike(src))) end
        while true do
            local usable = filter(tms(s, t, "shield"), ok)
            if c.amt <= 0 or #usable == 0 then break end
            local m = usable[1]
            if c.picked then
                m = find(usable, function(x) return x.sid == c.picked end) or m; c.picked = nil
            elseif isHuman(s, c.tp) and c.amt < sum(usable, function(x) return x.v end) and #uniq(map(usable, shieldSig)) > 1 then
                for _, x in ipairs(usable) do if not x.sid then x.sid = newUid("sh_") end end
                ask(s, { pid = c.tp, prompt = tr("{0} erhält {1} Schaden: Welche Verhinderung zuerst?", t.name, c.amt), src = tr("Schadensverhinderung"),
                    opts = map(usable, function(x) return { label = shieldLabel(s, x), v = x.sid, ai = x.reflect and 1 or 0 } end), k = "E:shieldPick", a = { c = c }, keep = true })
                return
            end
            local pv = m.whole and c.amt or math.min(m.v, c.amt)
            m.v = m.whole and 0 or (m.v - pv); c.amt = c.amt - pv
            if m.reflect and pv > 0 then c.reflect = c.reflect + pv end
        end
        t.tm = filter(t.tm or {}, function(m) return not (m.k == "shield" and m.v <= 0) end)
    end
    local st = assign({}, o, { amt = c.amt, unprev = c.unprev, sp = c.sp, tp = c.tp, heroSrc = c.heroSrc, reflect = c.reflect })
    if c.reflect > 0 and src then dealDamage(s, { src = tp.hero.uid, tgt = src.uid, amt = c.reflect, dt = "Holy" }) end   -- Holy Shield
    -- 3) Rüstung
    if t and (t.type == "Hero" or #armorFor(s, t, tp) > 0) and not c.unprev and c.amt > 0 then
        local armors = filter(armorFor(s, t, tp), function(a) return not a.exhausted and not cantExhaust(s, a) and defOf(s, a) > 0 end)
        if #armors > 0 then push(s._batch, { op = "call", k = "E:armorAsk", a = { st = st } }); return end
    end
    push(s._batch, assign({}, st, { op = "dmgApply" }))
end
-- Rüstungen, die Schaden an diesem Charakter verhindern können: beim Helden alle, bei Allies nur über ALLY_ARMOR
ALLY_ARMOR = {}   -- (s, Ally) => (Rüstung) => true
function armorFor(s, t, tp)
    local all = filter(tp.hero.armors, function(a) return a.type == "Armor" or (a.type == "Item" and (a.def or 0) > 0) end)
    if not t then return {} end
    if t.type == "Hero" then return all end
    if #ALLY_ARMOR == 0 then return {} end
    local oks = filter(map(ALLY_ARMOR, function(f) return f(s, t) or false end), function(x) return x end)
    if #oks == 0 then return {} end
    return filter(all, function(a) return some(oks, function(f) return f(a) end) end)
end
EK.shieldPick = function(s, a, sid) dmgShields(s, assign({}, a.c, { picked = sid })) end
function shieldLabel(s, m)
    return tr("Verhindert noch {0}", m.v) .. (m.reflect and tr(" · wirft den Schaden zurück") or "") .. (m.srcUid and tr(" · nur Schaden von {0}", nameOf(s, m.srcUid)) or "")
        .. (m.allyCombat and tr(" · nur Kampfschaden von Allies") or "") .. (m.combat and tr(" · nur in diesem Kampf") or "")
end
EK.armorAsk = function(s, a)
    local st = a.st
    local tp = getPlayer(s, st.tp)
    local armors = filter(armorFor(s, findCharacter(s, st.tgt), tp), function(x) return not x.exhausted and not cantExhaust(s, x) and defOf(s, x) > 0 end)
    if #armors == 0 or st.amt <= 0 then q(s, assign({}, st, { op = "dmgApply" })); return end
    local opts = map(armors, function(x) local d = defOf(s, x) return { label = tr("{0} erschöpfen (verhindert {1})", x.name, math.min(d, st.amt)), v = x.uid, ai = math.min(d, st.amt) * 2 - d * 0.1 } end)
    push(opts, { label = tr("Keine Rüstung – {0} Schaden nehmen", st.amt), v = "__none", ai = 0 })
    ask(s, { pid = tp.id, prompt = tr("{0} erhält {1} Schaden. Rüstung benutzen?", tp.hero.name, st.amt), src = "Rüstung", opts = opts, k = "E:armorUse", a = { st = st }, keep = true })
end
EK.armorUse = function(s, a, v)
    local st = a.st
    if v == "__none" then q(s, assign({}, st, { op = "dmgApply" })); return end
    local ar = findCharacter(s, v)
    if ar and not ar.exhausted then
        local d = defOf(s, ar); exhaust(s, ar)
        local pv = math.min(d, st.amt); st.amt = st.amt - pv
        L(s, tr("🛡 {0}: {1} verhindert", ar.name, pv), "", st.tp)
        if pv > 0 then evt(s, "armorPrevented", { uid = ar.uid, pid = st.tp, src = st.src, amt = pv }) end
    end
    q(s, { op = "call", k = "E:armorAsk", a = { st = st } })
end
function dmgApply(s, st)
    local tl = locate(s, st.tgt)
    if not tl or not isInPlayZone(tl.zone) or s.gameOver then afterCall(s, st, 0); return end
    local t, amt = tl.c, st.amt
    local wasDamaged = (t.damage or 0) > 0
    if st.pre and st.pre > amt then evt(s, "dmgPrevented", { tgt = t.uid, tpid = tl.pid, src = st.src, amt = st.pre - amt }) end
    if amt > 0 then
        t.damage = (t.damage or 0) + amt
        t.dmgTurn = s.turn
        L(s, tr("💥 {0} −{1}", t.name, amt) .. ((st.src and st.src ~= t.uid) and (" (" .. nameOf(s, st.src) .. ")") or ""), "log-hit", tl.pid)
        if isReal(s) and sfx then sfx("hit") end
        fxEvent(s, { t = "dmg", uid = t.uid, amt = amt, dt = st.dt, combat = not not st.combat, hero = t.type == "Hero" })
        if isReal(s) then local cu = valueCredit(s, st.src, st.combat, st.weapon); addValue(s, cu, "dmg", amt, amt, tl.pid); if cu then t.lastHitBy = cu end end
        local src = st.src and findCharacter(s, st.src) or nil
        if src and src.type == "Hero" and st.dt == "Fire" then addPE(s, ctrlOf(s, src), { k = "heroFire" }) end   -- Eye of Flame
        if st.dt then addTM(t, { k = "dealtDt", dt = st.dt, turn = s.turn }) end
        if t.type == "Hero" and src and src.type == "Ally" and ctrlOf(s, src) ~= tl.pid then addPE(s, ctrlOf(s, src), { k = "allyHitHero" }) end   -- Torek's Assault
        s.dmgTurn = s.turn
        local spid = src and ctrlOf(s, src) or st.sp
        if src then
            addTM(src, { k = "dealtDmg", to = t.uid, amt = amt, cmb = not not st.combat, turn = s.turn })
            addTM(t, { k = "hitBy", by = src.uid, cmb = not not st.combat, wpn = not not st.weapon, turn = s.turn })
        end
        if src and src.type == "Hero" and st.combat then
            addPE(s, spid, { k = (t.type == "Hero") and ((spid ~= tl.pid) and "heroCombatHero" or "heroCombatOwnHero") or "heroCombatAlly" })
            if isAllyLike(t) and t.damage >= hpOf(s, t) then addPE(s, spid, { k = "heroFatalAlly" }) end
        end
        if src and src.type == "Hero" and st.dt == "Fire" and st.ability then addTM(t, { k = "fireAbilityBy", by = spid, turn = s.turn }) end
        local weapons = st.weapons or (st.weapon and { st.weapon } or {})
        evt(s, "damaged", { tgt = t.uid, tpid = tl.pid, src = st.src, spid = st.sp, amt = amt, combat = not not st.combat, weapon = st.weapon, weapons = weapons, dt = st.dt, wasDamaged = wasDamaged, ability = not not st.ability })
        evt(s, "dmg", { tgt = t.uid, tpid = tl.pid, src = st.src, spid = spid, amt = amt, combat = not not st.combat, weapon = st.weapon, weapons = weapons, dt = st.dt, ability = not not st.ability,
            abilityId = st.abilityId, abilityUid = st.abilityUid, srcType = src and src.type or nil, fatal = t.damage >= hpOf(s, t) })
    end
    afterCall(s, st, amt)
end
local DT_NAMES = { Melee = "Nahkampf", Ranged = "Fernkampf", Fire = "Feuer", Frost = "Frost", Arcane = "Arkan", Nature = "Natur", Shadow = "Schatten", Holy = "Heilig" }
function dtName(dt) return DT_NAMES[dt] and tr(DT_NAMES[dt]) or dt end

-- Engine-weite Reaktionen auf Schaden
EV.damaged = function(s, d)
    local t = findCharacter(s, d.tgt)
    local src = d.src and findCharacter(s, d.src) or nil
    if not t then return end
    -- Stealth / Veil of Night: "When your hero deals damage, destroy this ability."
    if src and src.type == "Hero" then
        local sp = getPlayer(s, ctrlOf(s, src))
        if d.combat then addTM(t, { k = "hitByHero", by = sp.id, turn = s.turn }) end
        for _, o in ipairs(filter(sp.ongoing or {}, function(o) return (o.id == 103 or o.id == 104) and not o.attachedTo end)) do trig(s, { k = "destroyOngoing", a = { uid = o.uid } }) end
        -- Cold Blood
        if isAllyLike(t) and #pes(s, sp.id, "coldBlood") > 0 then trig(s, { k = "destroyUid", a = { uid = t.uid } }) end
        -- Devilsaur Leggings
        if d.combat and isAllyLike(t) and countCtrl(s, sp.id, 284) > 0 then trig(s, { k = "destroyUid", a = { uid = t.uid } }) end
        -- Iceblade Hacker
        if d.combat and isAllyLike(t) and countCtrl(s, sp.id, 328) > 0 then addTM(t, { k = "noReady", once = true }) end
        -- Fang of the Crystal Spider
        if d.combat and t.type == "Hero" and countCtrl(s, sp.id, 320) > 0 then addPE(s, d.tpid, { k = "fangLock" }) end
        -- Wraith Scythe
        if d.combat and countCtrl(s, sp.id, 339) > 0 then trig(s, { k = "healHero", a = { pid = sp.id, amt = d.amt } }) end
        -- Waffen-Auslöser
        if d.combat and d.weapon then
            local ws = (d.weapons and #d.weapons > 0) and d.weapons or { d.weapon }   -- Dual Wield: jede beteiligte Waffe
            for _, wu in ipairs(ws) do
                local w = findCharacter(s, wu)
                if w then
                    if w.id == 316 and t.type == "Hero" then trig(s, { k = "discard", a = { pid = d.tpid, n = 1 } }) end          -- Brain Hacker
                    if w.id == 317 and t.type == "Hero" then trig(s, { k = "destroyOwnResource", a = { pid = d.tpid } }) end      -- Cruel Hand of Timmy
                    if w.id == 334 and t.type == "Hero" then trig(s, { k = "shatterer", a = { pid = d.tpid } }) end               -- The Shatterer
                    if w.id == 318 then w.counters = w.counters or {}; w.counters.strength = (w.counters.strength or 0) + 1 end   -- Destiny
                    if w.id == 321 then trig(s, { k = "aoeFire", a = { srcUid = src.uid, pid = sp.id, amt = 1 } }) end            -- Flame Wrath
                    if w.id == 336 and s.activePlayer == sp.id and (w.usedTurn or {}).thrash ~= s.turn then                     -- Thrash Blade
                        w.usedTurn = w.usedTurn or {}; w.usedTurn.thrash = s.turn
                        trig(s, { k = "readyUids", a = { uids = { w.uid, src.uid } } })
                    end
                end
            end
            for _ in ipairs(filter(sp.ongoing or {}, function(o) return o.id == 73 and not o.attachedTo end)) do trig(s, { k = "healHero", a = { pid = sp.id, amt = 2 } }) end   -- Seal of Light
            for _ in ipairs(filter(sp.ongoing or {}, function(o) return o.id == 74 and not o.attachedTo end)) do trig(s, { k = "draw", a = { pid = sp.id, n = 1 } }) end        -- Seal of Wisdom
        end
    end
    if src and src.type == "Ally" and d.combat then
        local sp = ctrlOf(s, src)
        if src.id == 231 and isAllyLike(t) and d.wasDamaged and active(s, src) then trig(s, { k = "destroyUid", a = { uid = t.uid } }) end   -- Brigg
        if src.id == 276 and isAllyLike(t) and active(s, src) then trig(s, { k = "readyUids", a = { uids = { src.uid } } }) end           -- Zy'lah
        if src.race == "Spider" and isAllyLike(t) and some(getPlayer(s, sp).allies, function(a) return a.id == 223 and active(s, a) end) then trig(s, { k = "destroyUid", a = { uid = t.uid } }) end   -- Wilba
        if t.type == "Hero" and s.battle and s.battle.def == t.uid then
            if src.id == 213 and active(s, src) then trig(s, { k = "draw", a = { pid = sp, n = 1 } }) end              -- Randipan
            if src.id == 258 and active(s, src) then trig(s, { k = "discard", a = { pid = d.tpid, n = 1 } }) end       -- Samuel Grey
        end
        -- Green Whelp Armor: angreifender Ally trifft deinen Helden
        if t.type == "Hero" and s.battle and s.battle.att == src.uid then
            for i = 1, countCtrl(s, d.tpid, 291) do trig(s, { k = "greenWhelp", a = { pid = d.tpid, uid = src.uid } }) end
        end
    end
    -- Retribution Aura: Charakter des RA-Spielers erhält Kampfschaden
    if d.combat and src then
        local tp = getPlayer(s, d.tpid)
        for _ in ipairs(filter(tp.ongoing or {}, function(o) return o.id == 71 and not o.attachedTo end)) do dealDamage(s, { src = t.uid, tgt = src.uid, amt = 1, dt = "Holy" }) end
    end
    -- Feral Rage
    if d.combat and t.type == "Hero" and hasBearForm(s, d.tpid) then
        for _ in ipairs(filter(getPlayer(s, d.tpid).ongoing or {}, function(o) return o.id == 21 and not o.attachedTo end)) do trig(s, { k = "mayPayDraw", a = { pid = d.tpid, cost = 1, src = "Feral Rage" } }) end
    end
    -- Skorn: Wenn ein Ally Schaden erhält
    if isAllyLike(t) then
        for _, e in ipairs(filter(inPlay(s), function(e) return e.c.id == 259 and active(s, e.c) end)) do dealDamage(s, { src = e.c.uid, tgt = getPlayer(s, d.tpid).hero.uid, amt = d.amt, dt = "Shadow" }) end
    end
end
-- Allgemeine Auslöser-Fortsetzungen
EK.destroyUid = function(s, a) local c = findCharacter(s, a.uid) if c then destroy(s, c) end end
EK.destroyOngoing = function(s, a) local c = findCharacter(s, a.uid) if c then destroy(s, c) end end
EK.readyUids = function(s, a) for _, u in ipairs(a.uids) do readyCard(s, findCharacter(s, u)) end end
EK.healHero = function(s, a) local p = getPlayer(s, a.pid) heal(s, p.hero.uid, p.hero.uid, a.amt) end
EK.healList = function(s, a) for _, u in ipairs(a.tgts) do heal(s, a.src, u, a.amt) end end
EK.draw = function(s, a) drawCards(s, getPlayer(s, a.pid), a.n) end
EK.aoeFire = function(s, a) local o = getOpponent(s, a.pid) for _, c in ipairs(partyOf(o)) do dealDamage(s, { src = a.srcUid, tgt = c.uid, amt = a.amt, dt = "Fire" }) end end
EK.grayson = function(s, a)
    local g = findCharacter(s, a.uid) if not g then return end
    local pid = ctrlOf(s, g)
    local cands = targetCands(s, pid, { char = true })
    ask(s, { pid = pid, prompt = tr("Lord Grayson: Heile 2 Schaden von Ziel"), src = g.name, opts = map(cands, function(u) return { label = targetLabel(s, u, pid), v = u, ai = healValue(s, pid, u, 2) } end), k = "E:graysonHeal", a = { uid = g.uid } })
end
EK.graysonHeal = function(s, a, v) heal(s, a.uid, v, 2) end
-- "you may pay (n). If you do, draw a card."
EK.mayPayDraw = function(s, a)
    local p = getPlayer(s, a.pid)
    if getReadyRes(p) < a.cost then return end
    ask(s, { pid = p.id, prompt = tr("{0}: ({1}) bezahlen und eine Karte ziehen?", a.src, a.cost), src = a.src,
        opts = { { label = tr("Ja ({0})", a.cost), v = 1, ai = 3 }, { label = tr("Nein"), v = 0, ai = 0 } }, k = "E:mayPayDrawDo", a = a, auto = false })
end
EK.mayPayDrawDo = function(s, a, v) if v ~= 0 and v and payRes(getPlayer(s, a.pid), a.cost) then drawCards(s, getPlayer(s, a.pid), 1) end end
-- Abwerfen: Spieler wählt selbst
EK.discard = function(s, a) for i = 1, a.n do q(s, { op = "call", k = "E:discardOne", a = { pid = a.pid, src = a.src } }) end end
EK.discardOne = function(s, a)
    local p = getPlayer(s, a.pid)
    if #p.hand == 0 or auraAny(s, "noDiscard", a.pid) then return end
    local by = a.by or s._logPid
    if a.src ~= "Handlimit" and by and by ~= a.pid and auraAny(s, "randomDiscard", by) then EK.discardDo(s, {}, p.hand[randInt(#p.hand)].uid); return end
    ask(s, { pid = p.id, prompt = (a.src and (a.src .. ": ") or "") .. tr("Wirf eine Karte ab"), src = a.src or "Abwerfen",
        opts = map(p.hand, function(c) return { label = c.name, v = c.uid, ai = -cardHandValue(s, p, c) } end), k = "E:discardDo", a = {} })
end
EK.discardDo = function(s, a, uid)
    local l = locate(s, uid)
    if not l or l.zone ~= "hand" or auraAny(s, "noDiscard", l.pid) then return end
    local p = getPlayer(s, l.pid)
    removeVal(p.hand, l.c); push(p.graveyard, l.c)
    L(s, tr("🗑 {0} abgeworfen", l.c.name), "", p.id)
    evt(s, "discarded", { pid = p.id, uid = uid }); evt(s, "cardDiscarded", { pid = p.id, uid = uid, id = l.c.id }); evt(s, "handLeft", { pid = p.id, uid = uid })
end
local function resLabel(r, i) return r.faceUp and (r.card.name .. " (Quest)") or (tr("Verdeckte Ressource {0}", i) .. (r.exhausted and tr(" (erschöpft)") or "")) end
EK.destroyOwnResource = function(s, a)
    local p = getPlayer(s, a.pid) if #p.resources == 0 then return end
    ask(s, { pid = p.id, prompt = tr("Zerstöre eine eigene Ressource"), src = tr("The Cruel Hand of Timmy"),
        opts = map(p.resources, function(r, i) return { label = resLabel(r, i), v = r.card.uid, ai = r.exhausted and 1 or 0 } end), k = "E:destroyResDo", a = {} })
end
EK.destroyResDo = function(s, a, uid) destroyResource(s, uid) end
-- "Each player destroys a resource/an ally he controls" (CR 802.1): erst wählt der Zugspieler, dann der nächste;
-- danach wird alles gleichzeitig zerstört
function eachPlayerDestroys(s, kind, src)
    q(s, { op = "call", k = "E:eachPick", a = { kind = kind, src = src, order = { s.activePlayer, s.activePlayer == 1 and 2 or 1 }, picks = {}, n = 0 } })
end
EK.eachPick = function(s, a)
    local pid = a.order[(a.n or 0) + 1]
    if pid == nil then
        for _, u in ipairs(a.picks) do
            if u and u ~= false then
                if a.kind == "resource" then destroyResource(s, u) else local c = findCharacter(s, u) if c then destroy(s, c) end end
            end
        end
        return
    end
    local p = getPlayer(s, pid)
    local opts
    if a.kind == "resource" then opts = map(p.resources, function(r, i) return { label = resLabel(r, i), v = r.card.uid, ai = r.exhausted and 1 or 0 } end)
    else opts = map(playerDestroyList(s, p, a.kind), function(c) return { label = c.name, v = c.uid, ai = -cardValue(s, c) } end) end
    if #opts == 0 then EK.eachSet(s, a, false); return end
    ask(s, { pid = pid, prompt = (a.kind == "resource") and tr("Zerstöre eine eigene Ressource") or tr("{0}: Zerstöre eine eigene Karte", a.src), src = a.src, opts = opts, k = "E:eachSet", a = a })
end
EK.eachSet = function(s, a, v)
    local picks = copyArr(a.picks); push(picks, v or false)
    q(s, { op = "call", k = "E:eachPick", a = assign({}, a, { picks = picks, n = (a.n or 0) + 1 }) })
end

-- Mehrere Karten unter das Deck: der Besitzer wählt die Reihenfolge (CR 415.3c). Gefragt wird der Mensch nur, wenn
-- es verschiedene Karten sind und sie noch gezogen werden können (darüber liegen höchstens BOTTOM_ASK Karten).
-- then = { k, a }: geht danach weiter. Deck: oberste Karte = letztes Element.
BOTTOM_ASK = 7
function putBottom(s, pid, ids, nextStep)
    local p = getPlayer(s, pid)
    if #ids > 1 and #uniq(ids) > 1 and isHuman(s, pid) and #p.deck <= BOTTOM_ASK then
        q(s, { op = "call", k = "E:bottomPick", a = { pid = pid, ids = copyArr(ids), ["then"] = nextStep } }); return
    end
    for i = 1, #ids do table.insert(p.deck, 1, ids[i]) end                            -- ids[1] liegt zuoberst
    if nextStep then q(s, { op = "call", k = nextStep.k, a = nextStep.a }) end
end
EK.bottomPick = function(s, a)
    local p = getPlayer(s, a.pid)
    local nextStep = a["then"]
    if #a.ids <= 1 then
        for i = #a.ids, 1, -1 do table.insert(p.deck, 1, a.ids[i]) end
        if nextStep then q(s, { op = "call", k = nextStep.k, a = nextStep.a }) end
        return
    end
    local seen, opts = {}, {}
    for i, id in ipairs(a.ids) do if not seen[id] then seen[id] = true; push(opts, { label = CARDS[id].name, v = i, card = id, ai = -i }) end end
    ask(s, { pid = a.pid, prompt = tr("Unter das Deck: Welche Karte kommt als Nächstes (liegt weiter oben)?"), src = tr("Reihenfolge unter dem Deck"), opts = opts, k = "E:bottomSet", a = a })
end
-- Die gewählte Karte kommt unter das Deck, die nächste darunter
EK.bottomSet = function(s, a, i)
    local ids = copyArr(a.ids)
    local id = table.remove(ids, i)
    table.insert(getPlayer(s, a.pid).deck, 1, id)
    q(s, { op = "call", k = "E:bottomPick", a = assign({}, a, { ids = ids }) })
end
EK.drawN = function(s, a) drawCards(s, getPlayer(s, a.pid), a.n) end
function destroyResource(s, cardUid)
    for _, p in ipairs({ s.p1, s.p2 }) do
        local i = findIndex(p.resources, function(r) return r.card.uid == cardUid end)
        if i then
            local r = table.remove(p.resources, i)
            local owner = getPlayer(s, r.card.owner or p.id)
            resetInst(r.card); push(owner.graveyard, r.card)
            evt(s, "resDestroyed", { uid = r.card.uid, pid = p.id })
            L(s, tr("🔥 Ressource zerstört ({0})", r.faceUp and r.card.name or tr("verdeckt")), "log-hit", p.id)
            evt(s, "resDestroyed", { pid = p.id })
            return true
        end
    end
    return false
end
EK.shatterer = function(s, a)
    local p = getPlayer(s, a.pid) if #p.hero.weapons == 0 then return end
    local opts = {}
    if getReadyRes(p) >= 2 then push(opts, { label = tr("(2) bezahlen – Waffe behalten"), v = "__pay", ai = 5 }) end
    for _, w in ipairs(p.hero.weapons) do push(opts, { label = tr("{0} zerstören", w.name), v = w.uid, ai = -weaponAtk(s, w) }) end
    ask(s, { pid = p.id, prompt = tr("The Shatterer: Zerstöre eine deiner Waffen oder bezahle (2)"), src = "The Shatterer", opts = opts, k = "E:shattererDo", a = a, auto = false })
end
EK.shattererDo = function(s, a, v)
    if v == "__pay" then payRes(getPlayer(s, a.pid), 2); return end
    local w = findCharacter(s, v) if w then destroy(s, w) end
end
EK.greenWhelp = function(s, a)
    local p, al = getPlayer(s, a.pid), findCharacter(s, a.uid)
    if not al or getReadyRes(p) < 2 then return end
    ask(s, { pid = p.id, prompt = tr("Green Whelp Armor: (2) bezahlen, um {0} auf die Hand seines Besitzers zu schicken?", al.name), src = "Green Whelp Armor",
        opts = { { label = tr("Ja (2)"), v = 1, ai = 2 + (al.cost or 0) }, { label = tr("Nein"), v = 0, ai = 0 } }, k = "E:greenWhelpDo", a = a, auto = false })
end
EK.greenWhelpDo = function(s, a, v) if v == 1 and payRes(getPlayer(s, a.pid), 2) then local al = findCharacter(s, a.uid) if al then bounce(s, al) end end end

-- Bei Zerstörung (Engine-weit)
EV.destroyed = function(s, d)
    local snap = d.snap
    -- Corruption: "When attached character is destroyed, its controller discards a card."
    for i = 1, (snap.corruption or 0) do trig(s, { k = "discard", a = { pid = snap.wasCtrl, n = 1, src = "Corruption" } }) end
    -- Shadow Bolt: "When that character is destroyed this turn, its controller discards a card."
    for _, m in ipairs(snap.tm or {}) do if m.k == "shadowBolt" and m.turn == s.turn then trig(s, { k = "discard", a = { pid = snap.wasCtrl, n = 1, src = "Shadow Bolt" } }) end end
    -- Circle of Life
    if isAllyCard(CARDS[snap.id]) then
        local n = count(concat(s.p1.ongoing, s.p2.ongoing), function(o) return o.id == 19 and not o.attachedTo end)
        for i = 1, n do trig(s, { k = "circleOfLife", a = { pid = snap.wasCtrl, name = snap.name } }) end
    end
end
EK.circleOfLife = function(s, a)
    local p = getPlayer(s, a.pid)
    local idx = findIndex(p.deck, function(id) return isAllyCard(CARDS[id]) and CARDS[id].name == a.name end)
    if not idx then return end
    ask(s, { pid = p.id, prompt = tr("Circle of Life: {0} aus dem Deck erschöpft ins Spiel bringen?", a.name), src = "Circle of Life", show = { p.deck[idx] },
        opts = { { label = tr("Ja"), v = 1, ai = 5 }, { label = tr("Nein"), v = 0, ai = 0 } }, k = "E:circleDo", a = a, auto = false })
end
EK.circleDo = function(s, a, v)
    if v ~= 1 then return end
    local p = getPlayer(s, a.pid)
    local idx = findIndex(p.deck, function(id) return isAllyCard(CARDS[id]) and CARDS[id].name == a.name end)
    if not idx then return end
    local c = makeCardInst(table.remove(p.deck, idx), false, p.id)
    shuffleInPlace(p); s._hidden = true
    putIntoPlay(s, c, p.id, { exhausted = true })
end
-- Ally direkt ins Spiel bringen (nicht "gespielt")
function putIntoPlay(s, c, pid, o)
    o = o or {}
    local p = getPlayer(s, pid)
    c.owner = c.owner or pid
    if c.totem then c.isTotem = true; c.b = c.b or {}; c.b.hp = c.totemHp; c.b.atk = 0; c.hp = c.totemHp; c.atk = 0 end
    local pf = FX[c.id] or {}
    c.joinedTurn = s.turn; c.exhausted = not not o.exhausted; c.damage = o.damage or pf.enterDamage or 0
    if pf.enterCounters then c.counters = assign({}, c.counters or {}, pf.enterCounters) end
    push(p.allies, c)
    L(s, tr("✨ {0}", c.name), "", p.id)
    evt(s, "allyEnters", { uid = c.uid, pid = pid })
    local f = fx(c) if f.enter then f.enter(s, c, pid, nil) end
end
function makeToken(s, tokenId, pid, extra)
    extra = extra or {}
    local c = makeCardInst(tokenId, true, pid)
    assign(c, extra)
    putIntoPlay(s, c, pid, extra)
    return c
end

-- Forbidden Knowledge: statt zu ziehen eine entfernte Karte wählen
function fkDraw(s, pid)
    local p = getPlayer(s, pid)
    if not p.fk or #p.fk == 0 then p.decked = true; return end
    local seen, opts = {}, {}
    for _, id in ipairs(p.fk) do if not seen[id] then seen[id] = true; push(opts, { label = CARDS[id].name, v = id, card = id, ai = CARDS[id].cost or 0 }) end end
    ask(s, { pid = pid, prompt = tr("Forbidden Knowledge: Wähle eine entfernte Karte"), src = "Forbidden Knowledge", opts = opts, k = "E:fkPick", a = { pid = pid } })
end
EK.fkPick = function(s, a, id)
    local p = getPlayer(s, a.pid)
    local i = indexOf(p.fk, id)
    if i then table.remove(p.fk, i); push(p.hand, makeCardInst(id, false, p.id)) end
end
