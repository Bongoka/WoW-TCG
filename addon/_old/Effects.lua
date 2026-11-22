-- ============================================================================
-- WoW TCG - Effekt-Engine
-- Liest den Effektkatalog (CardFx) und berechnet Auren, Schluesselwoerter,
-- Schaden, Heilung sowie unmittelbare Effekte.
-- ============================================================================
local ADDON, ns = ...
local E = {}
ns.Effects = E

-- ---------------------------------------------------------------------------
-- Kartentypen
-- ---------------------------------------------------------------------------
local function isAlly(card)
    return card and (card.type == "Ally" or card.isToken == true)
end
local function isChar(card)
    return card and (card.type == "Hero" or card.type == "Ally" or card.isToken == true)
end
local function isEquipment(card)
    return card and (card.type == "Weapon" or card.type == "Armor" or card.type == "Item")
end

E.IsAlly = isAlly
E.IsAttr = isChar
E.IsEquipment = isEquipment

-- ---------------------------------------------------------------------------
-- Effektkatalog an die Karten haengen
-- ---------------------------------------------------------------------------
local function initFx()
    if ns.Cards and ns.CardFx then
        for id, fx in pairs(ns.CardFx) do
            local card = ns.Cards[id]
            if card then
                card.fx = fx
                if fx.xCost then card.xCost = true end
            end
        end
        local known = ns.CardFxHardcoded or {}

        -- Entfernt reine Schluesselwoerter, ohne den restlichen Text zu verschlucken.
        local function stripKeywords(text)
            local s = text
            s = s:gsub("[Ee]lusive%s*%b()", "")
            s = s:gsub("[Ee]lusive%s*%d*", "")
            s = s:gsub("[Pp]rotector%s*%b()", "")
            s = s:gsub("[Pp]rotector%s*%d*", "")
            s = s:gsub("[Ff]erocity%s*%b()", "")
            s = s:gsub("[Ff]erocity", "")
            s = s:gsub("^[%s,;%.]+", "")
            s = s:gsub("[%s,;%.]+$", "")
            return s
        end

        for id, card in pairs(ns.Cards) do
            local text = card.text
            if card.type ~= "Hero" and text and text ~= "" and not card.fx and not known[id] then
                -- Nur reine Schluesselwort-Texte brauchen keinen Effekt.
                local stripped = stripKeywords(text)
                if stripped ~= "" then
                    if stripped:lower():find("activate", 1, true) or stripped:find(">>>", 1, true) then
                        card.fxNote = "Aktivierte Fähigkeit nicht verfügbar."
                    else
                        card.fxNote = "Effekt nicht umgesetzt."
                    end
                end
            end
        end
    end
end
initFx()

