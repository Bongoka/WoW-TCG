-- ============================================================================
-- WoW TCG - Spiel-Engine
-- Zustand, Züge, Aktionen, Kampf, Quests, Kartenbewegungen
-- ============================================================================
local ADDON, ns = ...
local E = ns.Effects
local Game = {}
ns.GameClass = Game

local MAX_HAND = ns.MAX_HAND

-- ---------------------------------------------------------------------------
-- Konstruktion
-- ---------------------------------------------------------------------------
function Game.New(deckId1, deckId2, humanPid)
    local g = setmetatable({}, { __index = Game })
    g.turn = 0
    g.active = 1
    g.phase = "setup"
    g.humanPid = humanPid or 1
    g.players = {}
    g.log = {}
    g.pending = nil
    g.gameOver = false
    g.winner = nil
    g.uidCounter = 0
    g.destroyWatchers = {}
    g.delayed = {}
    g.combat = nil
    g.started = false
    g.onChange = nil
    g.onLog = nil
    g.onGameOver = nil
    g.mulliganDone = { false, false }

    local d1 = ns.DeckById(deckId1) or ns.Decks[1]
    local d2 = ns.DeckById(deckId2) or ns.Decks[2] or ns.Decks[1]
    g.players[1] = g:NewPlayer(1, d1)
    g.players[2] = g:NewPlayer(2, d2)
    g:DealOpeningHands()
    g.phase = "mulligan"
    g:Log("Partie: " .. g.players[1].hero.name .. " gegen " .. g.players[2].hero.name, "turn")
    return g
end

function Game:NewPlayer(pid, deck)
    local heroDef = ns.Cards[deck.hero]
    local p = {
        id = pid,
        deckId = deck.id,
        deckName = deck.name,
        class = deck.class,
        faction = deck.faction,
        talent = heroDef and heroDef.talent or nil,
        hero = self:NewInstance(heroDef, pid),
        deck = {},
        hand = {},
        graveyard = {},
        removed = {},
        allies = {},
        resources = {},
        weapons = {},
        armors = {},
        ongoing = {},
        playedResource = false,
        mulliganed = false,
        decked = false,
        heroDamagedByAllyThisTurn = false,
        stats = { played = 0, damage = 0, healed = 0 },
    }
    p.hero.owner = pid
    for i = 1, #deck.cards do p.deck[i] = deck.cards[i] end
    ns.Shuffle(p.deck)
    return p
end

function Game:NextUid(cardId)
    self.uidCounter = (self.uidCounter or 0) + 1
    return "c" .. tostring(self.uidCounter) .. "_" .. tostring(cardId or 0)
end

function Game:NewInstance(cardDef, owner)
    if not cardDef then return nil end
    local inst = {}
    for k, v in pairs(cardDef) do inst[k] = v end
    inst.uid = self:NextUid(cardDef.id)
    inst.owner = owner
    inst.damage = 0
    inst.exhausted = false
    inst.joinedTurn = self.turn
    inst.buffs = {}
    inst.counters = {}
    return inst
end

-- ---------------------------------------------------------------------------
-- Basis-Abfragen
-- ---------------------------------------------------------------------------
function Game:OpponentOf(pid)
    return pid == 1 and 2 or 1
end

function Game:ControllerOf(card)
    if not card then return nil end
    for _, pid in ipairs({ 1, 2 }) do
        local p = self.players[pid]
        if p then
            if p.hero == card then return pid end
            for i = 1, #p.allies do if p.allies[i] == card then return pid end end
            for i = 1, #p.weapons do if p.weapons[i] == card then return pid end end
            for i = 1, #p.armors do if p.armors[i] == card then return pid end end
            for i = 1, #p.ongoing do if p.ongoing[i] == card then return pid end end
            for i = 1, #p.resources do if p.resources[i].card == card then return pid end end
        end
    end
    return nil
end

function Game:FindCard(uid)
    if not uid then return nil end
    for _, pid in ipairs({ 1, 2 }) do
        local p = self.players[pid]
        if p then
            if p.hero and p.hero.uid == uid then return p.hero, pid, "hero" end
            local zones = {
                { p.allies, "ally" }, { p.weapons, "weapon" }, { p.armors, "armor" },
                { p.ongoing, "ongoing" }, { p.hand, "hand" }, { p.graveyard, "graveyard" },
                { p.removed, "removed" },
            }
            for z = 1, #zones do
                local list = zones[z][1]
                for i = 1, #list do
                    if list[i].uid == uid then return list[i], pid, zones[z][2] end
                end
            end
            for i = 1, #p.resources do
                if p.resources[i].card and p.resources[i].card.uid == uid then
                    return p.resources[i].card, pid, "resource"
                end
            end
        end
    end
    return nil
end

function Game:IsInPlay(card)
    if not card then return false end
    local pid, zone = nil, nil
    for _, p in ipairs({ 1, 2 }) do
        local pl = self.players[p]
        if pl then
            if pl.hero == card then return true end
            for i = 1, #pl.allies do if pl.allies[i] == card then return true end end
            for i = 1, #pl.weapons do if pl.weapons[i] == card then return true end end
            for i = 1, #pl.armors do if pl.armors[i] == card then return true end end
            for i = 1, #pl.ongoing do if pl.ongoing[i] == card then return true end end
            for i = 1, #pl.resources do if pl.resources[i].card == card then return true end end
        end
    end
    return false
end

function Game:IsAllyInPlay(card)
    local pid = self:ControllerOf(card)
    if not pid then return false end
    local p = self.players[pid]
    for i = 1, #p.allies do if p.allies[i] == card then return true end end
    return false
end

function Game:IsAttacking(card)
    return self.combat and self.combat.attacker == card
end

function Game:IsDefending(card)
    return self.combat and self.combat.defender == card
end

