-- ============================================================================
-- REGEL-ENGINE (engine.js 628–1031) – Warteschlange, Ereignisse, Auslöser, Hauptschleife,
-- zustandsbasierte Aktionen, Limits (Unique, Tags), Prioritätsfenster und Antworten
-- ============================================================================
local ADDON, ns = ...
local E = ns.E
if setfenv then setfenv(1, E) else _ENV = E end

-- ---------------------------------------------------------------- Warteschlange / Ereignisse
-- q: Schritt hinten an die aktuelle "Batch" hängen (wird nach dem laufenden Schritt vorne eingefügt)
function q(s, step) s._batch = s._batch or {}; push(s._batch, step) end
function trig(s, t) q(s, assign({ op = "trig" }, t)) end
HOOKS = {}
function onEvt(name, fn) HOOKS[name] = HOOKS[name] or {}; push(HOOKS[name], fn) end
-- Engine-seitige Auslöser ("when … is dealt damage / destroyed"): Wirkungen kommen auf die Kette
EV_CHAIN = { damaged = "Schadens-Auslöser", destroyed = "Zerstörungs-Auslöser" }
-- Ereignisse, deren Kartenreaktionen ausgelöste Effekte sind (sie kommen beim nächsten PPP auf die Kette)
CHAIN_EVENTS = { sabotages = 1, proposes = 1, targeted = 1, startOfTurn = 1, endOfTurn = 1, attacks = 1, defends = 1, protects = 1, allyEnters = 1, strike = 1, cardPlayed = 1,
    dmg = 1, died = 1, exhausted = 1, healed = 1, questDone = 1, drew = 1, cardDiscarded = 1, resDestroyed = 1, handLeft = 1, entersPlay = 1, combatEnd = 1,
    resEnters = 1, armorPrevented = 1 }
EV = {}   -- engine-eigene Reaktionen auf Ereignisse

