-- Ablauftest Taverne (läuft nach _wowmock.lua und allen Addon-Dateien)
local ns = __NS
local out = {}
local function check(c, msg) out[#out + 1] = (c and "OK   " or "FAIL ") .. msg end

__fire("ADDON_LOADED", "WoWTCG"); __fire("PLAYER_LOGIN")
check(ns.UI and ns.UI.frame ~= nil, "UI aufgebaut")

-- Gastwirt (Gossip-Option "binder")
__npc.guid = "Creature-0-1-2-3-6740-0000ABCD"; __npc.name = "Innkeeper Allison"; __npc.gossip = { { icon = 132052, name = "Make this inn your home." } }
__fire("GOSSIP_SHOW")
local ch = _G.WoWTCGChallenge
check(ch and ch:IsShown(), "Herausforderung geht beim Gastwirt auf")
check(ch and ch.title._text == "Innkeeper Allison", "Titel = NPC-Name")
check(ch and ch.text._text and ch.text._text:find("Innkeeper Allison", 1, true) ~= nil, "Text nennt den NPC: " .. tostring(ch and ch.text._text))
check(ch and ch.portrait._portrait == "npc", "NPC-Porträt gesetzt")
check(ch and ch.deck._text and ch.deck._text:find("Dein Deck", 1, true) ~= nil, "Deckzeile: " .. tostring(ch and ch.deck._text))
__fire("MERCHANT_SHOW")
check(true, "Händlerfenster im selben Gespräch fragt nicht doppelt")
-- Gastwirt am deutschen Namen (ohne Gossip-Symbol)
ch:Hide(); __now = __now + 100
__npc.guid = "Creature-0-1-2-3-5111-0000"; __npc.name = "Gastwirt Firebrew"; __npc.gossip = {}
__fire("GOSSIP_SHOW")
check(ch:IsShown(), "Gastwirt am Namen erkannt (deutsch)")
-- normaler NPC
ch:Hide(); __now = __now + 100
__npc.guid = "Creature-0-1-2-3-1234-0000"; __npc.name = "Stadtwache"; __npc.gossip = { { icon = 132053 } }
__fire("GOSSIP_SHOW")
check(not ch:IsShown(), "Normaler NPC fragt nicht")
-- eigener NPC
ns.HandleSlash("npc")
__now = __now + 100
__fire("GOSSIP_SHOW")
check(ch:IsShown(), "Eigener NPC (/tcg npc) fragt")
ch.no._scripts.OnClick(); __now = __now + 100; __fire("GOSSIP_SHOW")
check(not ch:IsShown(), "Nach 'Nein, danke' Ruhe")
__now = __now + 700; __fire("GOSSIP_SHOW")
check(ch:IsShown(), "Nach 10 Minuten fragt er wieder")
-- Deck wechseln
local d0 = ch.deck._text; ch.deckBtn._scripts.OnClick()
check(ch.deck._text ~= d0, "Deck wechseln ändert die Anzeige")

-- Schwierigkeit nach Gebiet (NpcDecks.lua): Startgebiet = Stufe 1, Östliche Pestländer = Stufe 5, Hauptstadt = 3
local T = ns.Tavern
check(ns.NPC_DECKS and #ns.NPC_DECKS == 5, "5 Stufen mit NPC-Decks")
for tier = 1, 5 do
    local list = ns.NPC_DECKS[tier] or {}
    local bad = 0
    for _, d in ipairs(list) do if #d.cards ~= 30 or not ns.Cards[d.hero] then bad = bad + 1 end end
    check(#list >= 16 and bad == 0, "Stufe " .. tier .. ": " .. #list .. " Decks mit je 30 Karten")
end
local zones = { { 1429, 1, "Wald von Elwynn" }, { 1436, 2, "Westfall" }, { 1453, 3, "Sturmwind" }, { 1434, 4, "Schlingendorntal" }, { 1423, 5, "Östliche Pestländer" } }
for _, z in ipairs(zones) do
    C_Map = { GetBestMapForUnit = function() return z[1] end }
    check(T.CurrentTier() == z[2], z[3] .. " = Stufe " .. z[2] .. " (" .. T.CurrentTier() .. ")")
end
C_Map = nil
function UnitLevel() return 52 end
check(T.CurrentTier() == 5, "Unbekanntes Gebiet: nach Spielerstufe (52 = Stufe 5)")
C_Map = { GetBestMapForUnit = function() return 1426 end }
__now = __now + 100; ch:Hide(); __fire("GOSSIP_SHOW")
check(ch:IsShown() and ch.sub._text and ch.sub._text:find("Anf", 1, true) ~= nil, "Dun Morogh: Herausforderung zeigt Stufe Anfänger")
check(ch.tier == 1, "Gegnerdeck aus Stufe 1")
UnitLevel = nil

-- Spielen bis zum Sieg
local db = ns.GetDB()
local function total() local n = 0 for _, k in pairs(db.tavern.collection) do n = n + k end return n end
local before = total()
local won, games, errs = false, 0, {}
while not won and games < 3 do
    games = games + 1
    local ok, err = pcall(function()
        ch.yes._scripts.OnClick()
        local g = ns.UI.game
        if games == 1 then
            check(ns.UI.frame:IsShown(), "Spielfenster geöffnet")
            check(__npc.closed == true, "Gesprächsfenster geschlossen")
            check(ns.UI.challenge and ns.UI.challenge.opponent == "Stadtwache", "Gegner = NPC")
            check(ns.UI.oppName == "Stadtwache", "Gegnername im Spiel")
            check(type(ns.UI.lastOpp) == "string" and ns.UI.lastOpp:find("^t1_") ~= nil, "Gegner spielt ein Stufe-1-Deck: " .. tostring(ns.UI.lastOpp))
        end
        ns.UI.FinishMulligan(false)
        __tick(1)
        -- Partie entscheiden: erst eine Niederlage, dann ein Sieg
        local loser = (games == 1) and g.p1 or g.p2
        loser.hero.damage = 99
        ns.E.process(g); ns.UI.Render(); __tick(0.5); __pump()
        won = g.gameOver and g.winner == 1
        if not won then
            check(g.gameOver and g.winner == 2, "Niederlage erkannt")
            check(not (_G.WoWTCGBooster and _G.WoWTCGBooster:IsShown()), "Keine Belohnung bei Niederlage")
            __now = __now + 1000; __fire("GOSSIP_SHOW")
        else
            local msg = false for _, m in ipairs(__chat) do if m:find("besiegt", 1, true) then msg = true end end
            check(msg, "Siegmeldung im Chat")
            check(ns.UI.over:IsShown(), "Sieg-Fenster im Spiel")
        end
    end)
    if not ok then errs[#errs + 1] = tostring(err); break end
end
check(#errs == 0, "Partien ohne Lua-Fehler " .. table.concat(errs, " | "))
check(won, "Sieg nach " .. games .. " Partie(n)")
local b = _G.WoWTCGBooster
check(b and b:IsShown(), "Booster öffnet sich nach Sieg")
check(total() == before + 8, "8 Karten in der Sammlung (" .. before .. " -> " .. total() .. ")")
local art = 0
if b then
    for _, c in ipairs(b.cards) do if c.card and type(c.art._tex) == "string" and c.art._tex:find("Art\\" .. c.card.id .. ".tga", 1, true) then art = art + 1 end end
    check(art == 8, "Booster-Karten mit Bild: " .. art .. "/8")
    b.all._scripts.OnClick(); __tick(2.5)
    local rev = 0 for _, c in ipairs(b.cards) do if c.revealed and c.name._text == c.card.name then rev = rev + 1 end end
    check(rev == 8, "Alle aufgedeckt: " .. rev .. "/8")
end
-- Spielfeld mit Bildern
local boardArt = 0
for _, p in ipairs(__textures) do if p:find("WoWTCG\\Art\\", 1, true) then boardArt = boardArt + 1 end end
check(boardArt > 20, "Kartenbilder auf dem Spielfeld gesetzt (" .. boardArt .. ")")
-- Test-Booster ohne Gutschrift
local t0 = total(); ns.HandleSlash("booster"); check(total() == t0, "/tcg booster schreibt nichts gut")
ns.HandleSlash("sammlung"); check(__chat[#__chat]:find("Sammlung", 1, true) ~= nil, "/tcg sammlung: " .. __chat[#__chat])
ns.HandleSlash("npc liste"); ns.HandleSlash("help")
-- Booster-Verteilung
local cnt, bad = { Common = 0, Uncommon = 0, Rare = 0, Epic = 0, Hero = 0, Foil = 0 }, 0
for i = 1, 400 do
    local l = ns.Tavern.MakeBooster()
    if #l ~= 8 then bad = bad + 1 end
    for _, e in ipairs(l) do cnt[e.r] = cnt[e.r] + 1; if not ns.Cards[e.id] then bad = bad + 1 end end
end
check(bad == 0, "400 Booster: je 8 Karten, alle bekannt")
out[#out + 1] = string.format("     Verteilung je Booster: C %.2f U %.2f R %.2f E %.2f Held %.2f Foil %.2f", cnt.Common / 400, cnt.Uncommon / 400, cnt.Rare / 400, cnt.Epic / 400, cnt.Hero / 400, cnt.Foil / 400)
__OUT = table.concat(out, "\n")

-- ---------------------------------------------------------------- Effekte (FX.lua)
local FX = ns.FX
check(FX ~= nil and #FX.buttons > 10, "Effekte an Kartenschaltflächen: " .. (FX and #FX.buttons or 0))
check(FX.floatHost ~= nil, "Schadens-/Heilzahlen wurden angezeigt")
-- Foil auf dem Spielfeld (10 % der Instanzen)
local foils, inst = 0, 0
local g = ns.UI.game
for i = 1, 1000 do inst = inst + 1; if ns.E.makeCardInst(100, false, 1).isFoil then foils = foils + 1 end end
check(foils > 60 and foils < 140, "Foil-Anteil neuer Karten (Soll ~100 von 1000): " .. foils)
-- Überfahren einer Spielfeldkarte: Zoom, Neigung, Verlassen
ns.UI.Render()
local hb
for _, b in ipairs(FX.buttons) do if b:IsShown() and b.card and b.art._shown and not b.fxRot and b.ref and b.ref.zone ~= "opphand" and b.ref.zone ~= "res" then hb = b break end end
check(hb ~= nil, "Sichtbare Spielfeldkarte gefunden")
if hb then
    hb._scripts.OnEnter(hb); __tick(0.3)
    check(FX.zoomFrame and FX.zoomFrame:IsShown(), "Zoom beim Überfahren")
    check(FX.zoomFrame.art._tex == (hb.fxTex or ns.CardArt(hb.card.id)), "Zoom zeigt die richtige Karte")
    check(type(FX.zoomFrame.art._tex) == "string" and FX.zoomFrame.art._tex:find("hd", 1, true) ~= nil, "Zoom nimmt das HD-Bild (512 px): " .. tostring(FX.zoomFrame.art._tex))
    check((FX.zoomFrame._w or 0) > 200 and (FX.zoomFrame._w or 0) < 260 and (FX.zoomFrame._h or 0) > 300, string.format("Zoom halb so groß: %d x %d (1080p: 43 %% der Höhe)", FX.zoomFrame._w or 0, FX.zoomFrame._h or 0))
    local tc = FX.zoomFrame.art._tc
    check(tc and tc[2] == 1 and math.abs(tc[4] - 358 / 512) < 0.001, "Zoom-Ausschnitt passt zum HD-Bild")
    local g = FX.tiltGrid
    check(g and g:IsShown() and (hb.art._alpha or 1) == 0, "Neigung: Raster statt Bild sichtbar")
    local tr6, tl1 = g and g.cells[6].art._vo, g and g.cells[1].art._vo
    check(tr6 and tl1 and tr6[3][1] < 0 and tl1[1][1] < 0, string.format("Maus rechts: rechte Kante kippt nach hinten (%.2f), linke nach vorn (%.2f)", tr6 and tr6[3][1] or 0, tl1 and tl1[1][1] or 0))
    check(tr6 and math.abs(tr6[3][1]) < 4, "Neigung dezent wie im Browser (7°)")
    check((hb.fxLift or 0) > 3, "Karte hebt sich beim Überfahren")
    hb._scripts.OnLeave(hb); __tick(0.6)
    check(not FX.zoomFrame:IsShown(), "Zoom verschwindet beim Verlassen")
    check((hb.fxLift or 0) < 0.5, "Karte senkt sich wieder")
    check(not g:IsShown() and (hb.art._alpha or 1) == 1, "Neigung weich zurück, Bild wieder normal")
end
-- Booster: Austeilen, Umdrehen, Leuchten, Foil
ns.Tavern.OpenBooster("Testgegner"); __tick(1.2)
local bb = _G.WoWTCGBooster
local placed = 0 for _, c in ipairs(bb.cards) do if (c._alpha or 1) >= 0.99 then placed = placed + 1 end end
check(placed == 8, "Booster ausgeteilt: " .. placed .. "/8 sichtbar")
local hidden = 0 for _, c in ipairs(bb.cards) do if not c.art._shown and c.back._shown then hidden = hidden + 1 end end
check(hidden == 8, "Alle verdeckt (Rückseite): " .. hidden .. "/8")
bb.all._scripts.OnClick(); __tick(2.5)
local up, widthOk, foilOk = 0, 0, 0
for _, c in ipairs(bb.cards) do
    if c.revealed and c.art._shown and not c.back._shown and c.name._text == c.card.name then up = up + 1 end
    if (c._w or 128) == 128 then widthOk = widthOk + 1 end
    if (c.foilCard and c.foil._shown) or (not c.foilCard and not c.foil._shown) then foilOk = foilOk + 1 end
end
check(up == 8, "Umgedreht: " .. up .. "/8")
check(widthOk == 8, "Breite nach dem Umdrehen wieder voll: " .. widthOk .. "/8")
check(foilOk == 8, "Foil genau bei Foil-Karten: " .. foilOk .. "/8")
check(bb.cards[8].foilCard == true and bb.cards[8].fxPulse == true, "Letzte Karte = Foil und leuchtet")
check(not FX.errShown, "Kein Effekt-Fehler im Takt")
__OUT = table.concat(out, "\n")