function Game:SideCards(pid, side, includeHero)
    local out = {}
    local function add(pl)
        if not pl then return end
        if includeHero ~= false and pl.hero then out[#out + 1] = pl.hero end
        for i = 1, #pl.allies do out[#out + 1] = pl.allies[i] end
    end
    if side == "friendly" then add(self.players[pid])
    elseif side == "enemy" then add(self.players[self:OpponentOf(pid)])
    else add(self.players[1]); add(self.players[2]) end
    return out
end

function Game:FaceDownResources(pid)
    local n = 0
    local p = self.players[pid]
    for i = 1, #p.resources do if not p.resources[i].faceUp then n = n + 1 end end
    return n
end

function Game:ReadyResources(pid)
    local n = 0
    local p = self.players[pid]
    for i = 1, #p.resources do if not p.resources[i].exhausted then n = n + 1 end end
    return n
end

function Game:ResourceCount(pid)
    return #self.players[pid].resources
end

function Game:HandSize(pid)
    return #self.players[pid].hand
end

-- ---------------------------------------------------------------------------
-- Log / UI
-- ---------------------------------------------------------------------------
function Game:Log(text, kind)
    local entry = { text = text, kind = kind or "", turn = self.turn, pid = self.active }
    self.log[#self.log + 1] = entry
    if #self.log > 300 then table.remove(self.log, 1) end
    if self.onLog then
        local ok, err = pcall(self.onLog, entry, self)
        if not ok then ns.Print("Log-Fehler: " .. tostring(err)) end
    end
end

function Game:Changed()
    if self.onChange then
        local ok, err = pcall(self.onChange, self)
        if not ok then ns.Print("UI-Fehler: " .. tostring(err)) end
    end
end

-- ---------------------------------------------------------------------------
-- Start / Mulligan / Züge
-- ---------------------------------------------------------------------------
function Game:DealOpeningHands()
    for _, pid in ipairs({ 1, 2 }) do
        self:Draw(pid, ns.START_HAND, true)
    end
end

function Game:Mulligan(pid)
    local p = self.players[pid]
    if not p or p.mulliganed then return false end
    p.mulliganed = true
    self.mulliganDone[pid] = true
    for i = 1, #p.hand do p.deck[#p.deck + 1] = p.hand[i].id end
    p.hand = {}
    ns.Shuffle(p.deck)
    self:Draw(pid, ns.START_HAND, true)
    self:Log("Mulligan: " .. p.hero.name .. " mischt seine Starthand neu.", "turn")
    self:Changed()
    return true
end

function Game:BeginMatch()
    if self.started then return end
    self.started = true
    self.turn = 0
    self.active = 1
    self.phase = "start"
    self:Log("== Spielbeginn ==", "turn")
    self:BeginTurn(1)
end

function Game:BeginTurn(pid)
    self.turn = self.turn + 1
    if self.turn > (ns.TURN_LIMIT or 50) then
        self:TimeLimit()
        return
    end
    self.active = pid
    self.phase = "start"
    local p = self.players[pid]
    p.playedResource = false
    p.heroDamagedByAllyThisTurn = false
    p.coldBloodTurn = nil
    p.rangedReadyTurn = nil
    p.cantPlayTurn = nil
    p.cantStrikeTurn = nil
    p.aiSkip = {}
    p.aiSkipAtk = {}
    for k in pairs(p) do
        if type(k) == "string" and (k:find("^windfury_") or k:find("^thrash_") or k:find("^windseer_")) then
            p[k] = nil
        end
    end

    self:Log("== Zug " .. self.turn .. ": " .. p.hero.name .. " ==", "turn")

    -- Bereit-Phase
    local function readyCard(c)
        if not c then return end
        if (c.noReadyTurns or 0) > 0 then
            c.noReadyTurns = c.noReadyTurns - 1
            self:Log(c.name .. " bleibt erschöpft.", "")
            return
        end
        if E.CannotReady(self, c) then return end
        if c.exhausted then c.exhausted = false end
    end
    readyCard(p.hero)
    for i = 1, #p.allies do readyCard(p.allies[i]) end
    for i = 1, #p.weapons do readyCard(p.weapons[i]) end
    for i = 1, #p.armors do readyCard(p.armors[i]) end
    for i = 1, #p.ongoing do readyCard(p.ongoing[i]) end

    -- Ressourcen bereit machen
    for i = 1, #p.resources do
        local r = p.resources[i]
        if r.exhausted and not E.CannotReady(self, r.card) then r.exhausted = false end
    end

    -- Temporäre Modifikatoren aufräumen
    for _, pl in ipairs({ self.players[1], self.players[2] }) do
        local lists = { pl.allies, pl.weapons, pl.armors, pl.ongoing, { pl.hero } }
        for _, list in ipairs(lists) do
            for i = 1, #list do
                local c = list[i]
                if c.buffs then
                    local keep = {}
                    for j = 1, #c.buffs do
                        local b = c.buffs[j]
                        if not b.untilTurn or b.untilTurn >= self.turn then keep[#keep + 1] = b end
                    end
                    c.buffs = keep
                end
            end
        end
    end

    -- Start-of-Turn-Auslöser
    E.StartTurn(self, pid)
    self:RunDelayed(pid, "nextStart")

    -- Ziehen (erster Zug des Startspielers ausgenommen)
    if not (self.turn == 1) then
        self:Draw(pid, 1)
    end

    self.phase = "main"
    self:Log(p.hero.name .. " ist am Zug.", "")
    self:CheckState()
    self:Changed()
end

-- Ende des Zuges (Aktion)
function Game:EndTurnAction(pid)
    if self.gameOver then return false, "Das Spiel ist vorbei." end
    if self.active ~= pid then return false, "Du bist nicht am Zug." end
    if self.phase ~= "main" then return false, "Gerade keine Aktionsphase." end
    if self.pending then return false, "Bitte zuerst die offene Entscheidung treffen." end

    local p = self.players[pid]
    self.phase = "end"
    E.EndTurn(self, pid)
    self:RunDelayed(pid, "nextEnd")

    -- Handlimit
    local over = #p.hand - MAX_HAND
    if over > 0 then
        self:DiscardCards(pid, over)
        self:Log("Handlimit: " .. p.hero.name .. " legt " .. over .. " Karte(n) ab.", "")
    end

    self:CheckState()
    if self.gameOver then
        self:Changed()
        return true
    end

    self:BeginTurn(self:OpponentOf(pid))
    return true
end

-- ---------------------------------------------------------------------------
-- Zustandsprüfung
-- ---------------------------------------------------------------------------
function Game:CheckState()
    if self.gameOver then return end
    for _, pid in ipairs({ 1, 2 }) do
        local p = self.players[pid]
        -- Verbündete mit tödlichem Schaden
        local dead = {}
        for i = 1, #p.allies do
            local a = p.allies[i]
            if (a.damage or 0) >= self:MaxHP(a) then dead[#dead + 1] = a end
        end
        for i = 1, #dead do
            self:Log("💀 " .. dead[i].name .. " wird zerstört.", "hit")
            self:DestroyCard(dead[i], { cause = "damage", noCheck = true })
        end
        -- Held
        if not self.gameOver then
            if p.decked then
                self:Lose(pid, "Deck leer")
            elseif (p.hero.damage or 0) >= self:MaxHP(p.hero) and not self:HeroIndestructible(pid) then
                self:Lose(pid, p.hero.name .. " ist gefallen")
            end
        end
    end
    if self.gameOver then
        self:Changed()   -- Spielende hat Game:Lose schon gemeldet (onGameOver nicht doppelt aufrufen)
    end
end

function Game:Lose(pid, reason)
    if self.gameOver then return end
    self.gameOver = true
    self.winner = self:OpponentOf(pid)
    self.phase = "over"
    self:Log("☠ " .. self.players[pid].hero.name .. " verliert (" .. tostring(reason) .. ").", "hit")
    self:Log("🏆 " .. self.players[self.winner].hero.name .. " gewinnt!", "turn")
    if self.onGameOver then self.onGameOver(self) end
end

function Game:TimeLimit()
    if self.gameOver then return end
    local p1, p2 = self.players[1], self.players[2]
    local h1 = self:MaxHP(p1.hero) - (p1.hero.damage or 0)
    local h2 = self:MaxHP(p2.hero) - (p2.hero.damage or 0)
    self.gameOver = true
    self.phase = "over"
    if h1 == h2 then
        self.winner = nil
        self:Log("⏱ Zeitlimit erreicht - Unentschieden (" .. h1 .. " zu " .. h2 .. ").", "turn")
    else
        local loser = (h1 < h2) and 1 or 2
        self.winner = self:OpponentOf(loser)
        self:Log("⏱ Zeitlimit erreicht - " .. self.players[loser].hero.name .. " hat weniger Leben.", "hit")
        self:Log("🏆 " .. self.players[self.winner].hero.name .. " gewinnt!", "turn")
    end
    if self.onGameOver then self.onGameOver(self) end
    self:Changed()
end

function Game:WinnerName()
    if not self.winner then return "Unentschieden" end
    return self.players[self.winner].hero.name
end

function Game:HeroIndestructible(pid)
    local p = self.players[pid]
    for i = 1, #p.allies do
        if p.allies[i].id == 263 then return true end
    end
    return false
end

-- ---------------------------------------------------------------------------
-- Karten ziehen / ablegen / Friedhof
-- ---------------------------------------------------------------------------
function Game:Draw(pid, n, silent)
    local p = self.players[pid]
    local got = 0
    if self.noDrawTurn == self.turn then
        if not silent then self:Log("Kartenziehen ist in diesem Zug gesperrt.", "") end
        return 0
    end
    for _ = 1, n or 1 do
        if #p.deck == 0 then
            p.decked = true
            p.deckEmpty = true
            return got
        end
        local id = table.remove(p.deck)
        local inst = self:NewInstance(ns.Cards[id], pid)
        if inst then
            p.hand[#p.hand + 1] = inst
            got = got + 1
        end
    end
    if not silent and got > 0 then
        self:Log(p.hero.name .. " zieht " .. got .. " Karte(n).", "")
    end
    return got
end

function Game:CardValue(card)
    if not card then return 0 end
    local v = (card.cost or 0) * 10
    if card.type == "Ability" then v = v + 4 end
    if card.type == "Ally" then v = v + 6 + (card.atk or 0) + (card.hp or 0) end
    if card.type == "Weapon" then v = v + 5 end
    if card.type == "Quest" then v = v + 2 end
    return v
end

function Game:DiscardCards(pid, n)
    local p = self.players[pid]
    local discarded = 0
    for _ = 1, n or 1 do
        if #p.hand == 0 then break end
        local best, bestIdx = nil, nil
        for i = 1, #p.hand do
            local v = self:CardValue(p.hand[i])
            if not best or v < best then best, bestIdx = v, i end
        end
        local c = table.remove(p.hand, bestIdx)
        c.damage = 0
        c.exhausted = false
        c.buffs = {}
        p.graveyard[#p.graveyard + 1] = c
        discarded = discarded + 1
        self:Log(p.hero.name .. " legt " .. c.name .. " ab.", "")
    end
    return discarded >= (n or 1)
end

function Game:Mill(pid, n)
    local p = self.players[pid]
    for _ = 1, n or 1 do
        if #p.deck == 0 then p.decked = true; break end
        local id = table.remove(p.deck)
        local inst = self:NewInstance(ns.Cards[id], pid)
        if inst then p.graveyard[#p.graveyard + 1] = inst end
    end
    self:Log(p.hero.name .. " legt die obersten Karten seines Decks in den Friedhof.", "")
end

function Game:ReturnToHand(card)
    local found, pid, zone = self:FindCard(card.uid)
    if not found or not pid then return false end
    if zone == "hand" or zone == "hero" then return false end
    if zone == "ally" then ns.RemoveValue(self.players[pid].allies, card)
    elseif zone == "weapon" then ns.RemoveValue(self.players[pid].weapons, card)
    elseif zone == "armor" then ns.RemoveValue(self.players[pid].armors, card)
    elseif zone == "ongoing" then ns.RemoveValue(self.players[pid].ongoing, card)
    elseif zone == "graveyard" then ns.RemoveValue(self.players[pid].graveyard, card)
    end
    self:DestroyAttachmentsOn(card)
    card.damage = 0
    card.exhausted = false
    card.buffs = {}
    card.attachedTo = nil
    card.noReadyTurns = nil
    if card.isToken then return true end
    local owner = self.players[card.owner or pid] or self.players[pid]
    owner.hand[#owner.hand + 1] = card
    return true
end

function Game:Bounce(card)
    if not card or card.type == "Hero" then return false end
    local ok = self:ReturnToHand(card)
    if ok then self:Log(card.name .. " kehrt auf die Hand zurück.", "") end
    return ok
end

-- ---------------------------------------------------------------------------
-- Statistik / Schlüsselwörter
-- ---------------------------------------------------------------------------
function Game:DynamicStat(card, stat)
    local pid = self:ControllerOf(card)
    if not pid or not card then return 0 end
    local p = self.players[pid]
    local o = self.players[self:OpponentOf(pid)]
    if card.id == 230 or card.id == 273 then
        return stat == "atk" and (card.damage or 0) or 0                              -- Mal'wani / Ya'mon
    end
    if card.id == 219 then return stat == "atk" and #p.allies or 0 end                  -- Tracker Gallen
    if card.id == 189 then                                                              -- Kailis
        if #p.allies >= 4 then return 2 end
        return 0
    end
    if card.id == 241 then                                                              -- Halnar
        if #p.allies == 1 then return 3 end
        return 0
    end
    if card.id == 254 then                                                              -- Orgrimmar Grunts
        if stat ~= "atk" then return 0 end
        local n = 0
        for i = 1, #p.allies do
            if p.allies[i] ~= card and p.allies[i].id == 254 then n = n + 1 end
        end
        return n
    end
    if card.id == 188 then                                                              -- Ironforge Guards
        if stat ~= "hp" then return 0 end
        local n = 0
        for i = 1, #p.allies do
            if p.allies[i] ~= card and p.allies[i].id == 188 then n = n + 1 end
        end
        return n
    end
    if card.id == 261 then                                                              -- Tewa
        local n = self:FaceDownResources(pid)
        return n
    end
    if card.id == 226 and stat == "atk" then                                            -- Bala
        if self.combat and self.combat.attacker == card and self.combat.defender and self.combat.defender.exhausted then
            return 3
        end
        return 0
    end
    return 0
end

function Game:MaxHP(card)
    if not card then return 0 end
    local base = card.hp or 0
    if card.type == "Hero" then base = card.hp or 26 end
    local bonus = E.StatBonus(self, card, "hp") + self:DynamicStat(card, "hp")
    return math.max(0, base + bonus)
end

function Game:AttackPower(card, ctx)
    if not card then return 0 end
    local base = 0
    if card.type ~= "Hero" then base = card.atk or 0 end
    local bonus = E.StatBonus(self, card, "atk") + self:DynamicStat(card, "atk")
    local v = base + bonus
    if ctx and ctx.weapon and card.type == "Hero" then v = v + self:WeaponAtk(ctx.weapon) end
    return math.max(0, v)
end

function Game:Defense(card)
    if not card then return 0 end
    local base = card.def or 0
    return math.max(0, base + E.StatBonus(self, card, "def"))
end

function Game:WeaponAtk(weapon, ctx)
    if not weapon then return 0 end
    local base = weapon.atk or 0
    local v = base + E.StatBonus(self, weapon, "atk")
    if weapon.counters and weapon.counters.strength then v = v + weapon.counters.strength end
    if weapon.id == 315 and ctx and ctx.target and ctx.target.exhausted then v = v + 2 end
    if weapon.id == 326 and ctx and ctx.target and (ctx.target.damage or 0) > 0 then v = v + 2 end
    return math.max(0, v)
end

function Game:StrikeCost(weapon)
    if not weapon then return 0 end
    local c = weapon.strike or 0
    local pid = self:ControllerOf(weapon)
    if pid then
        local p = self.players[pid]
        for i = 1, #p.armors do
            if p.armors[i].id == 286 and not p.armors[i].exhausted then c = c - 1; break end
        end
    end
    return math.max(0, c)
end

function Game:BestWeaponAtk(pid, slot)
    local best = 0
    local p = self.players[pid]
    if not p then return 0 end
    for i = 1, #p.weapons do
        local w = p.weapons[i]
        local ok = true
        if slot == "Dagger" then ok = (w.name:lower():find("dagger") ~= nil) or w.id == 320 or w.id == 326 end
        if slot == "Melee" then ok = (w.slot == "Melee") end
        if ok then
            local v = self:WeaponAtk(w)
            if v > best then best = v end
        end
    end
    return best
end

function Game:BestWeapon(pid)
    local p = self.players[pid]
    local best, bestV = nil, -1
    if not p then return nil end
    for i = 1, #p.weapons do
        local v = self:WeaponAtk(p.weapons[i])
        if v > bestV then best, bestV = p.weapons[i], v end
    end
    return best
end

function Game:HasForm(pid, form)
    local p = self.players[pid]
    if not p then return false end
    for i = 1, #p.ongoing do
        local o = p.ongoing[i]
        if form == "bear" and o.bearForm then return true end
        if form == "cat" and o.catForm then return true end
    end
    for i = 1, #p.ongoing do
        if p.ongoing[i].id == 18 or p.ongoing[i].id == 17 or p.ongoing[i].id == 25 then
            if form == "bear" then return true end
        end
    end
    return false
end

function Game:HasAuraKeywordFor(pid, kind)
    local p = self.players[pid]
    if not p then return false end
    if kind == "heroProtector" then
        for i = 1, #p.allies do
            if p.allies[i].id == 220 then return true end
        end
        for i = 1, #p.ongoing do
            local id = p.ongoing[i].id
            if id == 72 or id == 139 or id == 148 or id == 115 then return true end
        end
    elseif kind == "heroElusive" then
        for i = 1, #p.allies do
            if p.allies[i].id == 215 then return true end
        end
    end
    return false
end

function Game:HasKeyword(card, kw)
    return E.HasKeyword(self, card, kw)
end

-- ---------------------------------------------------------------------------
-- Bezahlen
-- ---------------------------------------------------------------------------
function Game:Pay(pid, n)
    if not n or n <= 0 then return true end
    local p = self.players[pid]
    if self:ReadyResources(pid) < n then return false end
    local paid = 0
    -- Erst verdeckte, dann offene Quests
    for i = 1, #p.resources do
        local r = p.resources[i]
        if not r.exhausted and not r.faceUp and paid < n then r.exhausted = true; paid = paid + 1 end
    end
    for i = 1, #p.resources do
        local r = p.resources[i]
        if not r.exhausted and paid < n then r.exhausted = true; paid = paid + 1 end
    end
    return paid >= n
end

function Game:PlayCost(pid, card, x)
    if not card then return 0 end
    local p = self.players[pid]
    local cost = (card.cost or 0) + ((card.xCost and (x or 0)) or 0)
    -- Nature's Swiftness (wird erst beim tatsächlichen Ausspielen verbraucht)
    for i = 1, #(p.nextCardLess or {}) do
        local m = p.nextCardLess[i]
        if not m.used then cost = cost - (m.amount or 0) end
    end
    -- Elemental Focus: Elemental-Fähigkeiten (1) weniger, min (1)
    for i = 1, #p.ongoing do
        local o = p.ongoing[i]
        if o.id == 108 and card.type == "Ability" and card.school == "Elemental" then
            cost = math.max(1, cost - 1)
        end
    end
    return math.max(0, cost)
end

function Game:UseCostReduction(pid)
    local p = self.players[pid]
    if not p or not p.nextCardLess then return end
    for i = #p.nextCardLess, 1, -1 do
        table.remove(p.nextCardLess, i)
    end
end

-- ---------------------------------------------------------------------------
-- Spielbarkeit / Ziele
-- ---------------------------------------------------------------------------
function Game:MatchesRequirement(card, p)
    if card.allowedClasses and #card.allowedClasses > 0 then
        local ok = false
        for i = 1, #card.allowedClasses do if card.allowedClasses[i] == p.class then ok = true end end
        if not ok then return false, "Klasse passt nicht" end
    end
    if card.allowedFactions and #card.allowedFactions > 0 then
        local ok = false
        for i = 1, #card.allowedFactions do if card.allowedFactions[i] == p.faction then ok = true end end
        if not ok then return false, "Fraktion passt nicht" end
    end
    if card.talentReq and card.talentReq ~= p.talent then
        return false, card.talentReq .. " erforderlich"
    end
    if card.raceReq and card.raceReq ~= p.hero.race then
        return false, card.raceReq .. " erforderlich"
    end
    if card.factionReq and card.factionReq ~= p.faction then
        return false, card.factionReq .. " erforderlich"
    end
    return true
end

function Game:MatchesFilter(card, filter, pid)
    if not card then return false end
    local ctrl = self:ControllerOf(card)
    if not ctrl then return false end
    local enemy = ctrl ~= pid
    if E.CannotBeTargeted(self, card, pid) then return false end
    local isChar = E.IsAttr(card)
    local isAllyCard = E.IsAlly(card)
    if filter == "char" then return isChar
    elseif filter == "fchar" then return isChar and not enemy
    elseif filter == "echar" then return isChar and enemy
    elseif filter == "ally" then return isAllyCard
    elseif filter == "fally" then return isAllyCard and not enemy
    elseif filter == "eally" then return isAllyCard and enemy
    elseif filter == "fpet" then return isAllyCard and not enemy and (card.isPet or (card.limitTags and card.limitTags.Pet))
    elseif filter == "pet" then return isAllyCard and (card.isPet or (card.limitTags and card.limitTags.Pet))
    elseif filter == "hero" then return card.type == "Hero"
    elseif filter == "fhero" then return card.type == "Hero" and not enemy
    elseif filter == "ehero" then return card.type == "Hero" and enemy
    elseif filter == "exhaustedChar" then return isChar and card.exhausted
    elseif filter == "exhaustedAlly" then return isAllyCard and card.exhausted
    elseif filter == "damagedAlly" then return isAllyCard and (card.damage or 0) > 0
    elseif filter == "fdamagedChar" then return isChar and not enemy and (card.damage or 0) > 0
    elseif filter == "ability" then return card.type == "Ability"
    elseif filter == "equipment" then return E.IsEquipment(card)
    elseif filter == "weapon" then return card.type == "Weapon"
    elseif filter == "armor" then return card.type == "Armor"
    elseif filter == "fmeleeWeapon" then return card.type == "Weapon" and not enemy and card.slot == "Melee"
    elseif filter == "frangedWeapon" then return card.type == "Weapon" and not enemy and card.slot == "Ranged"
    elseif filter == "fweapon" then return card.type == "Weapon" and not enemy
    elseif filter == "resource" then return self:IsResource(card)
    elseif filter == "quest" then return self:IsQuestResource(card)
    end
    return false
end

function Game:IsResource(card)
    for _, pid in ipairs({ 1, 2 }) do
        local p = self.players[pid]
        for i = 1, #p.resources do if p.resources[i].card == card then return true end end
    end
    return false
end

function Game:IsQuestResource(card)
    for _, pid in ipairs({ 1, 2 }) do
        local p = self.players[pid]
        for i = 1, #p.resources do
            local r = p.resources[i]
            if r.card == card and r.faceUp and card.type == "Quest" then return true end
        end
    end
    return false
end

function Game:LegalTargets(pid, filter)
    local out = {}
    -- Karten im Spiel
    for _, p in ipairs({ 1, 2 }) do
        local pl = self.players[p]
        if pl then
            local lists = { { pl.hero }, pl.allies, pl.weapons, pl.armors, pl.ongoing }
            for _, list in ipairs(lists) do
                for i = 1, #list do
                    local c = list[i]
                    if self:MatchesFilter(c, filter, pid) then out[#out + 1] = c end
                end
            end
            if filter == "resource" or filter == "quest" then
                for i = 1, #pl.resources do
                    local c = pl.resources[i].card
                    if self:MatchesFilter(c, filter, pid) then out[#out + 1] = c end
                end
            end
        end
    end
    return out
end

function Game:CanPlay(pid, card, x)
    if self.gameOver then return false, "Das Spiel ist vorbei." end
    if not card then return false, "Keine Karte." end
    if card.type == "Quest" or card.type == "Hero" or card.type == "Location" then
        return false, "Diese Karte kann nicht gespielt werden."
    end
    if card.fx and card.fx.unsupported then return false, "Diese Karte ist noch nicht umgesetzt." end
    if card.fx and card.fx.noPlay then return false, "Diese Karte kann nicht gespielt werden." end
    if self.players[pid].cantPlayTurn == self.turn then
        return false, "Du kannst in diesem Zug keine Karten spielen."
    end
    local ok, req = self:MatchesRequirement(card, self.players[pid])
    if not ok then return false, req end
    local cost = self:PlayCost(pid, card, x or 0)
    if self:ReadyResources(pid) < cost then return false, "Nicht genug Ressourcen (" .. cost .. ")." end
    if card.fx and card.fx.playCond then
        local c = card.fx.playCond
        if c == "oppTurn" and self.active == pid then return false, "Nur im gegnerischen Zug." end
        if c == "yourTurn" and self.active ~= pid then return false, "Nur in deinem Zug." end
        if c == "heroStealth" and not E.HasKeyword(self, self.players[pid].hero, "Stealth") then return false, "Stealth erforderlich." end
    end
    -- Ausrüstungsplätze / Limits
    if card.type == "Weapon" or card.type == "Armor" or card.type == "Item" then
        local reason = self:SlotReason(pid, card)
        if reason then return false, reason end
    end
    if card.type == "Ally" then
        local reason = self:AllyLimitReason(pid, card)
        if reason then return false, reason end
    end
    -- Zusatzkosten
    if card.fx and card.fx.costs then
        for i = 1, #card.fx.costs do
            local c = card.fx.costs[i]
            if c.k == "sacrifice" then
                local list = self:LegalTargets(pid, c.f or "fally")
                if #list == 0 then return false, "Kein gültiges Opfer." end
            elseif c.k == "discard" then
                if #self.players[pid].hand < (c.n or 1) then return false, "Nicht genug Karten auf der Hand." end
            elseif c.k == "pay" then
                if self:ReadyResources(pid) < cost + (c.n or 0) then return false, "Nicht genug Ressourcen." end
            end
        end
    end
    -- Ziele
    if card.fx and card.fx.targets then
        for i = 1, #card.fx.targets do
            local slot = card.fx.targets[i]
            local mn = slot.min or 1
            if mn > 0 then
                local list = self:LegalTargets(pid, slot.f)
                if #list < mn then return false, "Kein gültiges Ziel." end
            end
        end
    end
    return true, ""
end

function Game:SlotReason(pid, card)
    local p = self.players[pid]
    local tag = card.slot or card.type
    local lim = 1
    if card.limitTags then
        for t, n in pairs(card.limitTags) do
            tag = t
            lim = n
        end
    end
    local count = 0
    local lists = { p.weapons, p.armors, p.ongoing }
    for _, list in ipairs(lists) do
        for i = 1, #list do
            local c = list[i]
            if c.limitTags then
                for t in pairs(c.limitTags) do if t == tag then count = count + 1 end end
            elseif c.slot == tag then
                count = count + 1
            end
        end
    end
    if count >= lim then return tag .. "-Platz belegt (" .. lim .. ")." end
    return nil
end

function Game:AllyLimitReason(pid, card)
    local p = self.players[pid]
    if card.unique or (card.limitTags and card.limitTags.Unique) then
        for _, pl in ipairs({ 1, 2 }) do
            local list = self.players[pl].allies
            for i = 1, #list do
                if list[i].name == card.name then return "Unique: " .. card.name .. " ist bereits im Spiel." end
            end
        end
    end
    if card.limitTags then
        for t, lim in pairs(card.limitTags) do
            if t ~= "Unique" then
                local count = 0
                for i = 1, #p.allies do
                    local c = p.allies[i]
                    if c.limitTags and c.limitTags[t] then count = count + 1 end
                end
                if count >= lim then return t .. "-Limit (" .. lim .. ") erreicht." end
            end
        end
    end
    return nil
end

-- ---------------------------------------------------------------------------
-- Aktionen: Ressource legen
-- ---------------------------------------------------------------------------
function Game:PlaceResource(pid, handIndex, faceUp)
    if self.gameOver then return false, "Das Spiel ist vorbei." end
    if self.active ~= pid then return false, "Du bist nicht am Zug." end
    if self.phase ~= "main" then return false, "Ressourcen nur in der Aktionsphase." end
    if self.pending then return false, "Bitte zuerst die offene Entscheidung treffen." end
    local p = self.players[pid]
    if p.playedResource then return false, "Du hast in diesem Zug schon eine Ressource gelegt." end
    local card = p.hand[handIndex]
    if not card then return false, "Karte nicht auf der Hand." end
    if faceUp and card.type ~= "Quest" then return false, "Nur Quests dürfen offen gelegt werden." end
    table.remove(p.hand, handIndex)
    p.resources[#p.resources + 1] = { card = card, faceUp = faceUp and true or false, exhausted = false }
    p.playedResource = true
    self:Log(p.hero.name .. " legt " .. (faceUp and card.name or "eine Ressource") .. " als Ressource.", "")
    self:CheckState()
    self:Changed()
    return true
end

-- ---------------------------------------------------------------------------
-- Aktionen: Quest abschließen
-- ---------------------------------------------------------------------------
function Game:QuestCondition(pid, res)
    local card = res.card
    local p = self.players[pid]
    local cond = card.fx and card.fx.condition
    if not cond then return true end
    if cond == "yourTurn" then return self.active == pid
    elseif cond == "oppTurn" then
        -- Vereinfachung v1: Auch im eigenen Zug erlaubt (kein Prioritätsfenster).
        return true
    elseif cond == "alliesGE4" then return #p.allies >= 4
    elseif cond == "oppAlliesGT" then return #self.players[self:OpponentOf(pid)].allies > #p.allies
    elseif cond == "oppHeroDamagedByAlly" then return p.heroDamagedByAllyThisTurn
    elseif cond == "heroStealth" then return E.HasKeyword(self, p.hero, "Stealth")
    end
    return true
end

function Game:CanCompleteQuest(pid, resIndex)
    if self.gameOver then return false, "Das Spiel ist vorbei." end
    if self.active ~= pid then return false, "Du bist nicht am Zug." end
    if self.phase ~= "main" then return false, "Quests nur in der Aktionsphase." end
    local p = self.players[pid]
    local res = p.resources[resIndex]
    if not res or not res.faceUp or not res.card or res.card.type ~= "Quest" then
        return false, "Keine offene Quest."
    end
    if not self:QuestCondition(pid, res) then return false, "Bedingung nicht erfüllt." end
    local card = res.card
    local cost = card.questCost or 0
    if self:ReadyResources(pid) < cost then return false, "Nicht genug Ressourcen (" .. cost .. ")." end
    if card.fx and card.fx.questCosts then
        for i = 1, #card.fx.questCosts do
            local c = card.fx.questCosts[i]
            if c.k == "exileGYAllies" then
                if #p.graveyard < (c.n or 1) then return false, "Nicht genug Allies im Friedhof." end
                local n = 0
                for j = 1, #p.graveyard do if p.graveyard[j].type == "Ally" then n = n + 1 end end
                if n < (c.n or 1) then return false, "Nicht genug Allies im Friedhof." end
            elseif c.k == "exhaustAllies" then
                local ready = 0
                for j = 1, #p.allies do if not p.allies[j].exhausted then ready = ready + 1 end end
                if ready < (c.n or 1) then return false, "Nicht genug bereite Allies." end
            end
        end
    end
    return true, ""
end

function Game:CompleteQuest(pid, resIndex, targets)
    local ok, err = self:CanCompleteQuest(pid, resIndex)
    if not ok then return false, err end
    local p = self.players[pid]
    local res = p.resources[resIndex]
    local card = res.card

    -- Zusatzkosten
    if card.fx and card.fx.questCosts then
        for i = 1, #card.fx.questCosts do
            local c = card.fx.questCosts[i]
            if c.k == "exileGYAllies" then
                self:ExileFromGraveyard(pid, "Ally", c.n or 1)
            elseif c.k == "exhaustAllies" then
                local n = c.n or 1
                for j = 1, #p.allies do
                    if n <= 0 then break end
                    if not p.allies[j].exhausted then
                        self:Exhaust(p.allies[j]); n = n - 1
                    end
                end
            end
        end
    end

    local cost = card.questCost or 0
    if not self:Pay(pid, cost) then return false, "Nicht genug Ressourcen." end

    self:Log("📜 " .. p.hero.name .. " schließt die Quest " .. card.name .. " ab.", "heal")

    if card.fx and card.fx.questSelfDestruct then
        table.remove(p.resources, resIndex)
        p.graveyard[#p.graveyard + 1] = card
    else
        res.faceUp = false
        res.exhausted = false
    end

    local ctx = {
        targets = targets or {},
        slots = card.fx and card.fx.targets,
        source = card,
    }
    if card.fx and card.fx.reward then
        E.ApplyAll(self, pid, card.fx.reward, ctx)
    end
    self:CheckState()
    self:Changed()
    return true
end

function Game:ExileFromGraveyard(pid, filter, n)
    local p = self.players[pid]
    local removed = 0
    for i = #p.graveyard, 1, -1 do
        if removed < n then
            local c = p.graveyard[i]
            if filter == "Ally" and c.type == "Ally" then
                table.remove(p.graveyard, i)
                p.removed[#p.removed + 1] = c
                removed = removed + 1
            end
        end
    end
    return removed
end

-- ---------------------------------------------------------------------------
-- Aktionen: Karte spielen
-- ---------------------------------------------------------------------------
function Game:PlayCard(pid, handIndex, targets, opts)
    opts = opts or {}
    if self.gameOver then return false, "Das Spiel ist vorbei." end
    if self.active ~= pid then return false, "Du bist nicht am Zug." end
    if self.phase ~= "main" then return false, "Karten nur in der Aktionsphase." end
    if self.pending then return false, "Bitte zuerst die offene Entscheidung treffen." end
    local p = self.players[pid]
    local card = p.hand[handIndex]
    if not card then return false, "Karte nicht auf der Hand." end
    local x = opts.x or 0
    local ok, err = self:CanPlay(pid, card, x)
    if not ok then return false, err end

    local cost = self:PlayCost(pid, card, x)
    if not self:Pay(pid, cost) then return false, "Nicht genug Ressourcen." end
    self:UseCostReduction(pid)

    local ctx = {
        targets = targets or {},
        slots = card.fx and card.fx.targets,
        x = x,
        source = card,
    }

    -- Zusatzkosten
    if card.fx and card.fx.costs then
        for i = 1, #card.fx.costs do
            local c = card.fx.costs[i]
            if c.k == "selfDamage" then
                self:DealDamage(p.hero, c.n or 1, { source = p.hero, unpreventable = true })
            elseif c.k == "sacrifice" then
                local list = self:LegalTargets(pid, c.f or "fally")
                local t = list[1]
                if t then ctx.sacrificed = t; self:DestroyCard(t, { source = card }) end
            elseif c.k == "discard" then
                self:DiscardCards(pid, c.n or 1)
            elseif c.k == "pay" then
                self:Pay(pid, c.n or 0)
            elseif c.k == "exhaust" then
                local list = self:LegalTargets(pid, c.f or "fchar")
                if list[1] then self:Exhaust(list[1]) end
            end
        end
    end

    table.remove(p.hand, handIndex)
    local inst = self:NewInstance(card, pid)
    inst.joinedTurn = self.turn
    ctx.source = inst

    -- Karte in die passende Zone legen
    local zone = "graveyard"
    if inst.type == "Ally" then
        p.allies[#p.allies + 1] = inst
        zone = "ally"
    elseif inst.type == "Weapon" then
        p.weapons[#p.weapons + 1] = inst
        zone = "weapon"
    elseif inst.type == "Armor" or inst.type == "Item" then
        p.armors[#p.armors + 1] = inst
        zone = "armor"
    elseif inst.type == "Ability" then
        if inst.fx and inst.fx.attach then
            local hostUid = nil
            if targets and targets[1] and targets[1][1] then hostUid = targets[1][1] end
            local host = hostUid and self:FindCard(hostUid) or nil
            if host then
                inst.attachedTo = host.uid
                inst.attachToType = host.type
                p.ongoing[#p.ongoing + 1] = inst
                zone = "ongoing"
            else
                -- Kein Wirt: Fähigkeit verpufft
                p.graveyard[#p.graveyard + 1] = inst
                zone = "graveyard"
            end
        elseif inst.ongoing or (inst.fx and inst.fx.ongoing) then
            p.ongoing[#p.ongoing + 1] = inst
            zone = "ongoing"
        else
            p.graveyard[#p.graveyard + 1] = inst
            zone = "graveyard"
        end
    end

    p.stats.played = p.stats.played + 1
    self:Log(p.hero.name .. " spielt " .. card.name .. (cost > 0 and (" (" .. cost .. ")") or "") .. ".", "")

    -- Effekte
    if inst.fx then
        if inst.fx.effects and #inst.fx.effects > 0 then
            E.ApplyAll(self, pid, inst.fx.effects, ctx)
        end
        if inst.fx.reward then
            E.ApplyAll(self, pid, inst.fx.reward, ctx)
        end
    end

    -- Auslöser
    if zone == "ally" then
        E.OnEnter(self, pid, inst)
    elseif inst.type == "Ability" then
        E.OnPlayAbility(self, pid, inst)
    end

    self:CheckState()
    self:Changed()
    return true
end

-- ---------------------------------------------------------------------------
-- Kampf
-- ---------------------------------------------------------------------------
function Game:AttackTax(pid)
    local o = self.players[self:OpponentOf(pid)]
    for i = 1, #o.ongoing do
        if o.ongoing[i].id == 60 then return 1 end
    end
    return 0
end

function Game:CanAttack(attacker)
    if not attacker then return false, "Kein Angreifer." end
    local pid = self:ControllerOf(attacker)
    if not pid then return false, "Nicht im Spiel." end
    if attacker.exhausted then return false, "Bereits erschöpft." end
    if E.CannotAttack(self, attacker) then return false, "Kann nicht angreifen." end
    if E.IsAlly(attacker) then
        if attacker.joinedTurn and attacker.joinedTurn >= self.turn and not E.HasKeyword(self, attacker, "Ferocity") then
            return false, "Erst ab dem nächsten Zug angriffsbereit."
        end
    end
    if self:AttackTax(pid) > 0 and self:ReadyResources(pid) < self:AttackTax(pid) then
        return false, "Nicht genug Ressourcen für Winter's Grasp."
    end
    if #self:ValidAttackTargets(attacker) == 0 then return false, "Kein gültiges Ziel." end
    return true, ""
end

function Game:ValidAttackTargets(attacker)
    local pid = self:ControllerOf(attacker)
    if not pid then return {} end
    local o = self.players[self:OpponentOf(pid)]
    local out = {}
    local function add(c)
        if not c then return end
        if E.HasKeyword(self, c, "Elusive") then return end
        if E.CannotBeTargeted(self, c, pid) then return end
        if c.limitTags and c.limitTags.Mount then return end
        out[#out + 1] = c
    end
    add(o.hero)
    for i = 1, #o.allies do add(o.allies[i]) end
    -- Sarmoth: "Opposing heroes and allies can attack only this ally if able."
    local sarmoth = nil
    for i = 1, #o.allies do if o.allies[i].id == 130 and self:IsInPlay(o.allies[i]) then sarmoth = o.allies[i] end end
    if sarmoth then
        local only = {}
        for i = 1, #out do if out[i] == sarmoth then only[#only + 1] = out[i] end end
        if #only > 0 then return only end
    end
    return out
end

function Game:ProtectorsFor(defender)
    local dpid = self:ControllerOf(defender)
    if not dpid then return {} end
    local p = self.players[dpid]
    local out = {}
    for i = 1, #p.allies do
        local a = p.allies[i]
        if not a.exhausted and a ~= defender and E.HasKeyword(self, a, "Protector") and not E.CannotProtect(self, a) then
            out[#out + 1] = a
        end
    end
    -- Old Bones darf den Helden schützen
    for i = 1, #p.allies do
        local a = p.allies[i]
        if a.id == 42 and not a.exhausted and defender.type == "Hero" and not E.CannotProtect(self, a) then
            local found = false
            for j = 1, #out do if out[j] == a then found = true end end
            if not found then out[#out + 1] = a end
        end
    end
    return out
end

function Game:ChooseStrikeWeapon(pid, side)
    local p = self.players[pid]
    local best, bestVal = nil, -1
    for i = 1, #p.weapons do
        local w = p.weapons[i]
        if not w.exhausted and self:ReadyResources(pid) >= self:StrikeCost(w) then
            local v = self:WeaponAtk(w)
            if v > bestVal then best, bestVal = w, v end
        end
    end
    return best
end

function Game:StrikeWithWeapon(pid, weapon)
    if not weapon or weapon.exhausted then return false end
    local p = self.players[pid]
    if p.cantStrikeTurn == self.turn then return false end
    local cost = self:StrikeCost(weapon)
    if not self:Pay(pid, cost) then return false end
    self:Exhaust(weapon)
    self:Log(p.hero.name .. " schlägt mit " .. weapon.name .. " zu" .. (cost > 0 and (" (" .. cost .. ")") or "") .. ".", "combat")
    E.OnStrike(self, pid, weapon)
    return true
end

function Game:Attack(pid, attackerUid, defenderUid)
    if self.gameOver then return false, "Das Spiel ist vorbei." end
    if self.active ~= pid then return false, "Du bist nicht am Zug." end
    if self.phase ~= "main" then return false, "Angriffe nur in der Aktionsphase." end
    if self.pending then return false, "Bitte zuerst die offene Entscheidung treffen." end
    local attacker = self:FindCard(attackerUid)
    local defender = self:FindCard(defenderUid)
    if not attacker or not defender then return false, "Charakter nicht gefunden." end
    if self:ControllerOf(attacker) ~= pid then return false, "Das ist nicht dein Charakter." end
    local ok, err = self:CanAttack(attacker)
    if not ok then return false, err end
    local legal = false
    local targets = self:ValidAttackTargets(attacker)
    for i = 1, #targets do if targets[i] == defender then legal = true end end
    if not legal then return false, "Kein gültiges Angriffsziel." end

    local tax = self:AttackTax(pid)
    if tax > 0 and not self:Pay(pid, tax) then return false, "Nicht genug Ressourcen für Winter's Grasp." end

    self:Exhaust(attacker)
    self.combat = { attacker = attacker, defender = defender }
    self:Log("⚔ " .. attacker.name .. " greift " .. defender.name .. " an.", "combat")
    E.OnAttack(self, pid, attacker)

    -- Waffe des Angreifers
    local aWeapon = nil
    if attacker.type == "Hero" then
        aWeapon = self:ChooseStrikeWeapon(pid, "attack")
        if aWeapon then self:StrikeWithWeapon(pid, aWeapon) end
    end
    self.combat.attackerWeapon = aWeapon

    -- Protector
    local prots = self:ProtectorsFor(defender)
    if #prots > 0 then
        local dpid = self:ControllerOf(defender)
        if dpid == self.humanPid and not self.aiControlled then
            local opts = {}
            for i = 1, #prots do opts[#opts + 1] = prots[i] end
            self.pending = {
                kind = "protect",
                pid = dpid,
                options = opts,
                attacker = attacker,
                defender = defender,
                onPick = function(uid)
                    self:ResolveProtect(uid)
                end,
            }
            self:Changed()
            return true, "Protector wählen"
        else
            -- KI: besten Protector wählen
            local best = nil
            for i = 1, #prots do
                if not best or self:MaxHP(prots[i]) > self:MaxHP(best) then best = prots[i] end
            end
            self:ResolveCombat(best)
            return true
        end
    end
    self:ResolveCombat(nil)
    return true
end

function Game:ResolveProtect(uid)
    if not self.pending or self.pending.kind ~= "protect" then return false end
    self.pending = nil
    local protector = nil
    if uid then protector = self:FindCard(uid) end
    self:ResolveCombat(protector)
    self:Changed()
    return true
end

function Game:ResolveCombat(protector)
    local c = self.combat
    if not c then return end
    local attacker, defender = c.attacker, c.defender
    local apid = self:ControllerOf(attacker)
    local dpid = self:ControllerOf(defender)
    if protector and self:IsInPlay(protector) then
        self:Exhaust(protector)
        defender = protector
        dpid = self:ControllerOf(protector)
        self.combat.defender = protector
        self:Log("🛡 " .. protector.name .. " schützt " .. (c.defender and c.defender.name or "?" ) .. ".", "combat")
        E.OnProtect(self, dpid, protector)
    end

    local aWeapon = c.attackerWeapon
    local dWeapon = nil
    if defender.type == "Hero" then
        dWeapon = self:ChooseStrikeWeapon(dpid, "defend")
        if dWeapon then self:StrikeWithWeapon(dpid, dWeapon) end
    end

    local aDmg = self:AttackPower(attacker, { attacking = true, target = defender })
    if attacker.type == "Hero" and aWeapon then
        aDmg = aDmg + self:WeaponAtk(aWeapon, { target = defender })
    end
    local dDmg = self:AttackPower(defender, { defending = true })
    if defender.type == "Hero" and dWeapon then
        dDmg = dDmg + self:WeaponAtk(dWeapon, { target = attacker })
    end

    local longRange = false
    if aWeapon and (aWeapon.id == 311 or E.HasKeyword(self, aWeapon, "LongRange")) then longRange = true end
    if E.HasKeyword(self, attacker, "LongRange") then longRange = true end
    if longRange then dDmg = 0 end

    E.OnDefend(self, dpid, defender)

    local dealtA = 0
    local dealtD = 0
    if aDmg > 0 then
        dealtA = self:DealDamage(defender, aDmg, {
            source = attacker, combat = true, weapon = aWeapon, ability = false,
        })
    end
    if dDmg > 0 and not longRange then
        dealtD = self:DealDamage(attacker, dDmg, {
            source = defender, combat = true, weapon = dWeapon, ability = false,
        })
    end

    -- Auslöser für Kampfschaden
    if dealtA > 0 then
        if E.IsAlly(attacker) and defender.type == "Hero" then
            self.players[apid].heroDamagedByAllyThisTurn = true
        end
        if attacker.type == "Hero" and aWeapon then
            E.OnCombatDamage(self, apid, aWeapon, defender, dealtA, { attacker = attacker, weapon = aWeapon })
        else
            E.OnCombatDamage(self, apid, attacker, defender, dealtA, { defending = defender.type == "Hero" })
        end
    end
    if dealtD > 0 then
        if E.IsAlly(defender) and attacker.type == "Hero" then
            self.players[dpid].heroDamagedByAllyThisTurn = true
        end
        if defender.type == "Hero" and dWeapon then
            E.OnCombatDamage(self, dpid, dWeapon, attacker, dealtD, { attacker = defender, weapon = dWeapon })
        else
            E.OnCombatDamage(self, dpid, defender, attacker, dealtD, { defending = attacker.type == "Hero" })
        end
    end

    self.combat = nil
    self:CheckState()
    self:Changed()
end

-- ---------------------------------------------------------------------------
-- Schaden / Heilung
-- ---------------------------------------------------------------------------
function Game:DealDamage(target, amount, opts)
    opts = opts or {}
    if not target or not self:IsInPlay(target) or amount <= 0 then return 0 end
    local dt = opts.dt or "Melee"
    local source = opts.source
    local unpreventable = opts.unpreventable and true or false

    -- Lionheart Helm (297) / Annihilator (312): Schaden des Helden ist unverhinderbar
    if source and source.type == "Hero" then
        local spid = self:ControllerOf(source)
        if spid then
            for i = 1, #self.players[spid].armors do
                if self.players[spid].armors[i].id == 297 then unpreventable = true; break end
            end
            if opts.weapon and opts.weapon.id == 312 then unpreventable = true end
        end
    end

    local amt = E.DamageOutBonus(self, source, target, dt, amount, opts.ability)
    amt = E.DamageInBonus(self, target, source, dt, amt)
    local prevented = E.PreventDamage(self, target, source, dt, amt, opts.combat, unpreventable)
    amt = prevented.amount
    local reflect = prevented.reflect or 0

    -- Rüstung (nur Held)
    if target.type == "Hero" and not unpreventable and amt > 0 then
        local p = self.players[self:ControllerOf(target)]
        local best, bestDef = nil, 0
        for i = 1, #p.armors do
            local a = p.armors[i]
            if not a.exhausted and self:Defense(a) > bestDef then best, bestDef = a, self:Defense(a) end
        end
        if best and bestDef > 0 then
            self:Exhaust(best)
            local preventedByArmor = math.min(bestDef, amt)
            amt = amt - preventedByArmor
            self:Log("🛡 " .. best.name .. " verhindert " .. preventedByArmor .. " Schaden.", "")
        end
    end

    if amt > 0 then
        target.damage = (target.damage or 0) + amt
        self:Log("💥 " .. target.name .. " erhält " .. amt .. " Schaden" .. (source and source ~= target and (" (" .. source.name .. ")") or "") .. ".", "hit")
        -- Ausrüstungs-Auslöser
        if opts.combat and source and source.type == "Ally" and target.type == "Hero" then
            local p = self.players[self:ControllerOf(target)]
            for i = 1, #p.armors do
                local a = p.armors[i]
                if a.id == 291 then                     -- Green Whelp Armor
                    if self:Pay(self:ControllerOf(target), 2) then self:Bounce(source) end
                end
            end
        end
        if opts.combat and source and source.type == "Hero" and E.IsAlly(target) then
            local p = self.players[self:ControllerOf(source)]
            for i = 1, #p.armors do
                if p.armors[i].id == 284 then           -- Devilsaur Leggings
                    self:DestroyCard(target, { source = source })
                end
            end
        end
        -- Kaltes Blut (92)
        if source and source.type == "Hero" and E.IsAlly(target) and self:IsInPlay(target) then
            local spid = self:ControllerOf(source)
            if spid and self.players[spid].coldBloodTurn == self.turn then
                self:DestroyCard(target, { source = source })
            end
        end
        -- Vergeltungsaura (71)
        if opts.combat and source and source ~= target and not opts.noRetribution then
            local tpid = self:ControllerOf(target)
            local pl = tpid and self.players[tpid]
            if pl then
                for i = 1, #pl.ongoing do
                    local o = pl.ongoing[i]
                    if o.id == 71 and self:IsInPlay(o) then
                        self:DealDamage(source, 1, { source = o, dt = "Holy", ability = true, noRetribution = true })
                        break
                    end
                end
            end
        end
        -- Stealth-Fähigkeiten zerfallen, wenn der Held Schaden zufügt
        if source and source.type == "Hero" then
            local spid = self:ControllerOf(source)
            if spid then E.OnHeroDamage(self, spid, source) end
        end
        if target.type == "Hero" then
            local tpid = self:ControllerOf(target)
            if tpid then self.players[tpid].stats.damage = self.players[tpid].stats.damage + amt end
        end
    end

    if reflect > 0 and source and self:IsInPlay(source) then
        self:DealDamage(source, reflect, { source = target, dt = "Holy" })
    end
    return amt
end

function Game:Heal(target, amount, opts)
    opts = opts or {}
    if not target or not self:IsInPlay(target) or amount <= 0 then return 0 end
    local tpid = self:ControllerOf(target)
    -- Hide of the Wild (294)
    if target.type == "Hero" and tpid then
        local p = self.players[tpid]
        for i = 1, #p.armors do
            if p.armors[i].id == 294 then amount = amount + 1; break end
        end
    end
    for i = 1, #(target.buffs or {}) do
        local b = target.buffs[i]
        if (not b.untilTurn or b.untilTurn >= self.turn) and b.noHeal then return 0 end
    end
    local healed = math.min(target.damage or 0, amount)
    if healed > 0 then
        target.damage = target.damage - healed
        self:Log("💚 " .. target.name .. " heilt " .. healed .. " Schaden.", "heal")
        if tpid then self.players[tpid].stats.healed = self.players[tpid].stats.healed + healed end
    end
    return healed
end

-- ---------------------------------------------------------------------------
-- Karten zerstören / verändern
-- ---------------------------------------------------------------------------
function Game:DestroyCard(card, opts)
    if not card then return false end
    local found, pid, zone = self:FindCard(card.uid)
    if not found or not pid or not zone then return false end
    if zone == "resource" then
        local p = self.players[pid]
        for i = 1, #p.resources do
            if p.resources[i].card == card then
                table.remove(p.resources, i)
                break
            end
        end
        p.graveyard[#p.graveyard + 1] = card
        self:Log(card.name .. " (Ressource) wird zerstört.", "hit")
        self:NotifyDestroy(card)
        return true
    end
    if zone == "hero" then
        card.damage = self:MaxHP(card)
        self:CheckState()
        return true
    end
    if card.type == "Ally" and self:HeroIndestructible(pid) and card.id == 263 then
        return false
    end
    if card.type == "Ally" then
        ns.RemoveValue(self.players[pid].allies, card)
        self:Log("💀 " .. card.name .. " wird zerstört.", "hit")
        E.OnDeath(self, pid, card)
    elseif zone == "weapon" then
        ns.RemoveValue(self.players[pid].weapons, card)
        self:Log("💀 " .. card.name .. " wird zerstört.", "hit")
    elseif zone == "armor" then
        ns.RemoveValue(self.players[pid].armors, card)
        self:Log("💀 " .. card.name .. " wird zerstört.", "hit")
    elseif zone == "ongoing" then
        ns.RemoveValue(self.players[pid].ongoing, card)
        self:Log(card.name .. " wird zerstört.", "")
    end
    self:DestroyAttachmentsOn(card)
    if not card.isToken then
        card.damage = 0
        card.exhausted = false
        card.buffs = {}
        card.attachedTo = nil
        self.players[card.owner or pid].graveyard[#self.players[card.owner or pid].graveyard + 1] = card
    end
    -- Stealth (103): optional (2) zahlen, um die Karte am Ende des Zuges zurueckzuholen
    if card.id == 103 and card.owner then
        local owner = card.owner
        if self:Pay(owner, 2) then
            self:AddDelayed(owner, "nextEnd", nil, card.name .. " kehrt zurück", function()
                local p = self.players[owner]
                for i = 1, #p.graveyard do
                    if p.graveyard[i] == card then
                        table.remove(p.graveyard, i)
                        p.hand[#p.hand + 1] = card
                        self:Log(card.name .. " kehrt auf die Hand zurück.", "")
                        return
                    end
                end
            end)
        end
    end
    self:NotifyDestroy(card)
    if not opts or not opts.noCheck then self:CheckState() end
    return true
end

function Game:DestroyAttachmentsOn(card)
    if not card then return end
    for _, pid in ipairs({ 1, 2 }) do
        local p = self.players[pid]
        local remove = {}
        for i = 1, #p.ongoing do
            if p.ongoing[i].attachedTo == card.uid then remove[#remove + 1] = p.ongoing[i] end
        end
        for i = 1, #remove do
            ns.RemoveValue(p.ongoing, remove[i])
            remove[i].attachedTo = nil
            p.graveyard[#p.graveyard + 1] = remove[i]
        end
    end
end

function Game:WatchDestroy(card, fn)
    if not card then return end
    self.destroyWatchers[card.uid] = self.destroyWatchers[card.uid] or {}
    self.destroyWatchers[card.uid][#self.destroyWatchers[card.uid] + 1] = fn
end

function Game:NotifyDestroy(card)
    local list = self.destroyWatchers[card.uid]
    if list then
        self.destroyWatchers[card.uid] = nil
        for i = 1, #list do pcall(list[i]) end
    end
end

function Game:Exhaust(card)
    if not card or card.exhausted then return end
    card.exhausted = true
    local pid = self:ControllerOf(card)
    if pid then E.OnExhaust(self, pid, card) end
end

function Game:Ready(card)
    if card and card.exhausted then card.exhausted = false end
end

-- ---------------------------------------------------------------------------
-- Hilfseffekte (Auto-Ziele, Tutor, Reveal, Token, Kontrolle)
-- ---------------------------------------------------------------------------
local function scoreTargetForDamage(g, pid, card)
    local score = 0
    if card.type == "Hero" then score = 40 end
    if E.IsAlly(card) then score = 30 + (g:AttackPower(card, {}) * 2) + g:MaxHP(card) - (card.damage or 0) * 3 end
    if g:MaxHP(card) - (card.damage or 0) <= 0 then score = score + 100 end
    return score
end

function Game:AutoTarget(pid, filter, eff, ctx)
    local list = self:LegalTargets(pid, filter)
    if #list == 0 then return nil end
    if eff and (eff.k == "damage" or eff.k == "destroy" or eff.k == "exhaust") then
        local best, bestScore = nil, -1e9
        for i = 1, #list do
            local s = scoreTargetForDamage(self, pid, list[i])
            if self:MaxHP(list[i]) - (list[i].damage or 0) <= (eff.n or 0) then s = s + 200 end
            if s > bestScore then best, bestScore = list[i], s end
        end
        return best
    elseif eff and (eff.k == "heal" or eff.k == "ready") then
        local best, bestScore = nil, -1e9
        for i = 1, #list do
            local c = list[i]
            local s = (c.damage or 0) * 10 + (E.IsAlly(c) and 5 or 0)
            if s > bestScore then best, bestScore = c, s end
        end
        return best
    elseif eff and eff.k == "bounce" then
        local best, bestScore = nil, -1e9
        for i = 1, #list do
            local c = list[i]
            local s = self:CardValue(c) + (c.damage or 0)
            if E.IsAlly(c) then s = s + 10 end
            if s > bestScore then best, bestScore = c, s end
        end
        return best
    end
    return list[1]
end

function Game:AutoDamage(pid, source, n, dt, filter)
    local t = self:AutoTarget(pid, filter or "echar", { k = "damage", n = n })
    if t then self:DealDamage(t, n, { source = source, dt = dt }) end
    return t
end

function Game:AutoDestroy(pid, filter)
    local t = self:AutoTarget(pid, filter, { k = "destroy" })
    if t then self:DestroyCard(t) end
    return t
end

function Game:AutoBounce(pid, filter)
    local t = self:AutoTarget(pid, filter, { k = "bounce" })
    if t then self:Bounce(t) end
    return t
end

function Game:AutoExhaust(pid, filter)
    local t = self:AutoTarget(pid, filter, { k = "exhaust" })
    if t then self:Exhaust(t) end
    return t
end

function Game:AutoHeal(pid, filter, n, source)
    local t = self:AutoTarget(pid, filter, { k = "heal", n = n })
    if t then self:Heal(t, n, { source = source }) end
    return t
end

function Game:AoEDamage(pid, side, n, dt, heroes, source)
    local list = self:SideCards(pid, side, heroes)
    for i = 1, #list do self:DealDamage(list[i], n, { source = source, dt = dt }) end
end

function Game:AoEHeal(pid, side, n, heroes, source)
    local list = self:SideCards(pid, side, heroes)
    for i = 1, #list do self:Heal(list[i], n, { source = source }) end
end

function Game:ReadyHeroAndWeapon(pid)
    local p = self.players[pid]
    self:Ready(p.hero)
    for i = 1, #p.weapons do
        if not p.weapons[i].exhausted then self:Ready(p.weapons[i]); break end
    end
    for i = 1, #p.weapons do if p.weapons[i].exhausted then self:Ready(p.weapons[i]); break end end
end

function Game:MaybePayReady(pid, cost, card)
    if self:Pay(pid, cost) then self:Ready(card) end
end

function Game:MaybeReadyWeapon(pid, weapon, cost)
    if weapon and weapon.exhausted and self:Pay(pid, cost) then
        self:Ready(weapon)
        self:Ready(self.players[pid].hero)
    end
end

function Game:FirstReadyAlly(pid)
    local p = self.players[pid]
    for i = 1, #p.allies do if not p.allies[i].exhausted then return p.allies[i] end end
    return nil
end

function Game:GiveControl(card, newPid)
    local found, pid, zone = self:FindCard(card.uid)
    if not found or not pid or zone ~= "ally" then return false end
    ns.RemoveValue(self.players[pid].allies, card)
    card.owner = card.owner or pid
    self.players[newPid].allies[#self.players[newPid].allies + 1] = card
    card.joinedTurn = self.turn
    self:Log(card.name .. " wechselt die Kontrolle zu " .. self.players[newPid].hero.name .. ".", "")
    return true
end

function Game:CreateToken(pid, def, n)
    local p = self.players[pid]
    for _ = 1, n or 1 do
        local card = {
            id = "token_" .. tostring(def.name or "Token"),
            name = def.name or "Token",
            type = "Ally",
            isToken = true,
            atk = def.atk or 1,
            hp = def.hp or 1,
            atkType = def.atkType or "Melee",
            race = def.race,
            allyTypes = def.allyTypes,
            unique = def.unique,
            text = "",
            limitTags = def.unique and { Unique = 1 } or nil,
        }
        local inst = self:NewInstance(card, pid)
        inst.joinedTurn = self.turn
        inst.exhausted = def.exhausted and true or false
        p.allies[#p.allies + 1] = inst
    end
    self:Log(p.hero.name .. " bringt " .. (n or 1) .. "x " .. (def.name or "Token") .. " ins Spiel.", "")
end

function Game:Tutor(pid, filter, n, to)
    local p = self.players[pid]
    local picks = {}
    for _ = 1, n or 1 do
        local best, bestIdx = nil, nil
        for i = 1, #p.deck do
            local c = ns.Cards[p.deck[i]]
            local ok = true
            if filter == "ally" then ok = c and c.type == "Ally"
            elseif filter == "ability" then ok = c and c.type == "Ability"
            elseif filter == "equipment" then ok = c and (c.type == "Weapon" or c.type == "Armor" or c.type == "Item")
            elseif filter == "combo" then ok = c and c.subtypes and ns.IndexOf(c.subtypes, "Combo") ~= nil
            elseif filter == "quest" then ok = c and c.type == "Quest" end
            if ok and (not best or (c.cost or 0) > (best.cost or 0)) then best, bestIdx = c, i end
        end
        if bestIdx then
            table.remove(p.deck, bestIdx)
            local inst = self:NewInstance(best, pid)
            if to == "play" then
                p.allies[#p.allies + 1] = inst
                inst.joinedTurn = self.turn
                E.OnEnter(self, pid, inst)
            else
                p.hand[#p.hand + 1] = inst
            end
            picks[#picks + 1] = best.name
        end
    end
    ns.Shuffle(p.deck)
    if #picks > 0 then self:Log(p.hero.name .. " sucht: " .. table.concat(picks, ", ") .. ".", "") end
end

function Game:GYToHand(pid, filter, targetCard)
    local p = self.players[pid]
    local idx = nil
    if targetCard then
        for i = 1, #p.graveyard do if p.graveyard[i].uid == targetCard.uid then idx = i end end
    else
        local bestVal = -1
        for i = 1, #p.graveyard do
            local c = p.graveyard[i]
            local ok = true
            if filter == "ally" then ok = c.type == "Ally"
            elseif filter == "equipment" then ok = (c.type == "Weapon" or c.type == "Armor" or c.type == "Item")
            elseif filter == "ability" then ok = c.type == "Ability" end
            if ok and self:CardValue(c) > bestVal then idx, bestVal = i, self:CardValue(c) end
        end
    end
    if not idx then return false end
    local c = table.remove(p.graveyard, idx)
    c.damage = 0; c.exhausted = false; c.buffs = {}
    p.hand[#p.hand + 1] = c
    self:Log(p.hero.name .. " nimmt " .. c.name .. " aus dem Friedhof auf die Hand.", "")
    return true
end

function Game:GYToPlay(pid, filter, maxCost)
    local p = self.players[pid]
    local best, bestIdx = nil, nil
    for i = 1, #p.graveyard do
        local c = p.graveyard[i]
        if (not filter or filter == "ally") and c.type == "Ally" then
            if not maxCost or maxCost == "resources" and (c.cost or 0) <= #p.resources or (type(maxCost) == "number" and (c.cost or 0) <= maxCost) then
                if not best or (c.cost or 0) > (best.cost or 0) then best, bestIdx = c, i end
            end
        end
    end
    if not bestIdx then return false end
    local c = table.remove(p.graveyard, bestIdx)
    c.damage = 0; c.exhausted = false; c.buffs = {}
    c.joinedTurn = self.turn
    p.allies[#p.allies + 1] = c
    self:Log(p.hero.name .. " erweckt " .. c.name .. " aus dem Friedhof.", "")
    E.OnEnter(self, pid, c)
    return true
end

function Game:ShuffleGraveyard(pid)
    local p = self.players[pid]
    for i = 1, #p.graveyard do p.deck[#p.deck + 1] = p.graveyard[i].id end
    p.graveyard = {}
    ns.Shuffle(p.deck)
    self:Log(p.hero.name .. " mischt seinen Friedhof ins Deck.", "")
end

function Game:RevealPick(pid, n, filter, to, rest, opponentChooses)
    local p = self.players[pid]
    local revealed = {}
    local max = math.min(n or 1, #p.deck)
    for i = 1, max do
        local id = table.remove(p.deck)
        revealed[#revealed + 1] = id
    end
    if #revealed == 0 then return end
    local names = {}
    for i = 1, #revealed do names[#names + 1] = ns.Cards[revealed[i]] and ns.Cards[revealed[i]].name or "?" end
    self:Log(p.hero.name .. " deckt auf: " .. table.concat(names, ", ") .. ".", "")
    local pickIdx = nil
    local bestVal = nil
    for i = 1, #revealed do
        local c = ns.Cards[revealed[i]]
        local ok = true
        if filter == "ally" then ok = c and c.type == "Ally"
        elseif filter == "ability" then ok = c and c.type == "Ability"
        elseif filter == "equipment" then ok = c and (c.type == "Weapon" or c.type == "Armor" or c.type == "Item") end
        if ok then
            local v = c and (c.cost or 0) or 0
            if opponentChooses then
                if not bestVal or v < bestVal then pickIdx, bestVal = i, v end
            else
                if not bestVal or v > bestVal then pickIdx, bestVal = i, v end
            end
        end
    end
    if pickIdx then
        local id = table.remove(revealed, pickIdx)
        if to == "play" then
            local inst = self:NewInstance(ns.Cards[id], pid)
            p.allies[#p.allies + 1] = inst
            inst.joinedTurn = self.turn
        else
            p.hand[#p.hand + 1] = self:NewInstance(ns.Cards[id], pid)
        end
    end
    if rest == "top" then
        for i = #revealed, 1, -1 do p.deck[#p.deck + 1] = revealed[i] end
    else
        for i = 1, #revealed do table.insert(p.deck, 1, revealed[i]) end
    end
end

function Game:TopDeckToResource(pid, exhausted)
    local p = self.players[pid]
    if #p.deck == 0 then p.decked = true; return end
    local id = table.remove(p.deck)
    local inst = self:NewInstance(ns.Cards[id], pid)
    p.resources[#p.resources + 1] = { card = inst, faceUp = false, exhausted = exhausted and true or false }
    self:Log(p.hero.name .. " legt die oberste Deckkarte als Ressource ins Spiel.", "")
end

function Game:LookTop(pid)
    local p = self.players[pid]
    if #p.deck == 0 then return end
    local c = ns.Cards[p.deck[#p.deck]]
    self:Log(p.hero.name .. " betrachtet die oberste Karte: " .. (c and c.name or "?"), "")
end

function Game:SpiritHealer(pid)
    local p = self.players[pid]
    local best, bestIdx = nil, nil
    for i = 1, #p.graveyard do
        local c = p.graveyard[i]
        if c.type == "Ally" and (not best or (c.cost or 0) > (best.cost or 0)) then best, bestIdx = c, i end
    end
    if not bestIdx then return end
    local c = table.remove(p.graveyard, bestIdx)
    c.damage = math.max(0, self:MaxHP(c) - 1)
    c.exhausted = true
    c.buffs = {}
    c.joinedTurn = self.turn
    p.allies[#p.allies + 1] = c
    self:Log("✨ " .. c.name .. " kehrt mit 1 Leben zurück.", "")
end

function Game:AddDelayed(pid, when, effects, label, fn)
    self.delayed[#self.delayed + 1] = {
        pid = pid, when = when or "nextStart", effects = effects, label = label,
        turn = self.turn, fn = fn,
    }
end

function Game:RunDelayed(pid, when)
    local keep = {}
    for i = 1, #self.delayed do
        local d = self.delayed[i]
        if d.pid == pid and d.when == when and (d.turn or 0) < self.turn then
            self:Log("⏳ " .. (d.label or "Verzögerter Effekt"), "")
            if d.fn then
                local ok, err = pcall(d.fn)
                if not ok then self:Log("Fehler im verzögerten Effekt: " .. tostring(err), "") end
            elseif d.effects then
                E.ApplyAll(self, pid, d.effects, {})
            end
        else
            keep[#keep + 1] = d
        end
    end
    self.delayed = keep
end

function Game:CustomEffect(pid, id, ctx)
    if id == "tooga" then
        self:AddDelayed(pid, "nextStart", { { k = "custom", id = "toogaReturn" } }, "Tooga kehrt zurück")
    elseif id == "toogaReturn" then
        for i = 1, #self.players[pid].allies do
            local a = self.players[pid].allies[i]
            if a.id == "token_Tooga" then
                self:ReturnToHand(a)
                self:Draw(pid, 2)
                break
            end
        end
    elseif id == "totemicCall" then
        -- nicht umgesetzt
    end
end

-- ---------------------------------------------------------------------------
-- Reaktion auf "On Your Feet" etc.
-- ---------------------------------------------------------------------------
function Game:CanAct(pid)
    return not self.gameOver and self.active == pid and self.phase == "main" and not self.pending
end

-- ---------------------------------------------------------------------------
-- Zusätzliche Effekt-Hilfen
-- ---------------------------------------------------------------------------
function Game:FilterSide(pid, side)
    local out = {}
    local function add(c) if c then out[#out + 1] = c end end
    local function addPlayer(pl, heroes, allies)
        if not pl then return end
        if heroes then add(pl.hero) end
        if allies then for i = 1, #pl.allies do add(pl.allies[i]) end end
    end
    local own = self.players[pid]
    local enemy = self.players[self:OpponentOf(pid)]
    if side == "friendly" or side == "friendlyChars" then
        addPlayer(own, true, true)
    elseif side == "friendlyAllies" then addPlayer(own, false, true)
    elseif side == "friendlyHero" then addPlayer(own, true, false)
    elseif side == "enemy" or side == "enemyChars" then addPlayer(enemy, true, true)
    elseif side == "enemyAllies" then addPlayer(enemy, false, true)
    elseif side == "enemyHero" then addPlayer(enemy, true, false)
    elseif side == "all" or side == "allChars" then
        addPlayer(own, true, true); addPlayer(enemy, true, true)
    elseif side == "allAllies" then
        addPlayer(own, false, true); addPlayer(enemy, false, true)
    end
    return out
end

function Game:PreventReady(card, n)
    if not card then return end
    card.noReadyTurns = math.max(card.noReadyTurns or 0, n or 1)
end

function Game:BounceMany(pid, side, n)
    local list = self:FilterSide(pid, side)
    table.sort(list, function(a, b) return self:CardValue(a) > self:CardValue(b) end)
    local done = 0
    for i = 1, #list do
        if done >= (n or 0) then break end
        if self:Bounce(list[i]) then done = done + 1 end
    end
    return done
end

function Game:ReadyBest(pid)
    local p = self.players[pid]
    local best, bestV = nil, -1
    if p.hero.exhausted then best, bestV = p.hero, 1000 end
    for i = 1, #p.allies do
        local a = p.allies[i]
        if a.exhausted then
            local v = self:AttackPower(a, {}) * 2 + self:MaxHP(a)
            if v > bestV then best, bestV = a, v end
        end
    end
    if best then
        self:Ready(best)
        self:Log(best.name .. " wird bereit gemacht.", "")
        return true
    end
    return false
end

function Game:HealAll(target, opts)
    if not target then return 0 end
    return self:Heal(target, target.damage or 0, opts)
end

function Game:SearchToTop(pid, filter)
    local p = self.players[pid]
    local idx, bestCost = nil, -1
    for i = 1, #p.deck do
        local c = ns.Cards[p.deck[i]]
        local ok = false
        if filter == "weapon" then ok = c and c.type == "Weapon"
        elseif filter == "armor" then ok = c and c.type == "Armor"
        elseif filter == "ally" then ok = c and c.type == "Ally"
        elseif filter == "ability" then ok = c and c.type == "Ability"
        else ok = c ~= nil end
        if ok and (c.cost or 0) > bestCost then idx, bestCost = i, c.cost or 0 end
    end
    if not idx then return false end
    local id = table.remove(p.deck, idx)
    p.deck[#p.deck + 1] = id
    local c = ns.Cards[id]
    self:Log(p.hero.name .. " legt " .. (c and c.name or "eine Karte") .. " auf das Deck.", "")
    return true
end

function Game:GYToPlayMax(pid)
    return self:GYToPlay(pid, "ally", "resources")
end

function Game:DestroyResource(pid)
    local p = self.players[pid]
    if #p.resources == 0 then return false end
    local idx = #p.resources
    for i = 1, #p.resources do
        if not p.resources[i].faceUp then idx = i; break end
    end
    local r = table.remove(p.resources, idx)
    if r and r.card then
        p.graveyard[#p.graveyard + 1] = r.card
        self:Log("💀 " .. (r.card.name or "Ressource") .. " (Ressource) wird zerstört.", "hit")
    end
    return true
end

function Game:ToogaWatches(pid)
    self:AddDelayed(pid, "nextStart", nil, "Tooga verschwindet", function()
        local p = self.players[pid]
        for i = 1, #p.allies do
            local a = p.allies[i]
            if a.isToken and a.name == "Tooga" then
                table.remove(p.allies, i)
                p.removed[#p.removed + 1] = a
                self:Log("🐢 Tooga wird aus dem Spiel entfernt.", "")
                self:Draw(pid, 2)
                return
            end
        end
    end)
end

-- ---------------------------------------------------------------------------
-- Einfache KI
-- ---------------------------------------------------------------------------
function Game:AIBestPlay(pid)
    local p = self.players[pid]
    local best, bestIdx, bestScore, bestX = nil, nil, -1e9, 0
    for i = 1, #p.hand do
        local card = p.hand[i]
        if not (p.aiSkip and p.aiSkip[card.uid]) then
            local maxX = 0
            if card.xCost then
                for x = 0, math.min(8, self:ReadyResources(pid)) do
                    if self:CanPlay(pid, card, x) then maxX = x end
                end
            end
            if self:CanPlay(pid, card, maxX) then
                local score = self:CardValue(card) + (card.cost or 0)
                if card.type == "Ally" then score = score + 5 end
                if card.type == "Ability" then score = score + 2 end
                if score > bestScore then
                    best, bestIdx, bestScore, bestX = card, i, score, maxX
                end
            end
        end
    end
    return best, bestIdx, bestX
end

function Game:AITargets(pid, card)
    local targets = {}
    if not card or not card.fx or not card.fx.targets then return targets end
    local friendly = false
    local effects = card.fx.effects or {}
    for i = 1, #effects do
        local k = effects[i].k
        if k == "heal" or k == "healAll" or k == "aoeHeal" or k == "buff"
            or k == "ready" or k == "prevent" then
            friendly = true
        end
    end
    for i = 1, #card.fx.targets do
        local slot = card.fx.targets[i]
        local filter = slot.f or "char"
        local list = self:LegalTargets(pid, filter)
        if #list > 0 then
            local pick
            if friendly then
                pick = self:AutoTarget(pid, filter, { k = "heal" })
            else
                pick = self:AutoTarget(pid, filter, { k = "damage", n = 2 })
            end
            if pick then targets[i] = { pick.uid } end
        end
    end
    return targets
end

function Game:AIOneStep(pid)
    if self.gameOver then return "over" end
    if self.pending then return "wait" end
    if self.active ~= pid or self.phase ~= "main" then return "wait" end
    local p = self.players[pid]
    p.aiSkip = p.aiSkip or {}
    p.aiSkipAtk = p.aiSkipAtk or {}

    -- 1. Quest abschließen
    for i = 1, #p.resources do
        local r = p.resources[i]
        if r.faceUp and r.card and r.card.type == "Quest" and self:CanCompleteQuest(pid, i) then
            self:CompleteQuest(pid, i, {})
            return "action"
        end
    end

    -- 2. Ressource legen
    if not p.playedResource then
        local idx = nil
        for i = 1, #p.hand do
            if p.hand[i].type ~= "Quest" then idx = i; break end
        end
        if not idx then
            for i = 1, #p.hand do
                if p.hand[i].type == "Quest" then idx = i; break end
            end
        end
        if idx then
            self:PlaceResource(pid, idx, false)
            return "action"
        end
    end

    -- 3. Karte spielen
    local card, idx, x = self:AIBestPlay(pid)
    if card and idx then
        local targets = self:AITargets(pid, card)
        local ok = self:PlayCard(pid, idx, targets, { x = x })
        if ok then return "action" end
        p.aiSkip[card.uid] = true
        return "action"
    end

    -- 4. Angreifen
    local bestAtk, bestTgt, bestScore = nil, nil, -1e9
    local attackers = {}
    if not p.hero.exhausted then attackers[#attackers + 1] = p.hero end
    for i = 1, #p.allies do
        if not p.allies[i].exhausted then attackers[#attackers + 1] = p.allies[i] end
    end
    for i = 1, #attackers do
        local a = attackers[i]
        if not p.aiSkipAtk[a.uid] and self:CanAttack(a) then
            local targets = self:ValidAttackTargets(a)
            for j = 1, #targets do
                local t = targets[j]
                local dmg = self:AttackPower(a, { attacking = true, target = t })
                if a.type == "Hero" then
                    local w = self:BestWeapon(pid)
                    if w then dmg = dmg + self:WeaponAtk(w, { target = t }) end
                end
                local score = dmg * 2
                local tHP = self:MaxHP(t) - (t.damage or 0)
                if dmg >= tHP then
                    score = score + (t.type == "Hero" and 10000 or 250)
                end
                if E.IsAlly(t) then
                    score = score + self:CardValue(t) - self:AttackPower(t, {})
                else
                    score = score + (t.type == "Hero" and 60 or 0)
                end
                if score > bestScore then bestAtk, bestTgt, bestScore = a, t, score end
            end
        end
    end
    if bestAtk and bestTgt then
        local ok = self:Attack(pid, bestAtk.uid, bestTgt.uid)
        if ok then return "action" end
        p.aiSkipAtk[bestAtk.uid] = true
        return "action"
    end

    -- 5. Zug beenden
    self:EndTurnAction(pid)
    return "end"
end

function Game:AIFullTurn(pid)
    for _ = 1, 120 do
        if self.gameOver then return end
        if self.active ~= pid or self.phase ~= "main" or self.pending then return end
        local r = self:AIOneStep(pid)
        if r == "end" or r == "wait" or r == "over" then return end
    end
    if self.active == pid and not self.gameOver and self.phase == "main" then
        self:EndTurnAction(pid)
    end
end

-- ---------------------------------------------------------------------------
-- Debug / Selbsttest
-- ---------------------------------------------------------------------------
function Game:Describe()
    local lines = {}
    lines[#lines + 1] = "Zug " .. self.turn .. " - " .. (self.players[self.active] and self.players[self.active].hero.name or "?")
    for _, pid in ipairs({ 1, 2 }) do
        local p = self.players[pid]
        lines[#lines + 1] = p.hero.name .. ": " .. (self:MaxHP(p.hero) - (p.hero.damage or 0)) .. " HP, "
            .. #p.allies .. " Allies, " .. self:ReadyResources(pid) .. "/" .. #p.resources .. " Ressourcen, "
            .. #p.hand .. " Hand, " .. #p.deck .. " Deck"
    end
    return table.concat(lines, "\n")
end

return Game
