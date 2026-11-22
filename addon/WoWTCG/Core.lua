-- ============================================================================
-- WoW TCG - Core
-- Grundlagen: Namespace, Hilfsfunktionen, Gespeicherte Variablen, Events
-- ============================================================================
local ADDON, ns = ...

ns.ADDON = ADDON
ns.VERSION = "0.1.0"
ns.Cards = ns.Cards or {}
ns.Decks = ns.Decks or {}
ns.Tokens = ns.Tokens or {}

-- ---------------------------------------------------------------------------
-- Konstanten
-- ---------------------------------------------------------------------------
ns.MAX_HAND = 7
ns.START_HAND = 7
ns.MAX_TURNS = 120
ns.TURN_LIMIT = 50

-- Fraktions- und Klassenfarben (an die Spielvorlage angelehnt)
ns.CLASS_COLORS = {
    ["Death Knight"] = { 0.77, 0.12, 0.23 },
    ["Demon Hunter"] = { 0.64, 0.19, 0.79 },
    ["Druid"]        = { 1.00, 0.49, 0.04 },
    ["Hunter"]       = { 0.67, 0.83, 0.45 },
    ["Mage"]         = { 0.25, 0.78, 0.92 },
    ["Monk"]         = { 0.00, 1.00, 0.59 },
    ["Paladin"]      = { 0.96, 0.55, 0.73 },
    ["Priest"]       = { 1.00, 1.00, 1.00 },
    ["Rogue"]        = { 1.00, 0.96, 0.41 },
    ["Shaman"]       = { 0.00, 0.44, 0.87 },
    ["Warlock"]      = { 0.53, 0.53, 0.93 },
    ["Warrior"]      = { 0.78, 0.61, 0.43 },
}
ns.FACTION_COLORS = {
    Alliance = { 0.24, 0.47, 0.78 },
    Horde    = { 0.78, 0.20, 0.20 },
    Neutral  = { 0.55, 0.55, 0.55 },
}
ns.TYPE_COLORS = {
    Hero    = { 0.95, 0.78, 0.25 },
    Ally    = { 0.35, 0.62, 0.36 },
    Ability = { 0.28, 0.45, 0.72 },
    Weapon  = { 0.66, 0.42, 0.24 },
    Armor   = { 0.48, 0.48, 0.55 },
    Item    = { 0.55, 0.42, 0.66 },
    Quest   = { 0.72, 0.58, 0.22 },
}

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------------
local function shallowCopy(t)
    local r = {}
    if t then
        for k, v in pairs(t) do r[k] = v end
    end
    return r
end
ns.Copy = shallowCopy

function ns.DeepCopy(t, seen)
    if type(t) ~= "table" then return t end
    seen = seen or {}
    if seen[t] then return seen[t] end
    local r = {}
    seen[t] = r
    for k, v in pairs(t) do r[ns.DeepCopy(k, seen)] = ns.DeepCopy(v, seen) end
    return r
end

function ns.Shuffle(list)
    for i = #list, 2, -1 do
        local j = math.random(i)
        list[i], list[j] = list[j], list[i]
    end
    return list
end

function ns.IndexOf(list, value)
    if not list then return nil end
    for i = 1, #list do
        if list[i] == value then return i end
    end
    return nil
end

function ns.RemoveValue(list, value)
    local i = ns.IndexOf(list, value)
    if i then table.remove(list, i) end
    return i
end

function ns.Round(n)
    return math.floor(n + 0.5)
end

function ns.Clamp(v, lo, hi)
    if v < lo then return lo end
    if v > hi then return hi end
    return v
end

function ns.Trim(s)
    if type(s) ~= "string" then return "" end
    return (s:gsub("^%s+", ""):gsub("%s+$", ""))
end

