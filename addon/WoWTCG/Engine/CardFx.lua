-- ============================================================================
-- KARTENEFFEKTE (cardfx.js) – jede Karte nach ihrem offiziellen Regeltext. Teil 1: Hilfen
-- FX[id] = {
--   slots(s,pid,card,ctx)  -> Ziel-Slots { {label,cands,min,max,harm} }
--   modes(s,pid,card,ctx)  -> "Choose one"-Optionen
--   xRange, canPlay, addCost, resolve(s,it), enter(s,c,pid), entered(s,c,pid,it)
--   powers: { {key,label,cost,act,exhaustHero,myTurn,once,flip,slots,canUse,selfCost,payExtra,resolve} }
--   on: { startOfTurn, endOfTurn, attacks, defends, protects, strike, cardPlayed, allyEnters, readied, ... }
--   leave(s,snap,dest,info), questCond, questExtra, questNoPay, reward
--   k: { benannte Fortsetzungen nach Entscheidungen }
-- }
-- Fortsetzungen werden über "id:name" adressiert. Ziel-Slots 1-basiert: JS T(it, 1) = Lua T(it, 2).
-- ============================================================================
local ADDON, ns = ...
local E = ns.E
if setfenv then setfenv(1, E) else _ENV = E end

FX_CARDS = FX
-- ---------------------------------------------------------------- Kurzhelfer
function me(s, pid) return getPlayer(s, pid) end
function foe(s, pid) return getOpponent(s, pid) end
function heroOf(s, pid) return getPlayer(s, pid).hero end
CH = { char = true }
ALLY = { ally = true }
function actPow(key, label, o) return assign({ key = key, label = label, act = true }, o) end   -- "[Activate] >>> …"
function slotChar(label, harm, extra) return function(s, pid) return { { label = label, cands = targetCands(s, pid, assign({ char = true }, extra)), harm = harm } } end end
function slotAlly(label, harm, extra) return function(s, pid) return { { label = label, cands = targetCands(s, pid, assign({ ally = true }, extra)), harm = harm } } end end
-- "Your hero deals X damage"
function heroDmg(s, pid, tgt, amt, dt, o)
    o = o or {}
    dealDamage(s, assign({ src = heroOf(s, pid).uid, tgt = tgt, amt = amt, dt = dt, ability = o.ability ~= false }, o))
end
function heroHeal(s, pid, tgt, amt) return heal(s, heroOf(s, pid).uid, tgt, amt) end
function opposingChars(s, pid, alliesOnly) local o = foe(s, pid) if alliesOnly then return alliesOf(o) end return concat({ o.hero }, o.allies) end
function yesNo(s, pid, prompt, src, k, a, aiYes)
    ask(s, { pid = pid, prompt = prompt, src = src, opts = { { label = tr("Ja"), v = 1, ai = aiYes and 1 or 0 }, { label = tr("Nein"), v = 0, ai = aiYes and 0 or 1 } }, k = k, a = a, auto = false })
end
function gyCands(s, pid, pred) return map(filter(me(s, pid).graveyard, pred), function(c) return c.uid end) end
function gyCard(s, uid) local l = locate(s, uid) if l and l.zone == "graveyard" then return l end return nil end
function gyLocked(s, ownerPid) return false end
function fromGyToHand(s, uid)
    local l = gyCard(s, uid) if not l then return end
    local p = me(s, l.pid)
    removeVal(p.graveyard, l.c); resetInst(l.c); push(me(s, l.c.owner or l.pid).hand, l.c)
    L(s, tr("↩ {0} aus dem Friedhof auf die Hand.", l.c.name))
end
function fromGyToPlay(s, uid, pid, o)
    local l = gyCard(s, uid) if not l then return end
    local p = me(s, l.pid)
    removeVal(p.graveyard, l.c); resetInst(l.c); putIntoPlay(s, l.c, pid, o)
end
function gyRemove(s, uid)
    local l = gyCard(s, uid) if not l then return end
    local p = me(s, l.pid)
    removeVal(p.graveyard, l.c); push(p.removed, l.c)
end
function cardPower(id, key) return find(FX[id].powers or {}, function(p) return p.key == key end) end
function selfDestroyCost(s, it, src) destroy(s, src, { cause = "cost" }) end
function selfRemoveCost(s, it, src) removeFromGame(s, src); L(s, tr("{0} wird aus dem Spiel entfernt.", src.name)) end
function readyHeroAndWeapon(s, pid, onlyMelee, srcName)
    local p = me(s, pid)
    readyCard(s, p.hero)
    local ws = filter(p.hero.weapons, function(w) return w.exhausted and (not onlyMelee or w.slot == "Melee") end)
    if #ws <= 1 then if ws[1] then readyCard(s, ws[1]) end return end
    ask(s, { pid = pid, prompt = tr("{0}: Welche Waffe bereit machen?", srcName), src = srcName, opts = map(ws, function(w) return { label = w.name, v = w.uid, ai = weaponAtk(s, w) } end), k = "E:readyOne", a = {} })