-- ---------------------------------------------------------------------------
-- Hilfen
-- ---------------------------------------------------------------------------
function E.AttachmentsOn(g, uid)
    local out = {}
    if not uid then return out end
    for _, pid in ipairs({ 1, 2 }) do
        local p = g.players[pid]
        for i = 1, #p.ongoing do
            if p.ongoing[i].attachedTo == uid then out[#out + 1] = p.ongoing[i] end
        end
    end
    return out
end

local function formOk(g, pid, form)
    if not form then return true end
    if form == "any" then return g:HasForm(pid, "bear") or g:HasForm(pid, "cat") end
    return g:HasForm(pid, form)
end

-- Passt eine Zielseite auf eine Karte?
local function sideMatch(g, pid, src, side, card)
    if not side then return true end
    if side == "self" then return card == src end
    if side == "attached" then return src and src.attachedTo ~= nil and card.uid == src.attachedTo end
    local cpid = g:ControllerOf(card)
    if not cpid then return false end
    local ally = isAlly(card)
    local hero = (card.type == "Hero")
    if side == "friendlyChars" then return cpid == pid end
    if side == "enemyChars" then return cpid ~= pid end
    if side == "allChars" then return true end
    if side == "friendlyHero" then return hero and cpid == pid end
    if side == "enemyHero" then return hero and cpid ~= pid end
    if side == "friendlyAllies" then return ally and cpid == pid end
    if side == "otherFriendlyAllies" then return ally and cpid == pid and card ~= src end
    if side == "enemyAllies" then return ally and cpid ~= pid end
    if side == "allAllies" then return ally end
    if side == "friendlyPets" then return ally and cpid == pid and (card.isPet or (card.limitTags and card.limitTags.Pet)) end
    if side == "friendlyWeapons" then return card.type == "Weapon" and cpid == pid end
    if side == "friendlyArmor" then return (card.type == "Armor" or (card.type == "Item" and (card.def or 0) > 0)) and cpid == pid end
    if side == "dwarves" then return ally and cpid == pid and card.race == "Dwarf" end
    if side == "orcs" then return ally and cpid == pid and card.race == "Orc" end
    if side == "hordeAllies" then return ally and cpid == pid and card.faction == "Horde" end
    if side == "allianceAllies" then return ally and cpid == pid and card.faction == "Alliance" end
    return false
end

local function addSet(out, g, pid, src, set, attached)
    if not set then return end
    out[#out + 1] = { pid = pid, src = src, set = set, attached = attached and true or false }
end

-- Alle Auren/Dauereffekte, die auf eine bestimmte Karte wirken koennen
function E.SourcesFor(g, card)
    local out = {}
    if not card then return out end
    for _, pid in ipairs({ 1, 2 }) do
        local p = g.players[pid]
        for i = 1, #p.ongoing do
            local o = p.ongoing[i]
            if o.fx then
                if o.attachedTo == card.uid then
                    addSet(out, g, pid, o, o.fx.ongoing, true)
                elseif not o.attachedTo then
                    addSet(out, g, pid, o, o.fx.static, false)
                    addSet(out, g, pid, o, o.fx.ongoing, false)
                end
            end
        end
        local cards = { p.hero }
        for i = 1, #p.allies do cards[#cards + 1] = p.allies[i] end
        for i = 1, #p.weapons do cards[#cards + 1] = p.weapons[i] end
        for i = 1, #p.armors do cards[#cards + 1] = p.armors[i] end
        for i = 1, #cards do
            local c = cards[i]
            if c and c.fx then
                -- Dauereffekte von Helden, Verbuendeten und Ausruestung wirken,
                -- solange die Karte im Spiel ist (Karten im Ongoing-Bereich
                -- werden bereits oben erfasst).
                addSet(out, g, pid, c, c.fx.static, false)
                if not c.attachedTo then
                    addSet(out, g, pid, c, c.fx.ongoing, false)
                end
            end
        end
    end
    return out
end

local function buffActive(g, card, b)
    if b.untilTurn and b.untilTurn < g.turn then return false end
    if b.attackingOnly and not g:IsAttacking(card) then return false end
    if b.defendingOnly and not g:IsDefending(card) then return false end
    return true
end

-- ---------------------------------------------------------------------------
-- Statische Werte
-- ---------------------------------------------------------------------------
function E.StatBonus(g, card, stat)
    local total = 0
    if not card then return 0 end
    local cpid = g:ControllerOf(card)
    for i = 1, #(card.buffs or {}) do
        local b = card.buffs[i]
        if b[stat] and buffActive(g, card, b) then total = total + b[stat] end
    end
    local srcs = E.SourcesFor(g, card)
    for i = 1, #srcs do
        local s = srcs[i]
        local list = s.set and s.set.stats
        if list then
            for j = 1, #list do
                local a = list[j]
                if a[stat] and a[stat] ~= 0 and sideMatch(g, s.pid, s.src, a.side, card) then
                    local ok = true
                    if a.attackingOnly and not g:IsAttacking(card) then ok = false end
                    if a.defendingOnly and not g:IsDefending(card) then ok = false end
                    if a.other and card == s.src then ok = false end
                    if a.form and cpid and not formOk(g, s.pid, a.form) then ok = false end
                    if ok then total = total + a[stat] end
                end
            end
        end
    end
    return total
end

function E.HasKeyword(g, card, kw)
    if not card then return false end
    local k = tostring(kw):lower()
    if E.PreventPowers(g, card) then return false end

    if k == "protector" then
        if card.protector or card.protectsHeroOnly then return true end
        if card.type == "Hero" and g:HasForm(g:ControllerOf(card), "bear") then return true end
    elseif k == "elusive" and card.elusive then return true
    elseif k == "ferocity" and card.ferocity then return true
    elseif k == "stealth" and card.stealth then return true
    elseif k == "longrange" and card.longRange then return true
    end

    for i = 1, #(card.buffs or {}) do
        local b = card.buffs[i]
        if buffActive(g, card, b) and b.kw then
            for _, x in ipairs(b.kw) do
                if tostring(x):lower() == k then return true end
            end
        end
    end

    local srcs = E.SourcesFor(g, card)
    for i = 1, #srcs do
        local s = srcs[i]
        local set = s.set
        if set then
            if set.kw then
                for j = 1, #set.kw do
                    local a = set.kw[j]
                    if tostring(a.kw):lower() == k and sideMatch(g, s.pid, s.src, a.side, card) then
                        if formOk(g, s.pid, a.form) then return true end
                    end
                end
            end
            if k == "protector" and set.heroProtector and card.type == "Hero" and g:ControllerOf(card) == s.pid then
                return true
            end
            if k == "elusive" and set.heroElusive and card.type == "Hero" and g:ControllerOf(card) == s.pid then
                return true
            end
            if set.factionKw and card.type == "Hero" and g:ControllerOf(card) == s.pid then
                local fac = g.players[s.pid].faction
                if fac == "Alliance" and k == "elusive" then return true end
                if fac == "Horde" and k == "ferocity" then return true end
            end
        end
    end
    return false
end

function E.PreventPowers(g, card)
    if not card then return false end
    local atts = E.AttachmentsOn(g, card.uid)
    for i = 1, #atts do
        local o = atts[i]
        if o.fx and o.fx.ongoing and o.fx.ongoing.noPowers then return true end
    end
    for i = 1, #(card.buffs or {}) do
        if buffActive(g, card, card.buffs[i]) and card.buffs[i].noPowers then return true end
    end
    return false
end

local function anyCannot(g, card, field)
    for i = 1, #(card.buffs or {}) do
        local b = card.buffs[i]
        if buffActive(g, card, b) and b[field] then return true end
    end
    local srcs = E.SourcesFor(g, card)
    for i = 1, #srcs do
        local s = srcs[i]
        local list = s.set and s.set.cannot
        if list then
            for j = 1, #list do
                local a = list[j]
                if a[field] and sideMatch(g, s.pid, s.src, a.side, card) then return true end
            end
        end
    end
    return false
end

function E.CannotAttack(g, card)
    if not card then return true end
    if card.cantAttack then return true end
    if E.PreventPowers(g, card) then return true end
    if anyCannot(g, card, "attack") then return true end
    -- Gegnerische Karten mit "kann nicht angreifen" (z. B. Jaina)
    return false
end

function E.CannotProtect(g, card)
    if not card then return true end
    if E.PreventPowers(g, card) then return true end
    return anyCannot(g, card, "protect")
end

function E.CannotReady(g, card)
    if not card then return true end
    if (card.noReadyTurns or 0) > 0 then return true end
    local srcs = E.SourcesFor(g, card)
    for i = 1, #srcs do
        local s = srcs[i]
        local nr = s.set and s.set.noReady
        if nr and sideMatch(g, s.pid, s.src, nr.side, card) then return true end
    end
    return false
end

function E.CannotBeTargeted(g, card, byPid)
    if not card then return true end
    for i = 1, #(card.buffs or {}) do
        local b = card.buffs[i]
        if buffActive(g, card, b) and b.untargetable then return true end
    end
    local srcs = E.SourcesFor(g, card)
    for i = 1, #srcs do
        local s = srcs[i]
        if s.set and s.set.untargetable and sideMatch(g, s.pid, s.src, s.set.untargetable.side, card) then
            if not byPid or byPid ~= g:ControllerOf(card) then return true end
        end
    end
    return false
end

function E.NoDamageOut(g, card)
    for i = 1, #(card.buffs or {}) do
        local b = card.buffs[i]
        if buffActive(g, card, b) and b.preventAll then return true end
    end
    local srcs = E.SourcesFor(g, card)
    for i = 1, #srcs do
        local s = srcs[i]
        if s.set and s.set.noDamageOut and sideMatch(g, s.pid, s.src, s.set.noDamageOut, card) then return true end
    end
    return false
end

-- ---------------------------------------------------------------------------
-- Schadensberechnung
-- ---------------------------------------------------------------------------
function E.DamageOutBonus(g, source, target, dt, amount, ability)
    if not source or amount <= 0 then return amount end
    local bonus, mult = 0, 1
    local srcs = E.SourcesFor(g, source)
    for i = 1, #srcs do
        local s = srcs[i]
        local list = s.set and s.set.damageMod
        if list then
            for j = 1, #list do
                local a = list[j]
                local ok = sideMatch(g, s.pid, s.src, a.side or "friendlyChars", source)
                if ok and a.dt and a.dt ~= dt then ok = false end
                if ok and a.abilityOnly and not ability then ok = false end
                if ok then
                    if a.plus then bonus = bonus + a.plus end
                    if a.multiply then mult = mult * a.multiply end
                end
            end
        end
    end
    if E.NoDamageOut(g, source) then return 0 end
    return math.max(0, (amount + bonus) * mult)
end

function E.DamageInBonus(g, target, source, dt, amount)
    if not target or amount <= 0 then return amount end
    local bonus = 0
    local srcs = E.SourcesFor(g, target)
    for i = 1, #srcs do
        local s = srcs[i]
        local list = s.set and s.set.damageIn
        if list then
            for j = 1, #list do
                local a = list[j]
                if not a.dt or a.dt == dt then
                    if sideMatch(g, s.pid, s.src, a.side or "friendlyChars", target) then
                        if a.plus then bonus = bonus + a.plus end
                    end
                end
            end
        end
    end
    return math.max(0, amount + bonus)
end

-- Liefert { amount = verbleibender Schaden, reflect = zurueckgeworfener Schaden }
function E.PreventDamage(g, target, source, dt, amount, combat, unpreventable)
    local res = { amount = amount, reflect = 0 }
    if amount <= 0 or unpreventable then return res end

    local srcs = E.SourcesFor(g, target)
    for i = 1, #srcs do
        local s = srcs[i]
        local list = s.set and s.set.prevent
        if list then
            for j = 1, #list do
                local a = list[j]
                if not a.combatOnly or combat then
                    if sideMatch(g, s.pid, s.src, a.side or "friendlyChars", target) then
                        local n = a.n or 1
                        if n == 999 then n = res.amount end
                        local r = math.min(n, res.amount)
                        res.amount = res.amount - r
                        if a.reflect then res.reflect = res.reflect + r end
                    end
                end
            end
        end
    end
    if res.amount <= 0 then return res end

    -- Schilde (z. B. Holy Shield, Divine Shield)
    local list = target.buffs or {}
    local keep = {}
    for i = 1, #list do
        local b = list[i]
        local ok = b.shield ~= nil and buffActive(g, target, b)
        if ok and b.sourceUid and source and b.sourceUid ~= source.uid then ok = false end
        if ok then
            local prevent = b.whole and res.amount or math.min(b.shield, res.amount)
            if b.all then prevent = res.amount end
            res.amount = res.amount - prevent
            if b.reflect then res.reflect = res.reflect + prevent end
            b.shield = (b.shield or 0) - prevent
            if b.shield > 0 and not b.whole then keep[#keep + 1] = b end
            if res.amount <= 0 then
                for j = i + 1, #list do keep[#keep + 1] = list[j] end
                break
            end
        else
            keep[#keep + 1] = b
        end
    end
    target.buffs = keep
    return res
end

-- ---------------------------------------------------------------------------
-- Ziele
-- ---------------------------------------------------------------------------
function E.TargetsOf(g, pid, eff, ctx)
    local out = {}
    if not eff or not eff.s then return out end
    local given = ctx and ctx.targets and ctx.targets[eff.s]
    if given then
        for i = 1, #given do
            local c = g:FindCard(given[i])
            if c and g:IsInPlay(c) then out[#out + 1] = c end
        end
        return out
    end
    local filter = eff.f
    if not filter and ctx and ctx.slots and ctx.slots[eff.s] then filter = ctx.slots[eff.s].f end
    if not filter then filter = "char" end
    local t = g:AutoTarget(pid, filter, eff, ctx)
    if t then out[1] = t end
    return out
end

function E.Amount(g, pid, expr, ctx, index, target)
    if type(expr) == "number" then return expr end
    if type(expr) == "table" then return tonumber(expr[index] or expr[1]) or 0 end
    if type(expr) ~= "string" then return 0 end
    if expr == "X" then return tonumber(ctx and ctx.x) or 0 end
    if expr == "3+daggerAtk" then return 3 + (g:BestWeaponAtk(pid, "Dagger") or 0) end
    if expr == "1+meleeAtk" then return 1 + (g:BestWeaponAtk(pid, "Melee") or 0) end
    if expr == "meleeAtk" then return g:BestWeaponAtk(pid, "Melee") or 0 end
    if expr == "2+X" then return 2 + (tonumber(ctx and ctx.x) or 0) end
    if expr == "petCost" then return (ctx and ctx.sacrificed and ctx.sacrificed.cost) or 0 end
    if expr == "allyAtk" and ctx and ctx.sourceAlly then return g:AttackPower(ctx.sourceAlly, {}) end
    if expr == "targetHp" and target then return math.max(0, g:MaxHP(target) - (target.damage or 0)) end
    return tonumber(expr) or 0
end

-- ---------------------------------------------------------------------------
-- Effekt anwenden
-- ---------------------------------------------------------------------------
local function addBuff(card, b)
    card.buffs = card.buffs or {}
    table.insert(card.buffs, b)
end
E.AddBuff = addBuff

local function rider(g, pid, eff, target, dealt, ctx)
    if not target or dealt <= 0 then return end
    if eff.noHeal then addBuff(target, { noHeal = true, untilTurn = g.turn }) end
    if eff.noAttack then addBuff(target, { cantAttack = true, untilTurn = g.turn }) end
    if eff.noProtect then addBuff(target, { cantProtect = true, untilTurn = g.turn }) end
    if eff.mustAttack then addBuff(target, { mustAttack = true, untilTurn = g.turn }) end
    if eff.discardPerDamage then
        local ctrl = g:ControllerOf(target)
        if ctrl then g:DiscardCards(ctrl, dealt) end
    end
    if eff.healHeroPerDamage then
        g:Heal(g.players[pid].hero, dealt, { source = ctx and ctx.source })
    end
    if eff.destroyIfDestroyedThisTurn then
        g:WatchDestroy(target, function()
            local ctrl = g:ControllerOf(target)
            if ctrl then g:DiscardCards(ctrl, 1) end
        end)
    end
end

function E.Apply(g, pid, eff, ctx)
    if not eff or not eff.k then return end
    ctx = ctx or {}
    local k = eff.k

    if k == "damage" then
        local targets = E.TargetsOf(g, pid, eff, ctx)
        for i = 1, #targets do
            local t = targets[i]
            local n = E.Amount(g, pid, eff.n, ctx, i, t)
            local dealt = g:DealDamage(t, n, {
                source = ctx.source, dt = eff.dt, ability = ctx.ability ~= false,
                unpreventable = eff.unpreventable,
            })
            rider(g, pid, eff, t, dealt, ctx)
        end

    elseif k == "damageAll" then
        local targets = E.TargetsOf(g, pid, eff, ctx)
        local n = E.Amount(g, pid, eff.n, ctx, 1, targets[1])
        for i = 1, #targets do
            g:DealDamage(targets[i], n, { source = ctx.source, dt = eff.dt, ability = ctx.ability ~= false })
        end

    elseif k == "aoeDamage" then
        local n = E.Amount(g, pid, eff.n, ctx, 1)
        local list = g:SideCards(pid, eff.side or "enemy", eff.heroes ~= false)
        for i = 1, #list do
            g:DealDamage(list[i], n, { source = ctx.source, dt = eff.dt, ability = ctx.ability ~= false })
        end

    elseif k == "heal" then
        local targets = E.TargetsOf(g, pid, eff, ctx)
        for i = 1, #targets do
            g:Heal(targets[i], E.Amount(g, pid, eff.n, ctx, i, targets[i]), { source = ctx.source })
        end

    elseif k == "healAll" then
        local targets = E.TargetsOf(g, pid, eff, ctx)
        for i = 1, #targets do g:HealAll(targets[i], { source = ctx.source }) end

    elseif k == "aoeHeal" then
        local n = E.Amount(g, pid, eff.n, ctx, 1)
        local list = g:SideCards(pid, eff.side or "friendly", eff.heroes ~= false)
        for i = 1, #list do g:Heal(list[i], n, { source = ctx.source }) end

    elseif k == "draw" then
        local n = E.Amount(g, pid, eff.n, ctx, 1)
        if eff.who == "opponent" then g:Draw(g:OpponentOf(pid), n)
        elseif eff.who == "targetPlayer" then
            local t = E.TargetsOf(g, pid, eff, ctx)[1]
            g:Draw(t and g:ControllerOf(t) or pid, n)
        else g:Draw(pid, n) end

    elseif k == "drawToMax" then
        local p = g.players[pid]
        g:Draw(pid, math.max(0, ns.MAX_HAND - #p.hand))

    elseif k == "destroy" then
        local targets = E.TargetsOf(g, pid, eff, ctx)
        for i = 1, #targets do g:DestroyCard(targets[i], { source = ctx.source }) end

    elseif k == "destroyX" then
        local n = E.Amount(g, pid, eff.n, ctx, 1)
        local list = g:LegalTargets(pid, eff.filter or "armor")
        for i = 1, math.min(n, #list) do g:DestroyCard(list[i], { source = ctx.source }) end

    elseif k == "destroyAttached" then
        local targets = E.TargetsOf(g, pid, eff, ctx)
        for i = 1, #targets do g:DestroyAttachmentsOn(targets[i]) end

    elseif k == "exhaust" then
        local targets = E.TargetsOf(g, pid, eff, ctx)
        for i = 1, #targets do
            g:Exhaust(targets[i])
            if eff.noReady then g:PreventReady(targets[i], 1) end
        end

    elseif k == "ready" then
        local targets = E.TargetsOf(g, pid, eff, ctx)
        for i = 1, #targets do g:Ready(targets[i]) end

    elseif k == "buff" then
        local b = {
            atk = eff.atk, hp = eff.hp, def = eff.def,
            untilTurn = (eff.duration == "permanent") and nil or g.turn,
            attackingOnly = eff.attackingOnly, defendingOnly = eff.defendingOnly,
            noHeal = eff.noHeal, mustAttack = eff.mustAttack,
            cantAttack = eff.cantAttack, cantProtect = eff.cantProtect,
            preventAll = eff.preventAll, untargetable = eff.untargetable,
            noPowers = eff.noPowers,
        }
        if eff.kw then b.kw = eff.kw end
        if eff.s then
            local targets = E.TargetsOf(g, pid, eff, ctx)
            for i = 1, #targets do addBuff(targets[i], b) end
        else
            local list = g:SideCards(pid, eff.side or "friendly", true)
            for i = 1, #list do
                if eff.side == "friendlyHero" and list[i].type ~= "Hero" then
                    -- nur der Held
                elseif eff.side == "friendlyChars" or eff.side == "friendlyAllies" or eff.side == "friendlyHero" then
                    addBuff(list[i], b)
                end
            end
        end

    elseif k == "debuff" then
        local targets = E.TargetsOf(g, pid, eff, ctx)
        for i = 1, #targets do
            addBuff(targets[i], { atk = -(eff.atk or 0), hp = -(eff.hp or 0), untilTurn = g.turn })
        end

    elseif k == "buffSide" then
        local b = { atk = eff.atk or 0, hp = eff.hp or 0, untilTurn = g.turn, attackingOnly = eff.attackingOnly }
        local list = g:SideCards(pid, "friendly", true)
        for i = 1, #list do
            local c = list[i]
            if sideMatch(g, pid, nil, eff.side, c) then addBuff(c, b) end
        end

    elseif k == "debuffSide" then
        local b = { atk = -(eff.atk or 0), hp = -(eff.hp or 0), untilTurn = g.turn, cantAttack = eff.cantAttack }
        local targets = g:LegalTargets(pid, "allChars")
        for i = 1, #targets do
            if sideMatch(g, pid, nil, eff.side, targets[i]) then addBuff(targets[i], b) end
        end

    elseif k == "bounce" then
        local targets = E.TargetsOf(g, pid, eff, ctx)
        for i = 1, #targets do g:Bounce(targets[i]) end

    elseif k == "bounceMany" then
        g:BounceMany(pid, eff.side or "enemyAllies", E.Amount(g, pid, eff.n, ctx, 1))

    elseif k == "discard" then
        local n = E.Amount(g, pid, eff.n, ctx, 1)
        if eff.who == "opponent" then g:DiscardCards(g:OpponentOf(pid), n)
        elseif eff.who == "targetController" then
            local t = E.TargetsOf(g, pid, eff, ctx)[1]
            g:DiscardCards(t and g:ControllerOf(t) or pid, n)
        elseif eff.who == "each" then
            g:DiscardCards(1, n); g:DiscardCards(2, n)
        else g:DiscardCards(pid, n) end

    elseif k == "mill" then
        local n = E.Amount(g, pid, eff.n, ctx, 1)
        if eff.who == "opponent" then g:Mill(g:OpponentOf(pid), n)
        elseif eff.who == "targetPlayer" then
            local t = E.TargetsOf(g, pid, eff, ctx)[1]
            g:Mill(t and g:ControllerOf(t) or pid, n)
        else g:Mill(pid, n) end

    elseif k == "prevent" then
        local targets = E.TargetsOf(g, pid, eff, ctx)
        for i = 1, #targets do
            addBuff(targets[i], {
                shield = eff.n == "all" and 999 or (tonumber(eff.n) or 1),
                whole = eff.n == "all",
                untilTurn = g.turn,
            })
        end

    elseif k == "preventSource" then
        local targets = E.TargetsOf(g, pid, eff, ctx)
        local src = targets[1]
        local hero = g.players[pid].hero
        addBuff(hero, {
            shield = tonumber(eff.n) or 0, untilTurn = g.turn,
            sourceUid = src and src.uid or nil, reflect = eff.reflect ~= nil,
        })

    elseif k == "tutor" then
        g:Tutor(pid, eff.filter or "any", E.Amount(g, pid, eff.n, ctx, 1) or 1, eff.to or "hand")

    elseif k == "gyToHand" then
        g:GYToHand(pid, eff.filter or "any")

    elseif k == "gyToPlayMax" then
        g:GYToPlayMax(pid)

    elseif k == "shuffleGY" then
        g:ShuffleGraveyard(pid)

    elseif k == "token" then
        g:CreateToken(pid, {
            name = eff.name, atk = eff.atk or 1, hp = eff.hp or 1,
            race = eff.race, unique = eff.unique, atkType = eff.atkType or "Melee",
        }, E.Amount(g, pid, eff.n, ctx, 1) or 1)

    elseif k == "revealPick" then
        g:RevealPick(pid, E.Amount(g, pid, eff.n, ctx, 1) or 1, eff.filter or "any",
            eff.to or "hand", eff.rest or "bottom", eff.opponentChooses)

    elseif k == "resourceFromDeck" then
        if not eff.ifStealth or E.HasKeyword(g, g.players[pid].hero, "Stealth") then
            g:TopDeckToResource(pid, eff.exhausted ~= false)
        end

    elseif k == "nextCardLess" then
        local p = g.players[pid]
        p.nextCardLess = p.nextCardLess or {}
        table.insert(p.nextCardLess, { amount = eff.n or 0 })
        g:Log(p.hero.name .. " zahlt fuer die naechste Karte " .. tostring(eff.n) .. " weniger.", "")

    elseif k == "noDrawTurn" then
        g.noDrawTurn = g.turn
        g:Log("In diesem Zug kann niemand Karten ziehen.", "")

    elseif k == "coldBlood" then
        g.players[pid].coldBloodTurn = g.turn
        g:Log("Kaltes Blut: Der naechste Schaden am Ally zerstoert ihn.", "")

    elseif k == "rangedReady" then
        g.players[pid].rangedReadyTurn = g.turn
        g:Log("Schnellfeuer: Fernkampf-Stoss kann die Waffe bereitmachen.", "")

    elseif k == "damageIfStealth" then
        local targets = E.TargetsOf(g, pid, eff, ctx)
        if E.HasKeyword(g, g.players[pid].hero, "Stealth") then
            for i = 1, #targets do
                g:DealDamage(targets[i], E.Amount(g, pid, eff.expr, ctx, i, targets[i]),
                    { source = ctx.source, dt = eff.dt, ability = true })
            end
        end

    elseif k == "allyStrike" then
        local attacker = E.TargetsOf(g, pid, { s = eff.s, f = "fally" }, ctx)[1]
        local victim = E.TargetsOf(g, pid, { s = eff.t, f = "eally" }, ctx)[1]
        if attacker and victim then
            g:DealDamage(victim, g:AttackPower(attacker, { attacking = true }), { source = attacker, dt = "Melee" })
        end

    elseif k == "readyBest" then
        g:ReadyBest(pid)

    elseif k == "tooga" then
        g:ToogaWatches(pid)
    end
end

function E.ApplyAll(g, pid, effects, ctx)
    if not effects then return end
    for i = 1, #effects do E.Apply(g, pid, effects[i], ctx) end
end

-- ---------------------------------------------------------------------------
-- Start-/Endzug-Ausloeser
-- ---------------------------------------------------------------------------
local function attachedHost(g, o)
    if not o.attachedTo then return nil end
    return (g:FindCard(o.attachedTo))
end

function E.StartTurn(g, pid)
    local p = g.players[pid]
    if not p then return end

    for _, owner in ipairs({ 1, 2 }) do
        local pl = g.players[owner]
        for i = 1, #pl.ongoing do
            local o = pl.ongoing[i]
            if g:IsInPlay(o) then
                local host = attachedHost(g, o)
                if host then
                    if not g:IsInPlay(host) then
                        g:DestroyCard(o, { source = o })
                    elseif owner == pid then
                        if o.id == 120 then
                            g:DealDamage(host, 1, { source = pl.hero, dt = "Shadow", ability = true })
                        elseif o.id == 121 then
                            host.counters = host.counters or {}
                            host.counters.agony = (host.counters.agony or 0) + 1
                            g:DealDamage(host, host.counters.agony, { source = pl.hero, dt = "Shadow", ability = true })
                        elseif o.id == 53 then
                            g:DealDamage(host, 1, { source = pl.hero, dt = "Fire", ability = true })
                        elseif o.id == 59 then
                            g:DealDamage(host, 2, { source = pl.hero, dt = "Fire", ability = true })
                        elseif o.id == 87 then
                            g:DealDamage(host, 1, { source = pl.hero, dt = "Shadow", ability = true })
                        elseif o.id == 95 then
                            g:DealDamage(host, 2, { source = pl.hero, dt = "Nature", ability = true })
                        elseif o.id == 146 then
                            g:DealDamage(host, 1, { source = pl.hero, dt = "Melee", ability = true })
                        elseif o.id == 94 then
                            if not g:Pay(owner, 3) then g:Exhaust(host) end
                        end
                    elseif o.id == 94 then
                        if not g:Pay(owner, 3) then g:Exhaust(host) end
                    end
                else
                    if o.id == 111 then
                        g:AoEHeal(owner, "friendly", 1, true, o)
                    elseif o.id == 116 then
                        g:AutoDamage(owner, o, 1, "Fire", "echar")
                    elseif owner == pid and o.id == 129 then
                        if not g:Pay(owner, 4) then g:DestroyCard(o, { source = o }) end
                    elseif owner == pid and o.id == 143 then
                        if #pl.hand >= 2 then g:DiscardCards(owner, 2)
                        else g:DestroyCard(o, { source = o }) end
                    end
                end
            end
        end
    end

    -- Verbündete mit Startzug-Effekt
    for _, owner in ipairs({ 1, 2 }) do
        local pl = g.players[owner]
        for i = 1, #pl.allies do
            local a = pl.allies[i]
            if a.id == 236 then
                g:Heal(a, 1, { source = a })
            elseif owner == pid and (a.id == 248 or a.id == 270) then
                if a.id == 248 then g:Heal(a, 1, { source = a })
                else g:AoEHeal(pid, "friendly", 1, true, a) end
            elseif owner == pid and a.id == 127 then
                if #pl.hand > 0 then g:DiscardCards(pid, 1)
                else g:GiveControl(a, g:OpponentOf(pid)) end
            end
        end
        if owner == pid then
            for i = 1, #pl.weapons do
                if pl.weapons[i].id == 314 then
                    g:Draw(pid, 1); g:Draw(g:OpponentOf(pid), 1)
                end
            end
            for i = 1, #pl.armors do
                local it = pl.armors[i]
                if it.id == 306 and #pl.hand >= 4 then
                    g:Heal(pl.hero, 1, { source = it })
                elseif it.id == 295 and g:Pay(pid, 1) then
                    g:Draw(pid, 1)
                end
            end
        end
        -- Bad Mojo Mask: sein Besitzer legt eine Karte ab
        for i = 1, #pl.armors do
            if pl.armors[i].id == 281 and not pl.armors[i].exhausted then
                g:DiscardCards(owner, 1)
                break
            end
        end
    end
end

function E.EndTurn(g, pid)
    local p = g.players[pid]
    if not p then return end
    local all = { p.hero }
    for i = 1, #p.allies do all[#all + 1] = p.allies[i] end
    for i = 1, #p.weapons do all[#all + 1] = p.weapons[i] end
    for i = 1, #p.armors do all[#all + 1] = p.armors[i] end
    for i = 1, #p.ongoing do all[#all + 1] = p.ongoing[i] end

    for i = 1, #all do
        local c = all[i]
        local id = c.id
        if id == 129 and g:IsInPlay(c) then
            g:AoEDamage(pid, "enemy", 1, "Fire", true, c)
        elseif id == 63 and g:IsInPlay(c) then
            g:DestroyCard(c, { source = c })
        elseif id == 249 then
            g:Ready(c)
        end
    end

    -- Effekte am Ende jedes Zuges (auch des Gegners)
    for _, owner in ipairs({ 1, 2 }) do
        local pl = g.players[owner]
        for i = 1, #pl.allies do
            local a = pl.allies[i]
            if a.id == 191 then
                g:CreateToken(owner, { name = "Dwarf Warrior", atk = 1, hp = 1, race = "Dwarf", atkType = "Melee" }, 1)
            elseif a.id == 127 and owner == pid then
                g:AoEDamage(pid, "enemy", 1, "Fire", true, a)
            end
        end
        for i = 1, #pl.ongoing do
            if pl.ongoing[i].id == 169 then g:SpiritHealer(owner) end
        end
    end
end

-- ---------------------------------------------------------------------------
-- Kampf-Ausloeser
-- ---------------------------------------------------------------------------
function E.OnStrike(g, pid, weapon)
    local p = g.players[pid]
    for i = 1, #p.ongoing do
        local o = p.ongoing[i]
        if o.id == 73 then g:Heal(p.hero, 2, { source = o })
        elseif o.id == 74 then g:Draw(pid, 1)
        elseif o.id == 119 then
            local key = "windfury_" .. tostring(weapon.uid)
            if not g.players[pid][key] and g:Pay(pid, 1) then
                g.players[pid][key] = true
                g:Ready(weapon); g:Ready(p.hero)
            end
        end
    end
    if weapon.id == 337 then
        E.AddBuff(p.hero, { shield = 3, untilTurn = g.turn + 1 })
    end
end

function E.OnCombatDamage(g, pid, source, target, dealt, ctx)
    if not source or not target or dealt <= 0 then return end
    local p = g.players[pid]
    local id = source.id
    if id == 316 or id == 258 then
        if target.type == "Hero" then g:DiscardCards(g:ControllerOf(target), 1) end
    elseif id == 317 then
        if target.type == "Hero" then g:DestroyResource(g:ControllerOf(target)) end
    elseif id == 318 then
        source.counters = source.counters or {}
        source.counters.strength = (source.counters.strength or 0) + 1
    elseif id == 320 then
        if target.type == "Hero" then
            p.cantPlayTurn = g.turn
            p.cantStrikeTurn = g.turn
        end
    elseif id == 321 then
        g:AoEDamage(pid, "enemy", 1, "Fire", true, source)
    elseif id == 328 then
        g:PreventReady(target, 1)
    elseif id == 334 then
        if target.type == "Hero" then
            local tp = g:ControllerOf(target)
            if not g:Pay(tp, 2) then
                local w = g:BestWeapon(tp)
                if w then g:DestroyCard(w, { source = source }) end
            end
        end
    elseif id == 336 then
        local key = "thrash_" .. tostring(source.uid)
        if not g.players[pid][key] then
            g.players[pid][key] = true
            g:Ready(source); g:Ready(p.hero)
        end
    elseif id == 339 then
        g:Heal(p.hero, dealt, { source = source })
    elseif id == 223 then
        if target.type == "Ally" and source.race == "Spider" then g:DestroyCard(target, { source = source }) end
    elseif id == 231 then
        if target.type == "Ally" and (target.damage or 0) > 0 then g:DestroyCard(target, { source = source }) end
    elseif id == 276 then
        if target.type == "Ally" then g:Ready(source) end
    end
    -- Fertigkeiten des Angreifers, die auf Kampfschaden reagieren
    if source.type == "Ally" and target.type == "Hero" then
        if source.id == 213 then g:Draw(pid, 1) end
    end
end

function E.OnDefend(g, pid, card, attacker)
    if not card then return end
    if card.id == 299 then
        g:AoEDamage(pid, "enemy", 1, "Fire", true, card)
    elseif card.id == 301 then
        g:Heal(card, 1, { source = card })
    elseif card.id == 204 then
        g:Heal(card, 2, { source = card })
    end
end

function E.OnEnter(g, pid, card)
    local p = g.players[pid]
    local id = card.id
    if id == 200 or id == 212 then
        g:Draw(pid, 1)
    elseif id == 257 or id == 185 then
        g:ReadyHeroAndWeapon(pid)
    elseif id == 260 then
        g:AutoDamage(pid, card, 1, "Ranged", "echar")
    elseif id == 243 then
        g:AutoDestroy(pid, "armor")
    elseif id == 251 then
        g:DiscardCards(g:OpponentOf(pid), 1)
    elseif id == 233 then
        g:GYToHand(pid, "ally")
    elseif id == 247 then
        g:AutoBounce(pid, "eall")
    elseif id == 218 then
        g:AoEHeal(pid, "friendly", 3, true, card)
    elseif id == 275 then
        local list = g:LegalTargets(pid, "equipment")
        if list[1] then g:DestroyCard(list[1], { source = card }) end
    elseif id == 293 then
        g:SearchToTop(pid, "weapon")
    elseif id == 303 then
        g:GYToHand(pid, "ability")
    end
    -- Watcher Mal'wi: reagiert auf gegnerische Allies
    local o = g.players[g:OpponentOf(pid)]
    for i = 1, #o.allies do
        if o.allies[i].id == 269 and o.allies[i] ~= card then
            g:DealDamage(card, 1, { source = o.allies[i], dt = "Ranged", ability = true })
        end
    end
end

function E.OnDeath(g, pid, card)
    local id = card.id
    if id == 225 then
        g:AoEDamage(pid, "enemy", 1, "Fire", true, card)
    elseif id == 250 then
        g:ReturnToHand(card)
    elseif id == 265 then
        local tp = g:OpponentOf(pid)
        g:DealDamage(g.players[tp].hero, #g.players[tp].hand, { source = card, dt = "Arcane" })
    end
    -- "Wenn diese Karte zerstoert wird" bei angehaengten Karten
    local atts = E.AttachmentsOn(g, card.uid)
    for i = 1, #atts do
        if atts[i].id == 120 then
            local ctrl = g:ControllerOf(card)
            if ctrl then g:DiscardCards(ctrl, 1) end
        end
    end
end

function E.OnAttack(g, pid, card)
    local id = card.id
    if id == 266 then
        g:AutoExhaust(pid, "echar")
    elseif id == 238 then
        g:AutoExhaust(pid, "armor")
    elseif id == 271 then
        local key = "windseer_" .. tostring(card.uid)
        if not g.players[pid][key] and g:Pay(pid, 1) then
            g.players[pid][key] = true
            g:Ready(card)
        end
    end
    -- Windfury Totem (118)
    local p = g.players[pid]
    for i = 1, #p.ongoing do
        if p.ongoing[i].id == 118 then
            local key = "windfury118_" .. tostring(card.uid)
            if not p[key] and g:Pay(pid, 1) then
                p[key] = true
                g:Ready(card)
            end
            break
        end
    end
    -- Donna Calister: bereitet sich, wenn ein Gegner angreift
    local o = g.players[g:OpponentOf(pid)]
    for i = 1, #o.allies do
        if o.allies[i].id == 181 then g:Ready(o.allies[i]) end
    end
end

function E.OnExhaust(g, pid, card)
    if card.id == 201 then g:AutoHeal(pid, "char", 2, card) end
end

function E.OnPlayAbility(g, pid, card)
    local p = g.players[pid]
    for i = 1, #p.ongoing do
        local o = p.ongoing[i]
        if o.id == 90 and card.school == "Holy" then g:AutoHeal(pid, "char", 2, o) end
        if o.id == 88 and card.school == "Holy" then g:DestroyCard(o, { source = o }) end
    end
    for i = 1, #p.weapons do
        local w = p.weapons[i]
        if w.id == 325 then
            local ally = g:FirstReadyAlly(pid)
            if ally then g:Exhaust(ally); g:Draw(pid, 1) end
        end
    end
end

function E.OnProtect(g, pid, protector)
    local p = g.players[pid]
    for i = 1, #p.ongoing do
        if p.ongoing[i].id == 72 then g:Heal(p.hero, 1, { source = p.ongoing[i] }) end
    end
end

function E.OnHeroDamage(g, pid, source)
    local p = g.players[pid]
    -- Kaltes Blut: Schaden am Ally zerstoert ihn
    if p.coldBloodTurn == g.turn and source and source.type == "Hero" then
        -- wird in Game:DealDamage behandelt
    end
    -- Stealth-Fertigkeiten zerstoeren sich, wenn der Held Schaden zufuegt
    for i = #p.ongoing, 1, -1 do
        local o = p.ongoing[i]
        if o.fx and o.fx.ongoing and o.fx.ongoing.selfDestroyOnHeroDamage then
            g:DestroyCard(o, { source = o })
        end
    end
end

return E