function ns.Split(s, sep)
    local out = {}
    if type(s) ~= "string" then return out end
    sep = sep or ","
    local pattern = "([^" .. sep .. "]+)"
    for part in s:gmatch(pattern) do out[#out + 1] = part end
    return out
end

function ns.PlayerColor(pid)
    if pid == 1 then return 0.4, 0.8, 1.0 end
    return 1.0, 0.45, 0.45
end

function ns.ClassColor(class)
    return ns.CLASS_COLORS[class] or { 0.8, 0.8, 0.8 }
end

function ns.Card(id)
    return ns.Cards[id]
end

function ns.DeckById(id)
    for _, d in ipairs(ns.Decks) do
        if d.id == id then return d end
    end
    for _, list in ipairs(ns.NPC_DECKS or {}) do                -- Gegnerdecks der NPCs (NpcDecks.lua, Stufen 1–5)
        for _, d in ipairs(list) do if d.id == id then return d end end
    end
    return nil
end

function ns.DefaultDeckIndex()
    return math.max(1, math.min(#ns.Decks, 1))
end

function ns.RandomDeckId(exclude)
    if #ns.Decks == 0 then return nil end
    local pick = nil
    for _ = 1, 40 do
        pick = ns.Decks[math.random(#ns.Decks)]
        if not exclude or pick.id ~= exclude then break end
    end
    return pick and pick.id
end

-- Text eines Karteneffekts kurz zusammenfassen (für Tooltips/Log)
function ns.ShortText(s, maxLen)
    s = tostring(s or "")
    maxLen = maxLen or 120
    if #s <= maxLen then return s end
    return s:sub(1, maxLen - 3) .. "..."
end

-- ---------------------------------------------------------------------------
-- Gespeicherte Variablen
-- ---------------------------------------------------------------------------
local DEFAULTS = {
    scale = 0.9,
    point = "CENTER",
    x = 0,
    y = 0,
    locked = false,
    lastDeck = nil,
    lastOpponent = nil,
    aiSpeed = 0.55,
    showTooltips = true,
    logLines = 14,
    sound = true,
    autoResource = false,
    showArt = true,          -- Kartenbilder (Art<id>.tga)
    innkeepers = true,       -- Gastwirte fordern zu einer Partie heraus (Tavern.lua)
    zoom = true,             -- großes Kartenbild beim Überfahren (FX.lua)
    tilt = true,             -- angedeutete 3D-Neigung zur Maus
    foil = true,             -- Foil-Effekt (10 % der Karten, Foil im Booster)
}

local function applyDefaults(db, defaults)
    for k, v in pairs(defaults) do
        if db[k] == nil then
            if type(v) == "table" then
                db[k] = ns.DeepCopy(v)
            else
                db[k] = v
            end
        end
    end
end

function ns.GetDB()
    if type(WoWTCGDB) ~= "table" then WoWTCGDB = {} end
    applyDefaults(WoWTCGDB, DEFAULTS)
    return WoWTCGDB
end

function ns.ResetDB()
    WoWTCGDB = ns.DeepCopy(DEFAULTS)
    return WoWTCGDB
end

-- ---------------------------------------------------------------------------
-- Einfache Ereignis-Verteilung (Engine -> UI)
-- ---------------------------------------------------------------------------
local listeners = {}

function ns.On(event, fn)
    listeners[event] = listeners[event] or {}
    table.insert(listeners[event], fn)
    return fn
end

function ns.Off(event, fn)
    local list = listeners[event]
    if not list then return end
    for i = #list, 1, -1 do
        if list[i] == fn then table.remove(list, i) end
    end
end

function ns.Fire(event, ...)
    local list = listeners[event]
    if not list then return end
    for i = 1, #list do
        local ok, err = pcall(list[i], ...)
        if not ok and ns.Print then ns.Print("Eventfehler (" .. tostring(event) .. "): " .. tostring(err)) end
    end
end

-- ---------------------------------------------------------------------------
-- Ausgabe
-- ---------------------------------------------------------------------------
function ns.Print(msg)
    local text = "|cffd4af37[WoW TCG]|r " .. tostring(msg)
    if DEFAULT_CHAT_FRAME then
        DEFAULT_CHAT_FRAME:AddMessage(text)
    else
        print(text)
    end
end

-- ---------------------------------------------------------------------------
-- Slash-Befehle (UI wird, sofern geladen, aufgerufen)
-- ---------------------------------------------------------------------------
function ns.HandleSlash(msg)
    msg = ns.Trim(msg):lower()
    if msg == "" or msg == "show" or msg == "toggle" or msg == "start" then
        if ns.UI and ns.UI.Toggle then ns.UI.Toggle() else ns.Print("UI ist noch nicht geladen.") end
    elseif msg == "options" or msg == "optionen" then
        if ns.Options and ns.Options.Toggle then ns.Options.Toggle() else ns.Print("Optionen sind nicht geladen.") end
    elseif msg == "reset" then
        if ns.UI and ns.UI.ResetPosition then ns.UI.ResetPosition() end
        ns.Print("Fensterposition zurückgesetzt.")
    elseif msg == "help" or msg == "hilfe" then
        ns.Print("/tcg - Fenster öffnen/schließen")
        ns.Print("/tcg options - Optionen")
        ns.Print("/tcg reset - Fensterposition zurücksetzen")
        ns.Print("/tcg npc - Ziel-NPC als Kartenspieler an/aus (Gastwirte spielen immer)")
        ns.Print("/tcg npc liste - eigene Kartenspieler anzeigen")
        ns.Print("/tcg sammlung - deine Kartensammlung aus Boostern")
    elseif ns.TavernSlash and ns.TavernSlash(msg) then
        -- Befehle aus Tavern.lua (npc, sammlung, booster)
    else
        ns.Print("Unbekannter Befehl. Nutze /tcg help.")
    end
end

SLASH_WOWTCG1 = "/tcg"
SLASH_WOWTCG2 = "/wowtcg"
SlashCmdList["WOWTCG"] = function(msg) ns.HandleSlash(msg) end

-- ---------------------------------------------------------------------------
-- Addon-Ladeereignis: UI erst danach aufbauen
-- ---------------------------------------------------------------------------
local loader = CreateFrame("Frame")
loader:RegisterEvent("ADDON_LOADED")
loader:RegisterEvent("PLAYER_LOGIN")
loader:SetScript("OnEvent", function(self, event, arg1)
    if event == "ADDON_LOADED" and arg1 == ADDON then
        ns.GetDB()
        self:UnregisterEvent("ADDON_LOADED")
    elseif event == "PLAYER_LOGIN" then
        ns.GetDB()
        if ns.UI and ns.UI.Initialize then
            local ok, err = pcall(ns.UI.Initialize)
            if not ok then ns.Print("UI-Fehler: " .. tostring(err)) end
        end
        self:UnregisterEvent("PLAYER_LOGIN")
    end
end)

ns.loader = loader