-- Ereignis an alle Karten im Spiel melden: FX[id].on[name](s, card, data, ctrlPid)
function evt(s, name, data)
    local list = inPlay(s)
    -- Aktiver Spieler zuerst (stabil wie Array.sort)
    local ap = s.activePlayer
    local first, second = {}, {}
    for _, e in ipairs(list) do if e.pid == ap then first[#first + 1] = e else second[#second + 1] = e end end
    list = concat(first, second)
    for _, e in ipairs(list) do
        local f = FX[e.c.id]
        if f and f.on and f.on[name] and active(s, e.c) then
            local fn = f.on[name]
            if CHAIN_EVENTS[name] then asTrigger(s, e.c, e.pid, function() fn(s, e.c, data, e.pid) end)
            else fn(s, e.c, data, e.pid) end
        end
    end
    if EV[name] then
        if EV_CHAIN[name] then asTrigger(s, { uid = false, name = tr(EV_CHAIN[name]) }, s.activePlayer, function() EV[name](s, data) end)
        else EV[name](s, data) end
    end
    -- Hooks für verzögerte Auslöser "this turn" (sie legen ihre Effekte selbst per pushTrig auf die Kette)
    local hk = HOOKS[name] if hk then for _, h in ipairs(hk) do h(s, data) end end
end
-- Führt die Auslöse-Prüfung sofort aus; die erzeugten Schritte werden zu einem wartenden ausgelösten Effekt.
-- c.uid == false: Engine-Auslöser (jeder Schritt gehört dem Spieler, dessen Karte ihn erzeugt hat)
function asTrigger(s, c, pid, fn)
    local saved = s._batch; s._batch = {}
    local ok, err = pcall(fn)
    local steps = s._batch; s._batch = saved
    if #steps > 0 then
        s.waitTrig = s.waitTrig or {}
        if c.uid == false then
            for _, st in ipairs(steps) do
                local owner = (st.a and (st.a.pid or st.a.owner)) or pid
                push(s.waitTrig, { pid = owner, srcId = st.id, srcName = (st.id and CARDS[st.id]) and CARDS[st.id].name or c.name, steps = { st } })
            end
        else
            push(s.waitTrig, { pid = pid, src = c.uid, srcId = c.id, srcName = c.name, steps = steps })
        end
    end
    if not ok then error(err, 0) end
end
-- PPP: wartende ausgelöste Effekte auf die Kette legen – die des Zugspielers zuerst (CR 410.5b)
-- Jeder Spieler wählt die Reihenfolge seiner eigenen wartenden Effekte (CR 708.1a): der zuerst gewählte kommt zuerst
-- auf die Kette und löst damit zuletzt auf. Gleiche Effekte (gleiche Quelle, gleiche Schritte) brauchen keine Wahl.
local function trigSig(t) return t.srcName .. serialize(t.steps) end
function addWaitingTriggers(s)
    local ap = s.activePlayer
    for _, pid in ipairs({ ap, ap == 1 and 2 or 1 }) do
        local mine = filter(s.waitTrig, function(t) return t.pid == pid end)
        -- Gefragt wird nur ein Mensch und nur, wenn die Reihenfolge das Ergebnis ändern kann
        if #mine > 1 and isHuman(s, pid) and #uniq(map(mine, trigSig)) > 1
            and choiceMatters(s, mine, function(c, t)
                local x = find(c.waitTrig, function(w) return trigSig(w) == trigSig(t) end)
                if x then chainTrigger(c, x) end
                addWaitingTriggers(c)
            end) then
            for _, t in ipairs(mine) do if not t.wid then t.wid = newUid("w_") end end
            ask(s, { pid = pid, prompt = tr("Mehrere ausgelöste Effekte: Welcher kommt zuerst auf die Kette (löst zuletzt auf)?"), src = tr("Ausgelöste Effekte"),
                opts = map(mine, function(t, i) return { label = t.srcName, v = t.wid, card = t.srcId, ai = -i } end), k = "E:trigFirst", a = {}, keep = true })
            flushBatch(s); return
        end
        for _, t in ipairs(mine) do chainTrigger(s, t) end
    end
    trigWindow(s)
end
-- Ändert eine Wahl etwas? Jede Option in einer Kopie anwenden, bis zur nächsten Ruhe durchspielen – mit gleichem
-- Zufall – und die Ergebnisse vergleichen. Nur dann lohnt es, den Spieler zu fragen.
function choiceMatters(s, opts, apply)
    local seed = math.floor(rand() * 2147483646)
    local saved = RNG
    local first = nil
    local result = false
    local ok = pcall(function()
        for _, o in ipairs(opts) do
            local c = cloneState(s)
            RNG = seededRandom(seed)
            apply(c, o); process(c); autoResolve(c)
            local sig = choiceSig(c)
            if first == nil then first = sig elseif sig ~= first then result = true; return end
        end
    end)
    RNG = saved
    if not ok then return true end
    return result
end
function choiceSig(c)
    local function ids(a) local t = map(a, function(x) return tostring(x.id) end) table.sort(t) return table.concat(t, ",") end
    local function chars(a)
        local t = map(a, function(x) return x.id .. ":" .. (x.damage or 0) .. ":" .. tostring(not not x.exhausted) .. ":" .. atkOf(c, x, {}) .. "/" .. hpOf(c, x) end)
        table.sort(t) return table.concat(t, ",")
    end
    local parts = { tostring(c.gameOver), tostring(c.winner), tostring(c.activePlayer), tostring(#c.chain) }
    for _, p in ipairs({ c.p1, c.p2 }) do
        local res = map(p.resources, function(r) return tostring(not not r.exhausted) .. ":" .. tostring(r.faceUp) end) table.sort(res)
        push(parts, chars({ p.hero }), ids(p.hand), chars(p.allies), ids(p.graveyard), tostring(#p.deck), table.concat(res, ","), ids(p.ongoing or {}),
            table.concat(map(p.hero.weapons, function(w) return w.id .. ":" .. tostring(not not w.exhausted) .. ":" .. weaponAtk(c, w, {}) end), ","),
            ids(p.hero.armors) .. table.concat(map(p.hero.armors, function(x) return tostring(not not x.exhausted) end), ""))
    end
    return table.concat(parts, "|")
end
function chainTrigger(s, t)
    removeVal(s.waitTrig, t)
    push(s.chain, { kind = "trigger", id = newUid("t_"), pl = t.pid, src = t.src, srcId = t.srcId, srcName = t.srcName, steps = t.steps, label = tr("Ausgelöster Effekt") })
end
-- Danach bekommt der Zugspieler Priorität (CR 410.5)
function trigWindow(s)
    if s.win then s.win.prio = s.activePlayer; s.win.passes = 0
    else s.win = { prio = s.activePlayer, passes = 0 } end
end
EK.trigFirst = function(s, a, wid)
    local t = find(s.waitTrig or {}, function(x) return x.wid == wid end)
    if t then chainTrigger(s, t) end
    if #s.waitTrig == 0 then trigWindow(s) end   -- sonst geht es beim nächsten Durchlauf mit den übrigen weiter
end

-- Entscheidung anfordern. dec = {pid, prompt, opts:[{label, v, ai}], k:'id:name' | 'E:name', a:{...}, src}
function ask(s, dec) q(s, { op = "ask", dec = dec }) end
function callK(s, k, a, v)
    local id, name = k:match("^([^:]+):(.+)$")
    if id == "E" then
        local f = EK[name] if not f then error("Fortsetzung fehlt: " .. k) end
        return f(s, a, v)
    end
    local f = FX[tonumber(id) or id]
    if not f or not f.k or not f.k[name] then error("Fortsetzung fehlt: " .. k) end
    return f.k[name](s, a, v)
end

function execStep(s, st)
    s._batch = {}
    local op = st.op
    if op == "ask" then
        local d = st.dec
        d.opts = filter(d.opts or {}, function(o) return o and true or false end)
        if #d.opts == 0 then
            if d.none ~= nil then callK(s, d.k, d.a, d.none) end
        elseif #d.opts == 1 and d.auto ~= false and not d.keep then
            callK(s, d.k, d.a, d.opts[1].v)
        elseif isHuman(s, d.pid) then
            if d.cancel and not some(d.opts, function(o) return o.v == "__cancel" end) then push(d.opts, { label = tr("Abbrechen"), v = "__cancel", ai = -1e9 }) end
            s.pending = assign({ kind = "choose" }, d)
        else
            local v = aiPick(s, d)
            if isReal(s) and d.pid ~= s.activePlayer then s._oppDecided = true end
            callK(s, d.k, d.a, v)
        end
    elseif op == "dmg" then dmgStep(s, st)
    elseif op == "dmgApply" then dmgApply(s, st)
    elseif op == "trig" then
        if st.id ~= nil then local f = FX[st.id] if f and f.k and f.k[st.k] then f.k[st.k](s, st.a or {}) end
        elseif EK[st.k] then EK[st.k](s, st.a or {}) end
    elseif op == "call" then callK(s, st.k, st.a or {}, st.v)
    elseif op == "resolveTop" then resolveTop(s)
    elseif op == "battle" then battleStep(s, st.step)
    elseif op == "turn" then turnStep(s, st.step)
    elseif op == "fkDraw" then fkDraw(s, st.pid)
    elseif op == "window" then openWindow(s, st.first or s.activePlayer, st.reason)   -- parkt den Rest der Warteschlange
    else error("Unbekannter Schritt " .. tostring(op)) end
    if #s._batch > 0 then insertFront(s.queue, unpack(s._batch)) end
    s._batch = {}
end

-- ---------------------------------------------------------------- Hauptschleife
function process(s)
    local guard = 0
    flushBatch(s)   -- Schritte, die außerhalb eines Schritts erzeugt wurden (z. B. Tests, Setup)
    while not s.gameOver and guard < 50000 do
        guard = guard + 1
        if s.pending then return end
        if #s.queue > 0 then execStep(s, table.remove(s.queue, 1))
        elseif stateBased(s) then -- weiter
        elseif s.waitTrig and #s.waitTrig > 0 then addWaitingTriggers(s)
        elseif s.win then if not priorityStep(s) then return end
        elseif #s.chain > 0 then s.win = { prio = s.activePlayer, passes = 0 }
        elseif s.battle then
            local before = s.battle.step
            battleStep(s, s.battle.step)
            if s.battle and s.battle.step == before and #s.queue == 0 and not s.pending and not s.win then endBattle(s, tr("Kampf hing")) end
        else return end
    end
    if guard >= 50000 then dbg("Engine-Schleife abgebrochen"); s.queue = {}; s.win = nil end
end
function isIdle(s) return not s.gameOver and not s.pending and #s.queue == 0 and not s.win and #s.chain == 0 and not s.battle and s.phase == "main" end

-- ---------------------------------------------------------------- Zustandsbasierte Aktionen: tödlicher Schaden, Einzigartigkeit
STATE_FIX = {}
function stateBased(s)
    local changed = false
    for _, p in ipairs({ s.p1, s.p2 }) do
        local dead = filter(p.allies, function(a) return (a.damage or 0) >= hpOf(s, a) and not isIndestructible(s, a) and not (FX[a.id] and FX[a.id].noFatal and active(s, a)) end)
        for _, a in ipairs(dead) do
            L(s, tr("💀 {0}", a.name), "log-hit", p.id); addValue(s, a.lastHitBy, "kills", 1, 2 + (a.cost or 0), p.id)
            leavePlay(s, a, "graveyard", { destroyed = true, cause = "damage" }); changed = true
        end
    end
    if changed then flushBatch(s); return true end
    -- Held zerstört oder "decked" (CR 410.6b) – beide gleichzeitig: Unentschieden (CR 102.1a)
    local heroDead = filter({ s.p1, s.p2 }, function(p)
        return p.decked or ((p.hero.damage or 0) >= hpOf(s, p.hero) and not some(p.allies, function(a) return a.id == 263 and active(s, a) end) and not isIndestructible(s, p.hero))
    end)
    if #heroDead == 2 then s.gameOver = true; s.winner = nil; L(s, tr("Unentschieden!")); return true end
    if #heroDead == 1 then local p = heroDead[1]; lose(s, p.id, p.decked and "DECKOUT" or tr("{0} ist gefallen.", p.hero.name)); return true end
    for _, f in ipairs(STATE_FIX) do if f(s) then flushBatch(s); return true end end
    -- Unique + Tag-Limits (Pet(1), Totem-Tags, Ausrüstungsplätze) – Zugspieler repariert zuerst (CR 414.2)
    for _, p in ipairs({ getPlayer(s, s.activePlayer), getOpponent(s, s.activePlayer) }) do
        local v = findLimitViolation(s, p)
        if v then
            ask(s, { pid = p.id, prompt = tr("{0}: Wähle, welche Karte zerstört wird.", v.label), src = v.label, destroy = true,
                opts = map(v.cards, function(c) return { label = c.name, v = c.uid, ai = -(c.joinedTurn or 0) - cardValue(s, c) } end), k = "E:limitDestroy", a = {} })
            flushBatch(s); return true
        end
    end
    return false
end
function flushBatch(s) if s._batch and #s._batch > 0 then insertFront(s.queue, unpack(s._batch)); s._batch = {} end end
EK.placeFaceUp = function(s)
    local r = s.resPrep; s.resPrep = nil
    if not r then return end
    local p, c = getPlayer(s, r.pid), r.card
    push(s.chain, { kind = "resource", id = newUid("r_"), pl = p.id, res = c, faceUp = true, srcId = c.id, srcName = c.name, label = tr("Ressource") })
    L(s, tr("Ressource: {0}", c.name), "", p.id); evt(s, "handLeft", { pid = p.id, uid = c.uid }); s.win = linkWindow(s, p.id, s.win); flushBatch(s)
end
EK.limitDestroy = function(s, a, uid)
    local c = findCharacter(s, uid)
    if c and c.type == "Hero" then return end
    if c then leavePlay(s, c, "graveyard", { destroyed = true, cause = "limit" }) end
end
UNIQUE_ALL = {}
TAG_LIMIT_EXTRA = {}
function findLimitViolation(s, p)
    local all = concat(p.allies, p.hero.weapons, p.hero.armors, p.ongoing or {})
    -- Unique (414.3a)
    local uq, uqOrder = {}, {}
    for _, c in ipairs(all) do
        if c.unique or (c.limitTags and c.limitTags.Unique) or (#UNIQUE_ALL > 0 and some(UNIQUE_ALL, function(f) return f(s) end)) then
            if not uq[c.name] then uq[c.name] = {}; push(uqOrder, c.name) end
            push(uq[c.name], c)
        end
    end
    for _, k in ipairs(uqOrder) do if #uq[k] > 1 then return { label = "Unique (" .. k .. ")", cards = uq[k] } end end
    -- Tags mit Zahl, z. B. Pet (1), Form (1), Earth Totem (1), Head (1), Ring (2) (414.3b)
    local tags, tagOrder = {}, {}
    for _, c in ipairs(all) do
        local lt = c.limitTags or {}
        local tk = keys(lt) table.sort(tk)
        for _, t in ipairs(tk) do
            if not tags[t] then tags[t] = { lim = lt[t], cards = {} }; push(tagOrder, t) end
            push(tags[t].cards, c)
        end
    end
    local offH = filter(p.hero.armors, function(a) return a.limitTags and a.limitTags["Off-Hand"] end)
    for _, t in ipairs(tagOrder) do
        local lim = tags[t].lim
        local cards = tags[t].cards
        -- Dual Wield (CR 406.2): zwei Einhand-Nahkampfwaffen statt einer Off-Hand-Ausrüstung
        if t == "Melee" and #cards == 2 and #offH == 0 and every(cards, function(w) return not w.twoHanded end) and hasDualWield(s, p.id) then lim = 2 end
        lim = lim + auraSum(s, "tagLimit", p.id, t, cards)
        for _, f in ipairs(TAG_LIMIT_EXTRA) do lim = lim + (f(s, p.id, t) or 0) end
        if #cards > lim then return { label = t .. " (" .. tags[t].lim .. ")", cards = cards } end
    end
    -- Zweihänder + Off-Hand (414.3c)
    local two = filter(p.hero.weapons, function(w) return w.twoHanded end)
    if #two > 0 and #offH > 0 then return { label = tr("Zweihänder + Off-Hand"), cards = concat(two, offH) } end
    return nil
end

-- ---------------------------------------------------------------- Prioritätsfenster
-- Ein Fenster "parkt" die restlichen Schritte – sie laufen erst weiter, wenn das Fenster schließt (CR 410.4)
-- Nach dem Hinzufügen eines Links bekommt der Spieler wieder Priorität (CR 410.2).
-- Für den menschlichen Spieler gilt das als sofortiges "Passen" (Bedienkomfort) – der Gegner darf antworten.
function linkWindow(s, pid, ow)
    local w = { prio = pid, passes = 0, reason = ow and ow.reason or nil, after = ow and ow.after or nil }
    if isHuman(s, pid) and not s.stopAll then w.prio = (pid == 1) and 2 or 1; w.passes = 1 end   -- "Jedes Fenster": Priorität behalten (CR 410.1)
    return w
end
function openWindow(s, first, reason)
    if s.win then return end
    local after = s.queue; s.queue = {}
    s.win = { prio = first, passes = 0, reason = reason, after = after }
end
function closeWindow(s)
    local w = s.win; s.win = nil
    if w and w.after and #w.after > 0 then insertFront(s.queue, unpack(w.after)) end
end
function priorityStep(s)
    local w = s.win
    if w.passes >= 2 then
        if #s.chain > 0 then
            push(s.queue, { op = "resolveTop" })
            -- Nach der Auflösung bekommt der Zugspieler wieder Priorität; das Fenster schließt erst nach
            -- aufeinanderfolgendem Passen bei leerer Kette (CR 410.4). Ein Fenster der Aktionsphase ist
            -- der Ruhezustand selbst (CR 502.2).
            if w.reason and w.reason ~= "action" then s.win = { prio = s.activePlayer, passes = 0, reason = w.reason, after = w.after }
            else s.win = nil end
            return true
        end
        closeWindow(s); return true
    end
    local pid = w.prio
    -- Vorausschau der KI (Kopien): dort antwortet niemand – sonst rechnete jede Kopie wieder Kopien durch
    if s.look and not isHuman(s, pid) then passPriority(s); return true end
    local opts
    if s.stopAll and isHuman(s, pid) then opts = map(getPriorityActions(s, pid), function(a) return { a = a } end) else opts = respondOptions(s, pid) end
    if #opts == 0 then passPriority(s); return true end
    if isHuman(s, pid) then
        -- Sinnvolle Antworten (beste zuerst) merken: die Oberfläche zeigt sie vorn und hebt sie hervor
        local src = s.stopAll and respondOptions(s, pid) or opts
        local good = uniq(map(src, function(o) return respondKey(s, pid, o.a) end))
        s.pending = { kind = "priority", pid = pid, prompt = priorityPrompt(s, pid), reason = w.reason, good = good }
        return false
    end
    if isReal(s) then s._oppDecided = true end
    doAction(s, opts[1].a, pid)
    return true
end
-- Wann eine Antwort überhaupt in Frage kommt (kein Regelbestandteil – Passen ist immer erlaubt, CR 410.2):
--  - 'react': ein Link des Gegners liegt oben auf der Kette, oder ein Kampf steht im letzten Fenster vor dem Kampfschaden (CR 602).
--  - 'end': End-Fenster des gegnerischen Zugs bei leerer Kette (übrige Ressourcen nutzen).
function respondMoment(s, pid)
    local top = s.chain[#s.chain]
    if top then if top.pl ~= pid and top.kind ~= "resource" then return "react" end return nil end
    if s.battle then if s.battle.step == "damage" then return "react" end return nil end
    if s.win and s.win.reason == "end" and s.activePlayer ~= pid then return "end" end
    return nil
end
-- Sinnvolle Antworten für pid, beste zuerst: { {a, gain} }. Bewertung über evaluateState (AI.lua):
--  - 'react': die Antwort muss jetzt mehr bringen als Passen UND mehr als dieselbe Antwort nach der Auflösung.
--  - 'end': die Antwort muss mehr bringen als Passen.
RESPOND_MAX = 8
local function flat(t) local o = {} for _, x in ipairs(t or {}) do if type(x) == "table" then for _, y in ipairs(x) do o[#o + 1] = y end else o[#o + 1] = x end end return o end
function respondOptions(s, pid)
    local moment = respondMoment(s, pid)
    if not moment or not evaluateState then return {} end
    local acts = respondCandidates(s, pid, getPriorityActions(s, pid))
    if #acts == 0 then return {} end
    local vPass = respondValue(s, pid, nil, false)
    if vPass == nil then return {} end
    local human, top = isHuman(s, pid), s.chain[#s.chain]
    local function onLink(a) return top ~= nil and some(flat(a.targets), function(u) return u == top.id or (top.card and u == top.card.uid) end) end
    local out = {}
    for _, a in ipairs(acts) do
        local vNow = respondValue(s, pid, a, false)
        if vNow ~= nil then
            if human and moment == "react" and onLink(a) then push(out, { a = a, gain = vNow - vPass })
            elseif not (vNow <= vPass + ((human and moment == "react") and -2 or 0.5)) then
                local proposal = human and moment == "react" and top and top.kind == "proposal" and stopsProposal(s, pid, a, top)
                local skip = false
                if moment == "react" and not proposal then
                    local vLater = respondValue(s, pid, a, true)
                    if vLater ~= nil and vNow <= vLater + 0.5 then skip = true end
                end
                if not skip then push(out, { a = a, gain = vNow - vPass }) end
            end
        end
    end
    return stableSort(out, function(x, y) return (y.gain - x.gain) end)
end
-- Verhindert die Antwort den vorgeschlagenen Angriff (Angreifer tot, "can't attack" – CR 601.3)? In einer Kopie geprüft
function stopsProposal(s, pid, a, top)
    local c = cloneState(s)
    local ok = pcall(function() doAction(c, a, pid); process(c); autoResolve(c) end)
    if not ok then return false end
    local att = findCharacter(c, top.att)
    return not att or not isInPlayZone((locate(c, top.att) or {}).zone) or att.attackedTurn ~= c.turn
end
-- Kennung einer Antwort unabhängig von Zielen/X: Karte (uid), Kraft (Quelle|Schlüssel) oder Quest (uid)
function respondKey(s, pid, a)
    local p = getPlayer(s, pid)
    if a.type == "ACTIVATE" then return a.srcUid .. "|" .. a.key end
    if a.type == "COMPLETE_QUEST" then return ((p.resources[a.resIdx] or { card = {} }).card).uid end
    if a.type == "COMPLETE_QUEST_ZONE" then return a.uid end
    return a.gyUid or (p.hand[a.handIdx] or {}).uid
end
-- Je Karte/Kraft/Quest höchstens drei Varianten (Ziele sind schon nach KI-Wert sortiert), insgesamt RESPOND_MAX
function respondCandidates(s, pid, acts)
    local p, per, out = getPlayer(s, pid), {}, {}
    for _, a in ipairs(acts) do
        local k
        if a.type == "ACTIVATE" then k = a.srcUid .. ":" .. a.key
        elseif a.type == "COMPLETE_QUEST" then k = "q" .. a.resIdx
        elseif a.type == "COMPLETE_QUEST_ZONE" then k = "z" .. a.uid
        else k = "c" .. tostring(a.gyUid or (p.hand[a.handIdx] or {}).id) end
        per[k] = (per[k] or 0) + 1
        if per[k] <= 3 then push(out, a); if #out >= RESPOND_MAX then break end end
    end
    return out
end
-- Wert für pid, nachdem alles bis zur nächsten eigenen Entscheidung durchgelaufen ist (in einer Kopie):
-- act = nil → passen; later → erst passen, dann dieselbe Aktion (falls noch möglich)
function respondValue(s, pid, act, later)
    local c = cloneState(s)
    local function settle() process(c); autoResolve(c) end
    local ok, res = pcall(function()
        if not act or later then passPriority(c) else doAction(c, act, pid) end
        settle()
        if later and not c.gameOver then
            local a = respondRelocate(s, c, pid, act) if not a then return nil end
            if not canActInstant(c, pid) then
                if c.win or c.pending then return nil end
                c.win = { prio = pid, passes = 0 }
            end
            if validateAction(c, a, pid) then return nil end
            doAction(c, a, pid); settle()
        end
        return evaluateState(c, pid)
    end)
    if not ok then return nil end
    return res
end
-- Dieselbe Aktion in einer späteren Kopie (Handposition und Quest-Platz können sich verschoben haben)
function respondRelocate(s, c, pid, a)
    local p0, p, b = getPlayer(s, pid), getPlayer(c, pid), assign({}, a)
    if a.type == "PLAY_CARD" and not a.gyUid then
        local u = p0.hand[a.handIdx].uid
        b.handIdx = findIndex(p.hand, function(x) return x.uid == u end)
        if not b.handIdx then return nil end
    end
    if a.type == "COMPLETE_QUEST" then
        local u = p0.resources[a.resIdx].card.uid
        b.resIdx = findIndex(p.resources, function(r) return r.card.uid == u end)
        if not b.resIdx then return nil end
    end
    return b
end
function passPriority(s) local w = s.win if not w then return end w.passes = w.passes + 1; w.prio = (w.prio == 1) and 2 or 1 end
function priorityPrompt(s, pid)
    if #s.chain > 0 then return tr("Auf der Kette: {0}. Reagieren?", chainDesc(s, s.chain[#s.chain])) end
    if s.battle then return tr("Kampf: {0} greift {1} an. Reagieren?", nameOf(s, s.battle.att), nameOf(s, s.battle.def)) end
    if s.phase == "end" then return tr("Ende des Zuges. Noch etwas spielen?") end
    return tr("Reagieren?")
end
function nameOf(s, uid) local c = findCharacter(s, uid) return c and c.name or "?" end
function chainDesc(s, it)
    if it.kind == "card" then return it.card.name end
    if it.kind == "proposal" then return tr("Angriff: {0} → {1}", nameOf(s, it.att), nameOf(s, it.def)) end
    return (it.srcName or nameOf(s, it.src)) .. ": " .. (it.label or tr("Kraft"))
end
