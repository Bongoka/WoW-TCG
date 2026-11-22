-- ============================================================================
-- WoW TCG - Taverne
-- Spricht man mit einem Gastwirt (oder einem selbst gewählten NPC), fordert er
-- einen zu einer Partie heraus. Gewinnt man, öffnet man einen Booster
-- (Heroes of Azeroth); die Karten landen in der Sammlung (WoWTCGDB.tavern).
-- ============================================================================
local ADDON, ns = ...
local T = {}
ns.Tavern = T

local GOLD = { 0.85, 0.72, 0.35 }
local ART_PATH = "Interface\\AddOns\\" .. ADDON .. "\\Art\\"
local SNOOZE = 600            -- "Nein, danke": dieser NPC fragt 10 Minuten nicht mehr
local REASK = 5               -- Händler- und Gossip-Fenster desselben Gesprächs nur einmal fragen

-- Kartenbild (TGA 256x512, Karte oben links 256x358): Pfad und Ausschnitt
function ns.CardArt(id)
    if not id then return nil end
    return ART_PATH .. tostring(id) .. ".tga"
end
ns.ART_TEXCOORD = { 0, 1, 0, 358 / 512 }
-- HD-Fassung (512x1024, Karte oben links 512x716) für große Darstellung
function ns.CardArtHD(id) if not id then return nil end return ART_PATH .. "hd\\" .. tostring(id) .. ".tga" end

local FLAVOR = {
    "%s mischt einen abgegriffenen Stapel Karten und schiebt ihn über den Tresen.\n\n\"Lust auf eine Runde? Wer gewinnt, bekommt einen frischen Booster.\"",
    "%s lehnt sich zurück und klopft auf ein Deck neben dem Bierkrug.\n\n\"Ruhiger Abend heute. Wie wär's mit einer Partie?\"",
    "\"Man erzählt sich, du spielst Karten.\" %s grinst und legt einen Booster auf den Tisch.\n\n\"Schlag mich, und er gehört dir.\"",
    "%s wischt den Tisch sauber und zieht ein Kartendeck aus der Schürze.\n\n\"Eine Runde, ein Booster für den Sieger. Abgemacht?\"",
}

local RARITY_COLOR = {
    Common = { 0.8, 0.8, 0.8 }, Uncommon = { 0.25, 0.9, 0.25 }, Rare = { 0.3, 0.55, 1 },
    Epic = { 0.75, 0.35, 1 }, Hero = { 1, 0.8, 0.3 }, Foil = { 0.4, 1, 1 },
}
local RARITY_LABEL = { Common = "Gewöhnlich", Uncommon = "Ungewöhnlich", Rare = "Selten", Epic = "Episch", Hero = "Held", Foil = "Foil" }

local function db()
    local d = ns.GetDB()
    d.tavern = d.tavern or {}
    local t = d.tavern
    t.npcs = t.npcs or {}
    t.collection = t.collection or {}
    t.wins = t.wins or 0
    t.losses = t.losses or 0
    if d.innkeepers == nil then d.innkeepers = true end
    return d, t
end

-- ---------------------------------------------------------------------------
-- NPC erkennen
-- ---------------------------------------------------------------------------
local function NpcInfo(unit)
    local guid = UnitGUID and UnitGUID(unit)
    if not guid then return nil end
    local kind, _, _, _, _, id = strsplit("-", guid)
    if kind ~= "Creature" then return nil end
    return tonumber(id), UnitName(unit)
end

-- Gastwirt: Gossip-Option "Heimatort setzen" (binder) – sprachunabhängig; sonst der Name
local function IsInnkeeper(name)
    if C_GossipInfo and C_GossipInfo.GetOptions then
        local opts = C_GossipInfo.GetOptions() or {}
        for _, o in ipairs(opts) do
            local ic = o.icon
            if ic == 132052 or o.type == "binder" or (type(ic) == "string" and ic:lower():find("binder")) then return true end
        end
    end
    if GetGossipOptions then
        local t = { GetGossipOptions() }
        for i = 2, #t, 2 do if t[i] == "binder" then return true end end
    end
    if name and (name:find("Innkeeper") or name:find("Gastwirt")) then return true end
    return false