end
EK.readyOne = function(s, a, uid) readyCard(s, findCharacter(s, uid)) end
EK.readyHW = function(s, a) readyHeroAndWeapon(s, a.pid, a.onlyMelee, a.src) end
-- Ausgelöste Effekte: Wirkung erst beim Auflösen von der Kette
function tHeal(s, src, tgts, amt) trig(s, { k = "healList", a = { src = src, tgts = (type(tgts) == "table") and copyArr(tgts) or { tgts }, amt = amt } }) end
function tHeroHeal(s, pid, tgts, amt) tHeal(s, heroOf(s, pid).uid, tgts, amt) end
function tReady(s, uid) trig(s, { k = "readyUids", a = { uids = { uid } } }) end
function tDraw(s, pid, n) trig(s, { k = "draw", a = { pid = pid, n = n } }) end
function chooseOwnAlly(s, pid, prompt, src, k, a, aiFn)
    local al = alliesOf(me(s, pid))
    ask(s, { pid = pid, prompt = prompt, src = src, opts = map(al, function(c) return { label = targetLabel(s, c.uid, pid), v = c.uid, ai = aiFn and aiFn(c) or -cardValue(s, c) } end), k = k, a = a })
end
-- Spieler als "Ziel" (Target player) – als Modus gewählt
function playerModes(selfAi, oppAi) return function(s, pid) return { { label = tr("Du selbst"), v = pid, ai = selfAi }, { label = tr("Gegner"), v = (pid == 1) and 2 or 1, ai = oppAi } } end end
-- Oberste Karten ansehen / aufdecken und eine nehmen (v = Index 1.., 0 = keine)
EK.lookPick = function(s, a)
    local p = me(s, a.pid)
    local n = math.min(a.n, #p.deck)
    local ids = {}
    for i = 1, n do push(ids, table.remove(p.deck)) end                                -- ids[1] = oberste Karte
    if a.reveal then L(s, tr("👁 {0} deckt auf: {1}", p.hero.name, (#ids > 0) and table.concat(map(ids, function(id) return CARDS[id].name end), ", ") or "–")) end
    -- "When this ally is revealed from your deck by a quest, draw a card." (Jubilee Arcspark, CR 703.3b)
    if a.reveal and a.byQuest then for _, id in ipairs(ids) do if FX[id] and FX[id].revealedByQuest then pushTrig(s, a.pid, id, { { op = "call", k = "E:drawOne", a = { pid = a.pid } } }) end end end
    s._hidden = true
    p.looking = ids
    local function costOk(c) return (a.minCost == nil or (c.cost or 0) >= a.minCost) and (a.maxCost == nil or (c.cost or 0) <= a.maxCost) end
    local opts = {}
    for i, id in ipairs(ids) do
        local c = CARDS[id]
        local typeOk = not a.type or ((a.type == "Equipment") and (c.type == "Weapon" or c.type == "Armor" or c.type == "Item") or c.type == a.type)
        if costOk(c) and (not a.pred or (PRED[a.pred] and PRED[a.pred](c, a))) and typeOk then push(opts, { label = c.name, v = i, card = id, ai = (c.cost or 0) + 1 }) end
    end
    if #opts == 0 then EK.lookPickDo(s, a, 0); return end
    if a.optional then push(opts, { label = tr("Keine nehmen"), v = 0, ai = 0 }) end
    ask(s, { pid = a.chooser or a.pid, prompt = tr("{0}: Wähle eine Karte für die Hand ({1})", a.src, table.concat(map(ids, function(id) return CARDS[id].name end), ", ")),
        src = a.src, opts = opts, k = "E:lookPickDo", a = a, auto = not a.optional })
end
EK.lookPickDo = function(s, a, idx)
    local p = me(s, a.pid)
    local ids = p.looking or {}
    p.looking = nil
    if idx and idx > 0 then
        local id = table.remove(ids, idx)
        push(p.hand, makeCardInst(id, false, p.id))
        L(s, tr("{0} nimmt {1} auf die Hand.", p.hero.name, (a.reveal or a.showTaken) and CARDS[id].name or tr("eine Karte")))
    end
    -- Rest unter das Deck (Reihenfolge bleibt)
    putBottom(s, p.id, ids)
end
EK.drawOne = function(s, a) drawCards(s, me(s, a.pid), 1) end
-- Deck durchsuchen (danach mischen)
function searchDeck(s, pid, src, predName, n, dest) q(s, { op = "call", k = "E:searchStep", a = { pid = pid, src = src, predName = predName, n = n or 1, dest = dest or "hand" } }) end
PRED = {
    ally = function(c) return isAllyCard(c) end,
    weapon = function(c) return c.type == "Weapon" end,
    combo = function(c) return includes(c.subtypes or {}, "Combo") end,
    equipment = function(c) return c.type == "Weapon" or c.type == "Armor" or c.type == "Item" end,
}
EK.searchStep = function(s, a)
    local p = me(s, a.pid)
    local pred = PRED[a.predName]
    local seen, opts = {}, {}
    for _, id in ipairs(p.deck) do local c = CARDS[id] if pred(c) and not seen[id] then seen[id] = true; push(opts, { label = c.name, v = id, card = id, ai = c.cost or 0 }) end end
    s._hidden = true
    if #opts == 0 or a.n <= 0 then if a.dest ~= "top" then shuffleInPlace(p) end return end
    push(opts, { label = tr("Nichts (mehr) nehmen"), v = 0, ai = -1 })
    ask(s, { pid = p.id, prompt = tr("{0}: Wähle aus deinem Deck", a.src), src = a.src, opts = opts, k = "E:searchDo", a = a, auto = false })
end
EK.searchDo = function(s, a, id)
    local p = me(s, a.pid)
    if not id or id == 0 then shuffleInPlace(p); return end
    local i = indexOf(p.deck, id) if not i then return end
    table.remove(p.deck, i)
    L(s, tr("🔎 {0} sucht und zeigt {1}.", p.hero.name, CARDS[id].name))
    if a.dest == "top" then shuffleInPlace(p); push(p.deck, id); return end
    if a.dest == "play" then shuffleInPlace(p); putIntoPlay(s, makeCardInst(id, false, p.id), p.id); return end
    push(p.hand, makeCardInst(id, false, p.id))
    if a.n > 1 then q(s, { op = "call", k = "E:searchStep", a = assign({}, a, { n = a.n - 1 }) }); return end
    shuffleInPlace(p)
end
-- Mehrfachauswahl "beliebig viele" -> nacheinander mit "Fertig"
function askMany(s, pid, prompt, src, cands, k, a, aiFn, max)
    local opts = map(cands, function(u) return { label = targetLabel(s, u, pid), v = u, ai = aiFn and aiFn(u) or 0 } end)
    push(opts, { label = tr("Fertig"), v = "__done", ai = 0 })
    ask(s, { pid = pid, prompt = prompt, src = src, opts = opts, k = k, a = assign({}, a, { max = max or 99 }), auto = false })
end

-- "When this ability is destroyed, you may pay (2). If you do, its owner puts it from his graveyard into his hand at the next end of turn."
function payReturnOnDestroy(id)
    return function(s, snap, dest, info)
        if dest ~= "graveyard" or not info.destroyed then return end
        trig(s, { id = id, k = "retAsk", a = { uid = snap.uid, pid = snap.wasCtrl, owner = snap.owner } })
    end
end
function retK(id)
    return {
        retAsk = function(s, a) local p = me(s, a.pid) if getReadyRes(p) < 2 then return end yesNo(s, a.pid, tr("{0} wurde zerstört: (2) bezahlen, um es am Ende des Zuges auf die Hand zu nehmen?", CARDS[id].name), CARDS[id].name, id .. ":retDo", a, true) end,
        retDo = function(s, a, v) if v ~= 1 or not payRes(me(s, a.pid), 2) then return end s.delayed = s.delayed or {}; push(s.delayed, { at = "nextEnd", k = id .. ":retBack", a = a }) end,
        retBack = function(s, a) local l = gyCard(s, a.uid) if l then fromGyToHand(s, a.uid) end end,
    }
end
-- Bear Form: "Destroy this card when you strike with a weapon or play a non-Feral ability."
bearOn = {
    cardPlayed = function(s, c, d, pid) if d.pid == pid and d.card.type == "Ability" and d.card.school ~= "Feral" then trig(s, { k = "destroyOngoing", a = { uid = c.uid, byAbility = true } }) end end,
}
-- "At the start of your turn, your hero deals N <type> damage to attached character"
function dotOnStart(n, dt)
    return { startOfTurn = function(s, c, d, pid) if d.pid == pid and c.attachedTo then heroDmg(s, pid, c.attachedTo, n, dt, { abilityId = c.id, abilityUid = c.uid }) end end }
end
-- Gift-Ziel: "hero or ally that was dealt combat damage by your hero this turn"
function poisonSlots(s, pid)
    return { { label = tr("Ziel (von deinem Helden im Kampf getroffen)"), cands = targetCands(s, pid, { char = true, filter = function(c) return some(tms(s, c, "hitByHero"), function(m) return m.by == pid end) end }), harm = true } }
end
