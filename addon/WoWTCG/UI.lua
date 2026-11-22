-- ============================================================================
-- WoW TCG – Spielfeld (nach dem Browserspiel: index.html, js/ui.js, js/main.js)
-- Alle Regeln liegen in der Engine (Engine/*.lua, Umgebung ns.E). Hier nur Darstellung, Eingaben und der CPU-Ablauf.
-- Aufbau wie im Browser: oben der Gegner (Held, Friedhof, Hand, Ressourcen), zwei Reihen Spielfeld, unten eigene
-- Ressourcen, Hand, Friedhof und Held; rechts die Seitenleiste mit Zug, Einstellungen und Log.
-- Bedienung: Linksklick = spielen / angreifen / Kraft / wählen, Rechtsklick auf eine Handkarte = als Ressource legen
-- (Quests offen, mit Umschalt verdeckt).
-- ============================================================================
local ADDON, ns = ...
local E = ns.E
local UI = {}
ns.UI = UI
ns.Cards, ns.Decks, ns.Rarity = E.CARDS, E.GAME_DECKS, E.RARITIES
local tr = E.tr

local ART = "Interface\\AddOns\\" .. ADDON .. "\\Art\\"
local ART_B = 358 / 512                    -- Kartenbild: oberer Teil der 256x512-Textur
local FONT = STANDARD_TEXT_FONT or "Fonts\\FRIZQT__.TTF"
local BW, BH, SW = 1560, 880, 270          -- Spielfeld (breit, 16:9) und Seitenleiste (über dem Feld, per Knopf)
local FW, FH = 124, 173                    -- Karten im Spiel
local HW, HH = 148, 207                    -- Helden
local CW, CH = 124, 173                    -- Hand
local RW, RH = 84, 117                     -- Ressourcen
local GW, GH = 110, 154                    -- Friedhof
local BKW, BKH = 74, 103                   -- gegnerische Hand (Rückseiten)
local OPP_ROW, OWN_ROW, ROW_H = 222, 452, 220
local MID = BW / 2                         -- Mitte des Spielfelds (x)
-- Feste Plätze (wie im Browser: Gegner oben links Held+Friedhof, oben rechts Ressourcen; unten gespiegelt)
local OWN_HERO_X = BW - 10 - HW - 20       -- Platz rechts für den Lebensbalken
local OWN_GY_X = OWN_HERO_X - GW - 18
local OPP_RES = { BW - 54 - 420, BW - 54 }  -- rechts frei für den Menü-Knopf
local OWN_RES = { 10, 410 }
local OPP_HAND = { MID - 260, MID + 260 }
local OWN_HAND = { MID - 360, MID + 360 }
local GAP_Y = 446                          -- Trennlinie zwischen den Reihen

local COL = {
    gold = { 0.92, 0.78, 0.4 }, white = { 1, 1, 1 }, grey = { 0.7, 0.7, 0.7 }, red = { 1, 0.35, 0.3 },
    green = { 0.4, 0.95, 0.45 }, blue = { 0.5, 0.75, 1 }, yellow = { 1, 0.85, 0.2 },
}
local GLOW = { act = { 1, 0.82, 0.15 }, target = { 0.3, 1, 0.4 }, attack = { 1, 0.25, 0.2 }, good = { 1, 0.9, 0.3 } }
local LOG_COLORS = {
    ["log-turn"] = { 1, 0.82, 0.3 }, ["log-hit"] = { 1, 0.45, 0.35 }, ["log-heal"] = { 0.5, 1, 0.55 },
    ["log-combat"] = { 1, 0.7, 0.4 }, ["log-quest"] = { 0.95, 0.8, 0.35 }, [""] = { 0.85, 0.85, 0.85 },
}

local db
local cpu = { co = nil, inAI = false, frameStart = 0, skip = false }

local function now() return GetTime and GetTime() or 0 end
local function G() return UI.game end

-- ---------------------------------------------------------------------------
-- Grundbausteine
-- ---------------------------------------------------------------------------
local function text(parent, size, col, layer)
    local fs = parent:CreateFontString(nil, layer or "OVERLAY")
    fs:SetFont(FONT, size or 12, "OUTLINE")
    local c = col or COL.white
    fs:SetTextColor(c[1], c[2], c[3])
    return fs
end

local BTN = { normal = { 0.17, 0.12, 0.08 }, success = { 0.1, 0.34, 0.13 }, danger = { 0.45, 0.1, 0.08 }, good = { 0.42, 0.32, 0.05 } }
local function button(parent, label, w, h, kind)
    local b = CreateFrame("Button", nil, parent)
    b:SetSize(w or 120, h or 26)
    b.edge = b:CreateTexture(nil, "BACKGROUND"); b.edge:SetAllPoints(); b.edge:SetColorTexture(0.62, 0.5, 0.25, 1)
    b.bg = b:CreateTexture(nil, "BACKGROUND", nil, 1); b.bg:SetPoint("TOPLEFT", 1, -1); b.bg:SetPoint("BOTTOMRIGHT", -1, 1)
    b.label = text(b, 12, COL.white); b.label:SetPoint("LEFT", 6, 0); b.label:SetPoint("RIGHT", -6, 0); b.label:SetJustifyH("CENTER")
    b.label:SetText(label or "")
    b.paint = function(self, hover)
        local c = BTN[self.kind] or BTN.normal
        local k = hover and 1.6 or 1
        self.bg:SetColorTexture(math.min(1, c[1] * k + (hover and 0.04 or 0)), math.min(1, c[2] * k + (hover and 0.04 or 0)), math.min(1, c[3] * k + (hover and 0.04 or 0)), 0.96)
    end
    b.setKind = function(self, k) self.kind = k or "normal"; self:paint(false) end
    b.setText = function(self, s) self.label:SetText(s or "") end
    b.setOn = function(self, on) self.off = not on; self:SetAlpha(on and 1 or 0.4) end
    b:setKind(kind)
    b:SetScript("OnEnter", function(self)
        if not self.off then self:paint(true) end
        if self.tip and GameTooltip then GameTooltip:SetOwner(self, "ANCHOR_TOP"); GameTooltip:AddLine(self.tip, 1, 1, 1, true); GameTooltip:Show() end
    end)
    b:SetScript("OnLeave", function(self) self:paint(false) if self.tip and GameTooltip then GameTooltip:Hide() end end)
    return b
end
local function onClick(b, fn) b:SetScript("OnClick", function(self, ...) if self.off then return end fn(self, ...) end) end

local function panel(parent, a)
    local f = CreateFrame("Frame", nil, parent)
    f.edge = f:CreateTexture(nil, "BACKGROUND"); f.edge:SetAllPoints(); f.edge:SetColorTexture(0.62, 0.5, 0.25, 0.9)
    f.bg = f:CreateTexture(nil, "BACKGROUND", nil, 1); f.bg:SetPoint("TOPLEFT", 1, -1); f.bg:SetPoint("BOTTOMRIGHT", -1, 1)
    f.bg:SetColorTexture(0.05, 0.035, 0.025, a or 0.94)
    return f
end

local function at(f, x, y, rel) f:ClearAllPoints(); f:SetPoint("TOPLEFT", rel or UI.board, "TOPLEFT", x, -y) end

-- Werte-Symbol wie im Browser (renderer.js: "Bottom Icons/…png" mit Zahl darüber, css .cfx-stat-badge):
-- Breite 38 % der Karte, Zahl 20 % der Kartenbreite mit dicker schwarzer Kontur.
-- Zahlenposition je Symbol: "lean" (ATK, Schlag) 42 % / 58 %, "hp" 57 % / 51 %, sonst 50 % / 51 %
local NUM_POS = { lean = { 0.42, 0.58 }, hp = { 0.57, 0.51 }, def = { 0.5, 0.51 } }
local function statIcon(parent)
    local f = CreateFrame("Frame", nil, parent)
    f:SetSize(48, 48)
    f.tex = f:CreateTexture(nil, "ARTWORK"); f.tex:SetAllPoints()
    f.txt = f:CreateFontString(nil, "OVERLAY")
    f.txt:SetFont(FONT, 24, "THICKOUTLINE")
    -- icon: Dateiname in Art (icon_<name>.tga), v: Zahl, cardW: Kartenbreite, kind: lean / hp / def
    f.set = function(self, icon, v, col, cardW, kind)
        if v == nil then self:Hide() return end
        local s = math.floor(cardW * 0.38 + 0.5)
        self:SetSize(s, s)
        self.tex:SetTexture(ART .. "icon_" .. icon .. ".tga")
        self.txt:SetFont(FONT, math.max(9, math.floor(cardW * 0.2 + 0.5)), "THICKOUTLINE")
        local p = NUM_POS[kind] or NUM_POS.def
        self.txt:ClearAllPoints(); self.txt:SetPoint("CENTER", self, "TOPLEFT", s * p[1], -s * p[2])
        self.txt:SetText(tostring(v))
        local c = col or COL.white
        self.txt:SetTextColor(c[1], c[2], c[3])
        self:Show()
    end
    f:Hide()
    return f
end

-- Mana-Edelstein (css .mana-gem) für "VERFÜGBAR"
local function manaGem(parent, size)
    local f = CreateFrame("Frame", nil, parent)
    f:SetSize(size, size)
    f.tex = f:CreateTexture(nil, "ARTWORK"); f.tex:SetAllPoints(); f.tex:SetTexture(ART .. "mana.tga")
    f.txt = f:CreateFontString(nil, "OVERLAY"); f.txt:SetFont(FONT, math.floor(size * 0.54), "THICKOUTLINE"); f.txt:SetPoint("CENTER", 0, 0)
    f.base = size
    f.pulse = function(self, up)
        if not ns.FX then return end
        local sz = self.base
        ns.FX.Tween(up and 0.7 or 0.5, function(t)
            local k = math.sin(math.pi * math.min(1, t / 0.7)) * (up and 0.3 or 0.25)
            self:SetSize(sz * (1 + k), sz * (1 + k))
            if up then self.tex:SetVertexColor(1, 1, 1 - 0.6 * k / 0.3) else self.tex:SetVertexColor(1, 1 - 1.6 * k, 1 - 1.6 * k) end
        end, function() self:SetSize(sz, sz); self.tex:SetVertexColor(1, 1, 1) end, 0, "gem" .. tostring(self))
    end
    f.set = function(self, v)
        self.txt:SetText(tostring(v))
        local empty = v == 0                                                   -- leer: grau und dunkel
        if self.tex.SetDesaturated then self.tex:SetDesaturated(empty) end
        self.tex:SetVertexColor(empty and 0.55 or 1, empty and 0.55 or 1, empty and 0.55 or 1)
    end
    return f
end

-- Log-Text für die WoW-Schrift: Emojis und Symbole, die sie nicht kennt, entfernen
local function wowText(s)
    s = tostring(s or "")
    s = s:gsub("\226\134\146", "->"):gsub("\226\134\144", "<-"):gsub("\226\134\182", "")
    s = s:gsub("[\240-\244][\128-\191][\128-\191][\128-\191]", "")       -- 4-Byte-Zeichen (Emojis)
    s = s:gsub("\239\184\143", "")                                          -- Variantenwähler
    s = s:gsub("\226[\132-\159][\128-\191]", "")                            -- Symbole (Pfeile, ⚔, ★ …), Satzzeichen bleiben
    s = s:gsub("^%s+", "")
    return s
end

-- ---------------------------------------------------------------------------
-- Karten-Schaltflächen
-- ---------------------------------------------------------------------------
local function setArtCoords(b)
    if b.fxRot then b.art:SetTexCoord(0, ART_B, 1, ART_B, 0, 0, 1, 0)   -- 90° im Uhrzeigersinn (erschöpft)
    else b.art:SetTexCoord(0, 1, 0, ART_B) end
end

local function newCard(parent)
    local b = CreateFrame("Button", nil, parent)
    b:RegisterForClicks("LeftButtonUp", "RightButtonUp")
    b.edge = b:CreateTexture(nil, "BORDER"); b.edge:SetAllPoints(); b.edge:SetColorTexture(0, 0, 0, 0.9)
    b.plain = b:CreateTexture(nil, "BORDER", nil, 1); b.plain:SetPoint("TOPLEFT", 2, -2); b.plain:SetPoint("BOTTOMRIGHT", -2, 2)
    b.plain:SetColorTexture(0.18, 0.15, 0.1, 1)
    b.art = b:CreateTexture(nil, "ARTWORK"); b.art:SetPoint("TOPLEFT", 2, -2); b.art:SetPoint("BOTTOMRIGHT", -2, 2)
    b.fxInset = 2
    b.shade = b:CreateTexture(nil, "ARTWORK", nil, 5); b.shade:SetAllPoints(b.art); b.shade:SetColorTexture(0, 0, 0, 0.55); b.shade:Hide()
    -- Aufblitzen (Treffer rot, Heilung grün, Bereitmachen gold – wie die Browser-Animationen)
    b.flash = b:CreateTexture(nil, "ARTWORK", nil, 6); b.flash:SetAllPoints(b.art); b.flash:SetColorTexture(1, 1, 1, 1); b.flash:SetBlendMode("ADD"); b.flash:SetAlpha(0)
    b.name = text(b, 11); b.name:SetPoint("TOPLEFT", 6, -8); b.name:SetPoint("TOPRIGHT", -6, -8); b.name:SetJustifyH("CENTER")
    b.atkB, b.hpB = statIcon(b), statIcon(b)
    b.atkB:SetPoint("BOTTOMLEFT", 0, 0); b.hpB:SetPoint("BOTTOMRIGHT", 0, 0)
    b.tag = text(b, 12, COL.yellow); b.tag:SetPoint("TOP", 0, -4)
    b.mark = text(b, 13, COL.white); b.mark:SetPoint("CENTER", 0, 0); b.mark:SetJustifyH("CENTER")
    b.cap = text(b, 11, COL.gold); b.cap:SetPoint("TOP", b, "BOTTOM", 0, -2); b.cap:SetJustifyH("CENTER")
    b:SetScript("OnClick", function(self, mouse) if UI.CardClick then UI.CardClick(self, mouse) end end)
    -- Ebene setzen; die Plaketten (eigene Frames) immer darüber – ältere Clients ziehen Kinder nicht mit
    b.setLevel = function(self, l) self:SetFrameLevel(l); self.atkB:SetFrameLevel(l + 2); self.hpB:SetFrameLevel(l + 2) end
    b:SetScript("OnEnter", function(self)
        if self.raise then
            self.baseLevel = self:GetFrameLevel(); self:setLevel((self.baseLevel or 1) + 40)
            -- Handkarte fährt hoch (Browser: .hand-up / Anheben beim Überfahren)
            if ns.FX and self._x then
                local x0, y0 = self._x, self._y
                ns.FX.Cancel("mv" .. self.pi)
                ns.FX.Tween(0.16, function(p) at(self, x0, y0 - 30 * ns.FX.easeOut(p)) end, nil, 0, "hov" .. self.pi)
            end
            UI.Sound("hover")
        end
        if UI.ShowTooltip and self.card and self.tipOk then UI.ShowTooltip(self.card) end
    end)
    b:SetScript("OnLeave", function(self)
        if self.raise and self.baseLevel then
            self:setLevel(self.baseLevel)
            if ns.FX and self._x then
                local x0, y0 = self._x, self._y
                ns.FX.Tween(0.16, function(p) at(self, x0, y0 - 30 * (1 - ns.FX.easeOut(p))) end, nil, 0, "hov" .. self.pi)
            end
        end
        if GameTooltip then GameTooltip:Hide() end
    end)
    if ns.FX then ns.FX.Attach(b) end   -- Zoom, Neigung, Foil, Glanz, Leuchten (FX.lua)
    return b
end

-- Kartenbilder: Art/<id>.tga (256 breit) und Art/hd/<id>.tga (512 breit, wie die Browser-Bilder 716 px).
-- Große Darstellung (Vorschau, Kartenschau, große Karten auf hochauflösenden Bildschirmen) nimmt HD.
local TOKEN_ART = { [9001] = true, [9002] = true, [9004] = true, [9005] = true }   -- Browser: TOKEN_IMG
local function artPath(card, o, hd)
    local dir = (hd == "xl") and (ART .. "xl\\") or (hd and (ART .. "hd\\")) or ART
    if o.faceDown then return dir .. "back.tga" end
    if not card or not card.id then return nil end
    if card.type == "Hero" and card.flipped then return dir .. card.id .. "b.tga" end
    if card.isToken or card.id > 9000 then return TOKEN_ART[card.id] and (dir .. card.id .. ".tga") or nil end
    return dir .. card.id .. ".tga"
end
-- Bildschirm-Pixel je UI-Einheit des Spielfelds (WoW: 768 Einheiten = Bildschirmhöhe bei Skalierung 1)
local function pxPerUnit()
    local ph = 1080
    if GetPhysicalScreenSize then local _, h = GetPhysicalScreenSize() if h and h > 0 then ph = h end end
    local s = UI.board and UI.board:GetEffectiveScale() or 1
    return ph / 768 * s
end
local function wantHD(w) return w * pxPerUnit() > 270 end            -- über ~270 px Breite reicht die 256er Fassung nicht
-- Bildqualität fest "Mittel" (im Spiel getestet, reicht): Feld 256 px, große Vorschau 512 px (Art/hd). XL-Bilder entfernt.
local function quality() return 2 end
local function fieldRes(w) local q = quality() if q == 4 then return true elseif q == 3 then return wantHD(w) end return false end
local function zoomRes() local q = quality() if q == 1 then return false elseif q == 2 then return true end return "xl" end
-- große Vorschau für Karten ohne eigene Angabe (Mulligan, Entscheidungen, Friedhof; FX.lua)
function ns.CardArtZoom(id) return artPath({ id = id }, {}, zoomRes()) end

-- Schadensart-Symbol (main.js getDamageIcon): Allies ihre gedruckte Angriffsart, sonst nach Klasse
local DMG_ICONS = { Arcane = true, Fire = true, Frost = true, Holy = true, Melee = true, Nature = true, Ranged = true, Shadow = true }
local CLASS_ICON = { Hunter = "ranged", Mage = "fire", Warlock = "shadow", Priest = "holy", Paladin = "holy", Druid = "nature", Shaman = "nature" }
local function damageIcon(c)
    if c.type == "Ally" and c.atkType and DMG_ICONS[c.atkType] then return c.atkType:lower() end
    if c.type == "Weapon" then return c.slot == "Ranged" and "ranged" or "melee" end
    if c.type == "Hero" or c.type == "Ally" then return CLASS_ICON[c.class or ""] or "melee" end
    return "melee"
end
-- Werte wie im Browser (renderer.js): ATK links, Leben/Verteidigung rechts; erhöhter ATK grün, 0 ATK unsichtbar
local function setStats(b, c, o)
    b.atkB:Hide(); b.hpB:Hide()
    if not c or o.faceDown or o.stats == false then return end
    local cw = o.rot and o.h or o.w                                         -- Kartenbreite (hochkant)
    local base = c.b or E.CARDS[c.id] or {}
    if c.type == "Ally" or c.type == "Hero" or c.isTotem then
        local atk = (c.atk or 0) + (c.tempAtkBonus or 0)
        if atk > 0 then b.atkB:set(damageIcon(c), atk, (c.type ~= "Hero" and base.atk and atk > base.atk) and COL.green or COL.white, cw, "lean") end
        b.hpB:set("health", math.max(0, (c.hp or 0) - (c.damage or 0)), COL.white, cw, "hp")
    elseif c.type == "Weapon" then
        local atk = (c.atk or 0) + (c.tempAtkBonus or 0)
        b.atkB:set("melee", atk, (base.atk and atk > base.atk) and COL.green or COL.white, cw, "lean")
        b.hpB:set("strike", c.strike or 0, COL.white, cw, "lean")
    elseif c.type == "Armor" then
        b.hpB:set("armor", c.def or 0, COL.white, cw, "def")
    end
end

-- Karte zeichnen. o = { x, y, w, h, zone, pid, idx, rot, faceDown, glow, pulse, dim, level, stats, raise, tip, zoomTex }
local function drawCard(b, card, o)
    b.card, b.ref = card, o
    b.uidA = card and card.uid or nil                                      -- auch verdeckt: nur für Animationen
    b:SetSize(o.w, o.h)
    b._x, b._y, b._w, b._h = o.x, o.y, o.w, o.h
    at(b, o.x, o.y)
    if o.level then b:setLevel(UI.board:GetFrameLevel() + o.level) end
    b.raise, b.tipOk = o.raise, o.tip
    b.fxRot = o.rot and true or false
    b.fxNoTilt = b.fxRot
    local tex = artPath(card, o, fieldRes(o.rot and o.h or o.w))
    b.fxArtTex = tex                                                       -- Neigung zeigt genau dieses Bild (FX.lua)
    if tex then b.art:SetTexture(tex); setArtCoords(b); b.art:Show(); b.plain:Hide(); b.name:SetText("")
    else
        b.art:Hide(); b.plain:Show()
        b.name:SetText(card and card.name or "")
    end
    b.fxTex = o.zoomTex or (card and not o.faceDown and artPath(card, o, zoomRes())) or nil   -- große Vorschau je nach Bildqualität
    -- Rückseite ohne eigene Zoom-Ansicht (gegnerische verdeckte Karten)
    if o.faceDown and not o.zoomTex then b.card = nil end
    b.shade:SetShown(o.dim and true or false)
    b.tag:SetText(o.tag or "")
    b.mark:SetText(o.mark or "")
    b.cap:SetText(o.cap or "")
    setStats(b, card, o)
    if ns.FX then ns.FX.Update(b, card or {}, { pulse = o.pulse, glow = o.glow }) end
    if b.glow and o.glow and not o.pulse then b.glow:SetAlpha(0.7) end
    b:SetAlpha(1)
end

local pool, used = {}, 0
local function acquire()
    used = used + 1
    local b = pool[used]
    if not b then b = newCard(UI.board); b.pi = used; pool[used] = b end
    b:Show()
    return b
end
local function releaseAll()
    for i = 1, #pool do
        local b = pool[i]
        if ns.FX then ns.FX.Cancel("mv" .. i); ns.FX.Cancel("hov" .. i); ns.FX.Cancel("in" .. i) end
        if ns.FX then ns.FX.Cancel("fl" .. tostring(b)) end
        if b.flash then b.flash:SetAlpha(0) end
        b:Hide(); b.card = nil; b.ref = nil; b.uidA = nil; b._cx, b._cy = nil, nil; b:SetAlpha(1)
    end
    used = 0
end
local function buttonFor(uid)
    for i = 1, used do local b = pool[i] if b.card and b.card.uid == uid then return b end end
end
function UI.CardButtons() local out = {} for i = 1, used do out[i] = pool[i] end return out end   -- für Tests (addon/_ui_test.lua)

-- ---------------------------------------------------------------------------
-- Game Feel wie im Browser (ui.js: flyFrom, Todes-Animation am alten Platz, animateAttack, Treffer-Blitz,
-- screenShake, Mana-Puls). Vor jedem Neuzeichnen werden die Plätze aller Karten gemerkt; danach fliegt jede
-- Karte von ihrem alten an den neuen Platz, neue Karten fliegen herein, verschwundene zerfallen.
-- ---------------------------------------------------------------------------
local FIELD = { party = true, equip = true, hero = true }
local function placeLive(b, x, y) b._cx, b._cy = x, y; at(b, x, y) end
local function moveAnim(b, p)
    local x, y, w, h = b._x, b._y, b._w, b._h
    local ox, oy, ow, oh = p.x, p.y, p.w or w, p.h or h
    ns.FX.Tween(0.38, function(t)
        local e, k = ns.FX.easeBack(t), ns.FX.easeOut(t)
        placeLive(b, ox + (x - ox) * e, oy + (y - oy) * e)
        b:SetSize(ow + (w - ow) * k, oh + (h - oh) * k)
    end, function() b._cx, b._cy = nil, nil; at(b, x, y); b:SetSize(w, h) end, 0, "mv" .. b.pi)
end
local function flyIn(b, dx, dy, delay)
    local x, y = b._x, b._y
    b:SetAlpha(0)
    ns.FX.Tween(0.34, function(t)
        local e = ns.FX.easeOut(t)
        placeLive(b, x + dx * (1 - e), y + dy * (1 - e)); b:SetAlpha(math.min(1, t * 2.5))
    end, function() b._cx, b._cy = nil, nil; at(b, x, y); b:SetAlpha(1) end, delay or 0, "in" .. b.pi)
end
local function flash(b, r, g, bl, a, dur)
    if not b or not b.flash or not ns.FX then return end
    b.flash:SetVertexColor(r, g, bl)
    ns.FX.Tween(dur or 0.45, function(t) b.flash:SetAlpha((a or 0.6) * (1 - t)) end, function() b.flash:SetAlpha(0) end, 0, "fl" .. tostring(b))
end
UI.Flash = flash

-- Zerstörte Karte zerfällt an ihrem alten Platz (rot, kleiner, sinkt, verblasst)
local ghosts = {}
local function ghost(p)
    if not p.tex or not ns.FX then return end
    local g
    for _, x in ipairs(ghosts) do if not x.busy then g = x break end end
    if not g then
        g = CreateFrame("Frame", nil, UI.board)
        g.edge = g:CreateTexture(nil, "BORDER"); g.edge:SetAllPoints(); g.edge:SetColorTexture(0, 0, 0, 0.9)
        g.tex = g:CreateTexture(nil, "ARTWORK"); g.tex:SetPoint("TOPLEFT", 2, -2); g.tex:SetPoint("BOTTOMRIGHT", -2, 2)
        g.red = g:CreateTexture(nil, "ARTWORK", nil, 2); g.red:SetAllPoints(g.tex); g.red:SetColorTexture(0.95, 0.12, 0.05, 1); g.red:SetBlendMode("ADD")
        ghosts[#ghosts + 1] = g
    end
    g.busy = true
    g:SetFrameLevel(UI.board:GetFrameLevel() + 80)
    g.tex:SetTexture(p.tex)
    if p.rot then g.tex:SetTexCoord(0, ART_B, 1, ART_B, 0, 0, 1, 0) else g.tex:SetTexCoord(0, 1, 0, ART_B) end
    g:Show()
    local cx, cy = p.x + p.w / 2, p.y + p.h / 2
    ns.FX.Tween(0.65, function(t)
        local s = 1 - 0.28 * t
        local w, h = p.w * s, p.h * s
        g:SetSize(w, h); at(g, cx - w / 2, cy - h / 2 + 22 * t)
        g:SetAlpha(1 - t * t); g.red:SetAlpha(0.6 * (1 - t))
        g.tex:SetVertexColor(1, 1 - 0.65 * t, 1 - 0.65 * t)
    end, function() g:Hide(); g.busy = false end)
end

function UI.SnapPositions()
    local snap = {}
    for i = 1, used do
        local b = pool[i]
        local r = b.ref
        if b.uidA and r and b:IsShown() then
            snap[b.uidA] = { x = b._cx or b._x, y = b._cy or b._y, w = b._w, h = b._h, zone = r.zone, pid = r.pid, tex = b.fxArtTex, rot = b.fxRot }
        end
    end
    return snap
end

function UI.Animate(prev)
    if not ns.FX or not prev then return end
    local seen = {}
    local played, drawn, died, k = false, 0, false, 0
    for i = 1, used do
        local b = pool[i]
        local r = b.ref
        local uid = b.uidA
        if uid and r then
            seen[uid] = true
            local p = prev[uid]
            if p then
                if math.abs(p.x - b._x) + math.abs(p.y - b._y) > 3 or math.abs((p.w or 0) - b._w) > 2 then
                    moveAnim(b, p)
                    if FIELD[r.zone] and not FIELD[p.zone] then played = true end
                    if FIELD[p.zone] and r.zone == "gy" then died = true; flash(b, 1, 0.15, 0.05, 0.7, 0.6) end
                end
                -- bereitgemacht: goldenes Aufleuchten (Browser: Glühen beim Aufrichten)
                if p.zone == r.zone and p.rot and not b.fxRot and (FIELD[r.zone] or r.zone == "res") then flash(b, 1, 0.8, 0.25, 0.55, 0.7) end
            else
                if r.zone == "hand" then k = k + 1; flyIn(b, 240, 30, 0.07 * (k - 1)); drawn = drawn + 1
                elseif r.zone == "opphand" then flyIn(b, 60, -90, 0)
                elseif FIELD[r.zone] then flyIn(b, 0, (r.pid == 2) and -50 or 50, 0); played = true
                elseif r.zone == "res" then flyIn(b, 0, (r.pid == 2) and -40 or 40, 0) end
            end
        end
    end
    for uid, p in pairs(prev) do
        if not seen[uid] and FIELD[p.zone] then ghost(p); died = true end
    end
    if died then UI.Sound("destroy") elseif played then UI.Sound("play") end
    if drawn > 0 then UI.Sound("draw") end
end

-- Angreifer stößt zum Ziel vor und zurück (Browser: animateAttack); done läuft am Ende
function UI.Lunge(attUid, defUid, done)
    local a, d = buttonFor(attUid), buttonFor(defUid)
    if not (ns.FX and a and d and a._x and d._x) then if done then done() end return end
    local ax, ay = a._x, a._y
    local dx = (d._x + d._w / 2) - (ax + a._w / 2)
    local dy = (d._y + d._h / 2) - (ay + a._h / 2)
    a:setLevel(UI.board:GetFrameLevel() + 75)
    UI.animLock = now() + 1                                                -- Sperre mit Ablauf (Sicherung)
    -- eigener Schlüssel: Neuzeichnen bricht den Vorstoß nicht ab; wird die Schaltfläche neu vergeben, bleibt sie stehen
    ns.FX.Tween(0.36, function(t)
        if a.uidA ~= attUid then return end
        local e = (t < 0.55) and ns.FX.easeOut(t / 0.55) or (1 - ns.FX.easeOut((t - 0.55) / 0.45))
        placeLive(a, ax + dx * 0.42 * e, ay + dy * 0.42 * e)
    end, function()
        if a.uidA == attUid then a._cx, a._cy = nil, nil; at(a, ax, ay) end
        UI.animLock = nil
        if done then done() end
    end, 0, "lunge")
    flash(d, 1, 0.3, 0.2, 0.35, 0.36)
end

-- Bildschirm wackelt (Browser: screenShake bei großen Karten und schweren Treffern)
function UI.ScreenShake(k)
    if not ns.FX or not UI.board then return end
    local b = UI.board
    ns.FX.Tween(0.42, function(t)
        local a = (1 - t) * 7 * (k or 1)
        b:ClearAllPoints(); b:SetPoint("TOPLEFT", math.sin(t * 52) * a, math.cos(t * 41) * a)
    end, function() b:ClearAllPoints(); b:SetPoint("TOPLEFT", 0, 0) end, 0, "shake")
end

-- Töne: Das Browserspiel erzeugt seine Töne selbst (Oszillatoren); WoW spielt nur eigene Klänge oder ogg/mp3-Dateien.
-- Daher passende WoW-Oberflächenklänge (je Ereignis der erste vorhandene SOUNDKIT-Name).
local SOUND_KITS = {
    hover = { "U_CHAT_SCROLL_BUTTON" },
    draw = { "IG_ABILITY_PAGE_TURN" },
    play = { "IG_ABILITY_ICON_DROP", "IG_SPELLBOOK_OPEN" },
    hit = { "IG_CREATURE_AGGRO_SELECT" },
    heal = { "IG_QUEST_LIST_COMPLETE", "IG_QUEST_LIST_OPEN" },
    destroy = { "IG_QUEST_LOG_ABANDON_QUEST" },
    turn = { "READY_CHECK", "RAID_WARNING" },
    win = { "LEVELUPSOUND", "LEVEL_UP", "UI_EPICLOOT_TOAST" },
    lose = { "IG_QUEST_FAILED" },
    protect = { "IG_CHARACTER_INFO_TAB" },
}
local lastSound = {}
function UI.Sound(name)
    if not db or db.sound == false or not PlaySound or not SOUNDKIT then return end
    local t = now()
    if lastSound[name] and t - lastSound[name] < ((name == "hover") and 0.06 or 0.12) then return end
    lastSound[name] = t
    for _, key in ipairs(SOUND_KITS[name] or {}) do
        local id = SOUNDKIT[key]
        if id then pcall(PlaySound, id, "SFX") return end
    end
end

-- ---------------------------------------------------------------------------
-- Tooltip (Kartentext neben dem Zoom)
-- ---------------------------------------------------------------------------
local TYPE_DE = { Hero = "Held", Ally = "Verbündeter", Ability = "Fähigkeit", Weapon = "Waffe", Armor = "Rüstung", Item = "Gegenstand", Quest = "Quest" }
function UI.CardTypeLabel(card) if not card then return "" end return tr(TYPE_DE[card.type] or card.type or "") end
function UI.ShowTooltip(card)
    if not card or not GameTooltip or not db or db.showTooltips == false then return end
    local z = ns.FX and ns.FX.zoomFrame
    if z and z:IsShown() then
        -- neben die große Vorschau (auf die Seite mit mehr Platz), oben bündig
        GameTooltip:SetOwner(z, "ANCHOR_NONE")
        local zl, zr, W = z:GetLeft() or 0, z:GetRight() or 0, UIParent:GetWidth() or 1920
        if W - zr >= zl then GameTooltip:SetPoint("TOPLEFT", z, "TOPRIGHT", 8, 0) else GameTooltip:SetPoint("TOPRIGHT", z, "TOPLEFT", -8, 0) end
    else GameTooltip:SetOwner(UIParent, "ANCHOR_CURSOR") end
    GameTooltip:AddLine(card.name or "?", 1, 0.85, 0.4)
    if card.typeLine then GameTooltip:AddLine(card.typeLine, 0.8, 0.8, 0.8, true) end
    if card.text and card.text ~= "" then GameTooltip:AddLine(card.text, 1, 1, 1, true) end
    if E.CARD_ISSUES and E.CARD_ISSUES[card.id] then GameTooltip:AddLine(tostring(E.CARD_ISSUES[card.id]), 1, 0.5, 0.2, true) end
    GameTooltip:Show()
end

-- ---------------------------------------------------------------------------
-- Engine-Anbindung: Log, Rückgängig, Töne
-- ---------------------------------------------------------------------------
local function hookEngine()
    E.addLog = function(msg, cls, pid) UI.AddLog(msg, cls, pid) end
    E.takeUndoSnapshot = function() return E.deepCopy(UI.game) end
    E.commitUndoSnapshot = function(snap, action) UI.CommitUndo(snap, action) end
    E.sfx = function() end                                                  -- Töne kommen aus UI.Animate (passend zur Bewegung)
    -- CPU-Suche auf mehrere Frames verteilen (nur im CPU-Ablauf, nie in pcall)
    E.AI_YIELD = function() if cpu.inAI and E.nowMs() - cpu.frameStart > 12 then coroutine.yield() end end
end

function UI.AddLog(msg, cls, pid)
    if not UI.log then return end
    local c = LOG_COLORS[cls or ""] or LOG_COLORS[""]
    if cls == "log-sep" then                                                -- Trennlinie zwischen den Zügen
        local s = G()
        local name = pid == 1 and tr("Du") or (UI.oppName or "CPU")
        local col = pid == 1 and "|cff66ccff" or "|cffff7766"
        UI.log:AddMessage(col .. "- - - " .. tr("Zug {0}", s and s.turn or "?") .. ": " .. name .. " - - -|r")
        return
    end
    local who = ""
    if pid == 1 then who = "|cff66ccff" .. tr("Du") .. ":|r " elseif pid == 2 then who = "|cffff7766" .. (UI.oppName or "CPU") .. ":|r " end
    if cls == "log-turn" then who = "" end
    UI.log:AddMessage(who .. wowText(msg), c[1], c[2], c[3])
end

-- Rückgängig (wie im Browser): nur eigene, abgeschlossene Aktionen der eigenen Aktionsphase, solange nichts Verdecktes
-- aufgedeckt wurde, kein Zufall im Spiel war und der Gegner nichts entschieden hat
local function undoDesc(snap, a)
    local p = snap.p1
    if a.type == "PLACE_RESOURCE" then local c = p.hand[a.handIdx] return c and tr("Ressource ({0})", c.name) or tr("Ressource") end
    if a.type == "PLAY_CARD" then local c = p.hand[a.handIdx] return c and c.name or tr("Karte") end
    if a.type == "COMPLETE_QUEST" then local r = p.resources[a.resIdx] return (r and r.card) and ("Quest " .. r.card.name) or "Quest" end
    if a.type == "ATTACK" then return tr("Angriff") end
    if a.type == "ACTIVATE" then return tr("Kraft") end
    return tr("Aktion")
end
function UI.CommitUndo(snap, a)
    local s = UI.game
    local function sig(pl) return table.concat(pl.deck, ",") end
    if sig(snap.p1) ~= sig(s.p1) or sig(snap.p2) ~= sig(s.p2) or s._hidden or s._oppDecided or s.gameOver or a.type == "END_TURN" then UI.undo = {} return end
    if not E.isIdle(s) then return end
    UI.undo[#UI.undo + 1] = { snap = snap, desc = undoDesc(snap, a) }
    if #UI.undo > 30 then table.remove(UI.undo, 1) end
end
function UI.CanUndo() local s = UI.game return s and #UI.undo > 0 and s.activePlayer == 1 and not UI.busy and not s.gameOver and E.isIdle(s) end
function UI.Undo()
    if not UI.CanUndo() then return end
    local u = table.remove(UI.undo)
    UI.game = u.snap; UI.game.real = true; UI.game.humans = { 1 }
    UI.attacker = nil
    UI.AddLog(tr("Rückgängig: {0}", u.desc), "log-turn")
    UI.noAnim = true
    UI.SnapDamage()
    UI.Render()
end

-- ---------------------------------------------------------------------------
-- Hauptfenster
-- ---------------------------------------------------------------------------
local function fitScale()
    local w, h = UIParent:GetWidth() or 1920, UIParent:GetHeight() or 1080
    local s = math.min(1, (h * 0.95) / BH, (w * 0.97) / BW)
    return math.max(0.4, s * (db.scale or 1))
end

function UI.Initialize()
    if UI.frame then return end
    db = ns.GetDB()
    if db.autoEnd == nil then db.autoEnd = true end
    db.difficulty = db.difficulty or "normal"
    db.mulligan = db.mulligan or "hs"
    if db.scale and db.scale < 0.5 then db.scale = 1 end
    UI.undo = {}
    hookEngine()

    local main = CreateFrame("Frame", "WoWTCGFrame", UIParent)
    main:SetSize(BW, BH)
    main:SetPoint(db.point or "CENTER", UIParent, db.point or "CENTER", db.x or 0, db.y or 0)
    main:SetFrameStrata("HIGH")
    main:SetMovable(true); main:EnableMouse(true); main:SetClampedToScreen(true)
    main:Hide()
    UI.frame = main
    tinsert(UISpecialFrames, "WoWTCGFrame")      -- Esc blendet aus (die Partie läuft weiter)

    -- Spielfeld mit Hintergrund (je Partie ein anderer, wie im Browser)
    local board = CreateFrame("Frame", nil, main)
    board:SetPoint("TOPLEFT", 0, 0); board:SetSize(BW, BH)
    board:EnableMouse(true)
    board:SetScript("OnMouseDown", function() if UI.busy then cpu.skip = true end if UI.menu then UI.menu:Hide() end end)
    board:RegisterForDrag("LeftButton")
    board:SetScript("OnDragStart", function() if not db.locked then main:StartMoving() end end)
    board:SetScript("OnDragStop", function()
        main:StopMovingOrSizing()
        local p, _, _, x, y = main:GetPoint()
        db.point, db.x, db.y = p or "CENTER", x or 0, y or 0
    end)
    UI.board = board
    local edge = board:CreateTexture(nil, "BACKGROUND"); edge:SetPoint("TOPLEFT", -2, 2); edge:SetPoint("BOTTOMRIGHT", 2, -2); edge:SetColorTexture(0.55, 0.45, 0.25, 1)
    UI.bg = board:CreateTexture(nil, "BACKGROUND", nil, 1); UI.bg:SetAllPoints()
    UI.bg:SetTexture(ART .. "table.tga")                       -- alte Tavernen-Tischplatte (Poly Haven "Wood Planks", CC0)
    local dim = board:CreateTexture(nil, "BACKGROUND", nil, 2); dim:SetAllPoints(); dim:SetColorTexture(0.02, 0.015, 0.01, 0.15)
    -- Reihen (leichte Flächen wie im Browser)
    for i, y in ipairs({ OPP_ROW, OWN_ROW }) do
        local r = board:CreateTexture(nil, "BACKGROUND", nil, 3); r:SetPoint("TOPLEFT", 10, -y); r:SetSize(BW - 20, ROW_H)
        r:SetColorTexture(i == 1 and 0.5 or 0.2, 0.2, i == 1 and 0.15 or 0.5, 0.08)
    end
    local line = board:CreateTexture(nil, "BACKGROUND", nil, 4); line:SetPoint("TOPLEFT", 10, -GAP_Y); line:SetSize(BW - 20, 1); line:SetColorTexture(0.85, 0.7, 0.35, 0.35)
    UI.wmOpp = text(board, 22, { 0.6, 0.5, 0.4 }, "BORDER"); UI.wmOpp:SetPoint("CENTER", board, "TOPLEFT", MID, -(OPP_ROW + ROW_H / 2)); UI.wmOpp:SetAlpha(0.25); UI.wmOpp:SetText(tr("Gegnerische Diener"))
    UI.wmOwn = text(board, 22, { 0.6, 0.5, 0.4 }, "BORDER"); UI.wmOwn:SetPoint("CENTER", board, "TOPLEFT", MID, -(OWN_ROW + ROW_H / 2)); UI.wmOwn:SetAlpha(0.25); UI.wmOwn:SetText(tr("Deine Diener"))

    -- Lebensbalken neben den Helden
    UI.hp = {}
    for pid = 1, 2 do
        local f = CreateFrame("Frame", nil, board)
        f:SetSize(14, HH)
        f.track = f:CreateTexture(nil, "ARTWORK"); f.track:SetAllPoints(); f.track:SetColorTexture(0, 0, 0, 0.75)
        f.trail = f:CreateTexture(nil, "ARTWORK", nil, 1); f.trail:SetPoint("BOTTOMLEFT", 2, 2); f.trail:SetWidth(10); f.trail:SetColorTexture(1, 0.9, 0.7, 0.8)
        f.fill = f:CreateTexture(nil, "ARTWORK", nil, 2); f.fill:SetPoint("BOTTOMLEFT", 2, 2); f.fill:SetWidth(10)
        f.num = text(f, 20); f.num:SetPoint("BOTTOM", f, "TOP", 0, 2)
        f.max = text(f, 10, COL.grey); f.max:SetPoint("TOP", f, "BOTTOM", 0, -1)
        UI.hp[pid] = f
    end
    at(UI.hp[2], 10 + HW + 6, 8 + 22); UI.hp[2]:SetHeight(HH - 22)
    at(UI.hp[1], OWN_HERO_X + HW + 5, 664 + 22); UI.hp[1]:SetHeight(HH - 22)

    -- Ressourcen-Anzeige ("VERFÜGBAR")
    UI.resInfo = {}
    for pid = 1, 2 do
        local f = CreateFrame("Frame", nil, board); f:SetSize(170, 56); f:SetFrameLevel(board:GetFrameLevel() + 30)
        f.b = manaGem(f, 52); f.b:SetPoint(pid == 2 and "RIGHT" or "LEFT", 0, 0)
        f.t = text(f, 12, { 0.62, 0.82, 1 }); f.t:SetText(tr("VERFÜGBAR"))
        f.o = text(f, 11, COL.grey)
        -- Gegner gespiegelt (css .top-row .mana-badge: Edelstein rechts, Text rechtsbündig)
        if pid == 2 then f.t:SetPoint("RIGHT", -60, 7); f.o:SetPoint("RIGHT", -60, -8) else f.t:SetPoint("LEFT", 60, 7); f.o:SetPoint("LEFT", 60, -8) end
        UI.resInfo[pid] = f
    end
    at(UI.resInfo[2], OPP_RES[2] - 170, 130); at(UI.resInfo[1], 12, 822)

    -- Mitte: wer ist am Zug, Zug beenden, Angriff abbrechen
    UI.turnText = text(board, 16, COL.gold); UI.turnText:SetPoint("LEFT", board, "TOPLEFT", 330, -GAP_Y)
    UI.cpuStatus = text(board, 12, COL.yellow); UI.cpuStatus:SetPoint("LEFT", board, "TOPLEFT", 330, -(GAP_Y + 18))
    UI.btnEnd = button(board, tr("Zug beenden"), 130, 34, "success"); at(UI.btnEnd, BW - 150, GAP_Y - 17)
    UI.btnEnd:SetFrameLevel(board:GetFrameLevel() + 60)
    onClick(UI.btnEnd, function() UI.EndTurn() end)
    UI.endBar = UI.btnEnd:CreateTexture(nil, "OVERLAY"); UI.endBar:SetPoint("BOTTOMLEFT", 1, 1); UI.endBar:SetHeight(3); UI.endBar:SetColorTexture(1, 0.85, 0.3, 1); UI.endBar:Hide()
    UI.btnCancel = button(board, tr("Abbrechen"), 110, 30, "danger"); at(UI.btnCancel, BW - 272, GAP_Y - 15)
    UI.btnCancel:SetFrameLevel(board:GetFrameLevel() + 60)
    onClick(UI.btnCancel, function() UI.attacker = nil; UI.Render() end)

    -- Kette (links in der Lücke zwischen den Reihen)
    UI.chainBox = panel(board, 0.88); UI.chainBox:SetSize(300, 78); at(UI.chainBox, 12, GAP_Y - 39)
    UI.chainBox:SetFrameLevel(board:GetFrameLevel() + 70)
    UI.chainText = text(UI.chainBox, 11); UI.chainText:SetPoint("TOPLEFT", 8, -6); UI.chainText:SetPoint("RIGHT", -8, 0); UI.chainText:SetJustifyH("LEFT"); UI.chainText:SetJustifyV("TOP")
    UI.chainBox:Hide()

    UI.BuildSide(main)
    UI.BuildOverlays(main)
    main:SetScript("OnUpdate", function(_, el) UI.OnUpdate(el) end)
    UI.ApplySettings()
end

-- Seitenleiste (wie #side-panel im Browser): standardmäßig zu, der Knopf ☰ oben rechts schiebt sie über das Spielfeld
function UI.BuildSide(main)
    local side = panel(main, 0.96)
    side:SetPoint("TOPRIGHT", UI.board, "TOPRIGHT", 0, 0); side:SetSize(SW, BH)
    side:SetFrameLevel(main:GetFrameLevel() + 90)
    side:EnableMouse(true)
    side:Hide()
    UI.side = side
    -- Menü-Knopf (Browser: #side-tab)
    local tab = button(main, "", 36, 32); tab:SetPoint("TOPRIGHT", UI.board, "TOPRIGHT", -8, -8)
    tab:SetFrameLevel(main:GetFrameLevel() + 95)
    for i = 0, 2 do local l = tab:CreateTexture(nil, "OVERLAY"); l:SetSize(18, 3); l:SetPoint("CENTER", 0, 6 - i * 6); l:SetColorTexture(0.92, 0.8, 0.45, 1) end
    tab.tip = tr("Menü")
    onClick(tab, function() UI.ToggleSide() end)
    UI.sideTab = tab
    local title = text(side, 16, COL.gold); title:SetPoint("TOPLEFT", 10, -12); title:SetText("WoW TCG")
    UI.turnBadge = text(side, 12, COL.white); UI.turnBadge:SetPoint("TOPLEFT", 90, -14)

    UI.info1 = text(side, 11); UI.info1:SetPoint("TOPLEFT", 10, -52); UI.info1:SetPoint("RIGHT", -10, 0); UI.info1:SetJustifyH("LEFT")
    UI.info2 = text(side, 11); UI.info2:SetPoint("TOPLEFT", 10, -68); UI.info2:SetPoint("RIGHT", -10, 0); UI.info2:SetJustifyH("LEFT")

    local y = -90
    local function row(b) b:SetPoint("TOPLEFT", 10, y); y = y - 30 return b end
    UI.btnUndo = row(button(side, tr("Rückgängig"), SW - 20, 26)); onClick(UI.btnUndo, function() UI.Undo() end)
    UI.btnNew = row(button(side, tr("Neues Spiel"), SW - 20, 26, "success")); onClick(UI.btnNew, function() UI.ConfirmLeave(function() UI.StartGame() end) end)
    UI.btnClose = row(button(side, tr("Schließen"), SW - 20, 26, "danger")); onClick(UI.btnClose, function() UI.Hide() end)
    UI.btnClose.tip = tr("Fenster schließen – die Partie läuft weiter (/tcg öffnet es wieder)")
    -- Deck-Wahl
    local deckRow = CreateFrame("Frame", nil, side); deckRow:SetSize(SW - 20, 26); row(deckRow)
    local prev = button(deckRow, "<", 24, 24); prev:SetPoint("LEFT", 0, 0); onClick(prev, function() UI.CycleDeck(-1) end)
    local nxt = button(deckRow, ">", 24, 24); nxt:SetPoint("RIGHT", 0, 0); onClick(nxt, function() UI.CycleDeck(1) end)
    UI.deckLabel = text(deckRow, 11); UI.deckLabel:SetPoint("LEFT", 30, 0); UI.deckLabel:SetPoint("RIGHT", -30, 0); UI.deckLabel:SetJustifyH("CENTER")
    -- Einstellungen (wie im Browser-Menü)
    UI.btnAutoEnd = row(button(side, "", SW - 20, 24)); onClick(UI.btnAutoEnd, function() db.autoEnd = not db.autoEnd; UI.RenderSide() end)
    UI.btnAutoEnd.tip = tr("Zug automatisch beenden, wenn nichts mehr möglich ist")
    UI.btnPrio = row(button(side, "", SW - 20, 24)); onClick(UI.btnPrio, function() db.prioManual = not db.prioManual; UI.RenderSide() end)
    UI.btnPrio.tip = tr("Automatisch: das Spiel hält nur an, wenn ein Instant, eine Kraft oder Quest gerade sinnvoll ist. Jedes Fenster: Anhalten in jedem Prioritätsfenster, in dem du etwas tun kannst.")
    UI.btnSpeed = row(button(side, "", SW - 20, 24)); onClick(UI.btnSpeed, function() db.cpuFast = not db.cpuFast; UI.RenderSide() end)
    UI.btnSpeed.tip = tr("Pausen im CPU-Zug (Klick aufs Spielfeld überspringt sie)")
    UI.btnDiff = row(button(side, "", SW - 20, 24)); onClick(UI.btnDiff, function() db.difficulty = (db.difficulty == "hard") and "normal" or "hard"; UI.RenderSide() end)
    UI.btnMull = row(button(side, "", SW - 20, 24)); onClick(UI.btnMull, function() db.mulligan = (db.mulligan == "hs") and "standard" or "hs"; UI.RenderSide() end)
    UI.btnMull.tip = tr("Mulligan-Art umschalten (gilt ab dem nächsten Spiel)")

    local lt = text(side, 12, COL.gold); lt:SetPoint("TOPLEFT", 10, y - 4); lt:SetText(tr("Protokoll"))
    local log = CreateFrame("ScrollingMessageFrame", nil, side)
    log:SetPoint("TOPLEFT", 10, y - 22); log:SetPoint("BOTTOMRIGHT", -8, 10)
    log:SetFont(FONT, 11, "")
    log:SetJustifyH("LEFT"); log:SetFading(false); log:SetMaxLines(400)
    log:EnableMouseWheel(true)
    log:SetScript("OnMouseWheel", function(self, d) if d > 0 then self:ScrollUp() else self:ScrollDown() end end)
    UI.log = log
end

-- Overlays: Entscheidungen, Zielbanner, Mulligan, Spielende, Meldungen, Kartenschau, Menü an einer Karte
function UI.BuildOverlays(main)
    local lvl = main:GetFrameLevel() + 100
    -- Zielbanner (Wahl auf dem Feld): schmaler Streifen in der Lücke zwischen den Reihen
    local aim = panel(main, 0.9); aim:SetSize(620, 64); aim:SetPoint("CENTER", UI.board, "TOPLEFT", MID, -GAP_Y)
    aim:SetFrameLevel(lvl)
    aim.title = text(aim, 14, COL.yellow); aim.title:SetPoint("TOPLEFT", 10, -7)
    aim.prompt = text(aim, 11); aim.prompt:SetPoint("TOPLEFT", 10, -25); aim.prompt:SetPoint("RIGHT", -10, 0); aim.prompt:SetJustifyH("LEFT")
    aim.warn = text(aim, 11, COL.red); aim.warn:SetPoint("TOPLEFT", 10, -40); aim.warn:SetPoint("RIGHT", -230, 0); aim.warn:SetJustifyH("LEFT")
    aim.btns = {}
    aim:Hide()
    UI.aim = aim

    -- Entscheidungsfenster (Optionen, Karten aus Deck/Friedhof, Reagieren)
    local m = panel(main, 0.96); m:SetSize(700, 330); m:SetPoint("CENTER", UI.board, "CENTER", 0, 20)
    m:SetFrameLevel(lvl + 5); m:EnableMouse(true)
    m.title = text(m, 16, COL.gold); m.title:SetPoint("TOP", 0, -10)
    m.prompt = text(m, 12); m.prompt:SetPoint("TOP", 0, -34); m.prompt:SetWidth(660); m.prompt:SetJustifyH("CENTER")
    m.btns, m.cards = {}, {}
    m:Hide()
    UI.modal = m

    -- Mulligan
    local mu = panel(main, 0.96); mu:SetSize(880, 300); mu:SetPoint("CENTER", UI.board, "CENTER", 0, 40)
    mu:SetFrameLevel(lvl + 10); mu:EnableMouse(true)
    mu.title = text(mu, 18, COL.gold); mu.title:SetPoint("TOP", 0, -10)
    mu.sub = text(mu, 12); mu.sub:SetPoint("TOP", 0, -34); mu.sub:SetWidth(840); mu.sub:SetJustifyH("CENTER")
    mu.cards = {}
    mu.keep = button(mu, tr("Behalten"), 200, 30, "success"); mu.keep:SetPoint("BOTTOM", -110, 12)
    mu.again = button(mu, "Mulligan", 200, 30); mu.again:SetPoint("BOTTOM", 110, 12)
    mu:Hide()
    UI.mull = mu

    -- Spielende
    local go = panel(main, 0.9); go:SetSize(520, 190); go:SetPoint("CENTER", UI.board, "CENTER", 0, 0)
    go:SetFrameLevel(lvl + 20); go:EnableMouse(true)
    go.title = text(go, 34, COL.gold); go.title:SetPoint("TOP", 0, -18)
    go.sub = text(go, 13); go.sub:SetPoint("TOP", 0, -64); go.sub:SetWidth(480); go.sub:SetJustifyH("CENTER")
    go.again = button(go, tr("Nochmal (gleiche Decks)"), 160, 30, "success"); go.again:SetPoint("BOTTOMLEFT", 12, 14)
    go.new = button(go, tr("Neues Spiel"), 160, 30); go.new:SetPoint("BOTTOM", 0, 14)
    go.close = button(go, tr("Zum Spielfeld"), 160, 30); go.close:SetPoint("BOTTOMRIGHT", -12, 14)
    onClick(go.again, function() go:Hide(); UI.StartGame(UI.lastOpts, true) end)
    onClick(go.new, function() go:Hide(); UI.StartGame() end)
    onClick(go.close, function() go:Hide(); UI.goDismissed = true end)
    go:Hide()
    UI.over = go

    -- Rückfrage
    local cf = panel(main, 0.97); cf:SetSize(440, 150); cf:SetPoint("CENTER", UI.board, "CENTER", 0, 30)
    cf:SetFrameLevel(lvl + 30); cf:EnableMouse(true)
    cf.title = text(cf, 15, COL.gold); cf.title:SetPoint("TOP", 0, -12)
    cf.text = text(cf, 12); cf.text:SetPoint("TOP", 0, -38); cf.text:SetWidth(410); cf.text:SetJustifyH("CENTER")
    cf.yes = button(cf, "", 180, 28, "danger"); cf.yes:SetPoint("BOTTOMLEFT", 20, 14)
    cf.no = button(cf, tr("Abbrechen"), 180, 28); cf.no:SetPoint("BOTTOMRIGHT", -20, 14)
    onClick(cf.no, function() cf:Hide() end)
    cf:Hide()
    UI.confirm = cf

    -- Menü an einer Karte (Angreifen / Kräfte)
    local menu = panel(main, 0.97); menu:SetFrameLevel(lvl + 40); menu:EnableMouse(true); menu.btns = {}; menu:Hide()
    UI.menu = menu

    -- Friedhof ansehen
    local gy = panel(main, 0.97); gy:SetSize(900, 560); gy:SetPoint("CENTER", UI.board, "CENTER", 0, 0)
    gy:SetFrameLevel(lvl + 25); gy:EnableMouse(true)
    gy.title = text(gy, 15, COL.gold); gy.title:SetPoint("TOP", 0, -10)
    gy.close = button(gy, tr("Schließen"), 120, 26); gy.close:SetPoint("BOTTOM", 0, 10)
    onClick(gy.close, function() gy:Hide() end)
    gy.cards = {}
    gy:Hide()
    UI.gyView = gy

    -- Meldung, Zug-Banner, Kartenschau der CPU
    local hud = CreateFrame("Frame", nil, main); hud:SetAllPoints(UI.board); hud:SetFrameLevel(lvl + 50)
    UI.toast = text(hud, 16, COL.red); UI.toast:SetPoint("CENTER", UI.board, "CENTER", 0, 120); UI.toast:SetWidth(700); UI.toast:SetJustifyH("CENTER"); UI.toast:Hide()
    local bf = CreateFrame("Frame", nil, hud); bf:SetSize(700, 120); bf:SetPoint("CENTER", UI.board, "CENTER", 0, 0); bf:SetFrameLevel(lvl + 52)
    bf.glow = bf:CreateTexture(nil, "BACKGROUND"); bf.glow:SetTexture(ART .. "fx_glow.tga"); bf.glow:SetBlendMode("ADD"); bf.glow:SetAllPoints(); bf.glow:SetAlpha(0.6)
    UI.banner = bf:CreateFontString(nil, "OVERLAY"); UI.banner:SetFont(FONT, 44, "THICKOUTLINE"); UI.banner:SetTextColor(1, 0.86, 0.45); UI.banner:SetPoint("CENTER")
    bf:Hide()
    UI.bannerF = bf
    local sc = CreateFrame("Frame", nil, main); sc:SetSize(HW * 1.5, HH * 1.5); sc:SetPoint("CENTER", UI.board, "CENTER", 0, 10); sc:SetFrameLevel(lvl + 45)
    sc.glow = sc:CreateTexture(nil, "BACKGROUND"); sc.glow:SetTexture(ART .. "fx_glow.tga"); sc.glow:SetBlendMode("ADD")
    sc.glow:SetPoint("TOPLEFT", -50, 50); sc.glow:SetPoint("BOTTOMRIGHT", 50, -50); sc.glow:SetVertexColor(1, 0.3, 0.25)
    sc.edge = sc:CreateTexture(nil, "BORDER"); sc.edge:SetAllPoints(); sc.edge:SetColorTexture(0, 0, 0, 1)
    sc.art = sc:CreateTexture(nil, "ARTWORK"); sc.art:SetPoint("TOPLEFT", 3, -3); sc.art:SetPoint("BOTTOMRIGHT", -3, 3); sc.art:SetTexCoord(0, 1, 0, ART_B)
    sc.name = text(sc, 16); sc.name:SetPoint("CENTER")
    sc:Hide()
    UI.show = sc
end

-- ---------------------------------------------------------------------------
-- Sichtbarkeit / Einstellungen
-- ---------------------------------------------------------------------------
function UI.Show()
    if not UI.frame then UI.Initialize() end
    UI.frame:Show()
    if not UI.game then UI.StartGame() else UI.Render() end
end
function UI.Hide() if UI.frame then UI.frame:Hide() end if ns.FX and ns.FX.zoomFrame then ns.FX.zoomFrame:Hide() end end
-- Seitenleiste ein-/ausfahren (von rechts, wie im Browser)
function UI.ToggleSide(open)
    local side = UI.side
    if open == nil then open = not side:IsShown() end
    if open then
        UI.RenderSide()
        side:Show()
        if ns.FX then ns.FX.Tween(0.22, function(p) local e = 1 - (1 - p) * (1 - p) side:ClearAllPoints(); side:SetPoint("TOPRIGHT", UI.board, "TOPRIGHT", SW * (1 - e), 0); side:SetAlpha(e) end, nil, 0, "side") end
    elseif side:IsShown() then
        if ns.FX then ns.FX.Tween(0.16, function(p) side:ClearAllPoints(); side:SetPoint("TOPRIGHT", UI.board, "TOPRIGHT", SW * p, 0); side:SetAlpha(1 - p) end, function() side:Hide() end, 0, "side")
        else side:Hide() end
    end
end
function UI.Toggle() if UI.frame and UI.frame:IsShown() then UI.Hide() else UI.Show() end end
function UI.ResetPosition()
    if not db then db = ns.GetDB() end
    db.point, db.x, db.y = "CENTER", 0, 0
    if UI.frame then UI.frame:ClearAllPoints(); UI.frame:SetPoint("CENTER", UIParent, "CENTER", 0, 0) end
end
function UI.ApplySettings()
    if not UI.frame then return end
    UI.frame:SetScale(fitScale())
    if UI.log then UI.log:SetMaxLines(400) end
    UI.RenderSide()
end

-- ---------------------------------------------------------------------------
-- Decks und Spielstart (main.js initGame)
-- ---------------------------------------------------------------------------
local function deckIndex(id) for i, d in ipairs(ns.Decks) do if d.id == id then return i end end return 1 end
function UI.CurrentDeck() return ns.Decks[deckIndex(db and db.lastDeck)] end
function UI.CycleDeck(dir)
    if not db then db = ns.GetDB() end
    local n = #ns.Decks
    if n == 0 then return end
    local i = deckIndex(db.lastDeck) + (dir or 1)
    if i < 1 then i = n elseif i > n then i = 1 end
    db.lastDeck = ns.Decks[i].id
    UI.RenderSide()
end

-- opts = { deck, aiDeck, opponent, onGameOver }; again = gleiche Decks wie zuletzt
function UI.StartGame(opts, again)
    if not UI.frame then UI.Initialize() end
    opts = opts or {}
    local mine = (opts.deck and ns.DeckById(opts.deck)) or UI.CurrentDeck() or ns.Decks[1]
    local opp = opts.aiDeck and ns.DeckById(opts.aiDeck)
    if not opp then
        if again and UI.lastOpp then opp = ns.DeckById(UI.lastOpp) end
        if not opp then opp = ns.DeckById(ns.RandomDeckId(mine.id)) or ns.Decks[2] end
    end
    UI.lastOpts = { deck = mine.id, aiDeck = opp.id, opponent = opts.opponent, onGameOver = opts.onGameOver }
    UI.lastOpp = opp.id
    UI.challenge = { opponent = opts.opponent }
    UI.oppName = opts.opponent or "CPU"
    UI.onGameOver = opts.onGameOver
    cpu.co = nil; cpu.inAI = false; UI.busy = false
    UI.undo = {}; UI.attacker = nil; UI.goDismissed = false; UI.notified = false
    UI.prevDmg = {}; UI.autoEndAt = nil
    if UI.over then UI.over:Hide() end
    if UI.log then UI.log:Clear() end
    local s = E.newGameState(mine.hero, mine.cards, opp.hero, opp.cards)
    s.real = true; s.humans = { 1 }
    UI.game = s
    E.dealOpeningHands(s)
    if E.aiWantsMulligan(s, 2) then E.doMulligan(s, 2) end
    -- Startspieler zufällig (Hausregel statt CR 101.1, wie im Browser)
    if math.random() < 0.5 then s.activePlayer = 2; s.lastTurnOf = { [1] = 0, [2] = 1 } end
    UI.AddLog(tr("{0} gegen {1}", mine.name, opp.name), "log-turn")
    UI.noAnim = true; UI.prevReady = {}
    UI.mulliganing = true
    UI.SnapDamage()
    UI.Render()
    UI.OpenMulligan()
end

function UI.OpenMulligan()
    local s, mu = G(), UI.mull
    mu.pick = {}
    mu.title:SetText(tr("Starthand"))
    local first = s.activePlayer == 1 and tr("Du beginnst.") or tr("{0} beginnt.", UI.oppName)
    local hs = db.mulligan == "hs"
    mu.sub:SetText(first .. " " .. (hs and tr("Wähle die Karten, die du austauschen möchtest.") or tr("Möchtest du deine Starthand behalten oder einmal neu ziehen (Mulligan)?")))
    for _, b in ipairs(mu.cards) do b:Hide() end
    local n = #s.p1.hand
    local w, h = 104, 145
    local step = math.min(w + 10, (860 - w) / math.max(1, n - 1))
    local x0 = (880 - (w + step * (n - 1))) / 2
    for i, c in ipairs(s.p1.hand) do
        local b = mu.cards[i]
        if not b then b = newCard(mu); mu.cards[i] = b end
        b:Show(); b.card, b.ref = c, { zone = "mull", idx = i }
        b:SetSize(w, h); b:ClearAllPoints(); b:SetPoint("TOPLEFT", x0 + (i - 1) * step, -62)
        b.fxRot = false; b.art:SetTexture(artPath(c, {})); setArtCoords(b); b.art:Show(); b.plain:Hide(); b.name:SetText("")
        b.atkB:Hide(); b.hpB:Hide(); b.shade:Hide(); b.mark:SetText(""); b.tag:SetText(""); b.cap:SetText("")
        b.tipOk = true
        if ns.FX then ns.FX.Update(b, c, {}) end
    end
    local function upd()
        local k = 0 for _ in pairs(mu.pick) do k = k + 1 end
        for _, b in ipairs(mu.cards) do if b:IsShown() and b.card then local on = mu.pick[b.card.uid] b.shade:SetShown(on and true or false); b.mark:SetText(on and tr("TAUSCHEN") or "") end end
        if hs then mu.again:setText(tr("{0} Karten tauschen", k)); mu.again:setOn(k > 0) else mu.again:setText("Mulligan"); mu.again:setOn(true) end
    end
    mu.upd = upd
    onClick(mu.keep, function() UI.FinishMulligan(false) end)
    onClick(mu.again, function() UI.FinishMulligan(true) end)
    upd()
    mu:Show()
end

function UI.FinishMulligan(doIt)
    local s, mu = G(), UI.mull
    if not s or not UI.mulliganing then return end
    if doIt then
        if db.mulligan == "hs" then
            local uids = {} for u in pairs(mu.pick or {}) do uids[#uids + 1] = u end
            E.doPartialMulligan(s, 1, uids)
        else E.doMulligan(s, 1) end
    end
    mu:Hide()
    UI.mulliganing = false
    E.refreshDisplay(s)
    if s.activePlayer == 2 then UI.Banner(tr("{0} ist am Zug!", UI.oppName)); UI.KickCpu()
    else UI.Banner(tr("Dein Zug!"), true) end
    UI.Render()
end

-- ---------------------------------------------------------------------------
-- Aktionen des Menschen (main.js humanAct)
-- ---------------------------------------------------------------------------
local function limitWarning(card)
    local s = G(); local p = s.p1; local h = p.hero
    local c = E.assign({}, card, { uid = "limit_probe" })
    local t = E.assign({}, p, { allies = E.copyArr(p.allies), ongoing = E.copyArr(p.ongoing or {}),
        hero = E.assign({}, h, { weapons = E.copyArr(h.weapons), armors = E.copyArr(h.armors) }) })
    if card.type == "Weapon" then E.push(t.hero.weapons, c)
    elseif card.type == "Armor" or card.type == "Item" then E.push(t.hero.armors, c)
    elseif card.type == "Ally" or card.totem then E.push(t.allies, c)
    elseif card.type == "Ability" and card.limitTags then E.push(t.ongoing, c)
    else return nil end
    local v = E.findLimitViolation(s, t)
    if not v or not E.some(v.cards, function(x) return x.uid == "limit_probe" end) then return nil end
    return { label = v.label, names = table.concat(E.map(v.cards, function(x) return x.name end), ", ") }
end
-- Würde eine eigene Karte sich dadurch selbst zerstören (Formen, Mind Control …)? In einer Kopie geprüft
local function selfDestroyWarning(events)
    local c = E.cloneState(G()); c.real = false; c._batch = {}; c.queue = {}; c.waitTrig = {}
    local mine = {}
    for _, o in ipairs(c.p1.ongoing or {}) do mine[o.uid] = true end
    for _, ev in ipairs(events) do pcall(E.evt, c, ev[1], ev[2]) end
    local steps = E.concat(c._batch, c.queue)
    for _, w in ipairs(c.waitTrig or {}) do for _, st in ipairs(w.steps or {}) do steps[#steps + 1] = st end end
    local names, seen = {}, {}
    for _, x in ipairs(steps) do
        if x.op == "trig" and x.k == "destroyOngoing" and x.a and mine[x.a.uid] then
            local o = E.find(c.p1.ongoing, function(o) return o.uid == x.a.uid end)
            if o and not seen[o.name] then seen[o.name] = true; names[#names + 1] = o.name end
        end
    end
    return names
end

function UI.Act(action)
    local s = G()
    if not s or s.gameOver or UI.busy or UI.mulliganing then return false end
    if (action.type == "PLAY_CARD" or action.type == "ATTACK") and not action.limitOk then
        local card = action.type == "PLAY_CARD" and (action.gyUid and E.findCharacter(s, action.gyUid) or s.p1.hand[action.handIdx]) or nil
        local v = card and limitWarning(card)
        local lost = {}
        local ok = pcall(function()
            if action.type == "ATTACK" then
                if action.attackerUid == s.p1.hero.uid then lost = selfDestroyWarning({ { "attacks", { att = action.attackerUid, def = action.defenderUid, apid = 1, first = true } } }) end
            elseif card then
                local evs = { { "cardPlayed", { pid = 1, card = card } } }
                if not action.gyUid then evs[2] = { "handLeft", { pid = 1, uid = card.uid } } end
                lost = selfDestroyWarning(evs)
            end
        end)
        if not ok then lost = {} end
        if v or #lost > 0 then
            local lines = {}
            if v then lines[#lines + 1] = tr("Achtung: {0} – danach musst du eine dieser Karten zerstören: {1}.", v.label, v.names) end
            if #lost > 0 then lines[#lines + 1] = tr("Achtung: Dadurch wird {0} zerstört.", table.concat(lost, ", ")) end
            local title = card and tr("{0} spielen?", card.name) or tr("Angreifen?")
            local yes = card and tr("Trotzdem spielen") or tr("Trotzdem angreifen")
            UI.Confirm(title, table.concat(lines, " "), yes, function() local a = E.assign({}, action, { limitOk = true }) UI.Act(a) end)
            return false
        end
    end
    local a = E.assign({}, action); a.limitOk = nil; a.actorId = 1
    s.stopAll = db.prioManual and true or false
    local why = E.validateAction(s, a, 1)
    local okRun, res = pcall(E.applyAction, s, a, false, 1)
    if not okRun then ns.Print(tr("Fehler: {0}", tostring(res))); res = false end
    if not res and why then UI.Toast(why) end
    UI.attacker = nil
    if UI.menu then UI.menu:Hide() end
    UI.Render()
    if res then UI.KickCpu() end
    return res
end
function UI.Choose(v) return UI.Act({ type = "CHOOSE", v = v }) end

function UI.EndTurn()
    local s = G()
    if not s or s.gameOver or UI.busy then return end
    if not E.canActMain(s, 1) then UI.Toast(tr("Du kannst den Zug gerade nicht beenden (offene Entscheidung oder Kette).")) return end
    local err = E.validateAction(s, { type = "END_TURN" }, 1)
    if err then UI.Toast(err) return end
    UI.undo = {}
    UI.autoEndAt = nil
    UI.Act({ type = "END_TURN" })
end

-- Was kann man mit einer eigenen Karte im Spiel tun? (Browser: Knopfleiste an der Karte)
function UI.CardOptions(c)
    local s = G()
    local out = {}
    if E.canActMain(s, 1) then
        local defs, any = {}, false
        for _, a in ipairs(E.getAttackActions(s, 1)) do if a.attackerUid == c.uid then defs[a.defenderUid] = true; any = true end end
        if any then out[#out + 1] = { label = tr("Angreifen"), attack = true, run = function() UI.attacker = c.uid; UI.attackTargets = defs; UI.Render() end } end
    end
    local ok, pws = pcall(E.getPowers, s, c)
    if ok and pws then
        for _, pw in ipairs(pws) do
            if not E.canUsePower(s, 1, c, pw) then
                local key = pw.key
                out[#out + 1] = { label = wowText(pw.label or tr("Kraft")), run = function() UI.Act({ type = "ACTIVATE", srcUid = c.uid, key = key }) end }
            end
        end
    end
    return out
end

function UI.ShowMenu(b, opts)
    local m = UI.menu
    for _, x in ipairs(m.btns) do x:Hide() end
    local w = 220
    for i, o in ipairs(opts) do
        local x = m.btns[i]
        if not x then x = button(m, "", w - 12, 24); m.btns[i] = x end
        x:setText(o.label); x:setKind(o.attack and "danger" or "good"); x:Show()
        x:ClearAllPoints(); x:SetPoint("TOPLEFT", 6, -6 - (i - 1) * 28)
        onClick(x, function() m:Hide(); o.run() end)
    end
    m:SetSize(w, 12 + #opts * 28)
    m:ClearAllPoints(); m:SetPoint("BOTTOM", b, "TOP", 0, 6)
    m:Show()
end

local function myPending(kind)
    local s = G()
    local d = s and s.pending
    if d and d.pid == 1 and (not kind or d.kind == kind) then return d end
    return nil
end
local function boardOpt(o)
    local s = G()
    if type(o.v) ~= "string" then return false end
    local l = E.locate(s, o.v)
    return l ~= nil and (E.isInPlayZone(l.zone) or (l.zone == "hand" and l.pid == 1))
end
local function boardChoice(d)
    if not d or d.kind ~= "choose" then return false end
    local s, cards = G(), 0
    for _, o in ipairs(d.opts) do
        if o.card ~= nil then return false end
        local l = type(o.v) == "string" and E.locate(s, o.v) or nil
        if l then
            if not boardOpt(o) then return false end
            cards = cards + 1
        end
    end
    return cards > 0
end
local function optFor(d, uid) for _, o in ipairs(d.opts) do if o.v == uid then return o end end end

function UI.CardClick(b, mouse)
    local s = G()
    if not s or not b.ref then return end
    if UI.busy then cpu.skip = true return end
    if UI.animLock and now() < UI.animLock then return end                 -- Angriffs-Animation läuft
    if UI.menu then UI.menu:Hide() end
    local r = b.ref
    if r.zone == "mull" then
        local mu = UI.mull
        if db.mulligan ~= "hs" then return end
        local u = b.card.uid
        if mu.pick[u] then mu.pick[u] = nil else mu.pick[u] = true end
        mu.upd()
        return
    end
    if r.zone == "gyview" then return end
    if s.gameOver or UI.mulliganing then return end
    -- offene Wahl auf dem Feld: Kandidaten anklicken
    local d = myPending("choose")
    if d then
        if boardChoice(d) and b.card and optFor(d, b.card.uid) then
            if d.destroy then UI.destroyPick = b.card.uid; UI.Render() else UI.Choose(b.card.uid) end
        end
        return
    end
    -- Angreifer gewählt: Ziel anklicken
    if UI.attacker then
        local att = UI.attacker
        UI.attacker = nil
        if b.card and UI.attackTargets and UI.attackTargets[b.card.uid] then
            local def = b.card.uid
            local a = { type = "ATTACK", attackerUid = att, defenderUid = def }
            -- Warnung (Selbstzerstörung) zuerst, sonst Vorstoß-Animation und dann der Angriff
            local warn = false
            if att == s.p1.hero.uid then
                local ok, l = pcall(selfDestroyWarning, { { "attacks", { att = att, def = def, apid = 1, first = true } } })
                warn = ok and l and #l > 0
            end
            if warn then UI.Act(a) return end
            UI.Lunge(att, def, function() UI.Act(a) end)
            return
        end
        UI.Render()
        if b.card and b.card.uid == att then return end                   -- erneuter Klick auf den Angreifer: abbrechen
    end
    if r.zone == "hand" then
        if mouse == "RightButton" then
            local c = s.p1.hand[r.idx]
            local faceUp = c and c.type == "Quest" and not (IsShiftKeyDown and IsShiftKeyDown())
            UI.Act({ type = "PLACE_RESOURCE", handIdx = r.idx, faceUp = faceUp and true or false })
        else
            UI.Act({ type = "PLAY_CARD", handIdx = r.idx })
        end
    elseif r.zone == "res" then
        if r.pid == 1 then
            local res = s.p1.resources[r.idx]
            if res and res.faceUp and res.card.type == "Quest" then UI.Act({ type = "COMPLETE_QUEST", resIdx = r.idx }) end
        end
    elseif r.zone == "gy" then
        UI.OpenGraveyard(r.pid)
    elseif r.pid == 1 and b.card and (r.zone == "party" or r.zone == "hero" or r.zone == "equip") then
        local opts = UI.CardOptions(b.card)
        if #opts == 1 then opts[1].run() elseif #opts > 1 then UI.ShowMenu(b, opts) end
    end
end

-- ---------------------------------------------------------------------------
-- CPU-Ablauf (main.js driveCpu) – als Coroutine über OnUpdate, Pausen per yield
-- ---------------------------------------------------------------------------
local function sleep(sec)
    if cpu.skip then return end
    local t = now() + sec * (db.cpuFast and 0.35 or 1)
    repeat coroutine.yield() until now() >= t or cpu.skip
end
function UI.KickCpu() if not cpu.co and UI.game and not UI.game.gameOver then cpu.co = coroutine.create(UI.DriveCpu) end end

function UI.DriveCpu()
    local g0 = UI.game
    local steps, announced, guard = 0, false, 0
    while UI.game == g0 and not g0.gameOver and guard < 200 do
        guard = guard + 1
        local s = g0
        if s.pending then break end                                       -- Mensch muss entscheiden
        if not E.isIdle(s) then E.process(s); UI.Render(); if s.pending or not E.isIdle(s) then break end end
        if s.activePlayer ~= 2 then break end
        if not announced then
            announced = true; cpu.skip = false; UI.busy = true
            if UI.cpuBannerTurn ~= s.turn then UI.cpuBannerTurn = s.turn; UI.Banner(tr("{0} ist am Zug!", UI.oppName)); UI.Render(); sleep(0.7) end
        end
        UI.CpuStatus(tr("CPU analysiert..."))
        sleep(0.25)
        local dec
        if steps < 25 then
            cpu.inAI = true; cpu.frameStart = E.nowMs()
            dec = E.searchBestAction(s, 2, db.difficulty)
            cpu.inAI = false
        end
        if UI.game ~= g0 or s.gameOver then break end
        if not dec or not dec.action then
            UI.CpuStatus(tr("CPU beendet Zug."))
            sleep(0.4)
            if not E.applyAction(s, { type = "END_TURN", actorId = 2 }, false, 2) then
                -- "Must attack if able" (CR 600.2): erst der Pflichtangriff
                local forced = E.getAttackActions(s, 2)[1]
                if not (forced and E.applyAction(s, forced, false, 2)) then E.advanceTurn(s, false) end
            end
            UI.Render()
            if s.activePlayer == 1 and E.isIdle(s) then UI.Banner(tr("Dein Zug!"), true) end
        else
            UI.CpuStatus("CPU: " .. wowText(dec.reason or ""))
            local a = dec.action
            local played = a.type == "PLAY_CARD" and s.p2.hand[a.handIdx] or nil
            if played then UI.Showcase(played); sleep(0.95)
            else
                if a.type == "ATTACK" then UI.FlashAttack(a.attackerUid, a.defenderUid); sleep(0.3); UI.Lunge(a.attackerUid, a.defenderUid); sleep(0.36)
                else sleep(0.5) end
            end
            -- gespielte Karte fliegt aus der Kartenschau an ihren Platz (Browser: landShowcase)
            if played then UI.landFrom = UI.ShowcaseRect(played.uid) end
            E.applyAction(s, a, false, 2)
            steps = steps + 1
            UI.HideShowcase()
            UI.Render()
            if played and (played.cost or 0) >= 7 then UI.ScreenShake(1.2) end
            sleep(0.35)
        end
    end
    UI.busy = false
    UI.CpuStatus(nil)
    UI.Render()
end

local function stepCpu()
    if not cpu.co then return end
    cpu.frameStart = E.nowMs()
    local ok, err = coroutine.resume(cpu.co)
    if not ok then
        cpu.co = nil; cpu.inAI = false; UI.busy = false
        ns.Print(tr("CPU-Fehler: {0}", tostring(err)))
        UI.CpuStatus(nil); UI.Render()
        return
    end
    if cpu.co and coroutine.status(cpu.co) == "dead" then cpu.co = nil end
end

-- ---------------------------------------------------------------------------
-- Takt: CPU, Auto-Zugende, Meldungen
-- ---------------------------------------------------------------------------
function UI.OnUpdate(el)
    stepCpu()
    local t = now()
    for pid = 1, 2 do local f = UI.hp and UI.hp[pid] if f then f.fill:SetAlpha(f.low and (0.6 + 0.4 * math.sin(t * 6)) or 1) end end
    if UI.toastUntil and t > UI.toastUntil then UI.toast:Hide(); UI.toastUntil = nil end
    if UI.bannerUntil then
        local left = UI.bannerUntil - t
        if left <= 0 then UI.banner:Hide(); UI.bannerUntil = nil else UI.banner:SetAlpha(math.min(1, left / 0.4)) end
    end
    if UI.autoEndAt then
        local p = 1 - math.max(0, (UI.autoEndAt - t) / 1.1)
        UI.endBar:SetWidth(math.max(1, 128 * p)); UI.endBar:Show()
        if t >= UI.autoEndAt then
            UI.autoEndAt = nil; UI.endBar:Hide()
            local s = G()
            if s and db.autoEnd and s.activePlayer == 1 and not UI.busy and UI.NothingLeft() then UI.EndTurn() end
        end
    end
end

function UI.Toast(msg, ok)
    if not UI.toast then return end
    UI.toast:SetText(wowText(msg))
    local c = ok and COL.gold or COL.red
    UI.toast:SetTextColor(c[1], c[2], c[3])
    UI.toast:Show(); UI.toastUntil = now() + 2.2
end
function UI.Banner(msg, mine)
    local f = UI.bannerF
    UI.banner:SetText(wowText(msg))
    f.glow:SetVertexColor(mine and 0.4 or 1, mine and 0.7 or 0.35, mine and 1 or 0.25)
    f:Show()
    if mine then UI.Sound("turn") end
    if not ns.FX then f:SetAlpha(1); UI.bannerUntil = now() + 1.4 return end
    ns.FX.Tween(1.6, function(t)
        local a = (t < 0.12) and (t / 0.12) or ((t > 0.7) and (1 - (t - 0.7) / 0.3) or 1)
        f:SetAlpha(a)
        f:SetScale(t < 0.18 and (1.35 - 0.35 * ns.FX.easeOut(t / 0.18)) or 1)
    end, function() f:Hide() end, 0, "banner")
end
function UI.CpuStatus(msg) if UI.cpuStatus then UI.cpuStatus:SetText(msg and wowText(msg) or "") end end
function UI.Showcase(card)
    local sc = UI.show
    local tex = artPath(card, {}, true)
    if tex then sc.art:SetTexture(tex); sc.art:Show(); sc.name:SetText("") else sc.art:Hide(); sc.name:SetText(card.name) end
    sc:SetAlpha(0); sc:Show()
    if ns.FX then ns.FX.Tween(0.2, function(p) sc:SetAlpha(p); sc:SetScale(0.85 + 0.15 * p) end, nil, 0, "showcase") else sc:SetAlpha(1) end
end
function UI.ShowcaseRect(uid)
    local w, h = HW * 1.5, HH * 1.5
    return { uid = uid, x = BW / 2 - w / 2, y = BH / 2 - 10 - h / 2, w = w, h = h, zone = "showcase" }
end
function UI.HideShowcase() if UI.show then UI.show:Hide() end end
function UI.FlashAttack(attUid, defUid)
    for _, uid in ipairs({ attUid, defUid }) do
        local b = buttonFor(uid)
        if b and b.glow then
            b.glow:SetVertexColor(1, 0.2, 0.15)
            if ns.FX then ns.FX.Tween(0.6, function(p) b.glow:SetAlpha(0.9 * (1 - p * 0.3)) end, nil, 0, "flash" .. uid) end
        end
    end
end

function UI.Confirm(title, msg, yes, fn)
    local cf = UI.confirm
    cf.title:SetText(title); cf.text:SetText(wowText(msg)); cf.yes:setText(yes)
    onClick(cf.yes, function() cf:Hide(); fn() end)
    cf:Show()
end
function UI.ConfirmLeave(go)
    local s = G()
    if not s or s.gameOver then go() return end
    UI.Confirm(tr("Laufende Partie beenden?"), tr("Die aktuelle Partie geht dabei verloren."), tr("Ja, beenden"), go)
end

-- Nichts Sinnvolles mehr möglich: keine bezahlbare Karte, Ressource, Quest, Kraft, kein Angriff mit Schaden
function UI.NothingLeft()
    local s = G()
    if not s or not E.canActMain(s, 1) or UI.attacker then return false end
    local ok, acts = pcall(E.getLegalActions, s, 1)
    if not ok then return false end
    for _, a in ipairs(acts) do
        if a.type ~= "END_TURN" then
            if a.type == "ATTACK" then
                local c = E.findCharacter(s, a.attackerUid)
                if c then
                    local atk = (c.type == "Hero") and E.getHeroAttackPower(s.p1) or E.atkOf(s, c, { attacking = true, target = E.findCharacter(s, a.defenderUid) })
                    if atk > 0 then return false end
                end
            else return false end
        end
    end
    return true
end

-- ---------------------------------------------------------------------------
-- Zeichnen (ui.js render)
-- ---------------------------------------------------------------------------
-- Schaden/Heilung seit dem letzten Zeichnen als schwebende Zahl (wie die Treffer-Zahlen im Browser)
function UI.SnapDamage()
    UI.prevDmg = {}
    local s = G() if not s then return end
    for _, p in ipairs({ s.p1, s.p2 }) do for _, c in ipairs(E.partyOf(p)) do UI.prevDmg[c.uid] = c.damage or 0 end end
end
local function damageNumbers()
    local s = G()
    local prev = UI.prevDmg or {}
    UI.prevDmg = {}
    local hit, healed, heavy = false, false, 0
    for _, p in ipairs({ s.p1, s.p2 }) do
        for _, c in ipairs(E.partyOf(p)) do
            local d = c.damage or 0
            local before = prev[c.uid]
            if before and ns.FX then
                local b = buttonFor(c.uid)
                if d > before then
                    ns.FX.Number(c, d - before, "dmg"); flash(b, 1, 0.12, 0.08, 0.7, 0.5); hit = true
                    if c.type == "Hero" then heavy = math.max(heavy, d - before) end
                elseif d < before then
                    ns.FX.Number(c, before - d, "heal"); flash(b, 0.25, 1, 0.35, 0.6, 0.6); healed = true
                end
            end
            UI.prevDmg[c.uid] = d
        end
    end
    if hit then UI.Sound("hit") elseif healed then UI.Sound("heal") end
    if heavy >= 4 then UI.ScreenShake(math.min(1.4, heavy / 5)) end              -- schwerer Treffer auf einen Helden
end

-- Protector springt ein (Browser: playEventAnimations – Bewegung zum Angreifer, Wackeln, "PROTECTED")
local function renderProtect(s)
    local lp = s.lastProtect
    if not lp or lp.t == UI.shownProtect then return end
    UI.shownProtect = lp.t
    local b = buttonFor(lp.uid)
    if not b or not ns.FX then return end
    flash(b, 1, 0.85, 0.3, 0.7, 0.8)
    ns.FX.Shake(b)
    local f = UI.protectLabel
    if not f then
        f = UI.board:CreateFontString(nil, "OVERLAY"); f:SetFont(FONT, 22, "THICKOUTLINE"); f:SetTextColor(1, 0.85, 0.3)
        UI.protectLabel = f
    end
    f:SetText("PROTECTED")
    local x, y = b._x + b._w / 2, b._y + b._h / 2
    f:Show()
    ns.FX.Tween(1.4, function(t)
        f:ClearAllPoints(); f:SetPoint("CENTER", UI.board, "TOPLEFT", x, -(y - 40 * ns.FX.easeOut(t)))
        f:SetAlpha(t < 0.7 and 1 or (1 - (t - 0.7) / 0.3))
    end, function() f:Hide() end, 0, "protect")
    UI.Sound("protect")
end

local function heroBar(pid)
    local s = G()
    local p = E.getPlayer(s, pid)
    local f = UI.hp[pid]
    local max = math.max(1, E.hpOf(s, p.hero))
    local cur = math.max(0, max - (p.hero.damage or 0))
    local r = math.min(1, cur / max)
    local h = (f:GetHeight() or HH) - 4
    f.fill:SetHeight(math.max(1, h * r))
    if r > 0.6 then f.fill:SetColorTexture(0.13, 0.77, 0.37, 1) elseif r > 0.3 then f.fill:SetColorTexture(0.92, 0.7, 0.03, 1) else f.fill:SetColorTexture(0.94, 0.27, 0.27, 1) end
    local prev = f.prevR or r
    f.trail:SetHeight(math.max(1, h * math.max(prev, r)))
    if prev ~= r and ns.FX then ns.FX.Tween(0.6, function(t) f.trail:SetHeight(math.max(1, h * (prev + (r - prev) * t))) end, nil, 0.35, "hptrail" .. pid) end
    if prev > r and ns.FX then ns.FX.Tween(0.45, function(t) f.track:SetColorTexture(0.4 * (1 - t), 0, 0, 0.75) end, nil, 0, "hphit" .. pid) end
    f.low = r <= 0.3
    f.prevR = r
    f.num:SetText(cur); f.max:SetText("/" .. max)
    if cur <= 5 then f.num:SetTextColor(1, 0.3, 0.3) else f.num:SetTextColor(1, 1, 1) end
end

-- Kann der Mensch mit dieser eigenen Karte gerade etwas tun? (gelbes Leuchten)
local function canUse(s, c)
    if E.canActMain(s, 1) then
        for _, a in ipairs(UI._atk or {}) do if a.attackerUid == c.uid then return true end end
    end
    local ok, pws = pcall(E.getPowers, s, c)
    if ok and pws then for _, pw in ipairs(pws) do if not E.canUsePower(s, 1, c, pw) then return true end end end
    return false
end

-- Glanz/Abdunkeln einer Karte je nach Zustand (Ziel wählen, Angreifer, nutzbar)
local function stateLook(s, c, pid, zone)
    local o = {}
    local d = myPending("choose")
    if d and UI.boardMode then
        if optFor(d, c.uid) then o.glow, o.pulse = GLOW.target, true
            if d.destroy and UI.destroyPick == c.uid then o.glow, o.pulse, o.mark = GLOW.attack, false, tr("ZERSTÖREN") end
        else o.dim = true end
        return o
    end
    if UI.attacker then
        if c.uid == UI.attacker then o.glow = GLOW.attack
        elseif UI.attackTargets and UI.attackTargets[c.uid] then o.glow, o.pulse = GLOW.attack, true
        elseif pid == 2 then o.dim = true end
        return o
    end
    if pid == 1 and not UI.busy and canUse(s, c) then o.glow, o.pulse = GLOW.act, true end
    return o
end

local function sleepingTag(s, c, pid)
    if pid ~= s.activePlayer or c.type ~= "Ally" then return nil end
    if c.joinedTurn == s.turn and not c.ferocity then return "Zzz" end
    return nil
end

-- Ausrüstung und laufende Fähigkeiten eines Spielers (ohne angehängte – die liegen unter ihrem Ziel)
local function equipOf(s, p)
    local out = {}
    for _, w in ipairs(p.hero.weapons) do out[#out + 1] = w end
    for _, a in ipairs(p.hero.armors) do out[#out + 1] = a end
    for _, o in ipairs(p.ongoing or {}) do if not (o.attachedTo and E.findCharacter(s, o.attachedTo)) then out[#out + 1] = o end end
    return out
end
local function attachedTo(s, uid)
    local out = {}
    for _, p in ipairs({ s.p1, s.p2 }) do for _, o in ipairs(p.ongoing or {}) do if o.attachedTo == uid then out[#out + 1] = o end end end
    return out
end

-- Karten nebeneinander in [x0, x1]; Überlappung bei Platzmangel. dir = 1 von links, -1 von rechts
local function spread(n, x0, x1, w, dir, gap)
    local pos = {}
    if n == 0 then return pos end
    local step = math.min(w + (gap or 8), (n > 1) and ((x1 - x0 - w) / (n - 1)) or (w + 8))
    for i = 1, n do
        if dir == 1 then pos[i] = x0 + (i - 1) * step else pos[i] = x1 - w - (n - i) * step end
    end
    return pos
end

local function drawRow(s, pid)
    local p = E.getPlayer(s, pid)
    local y = (pid == 2) and OPP_ROW or OWN_ROW
    local cy = y + (ROW_H - FH) / 2
    -- Allies: gegnerische wachsen von der Mitte nach rechts, eigene von der Mitte nach links
    local allies = p.allies
    local n = #allies
    local pos
    if pid == 2 then pos = spread(n, MID - FW / 2, BW - 12, FW, 1)
    else pos = spread(n, 12, MID + FW / 2, FW, -1) end
    for i, c in ipairs(allies) do
        local look = stateLook(s, c, pid, "party")
        -- angehängte Fähigkeiten zuerst (liegen dahinter, leicht nach oben versetzt)
        for k, o in ipairs(attachedTo(s, c.uid)) do
            local ob = acquire()
            local ol = stateLook(s, o, pid, "equip")
            drawCard(ob, o, { x = pos[i] + 6 * k, y = cy - 14 * k, w = FW, h = FH, zone = "equip", pid = pid, level = 5 + i * 3, tip = true,
                glow = ol.glow, pulse = ol.pulse, dim = ol.dim, stats = false })
        end
        local b = acquire()
        local rot = c.exhausted and true or false
        local w, h = rot and FH or FW, rot and FW or FH
        drawCard(b, c, { x = pos[i] + (FW - w) / 2, y = cy + (FH - h) / 2, w = w, h = h, rot = rot, zone = "party", pid = pid, idx = i,
            level = 6 + i * 3, tip = true, fxZone = "ally", glow = look.glow, pulse = look.pulse, dim = look.dim, mark = look.mark,
            tag = sleepingTag(s, c, pid) })
    end
    -- Ausrüstung / laufende Fähigkeiten: gegenüber, vom Rand zur Mitte
    local eq = equipOf(s, p)
    local epos
    if pid == 2 then epos = spread(#eq, 12, MID - FW / 2 - 16, FW, 1, -FW * 0.35)
    else epos = spread(#eq, MID + FW / 2 + 16, BW - 12, FW, -1, -FW * 0.35) end
    for i, c in ipairs(eq) do
        local b = acquire()
        local look = stateLook(s, c, pid, "equip")
        local rot = c.exhausted and true or false
        local w, h = rot and FH or FW, rot and FW or FH
        drawCard(b, c, { x = epos[i] + (FW - w) / 2, y = cy + (FH - h) / 2, w = w, h = h, rot = rot, zone = "equip", pid = pid, idx = i,
            level = 4 + i, tip = true, glow = look.glow, pulse = look.pulse, dim = look.dim, mark = look.mark })
    end
end

local function drawHero(s, pid)
    local p = E.getPlayer(s, pid)
    local x, y = (pid == 2) and 10 or OWN_HERO_X, (pid == 2) and 8 or 664
    local look = stateLook(s, p.hero, pid, "hero")
    if pid == 2 and s.activePlayer == 2 and not s.gameOver and not look.glow then look.glow = { 1, 0.3, 0.25 } end
    local b = acquire()
    drawCard(b, p.hero, { x = x, y = y, w = HW, h = HH, zone = "hero", pid = pid, level = 20, tip = true, glow = look.glow, pulse = look.pulse,
        dim = look.dim, mark = look.mark, zoomTex = artPath(p.hero, {}, zoomRes()) })
    heroBar(pid)
end

local function drawGraveyard(s, pid)
    local p = E.getPlayer(s, pid)
    local x, y = (pid == 2) and 190 or OWN_GY_X, (pid == 2) and 8 or 704
    local n = #p.graveyard
    local b = acquire()
    if n > 0 then
        local top = p.graveyard[n]
        drawCard(b, top, { x = x, y = y, w = GW, h = GH, zone = "gy", pid = pid, level = 15, tip = true, stats = false, cap = tr("Friedhof") .. " (" .. n .. ")" })
    else
        drawCard(b, nil, { x = x, y = y, w = GW, h = GH, zone = "gy", pid = pid, level = 15, stats = false, cap = tr("Friedhof") })
        b.plain:SetColorTexture(0.1, 0.08, 0.06, 0.6)
    end
end

local function drawResources(s, pid)
    local p = E.getPlayer(s, pid)
    local n = #p.resources
    local x0, x1, y = (pid == 2) and OPP_RES[1] or OWN_RES[1], (pid == 2) and OPP_RES[2] or OWN_RES[2], (pid == 2) and 8 or 708
    local pos = spread(n, x0, x1, RH, pid == 2 and -1 or 1, 2)
    for i, r in ipairs(p.resources) do
        local b = acquire()
        local rot = r.exhausted and true or false
        local w, h = rot and RH or RW, rot and RW or RH
        local quest = r.faceUp and r.card.type == "Quest"
        local o = { x = pos[i] + (RH - w) / 2, y = y + (RH - h) / 2, w = w, h = h, rot = rot, zone = "res", pid = pid, idx = i, level = 10 + i,
            faceDown = not r.faceUp, stats = false, tip = r.faceUp or pid == 1 }
        if not r.faceUp and pid == 1 then o.zoomTex = artPath(r.card, {}, zoomRes()) end         -- eigene verdeckte Ressource: Zoom zeigt die Karte
        if quest and pid == 1 and not UI.busy and E.canActInstant(s, 1) and not E.checkQuestCondition(s, p, r) then o.glow, o.pulse = GLOW.good, true end
        drawCard(b, r.card, o)
        if not r.faceUp and pid == 1 then b.card = r.card end
    end
    local ri = UI.resInfo[pid]
    local ready = E.getReadyRes(p)
    ri.b:set(ready)
    UI.prevReady = UI.prevReady or {}
    local pr = UI.prevReady[pid]
    if pr and pr ~= ready and not UI.noAnim then ri.b:pulse(ready > pr) end
    UI.prevReady[pid] = ready
    if E.getReadyRes(p) == 0 then ri.t:SetTextColor(0.6, 0.6, 0.6) else ri.t:SetTextColor(0.62, 0.82, 1) end
    ri.o:SetText(tr("von {0}", n))
end

local function drawHands(s)
    -- Gegner: Rückseiten im Fächer (Mind Vision: offen)
    local p2 = s.p2
    local n2 = #p2.hand
    local open = E.handRevealed and E.handRevealed(s, 2)
    local pos2 = spread(n2, OPP_HAND[1], OPP_HAND[2], BKW, 1, -BKW * 0.45)
    local mid2 = (n2 + 1) / 2
    for i, c in ipairs(p2.hand) do
        local b = acquire()
        drawCard(b, c, { x = pos2[i], y = 4 + math.abs(i - mid2) * 4, w = BKW, h = BKH, zone = "opphand", pid = 2, level = 10 + i, faceDown = not open, stats = false, tip = open })
    end
    -- Eigene Hand: leichter Bogen, Überlappung bei vielen Karten, beim Überfahren nach vorn
    local p = s.p1
    local n = #p.hand
    local pos = spread(n, OWN_HAND[1], OWN_HAND[2], CW, 1, 6)
    local mid = (n + 1) / 2
    local main, inst = E.canActMain(s, 1), E.canActInstant(s, 1)
    local pickHand = myPending("choose") and UI.boardMode
    for i, c in ipairs(p.hand) do
        local b = acquire()
        local o = { x = pos[i], y = 690 + (i - mid) * (i - mid) * 1.6, w = CW, h = CH, zone = "hand", pid = 1, idx = i, level = 30 + i, raise = true, tip = true, fxZone = "hand", stats = false }   -- Handkarten ohne Werte-Symbole (wie im Browser)
        if pickHand then
            local d = myPending("choose")
            if optFor(d, c.uid) then o.glow, o.pulse = GLOW.target, true else o.dim = true end
        elseif not UI.busy and (main or inst) and not E.canPlayCard(s, 1, c) then o.glow, o.pulse = GLOW.act, true end
        drawCard(b, c, o)
    end
end

function UI.RenderSide()
    if not UI.side or not db then return end
    local s = G()
    if s then
        UI.turnBadge:SetText(tr("Zug {0}", s.turn or 1))
        local function info(p, label)
            local top = (p.deckFaceUp and #p.deck > 0) and (" · " .. tr("oben: {0}", E.CARDS[p.deck[#p.deck]].name)) or ""
            return label .. " " .. tr("Deck") .. " " .. #p.deck .. top .. " · " .. tr("Friedhof") .. " " .. #p.graveyard .. " · Res " .. E.getReadyRes(p) .. "/" .. #p.resources
        end
        UI.info1:SetText("|cff66ccff" .. (s.p1.hero.class or tr("Du")) .. ":|r " .. info(s.p1, ""))
        UI.info2:SetText("|cffff7766" .. (s.p2.hero.class or "CPU") .. ":|r " .. info(s.p2, ""))
        local can = UI.CanUndo()
        UI.btnUndo:setOn(can and true or false)
        UI.btnUndo:setText(can and tr("Rückgängig: {0}", UI.undo[#UI.undo].desc) or tr("Rückgängig"))
    end
    local d = UI.CurrentDeck()
    UI.deckLabel:SetText(d and d.name or "?")
    UI.btnAutoEnd:setText(db.autoEnd and tr("Auto-Zugende: An") or tr("Auto-Zugende: Aus"))
    UI.btnPrio:setText(db.prioManual and tr("Priorität: Jedes Fenster") or tr("Priorität: Automatisch"))
    UI.btnSpeed:setText(db.cpuFast and tr("CPU-Tempo: Schnell") or tr("CPU-Tempo: Normal"))
    UI.btnDiff:setText(db.difficulty == "hard" and tr("Schwierigkeit: Schwer") or tr("Schwierigkeit: Normal"))
    UI.btnMull:setText(db.mulligan == "hs" and tr("Mulligan: Tauschen") or tr("Mulligan: Standard"))
end

-- Mitte: Zuganzeige, Zug beenden, Auto-Zugende
local function renderMiddle(s)
    local mine, over = s.activePlayer == 1, s.gameOver
    local done = mine and not over and not UI.busy and not UI.mulliganing and UI.NothingLeft()
    if over then UI.turnText:SetText("")
    elseif done and db.autoEnd then UI.turnText:SetText(tr("ZUG ENDET …"))
    else UI.turnText:SetText(mine and tr("DEIN ZUG") or tr("ZUG DER CPU")) end
    UI.turnText:SetTextColor(mine and 0.5 or 1, mine and 0.85 or 0.45, mine and 1 or 0.4)
    UI.btnEnd:SetShown(mine and not over)
    UI.btnEnd:setOn(E.canActMain(s, 1) and not UI.busy)
    UI.btnEnd:setKind(done and "good" or "success")
    UI.btnCancel:SetShown(UI.attacker ~= nil)
    if done and db.autoEnd then
        if not UI.autoEndAt then UI.autoEndAt = now() + 1.1 end
    else UI.autoEndAt = nil; UI.endBar:Hide() end
end

-- Kette: oben löst zuerst aus
local function renderChain(s)
    local chain = s.chain or {}
    if #chain == 0 or myPending() then UI.chainBox:Hide() return end
    local lines = { "|cffe6c35c" .. tr("Kette (oben löst zuerst aus):") .. "|r" }
    for i = #chain, math.max(1, #chain - 3), -1 do
        local it = chain[i]
        local who = it.pl == 1 and tr("Du") or UI.oppName
        local tg = ""
        if it.targets then local fl = E.flat(it.targets) if #fl > 0 then tg = " -> " .. table.concat(E.map(fl, function(u) return E.nameOf(s, u) end), ", ") end end
        lines[#lines + 1] = who .. ": " .. wowText(E.chainDesc(s, it)) .. tg
    end
    UI.chainText:SetText(table.concat(lines, "\n"))
    UI.chainBox:Show()
end

-- Entscheidungen des Menschen: Zielbanner (Wahl auf dem Feld) oder mittiges Fenster
local function clearModal()
    local m = UI.modal
    for _, x in ipairs(m.btns) do x:Hide() end
    for _, x in ipairs(m.cards) do x:Hide() end
end
local function modalCards(m, list, y)
    local n = #list
    local w, h = 96, 134
    local step = math.min(w + 12, (660 - w) / math.max(1, n - 1))
    local x0 = (700 - (w + step * (n - 1))) / 2
    for i, o in ipairs(list) do
        local b = m.cards[i]
        if not b then b = newCard(m); m.cards[i] = b end
        b:Show(); b.card = o.card; b.ref = { zone = "modal" }
        b:SetSize(w, h); b:ClearAllPoints(); b:SetPoint("TOPLEFT", x0 + (i - 1) * step, -y)
        b.fxRot = false
        local tex = artPath(o.card, {})
        if tex then b.art:SetTexture(tex); setArtCoords(b); b.art:Show(); b.plain:Hide(); b.name:SetText("") else b.art:Hide(); b.plain:Show(); b.name:SetText(o.card.name or "") end
        b.atkB:Hide(); b.hpB:Hide(); b.shade:Hide(); b.mark:SetText(""); b.tag:SetText(""); b.cap:SetText(o.caption or "")
        b.cap:SetWidth(step + 4)
        b.tipOk = true
        if ns.FX then ns.FX.Update(b, o.card, { glow = o.good and GLOW.good or nil, pulse = o.good }) end
        b:SetScript("OnClick", function() o.run() end)
    end
end
-- Karte zu einem Verweis: Karteninstanz, uid (im Spiel, Hand, Friedhof, Ressourcen) oder Karten-ID
local function cardOfRef(ref)
    if type(ref) == "table" then return ref end
    if type(ref) == "string" then local l = E.locate(G(), ref) return l and l.c or nil end
    if type(ref) == "number" and E.CARDS[ref] then return E.assign({}, E.CARDS[ref], { id = ref, uid = "pv_" .. ref }) end
    return nil
end
-- Reagieren: Karten/Kräfte/Quests, mit denen man jetzt antworten kann (★ = sinnvoll laut Bewertung)
local function priorityChoices(d)
    local s = G()
    local p = s.p1
    local out, seen = {}, {}
    local good = {}
    for _, k in ipairs(d.good or {}) do good[k] = true end
    local ok, acts = pcall(E.getPriorityActions, s, 1)
    if not ok then return out end
    for _, a in ipairs(acts) do
        local key = E.respondKey(s, 1, a)
        if key and not seen[key] then
            seen[key] = true
            local o = { good = good[key] }
            if a.type == "PLAY_CARD" then
                o.card = a.gyUid and E.findCharacter(s, a.gyUid) or p.hand[a.handIdx]
                o.caption = tr("Spielen")
                local hand = { type = "PLAY_CARD", handIdx = a.handIdx, gyUid = a.gyUid }
                o.run = function() UI.Act(hand) end
            elseif a.type == "ACTIVATE" then
                local src = E.findCharacter(s, a.srcUid)
                local pw = src and E.getPower(s, src, a.key)
                o.card = src
                o.caption = wowText(pw and pw.label or tr("Kraft"))
                local act = { type = "ACTIVATE", srcUid = a.srcUid, key = a.key }
                o.run = function() UI.Act(act) end
            elseif a.type == "COMPLETE_QUEST" then
                o.card = p.resources[a.resIdx] and p.resources[a.resIdx].card
                o.caption = tr("Quest abschließen")
                local act = { type = "COMPLETE_QUEST", resIdx = a.resIdx }
                o.run = function() UI.Act(act) end
            end
            if o.card then out[#out + 1] = o end
        end
    end
    table.sort(out, function(a, b) return (a.good and 1 or 0) > (b.good and 1 or 0) end)
    return out
end

local function renderPending(s)
    local d = myPending()
    local board = boardChoice(d)
    UI.boardMode = board
    if not board then UI.destroyPick = nil end
    -- Zielbanner
    local aim = UI.aim
    for _, x in ipairs(aim.btns) do x:Hide() end
    if board and not UI.busy then
        aim.title:SetText(d.destroy and tr("Wähle die Karte, die zerstört wird!") or d.protect and tr("Protector einsetzen?") or d.target and tr("Wähle ein Ziel!") or tr("Wähle eine Karte!"))
        aim.prompt:SetText(wowText(d.prompt or ""))
        aim.warn:SetText(d.destroy and tr("Achtung: Die gewählte Karte wird zerstört und kommt auf den Friedhof.") or "")
        local list = {}
        local picked = d.destroy and optFor(d, UI.destroyPick)
        if picked then list[#list + 1] = { label = tr("{0} zerstören", picked.label), kind = "danger", run = function() UI.destroyPick = nil; UI.Choose(picked.v) end } end
        for _, o in ipairs(d.opts) do
            if not boardOpt(o) then
                local v = o.v
                list[#list + 1] = { label = wowText(o.label), kind = (v == "__cancel" or (v == "__none" and d.protect)) and "danger" or "normal", run = function() UI.Choose(v) end }
            end
        end
        for i, o in ipairs(list) do
            local b = aim.btns[i]
            if not b then b = button(aim, "", 110, 24); aim.btns[i] = b end
            b:setText(o.label); b:setKind(o.kind); b:Show()
            b:ClearAllPoints(); b:SetPoint("BOTTOMRIGHT", -8 - (i - 1) * 116, 7)
            onClick(b, o.run)
        end
        aim:Show()
        UI.turnText:SetText(""); UI.btnEnd:Hide()
    else aim:Hide() end
    -- Mittiges Fenster
    local m = UI.modal
    clearModal()
    if not d or board or UI.busy then m:Hide() return end
    local y = 60
    local cards, btns = {}, {}
    if d.kind == "priority" then
        m.title:SetText(d.reason == "combat" and tr("Kampf – reagieren?") or tr("Reagieren?"))
        m.prompt:SetText(wowText(d.prompt or ""))
        for _, ch in ipairs(priorityChoices(d)) do
            cards[#cards + 1] = { card = ch.card, caption = ch.good and ("* " .. ch.caption) or ch.caption, good = ch.good, run = ch.run }
        end
        btns[#btns + 1] = { label = tr("Passen"), kind = "success", run = function() UI.Act({ type = "PASS" }) end }
    else
        m.title:SetText(d.protect and tr("Angriff! Protector einsetzen?") or (d.src and wowText(d.src)) or tr("Entscheidung"))
        local pr = wowText(d.prompt or "")
        if d.destroy then pr = pr .. "\n|cffff5544" .. tr("Achtung: Die gewählte Karte wird zerstört und kommt auf den Friedhof.") .. "|r" end
        m.prompt:SetText(pr)
        for _, o in ipairs(d.opts) do
            local ref = o.card ~= nil and o.card or (type(o.v) ~= "number" and o.v or nil)
            local card = (o.v ~= "__none" and o.v ~= "__cancel" and o.v ~= "__done") and cardOfRef(ref) or nil
            local v = o.v
            if card then
                local cap = wowText(o.label or card.name)
                if d.destroy then
                    cards[#cards + 1] = { card = card, caption = cap, good = UI.destroyPick == v, run = function() UI.destroyPick = v; UI.Render() end }
                else cards[#cards + 1] = { card = card, caption = cap, run = function() UI.Choose(v) end } end
            else
                btns[#btns + 1] = { label = wowText(o.label), kind = (v == "__cancel" or (v == "__none" and d.protect)) and "danger" or "normal", run = function() UI.Choose(v) end }
            end
        end
        if d.destroy then
            local picked = optFor(d, UI.destroyPick)
            if picked then btns[#btns + 1] = { label = tr("{0} zerstören", wowText(picked.label)), kind = "danger", run = function() local v = picked.v UI.destroyPick = nil; UI.Choose(v) end } end
        end
    end
    local hgt = 70
    if #cards > 0 then modalCards(m, cards, y + 10); hgt = hgt + 134 + 34 end
    -- Schaltflächen in Zeilen zu je 4
    local rowsN = math.ceil(#btns / 4)
    for i, o in ipairs(btns) do
        local b = m.btns[i]
        if not b then b = button(m, "", 160, 28); m.btns[i] = b end
        local r = math.floor((i - 1) / 4)
        local inRow = math.min(4, #btns - r * 4)
        local w = math.min(200, (660 - (inRow - 1) * 8) / inRow)
        local x0 = (700 - (inRow * w + (inRow - 1) * 8)) / 2
        b:SetSize(w, 28); b:setText(o.label); b:setKind(o.kind); b:Show()
        b:ClearAllPoints(); b:SetPoint("TOPLEFT", x0 + ((i - 1) % 4) * (w + 8), -(hgt - 10 + r * 34))
        onClick(b, o.run)
    end
    for i = #btns + 1, #m.btns do m.btns[i]:Hide() end
    m:SetHeight(hgt + rowsN * 34 + 10)
    m:Show()
end

-- Spielende (Overlay) und Rückmeldung an die Taverne
local function renderGameOver(s)
    if not s.gameOver then UI.over:Hide() return end
    if not UI.notified then
        UI.notified = true
        local won = s.winner == 1
        UI.over.title:SetText(won and tr("SIEG!") or tr("NIEDERLAGE"))
        UI.over.title:SetTextColor(won and 1 or 1, won and 0.85 or 0.35, won and 0.3 or 0.3)
        UI.over.sub:SetText(tr("{0} gegen {1} · Zug {2}", s.p1.hero.name, s.p2.hero.name, s.turn or 1))
        UI.AddLog(won and tr("Du hast gewonnen!") or tr("Du hast verloren."), "log-turn")
        UI.Sound(won and "win" or "lose")
        if ns.FX then UI.over:SetAlpha(0); ns.FX.Tween(0.5, function(t) UI.over:SetAlpha(t); UI.over:SetScale(0.85 + 0.15 * ns.FX.easeBack(t)) end, nil, 0.6, "over") end
        if UI.onGameOver then local ok, err = pcall(UI.onGameOver, s) if not ok then ns.Print(tostring(err)) end end
    end
    if not UI.goDismissed then UI.over:Show() end
end

function UI.Render()
    local s = G()
    if not s or not UI.frame then return end
    s.stopAll = db.prioManual and true or false                         -- Einstellung: in jedem Prioritätsfenster anhalten
    E.refreshDisplay(s)
    -- Plätze vor dem Neuzeichnen merken (Animationen); neue Partie / Rückgängig: nichts fliegen lassen
    local prev = (not UI.noAnim) and UI.SnapPositions() or nil
    if prev and UI.landFrom then prev[UI.landFrom.uid] = UI.landFrom end   -- CPU-Karte landet aus der Kartenschau
    UI.landFrom = nil
    releaseAll()
    UI._atk = E.canActMain(s, 1) and E.getAttackActions(s, 1) or {}
    if UI.attacker and not E.findCharacter(s, UI.attacker) then UI.attacker = nil end
    local d = myPending("choose")
    UI.boardMode = boardChoice(d)
    drawHero(s, 2); drawHero(s, 1)
    drawGraveyard(s, 2); drawGraveyard(s, 1)
    drawResources(s, 2); drawResources(s, 1)
    drawRow(s, 2); drawRow(s, 1)
    drawHands(s)
    renderMiddle(s)
    renderChain(s)
    renderPending(s)
    UI.RenderSide()
    UI.Animate(prev)
    UI.noAnim = false
    damageNumbers()
    renderProtect(s)
    renderGameOver(s)
end

-- Friedhof ansehen (die neuesten oben)
function UI.OpenGraveyard(pid)
    local s = G()
    local p = E.getPlayer(s, pid)
    local gy = UI.gyView
    for _, b in ipairs(gy.cards) do b:Hide() end
    gy.title:SetText(tr("Friedhof – {0} ({1} Karten)", pid == 1 and tr("Du") or UI.oppName, #p.graveyard))
    local w, h = 96, 134
    local playable = {}
    if pid == 1 or true then
        local ok, acts = pcall(E.getLegalActions, s, 1)
        if ok then for _, a in ipairs(acts) do if a.type == "PLAY_CARD" and a.gyUid then playable[a.gyUid] = true end end end
    end
    local list = {}
    for i = #p.graveyard, 1, -1 do list[#list + 1] = p.graveyard[i] end
    for i, c in ipairs(list) do
        if i > 24 then break end
        local b = gy.cards[i]
        if not b then b = newCard(gy); gy.cards[i] = b end
        b:Show(); b.card = c; b.ref = { zone = "gyview" }
        b:SetSize(w, h); b:ClearAllPoints()
        b:SetPoint("TOPLEFT", 16 + ((i - 1) % 8) * (w + 14), -40 - math.floor((i - 1) / 8) * (h + 30))
        b.fxRot = false
        local tex = artPath(c, {})
        if tex then b.art:SetTexture(tex); setArtCoords(b); b.art:Show(); b.plain:Hide(); b.name:SetText("") else b.art:Hide(); b.plain:Show(); b.name:SetText(c.name) end
        b.atkB:Hide(); b.hpB:Hide(); b.shade:Hide(); b.mark:SetText(""); b.tag:SetText("")
        b.tipOk = true
        local can = playable[c.uid]
        b.cap:SetText(can and tr("Spielen") or "")
        if can then local uid = c.uid b:SetScript("OnClick", function() gy:Hide(); UI.Act({ type = "PLAY_CARD", handIdx = -1, gyUid = uid }) end)
        else b:SetScript("OnClick", function() end) end
        if ns.FX then ns.FX.Update(b, c, { glow = can and GLOW.act or nil, pulse = can }) end
    end
    gy:Show()
end

return UI