end

local lastAsk, snoozed = {}, {}

local function IsCardPlayer(npcId, name)
    local d, t = db()
    if t.npcs[npcId] then return true end
    return d.innkeepers and IsInnkeeper(name)
end

local function CloseNpcWindows()
    if C_GossipInfo and C_GossipInfo.CloseGossip then C_GossipInfo.CloseGossip() elseif CloseGossip then CloseGossip() end
    if CloseMerchant then CloseMerchant() end
    if CloseQuest then CloseQuest() end
end

local function OnNpcInteract()
    if InCombatLockdown and InCombatLockdown() then return end
    if ns.UI and ns.UI.game and not ns.UI.game.gameOver and ns.UI.frame and ns.UI.frame:IsShown() then return end   -- Partie läuft
    local npcId, name = NpcInfo("npc")
    if not npcId or not IsCardPlayer(npcId, name) then return end
    local now = GetTime()
    if (lastAsk[npcId] and now - lastAsk[npcId] < REASK) or (snoozed[npcId] and now < snoozed[npcId]) then return end
    lastAsk[npcId] = now
    T.ShowChallenge(npcId, name, "npc")
end

-- ---------------------------------------------------------------------------
-- Herausforderung
-- ---------------------------------------------------------------------------
-- Schwierigkeit nach Gebiet: Startgebiete = Stufe 1 (mit Starterdecks gut schlagbar), Hochlevel-Gebiete = Stufe 5
-- (stärkste Azeroth-Decks, Turnier-Niveau). Gebiete über die Classic-Kartennummer (uiMapID, sprachunabhängig)
-- mit ihrer höchsten Stufe; Hauptstädte = Stufe 3 (Starterdecks). Unbekanntes Gebiet: nach der eigenen Stufe.
local ZONE_MAX = {
    [1426] = 10, [1429] = 10, [1438] = 10, [1411] = 10, [1412] = 10, [1420] = 10,          -- Startgebiete
    [1432] = 20, [1436] = 20, [1439] = 20, [1421] = 20, [1413] = 25, [1433] = 25, [1442] = 27,
    [1431] = 30, [1440] = 30, [1424] = 30, [1437] = 30, [1441] = 35,
    [1416] = 40, [1417] = 40, [1443] = 40, [1418] = 45, [1434] = 45, [1435] = 45, [1445] = 45,
    [1425] = 50, [1427] = 50, [1444] = 50, [1446] = 50, [1419] = 55, [1447] = 55, [1448] = 55, [1449] = 55,
    [1422] = 58, [1428] = 58, [1423] = 60, [1430] = 60, [1450] = 60, [1451] = 60, [1452] = 60,
}
local CAPITALS = { [1453] = true, [1454] = true, [1455] = true, [1456] = true, [1457] = true, [1458] = true }
T.TIER_NAMES = { "Anfänger", "Leicht", "Mittel", "Schwer", "Meister" }
T.TIER_COLORS = { "ff9d9d9d", "ff1eff00", "ff0070dd", "ffa335ee", "ffff8000" }   -- grau, grün, blau, lila, orange
local function levelTier(lv)
    if lv <= 10 then return 1 elseif lv <= 22 then return 2 elseif lv <= 35 then return 3 elseif lv <= 48 then return 4 end
    return 5
end
function T.CurrentTier()
    local id = C_Map and C_Map.GetBestMapForUnit and C_Map.GetBestMapForUnit("player")
    if id and CAPITALS[id] then return 3 end
    if id and ZONE_MAX[id] then return levelTier(ZONE_MAX[id]) end
    return levelTier((UnitLevel and UnitLevel("player")) or 1)
end
function T.TierLabel(tier)
    local stars = string.rep("*", tier) .. string.rep("-", 5 - tier)
    return "|c" .. T.TIER_COLORS[tier] .. T.TIER_NAMES[tier] .. " [" .. stars .. "]|r"
end
-- Jeder NPC spielt immer "sein" Deck seiner Stufe (NpcDecks.lua); ohne Daten: Startdecks
local function OpponentDeck(npcId, tier)
    tier = tier or T.CurrentTier()
    local list = (ns.NPC_DECKS and ns.NPC_DECKS[tier] and #ns.NPC_DECKS[tier] > 0) and ns.NPC_DECKS[tier] or ns.Decks
    local n = #list
    if n == 0 then return nil end
    return list[(npcId % n) + 1], tier
end

local function MakeButton(parent, text, w)
    local b = CreateFrame("Button", nil, parent)
    b:SetSize(w or 120, 24)
    b.bg = b:CreateTexture(nil, "BACKGROUND"); b.bg:SetAllPoints(); b.bg:SetColorTexture(0.18, 0.18, 0.22, 1)
    b.edge = b:CreateTexture(nil, "BORDER"); b.edge:SetPoint("TOPLEFT", -1, 1); b.edge:SetPoint("BOTTOMRIGHT", 1, -1); b.edge:SetColorTexture(0.55, 0.45, 0.25, 1)
    b.text = b:CreateFontString(nil, "OVERLAY", "GameFontNormal"); b.text:SetPoint("CENTER"); b.text:SetText(text)
    b:SetScript("OnEnter", function(self) self.bg:SetColorTexture(0.28, 0.26, 0.2, 1) end)
    b:SetScript("OnLeave", function(self) self.bg:SetColorTexture(0.18, 0.18, 0.22, 1) end)
    return b
end

local function MakeWindow(name, w, h)
    local f = CreateFrame("Frame", name, UIParent)
    f:SetSize(w, h)
    f:SetFrameStrata("DIALOG")
    f:SetMovable(true); f:EnableMouse(true); f:RegisterForDrag("LeftButton"); f:SetClampedToScreen(true)
    f:SetScript("OnDragStart", f.StartMoving); f:SetScript("OnDragStop", f.StopMovingOrSizing)
    local edge = f:CreateTexture(nil, "BACKGROUND"); edge:SetAllPoints(); edge:SetColorTexture(0.55, 0.45, 0.25, 1)
    local bg = f:CreateTexture(nil, "BACKGROUND", nil, 1); bg:SetPoint("TOPLEFT", 2, -2); bg:SetPoint("BOTTOMRIGHT", -2, 2); bg:SetColorTexture(0.06, 0.05, 0.04, 0.97)
    f:Hide()
    tinsert(UISpecialFrames, name)     -- Esc schließt
    return f
end

local function BuildChallenge()
    local f = MakeWindow("WoWTCGChallenge", 440, 250)
    f:SetPoint("CENTER", 0, 120)
    f.portrait = f:CreateTexture(nil, "ARTWORK"); f.portrait:SetSize(64, 64); f.portrait:SetPoint("TOPLEFT", 14, -14)
    f.title = f:CreateFontString(nil, "OVERLAY", "GameFontNormalLarge"); f.title:SetPoint("TOPLEFT", f.portrait, "TOPRIGHT", 12, -4); f.title:SetPoint("RIGHT", -14, 0); f.title:SetJustifyH("LEFT")
    f.sub = f:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall"); f.sub:SetPoint("TOPLEFT", f.title, "BOTTOMLEFT", 0, -4); f.sub:SetJustifyH("LEFT")
    f.text = f:CreateFontString(nil, "OVERLAY", "GameFontHighlight"); f.text:SetPoint("TOPLEFT", 16, -92); f.text:SetPoint("RIGHT", -16, 0); f.text:SetJustifyH("LEFT"); f.text:SetJustifyV("TOP"); f.text:SetSpacing(2)
    f.deck = f:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall"); f.deck:SetPoint("BOTTOMLEFT", 16, 46); f.deck:SetJustifyH("LEFT")
    f.deckBtn = MakeButton(f, "Deck wechseln", 110); f.deckBtn:SetPoint("BOTTOMRIGHT", -14, 42); f.deckBtn:SetHeight(20)
    f.deckBtn:SetScript("OnClick", function() if ns.UI and ns.UI.CycleDeck then ns.UI.CycleDeck(1) end T.RefreshChallenge() end)
    f.yes = MakeButton(f, "Spielen", 150); f.yes:SetPoint("BOTTOMLEFT", 14, 12)
    f.no = MakeButton(f, "Nein, danke", 150); f.no:SetPoint("BOTTOMRIGHT", -14, 12)
    f.yes:SetScript("OnClick", function() T.Accept() end)
    f.no:SetScript("OnClick", function() if f.npcId then snoozed[f.npcId] = GetTime() + SNOOZE end f:Hide() end)
    T.challenge = f
    return f
end

function T.RefreshChallenge()
    local f = T.challenge; if not f then return end
    local d = ns.GetDB()
    local mine = (d.lastDeck and ns.DeckById(d.lastDeck)) or ns.Decks[1]
    f.deck:SetText("Dein Deck: |cffffffff" .. (mine and mine.name or "?") .. "|r")
end

function T.ShowChallenge(npcId, name, unit)
    local f = T.challenge or BuildChallenge()
    local _, t = db()
    f.npcId, f.npcName = npcId, name or "Fremder"
    if unit and SetPortraitTexture then SetPortraitTexture(f.portrait, unit) end
    f.title:SetText(f.npcName)
    local opp, tier = OpponentDeck(npcId)
    f.tier = tier
    f.sub:SetText("Stufe: " .. T.TierLabel(tier) .. "   |cffaaaaaa(Bilanz " .. t.wins .. " : " .. t.losses .. ")|r\nSpielt: " .. (opp and opp.name or "?"))
    f.text:SetText(string.format(FLAVOR[(npcId % #FLAVOR) + 1], f.npcName))
    T.RefreshChallenge()
    f:Show()
    if PlaySound and SOUNDKIT and SOUNDKIT.IG_QUEST_LIST_OPEN then PlaySound(SOUNDKIT.IG_QUEST_LIST_OPEN) end
end

function T.Accept()
    local f = T.challenge; if not f then return end
    local npcId, name = f.npcId, f.npcName
    f:Hide()
    CloseNpcWindows()
    local opp = OpponentDeck(npcId, f.tier)
    if not ns.UI or not ns.UI.StartGame then ns.Print("UI ist nicht geladen.") return end
    ns.UI.StartGame({ aiDeck = opp and opp.id, opponent = name, onGameOver = function(g) T.GameOver(g, name) end })
    ns.UI.Show()
end

function T.GameOver(g, name)
    local _, t = db()
    if g.winner == 1 then
        t.wins = t.wins + 1
        ns.Print("Du hast " .. name .. " besiegt! Als Belohnung gibt es einen Booster.")
        if C_Timer then C_Timer.After(1.2, function() T.OpenBooster(name) end) else T.OpenBooster(name) end
    else
        t.losses = t.losses + 1
        ns.Print(name .. " gewinnt diese Runde. Versuch es noch einmal!")
    end
end

-- ---------------------------------------------------------------------------
-- Booster (wie im Browserspiel: 3 gewöhnlich, 2 ungewöhnlich, 1 selten oder (1/8) episch, 1 Held, 1 Foil)
-- ---------------------------------------------------------------------------
local function take(list) if #list == 0 then return nil end return table.remove(list, math.random(#list)) end

function T.MakeBooster()
    local pools = { Common = {}, Uncommon = {}, Rare = {}, Epic = {}, Hero = {} }
    local any = {}
    for id, c in pairs(ns.Cards) do
        local r = ns.Rarity and ns.Rarity[id]
        if r and not c.isToken then
            if pools[r] then table.insert(pools[r], id) end
            if c.type ~= "Hero" then any[#any + 1] = id end
        end
    end
    for _, l in pairs(pools) do table.sort(l) end
    table.sort(any)
    local out = {}
    local function add(r, n) for _ = 1, n do local id = take(pools[r]); if id then out[#out + 1] = { id = id, r = r } end end end
    add("Common", 3); add("Uncommon", 2)
    if math.random() < 0.125 and #pools.Epic > 0 then add("Epic", 1) else add("Rare", 1) end
    add("Hero", 1)
    for i = #out, 2, -1 do local j = math.random(i); out[i], out[j] = out[j], out[i] end
    if #any > 0 then out[#out + 1] = { id = any[math.random(#any)], r = "Foil" } end   -- letzte Karte: Foil
    return out
end

local CW, CH = 128, 179
local PULSE = { Rare = true, Epic = true, Hero = true, Foil = true }   -- leuchten nach dem Aufdecken

local function MakeBoosterCard(parent)
    local b = CreateFrame("Button", nil, parent)
    b:SetSize(CW, CH)
    b.fxW = CW
    b.fxInset = 0
    b.edge = b:CreateTexture(nil, "BACKGROUND"); b.edge:SetPoint("TOPLEFT", -2, 2); b.edge:SetPoint("BOTTOMRIGHT", 2, -2)
    b.art = b:CreateTexture(nil, "ARTWORK"); b.art:SetAllPoints()
    b.back = b:CreateTexture(nil, "ARTWORK", nil, 1); b.back:SetAllPoints()
    b.back:SetTexture(ns.FX and ns.FX.TEX_BACK or nil); b.back:SetTexCoord(unpack(ns.ART_TEXCOORD))
    b.name = b:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall"); b.name:SetPoint("TOP", b, "BOTTOM", 0, -4); b.name:SetWidth(CW + 10)
    b.rar = b:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall"); b.rar:SetPoint("TOP", b.name, "BOTTOM", 0, -1)
    b:SetScript("OnClick", function(self) T.Reveal(self) end)
    b:SetScript("OnEnter", function(self) if self.revealed and ns.UI and ns.UI.ShowTooltip then ns.UI.ShowTooltip(self.card) end end)
    b:SetScript("OnLeave", function() if GameTooltip then GameTooltip:Hide() end end)
    if ns.FX then ns.FX.Attach(b) end   -- Zoom, Neigung, Foil, Glanz, Leuchten
    return b
end

local function BuildBooster()
    local f = MakeWindow("WoWTCGBooster", 4 * (CW + 22) + 28, 2 * (CH + 46) + 110)
    f:SetPoint("CENTER")
    f.title = f:CreateFontString(nil, "OVERLAY", "GameFontNormalLarge"); f.title:SetPoint("TOP", 0, -14)
    f.sub = f:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall"); f.sub:SetPoint("TOP", f.title, "BOTTOM", 0, -4)
    f.cards = {}
    for i = 1, 8 do
        local b = MakeBoosterCard(f)
        local row, col = math.floor((i - 1) / 4), (i - 1) % 4
        b.homeX, b.homeY = 24 + col * (CW + 22), -56 - row * (CH + 46)
        b:SetPoint("TOPLEFT", b.homeX, b.homeY)
        f.cards[i] = b
    end
    f.all = MakeButton(f, "Alle aufdecken", 140); f.all:SetPoint("BOTTOMLEFT", 14, 12)
    f.all:SetScript("OnClick", function()
        local n = 0
        for _, b in ipairs(f.cards) do
            if b:IsShown() and not b.revealed then
                n = n + 1
                if C_Timer and C_Timer.After then C_Timer.After((n - 1) * 0.12, function() T.Reveal(b) end) else T.Reveal(b) end
            end
        end
    end)
    f.close = MakeButton(f, "Schließen", 140); f.close:SetPoint("BOTTOMRIGHT", -14, 12)
    f.close:SetScript("OnClick", function() f:Hide() end)
    T.booster = f
    return f
end

local function showFace(b)
    b.back:Hide(); b.art:Show()
    local c = RARITY_COLOR[b.rarity] or GOLD
    b.edge:SetColorTexture(c[1], c[2], c[3], 1)
    b.name:SetText(b.card.name or "?")
    b.rar:SetText((b.foilCard and b.rarity ~= "Foil") and (RARITY_LABEL[b.rarity] .. " · Foil") or (RARITY_LABEL[b.rarity] or b.rarity))
    b.rar:SetTextColor(c[1], c[2], c[3])
    if ns.FX then ns.FX.Update(b, b.card, { foil = b.foilCard, glow = c, pulse = PULSE[b.rarity] }) end
end

function T.Reveal(b)
    if not b.card or b.revealed then return end
    b.revealed = true
    if ns.FX then ns.FX.Flip(b, function() showFace(b) end) else showFace(b) end
    if PlaySound and SOUNDKIT and SOUNDKIT.IG_SPELLBOOK_OPEN then PlaySound(SOUNDKIT.IG_SPELLBOOK_OPEN) end
end

function T.OpenBooster(fromName)
    local f = T.booster or BuildBooster()
    local _, t = db()
    local list = T.MakeBooster()
    if fromName then for _, e in ipairs(list) do t.collection[e.id] = (t.collection[e.id] or 0) + 1 end end   -- nur echte Gewinne, sofort gutschreiben
    f.title:SetText("Booster: Heroes of Azeroth")
    f.sub:SetText((fromName and ("Gewonnen gegen " .. fromName .. " – ") or "") .. "Karten anklicken zum Aufdecken")
    f:Show()
    local fromX, fromY = (f:GetWidth() - CW) / 2, -(f:GetHeight() - CH) / 2
    for i, b in ipairs(f.cards) do
        local e = list[i]
        if e then
            b.card, b.rarity, b.revealed = ns.Cards[e.id], e.r, false
            b.foilCard = e.r == "Foil" or (e.r == "Hero" and math.random() < 0.1)   -- wie im Browserspiel: Foil-Karte, 10 % Foil-Held
            b.art:SetTexture(ns.CardArt(e.id)); b.art:SetTexCoord(unpack(ns.ART_TEXCOORD)); b.art:Hide()
            b.back:Show(); b.edge:SetColorTexture(0.45, 0.35, 0.2, 1)
            b.name:SetText(""); b.rar:SetText("")
            b:SetWidth(CW)
            if ns.FX then ns.FX.Update(b, nil, {}) end
            b:Show()
            if ns.FX then ns.FX.Deal(b, i, fromX, fromY) end
        else
            b:Hide()
        end
    end
end

-- ---------------------------------------------------------------------------
-- Slash-Befehle: /tcg npc | npc liste | sammlung | herausforderung | booster
-- ---------------------------------------------------------------------------
function ns.TavernSlash(msg)
    local d, t = db()
    if msg == "npc" then
        local id, name = NpcInfo("target")
        if not id then ns.Print("Bitte zuerst einen NPC anvisieren.") return true end
        if t.npcs[id] then t.npcs[id] = nil; ns.Print(name .. " spielt keine Karten mehr.")
        else t.npcs[id] = name; ns.Print(name .. " ist jetzt Kartenspieler. Sprich ihn an!") end
        return true
    elseif msg == "npc liste" or msg == "npc list" then
        local n = 0
        for id, name in pairs(t.npcs) do n = n + 1; ns.Print(" - " .. tostring(name) .. " (" .. id .. ")") end
        ns.Print(n .. " eigene Kartenspieler. Gastwirte: " .. (d.innkeepers and "an" or "aus") .. " (/tcg gastwirte)")
        return true
    elseif msg == "gastwirte" or msg == "innkeepers" then
        d.innkeepers = not d.innkeepers
        ns.Print("Gastwirte fordern dich " .. (d.innkeepers and "wieder heraus." or "nicht mehr heraus."))
        return true
    elseif msg == "sammlung" or msg == "collection" then
        local kinds, total = 0, 0
        for _, n in pairs(t.collection) do kinds = kinds + 1; total = total + n end
        ns.Print("Sammlung: " .. total .. " Karten (" .. kinds .. " verschiedene). Bilanz " .. t.wins .. " : " .. t.losses)
        return true
    elseif msg == "herausforderung" or msg == "challenge" then   -- zum Testen: angepeilten NPC herausfordern lassen
        local id, name = NpcInfo("target")
        T.ShowChallenge(id or 0, name or "Testgegner", id and "target" or nil)
        return true
    elseif msg == "booster" then                                   -- zum Testen
        T.OpenBooster(nil)
        return true
    end
    return false
end

local ev = CreateFrame("Frame")
ev:RegisterEvent("GOSSIP_SHOW")
ev:RegisterEvent("MERCHANT_SHOW")
ev:RegisterEvent("QUEST_GREETING")
ev:SetScript("OnEvent", function()
    local ok, err = pcall(OnNpcInteract)
    if not ok then ns.Print("Taverne: " .. tostring(err)) end
end)

return T
