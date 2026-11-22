-- ============================================================================
-- WoW TCG - Effekte (nach dem Vorbild des Browserspiels)
-- Hover-Zoom, angedeutete 3D-Neigung zur Maus, Foil (wandernder Regenbogen), Glanzstreifen,
-- Leuchten, Umdrehen und Austeilen im Booster, Schadens-/Heilzahlen, Wackeln, neue Karten einblenden.
-- Alles über einen gemeinsamen OnUpdate-Takt (keine AnimationGroups: gleiche API in allen Clients).
-- ============================================================================
local ADDON, ns = ...
local FX = {}
ns.FX = FX

local ART = "Interface\\AddOns\\" .. ADDON .. "\\Art\\"
local TEX_FOIL, TEX_SHINE, TEX_GLOW = ART .. "fx_foil.tga", ART .. "fx_shine.tga", ART .. "fx_glow.tga"
FX.TEX_BACK = ART .. "back.tga"
local ART_B = 358 / 512                 -- Kartenbild: oberer Teil der 256x512-Textur
local XL_R, XL_B = 732 / 1024, 1022 / 1024 -- XL-Bild: Karte oben links 732x1022 in 1024x1024
local FOIL_CHANCE = 0.1                 -- wie im Browserspiel: 10 % der Karten sind Foil

FX.buttons = {}                         -- alle Kartenschaltflächen mit Effekten
FX.seen = {}                            -- schon angezeigte Karten (uid) – neue werden eingeblendet
local tweens, time = {}, 0
local hovered = nil

local function clamp(v, a, b) if v < a then return a elseif v > b then return b end return v end
local function easeOut(p) return 1 - (1 - p) * (1 - p) end

-- ---------------------------------------------------------------------------
-- Tweens: FX.Tween(dauer, fn(p), fertig, verzögerung, schlüssel)
-- ---------------------------------------------------------------------------
-- Laufenden Tween beenden (ohne done) – z. B. bevor eine Schaltfläche für eine andere Karte wiederverwendet wird
function FX.Cancel(key) for i = #tweens, 1, -1 do if tweens[i].key == key then table.remove(tweens, i) end end end
FX.easeOut = easeOut
-- Überschwingen wie cubic-bezier(.3,.7,.3,1.2) im Browser
function FX.easeBack(p) local c = 1.4 return 1 + (c + 1) * (p - 1) ^ 3 + c * (p - 1) ^ 2 end
function FX.Tween(dur, fn, done, delay, key)
    if key then for i = #tweens, 1, -1 do if tweens[i].key == key then table.remove(tweens, i) end end end
    local t = { dur = dur, fn = fn, done = done, t = -(delay or 0), key = key }
    tweens[#tweens + 1] = t
    if (delay or 0) <= 0 then fn(0) end
    return t
end

-- ---------------------------------------------------------------------------
-- Bildposition (Anheben, Wackeln) – Foil und Glanz hängen am Bild
-- ---------------------------------------------------------------------------
local function placeArt(b)
    if not b.art then return end
    local dx, dy = (b.fxShake or 0), (b.fxLift or 0) + (b.fxDrop or 0)
    local i = b.fxInset or 2
    b.art:ClearAllPoints()
    b.art:SetPoint("TOPLEFT", i + dx, -i + dy)
    b.art:SetPoint("BOTTOMRIGHT", -i + dx, i + dy)
end

-- ---------------------------------------------------------------------------
-- Neigung wie im Browser (js/renderer.js: perspective(900px) rotateX(-dy·max) rotateY(dx·max), Feldkarte 7°,
-- große Vorschau 13°; die Seite unter der Maus kippt nach hinten, Werte folgen weich).
-- WoW kann Texturen nicht perspektivisch zeichnen: ein verzerrtes Viereck wird als zwei Dreiecke gezeichnet und
-- knickt entlang der Diagonale. Deshalb wird das Bild in GRID x GRID Zellen zerlegt; jede Zellecke wird gedreht,
-- projiziert und per SetVertexOffset verschoben. Nachbarzellen teilen ihre Ecken – keine Lücken, kein Knick.
-- Ohne SetVertexOffset (sehr alte Clients) gibt es keine Neigung statt einer falschen.
-- ---------------------------------------------------------------------------
local GRID = 6
local TILT_CARD, TILT_ZOOM = 7, 13           -- Grad (Browser: applyFx(…, 7) und (…, 13))
local PERSP = 900 / 150                      -- perspective(900px) bei ~150 px breiten Karten: 6 Kartenbreiten

local function newTiltGrid(parent)
    local g = CreateFrame("Frame", nil, parent)
    g.cells = {}
    for j = 0, GRID - 1 do
        for i = 0, GRID - 1 do
            local c = { u0 = i / GRID, u1 = (i + 1) / GRID, v0 = j / GRID, v1 = (j + 1) / GRID }
            c.art = g:CreateTexture(nil, "ARTWORK")
            c.foil = g:CreateTexture(nil, "ARTWORK", nil, 2); c.foil:SetTexture(TEX_FOIL); c.foil:SetBlendMode("ADD")
            c.shine = g:CreateTexture(nil, "ARTWORK", nil, 3); c.shine:SetTexture(TEX_SHINE); c.shine:SetBlendMode("ADD")
            g.cells[#g.cells + 1] = c
        end
    end
    g.ok = g.cells[1].art.SetVertexOffset ~= nil
    g:Hide()
    return g
end

-- Raster auf ein Bild legen (Größe W x H, Textur tex, Bildbereich bis B)
local function tiltLayout(g, W, H, tex, B, R)
    R = R or 1                                                              -- Bildbereich waagerecht (XL: 732/1024)
    g.W, g.H = W, H
    for _, c in ipairs(g.cells) do
        for _, t in ipairs({ c.art, c.foil, c.shine }) do
            t:ClearAllPoints(); t:SetPoint("TOPLEFT", g, "TOPLEFT", c.u0 * W, -c.v0 * H)
            t:SetSize(W / GRID, H / GRID)
        end
        c.art:SetTexture(tex); c.art:SetTexCoord(c.u0 * R, c.u1 * R, c.v0 * B, c.v1 * B)
    end
end

-- Ecke (u, v) drehen und projizieren; Rückgabe: Verschiebung in WoW-Koordinaten (y nach oben)
local function project(u, v, W, H, sx, cx, sy, cy, P)
    local x, y = (u - 0.5) * W, (v - 0.5) * H                 -- wie im Browser: y nach unten
    local x1, z1 = x * cy, -x * sy                             -- rotateY
    local y2, z2 = y * cx - z1 * sx, y * sx + z1 * cx          -- rotateX
    local k = P / (P - z2)
    return x1 * k - x, -(y2 * k - y)
end

-- rx, ry in Grad; foilO/shineO = Verschiebung der Foil-/Glanzstreifen (wie bisher), Alpha je Ebene
local function tiltApply(g, rx, ry, foilO, foilA, shineO, shineA)
    local W, H = g.W, g.H
    local P = PERSP * W
    local ax, ay = math.rad(rx), math.rad(ry)
    local sx, cx, sy, cy = math.sin(ax), math.cos(ax), math.sin(ay), math.cos(ay)
    for _, c in ipairs(g.cells) do
        local ulx, uly = project(c.u0, c.v0, W, H, sx, cx, sy, cy, P)
        local llx, lly = project(c.u0, c.v1, W, H, sx, cx, sy, cy, P)
        local urx, ury = project(c.u1, c.v0, W, H, sx, cx, sy, cy, P)
        local lrx, lry = project(c.u1, c.v1, W, H, sx, cx, sy, cy, P)
        for _, t in ipairs({ c.art, c.foil, c.shine }) do
            t:SetVertexOffset(1, ulx, uly); t:SetVertexOffset(2, llx, lly)
            t:SetVertexOffset(3, urx, ury); t:SetVertexOffset(4, lrx, lry)
        end
        if foilA > 0 then c.foil:SetTexCoord(foilO + c.u0 * 0.5, foilO + c.u1 * 0.5, c.v0, c.v1) end
        c.foil:SetAlpha(foilA)
        c.shine:SetTexCoord(shineO + c.u0 * 0.5, shineO + c.u1 * 0.5, c.v0, c.v1)
        c.shine:SetAlpha(shineA)
    end
end

-- Zustand der Neigung (eine Karte gleichzeitig): x/y = Mausposition 0..1 (geglättet), h = Stärke 0..1
local T = { b = nil, x = 0.5, y = 0.5, tx = 0.5, ty = 0.5, h = 0, releasing = false }
FX.tilt = T
local function tiltOn() local db = ns.GetDB() return db.tilt ~= false end

local function tiltStop()
    local b = T.b
    if not b then return end
    T.b = nil
    if FX.tiltGrid then FX.tiltGrid:Hide() end
    if b.art then b.art:SetAlpha(1) end
    if b.shine then b.shine:SetAlpha(0) end
    local z = FX.zoomFrame
    if z and z.grid then z.grid:Hide(); z.art:SetAlpha(1) end
end

local function tiltStart(b)
    tiltStop()
    if not tiltOn() or b.fxRot or b.fxNoTilt or not (b.art and b.art:IsShown()) or not b.card then return end
    local g = FX.tiltGrid or newTiltGrid(UIParent)
    FX.tiltGrid = g
    if not g.ok then return end
    local tex = b.fxArtTex or b.fxTex or (b.card.id and ns.CardArt(b.card.id))
    if not tex then return end
    g:SetParent(b); g:ClearAllPoints(); g:SetAllPoints(b.art); g:SetFrameLevel(b:GetFrameLevel() + 1)
    local W, H = b.art:GetWidth() or 0, b.art:GetHeight() or 0
    if W <= 1 or H <= 1 then W, H = (b:GetWidth() or 4) - 4, (b:GetHeight() or 4) - 4 end
    tiltLayout(g, W, H, tex, b.fxB or ART_B)
    T.b, T.h, T.releasing, T.x, T.y, T.tx, T.ty = b, 0, false, 0.5, 0.5, 0.5, 0.5
end

-- ---------------------------------------------------------------------------
-- Zoom: großes Kartenbild neben der überfahrenen Karte
-- ---------------------------------------------------------------------------
local function buildZoom()
    local z = CreateFrame("Frame", "WoWTCGZoom", UIParent)
    z:SetSize(256, 358)
    z:SetFrameStrata("TOOLTIP")
    z.glow = z:CreateTexture(nil, "BACKGROUND"); z.glow:SetTexture(TEX_GLOW); z.glow:SetBlendMode("ADD")
    z.glow:SetPoint("TOPLEFT", -40, 40); z.glow:SetPoint("BOTTOMRIGHT", 40, -40)
    z.art = z:CreateTexture(nil, "ARTWORK"); z.art:SetAllPoints(); z.art:SetTexCoord(0, 1, 0, ART_B)
    z.foil = z:CreateTexture(nil, "ARTWORK", nil, 2); z.foil:SetAllPoints(); z.foil:SetTexture(TEX_FOIL); z.foil:SetBlendMode("ADD")
    z.shine = z:CreateTexture(nil, "ARTWORK", nil, 3); z.shine:SetAllPoints(); z.shine:SetTexture(TEX_SHINE); z.shine:SetBlendMode("ADD")
    z.grid = newTiltGrid(z); z.grid:SetAllPoints(z); z.grid:SetFrameLevel(z:GetFrameLevel() + 1)
    z:Hide()
    FX.zoomFrame = z
    return z
end

local function showZoom(b)
    local db = ns.GetDB()
    if db.zoom == false or not b.card or not b.card.id or not (b.art and b.art:IsShown()) then return end
    local z = FX.zoomFrame or buildZoom()
    local tex = b.fxTex or (ns.CardArtZoom or ns.CardArtHD or ns.CardArt)(b.card.id)
    -- Bildausschnitt: XL-Textur (1024x1024, Karte 732x1022), sonst 256er/512er (Karte oben, ganze Breite)
    local R, B = 1, ART_B
    if tex:find("\\xl\\", 1, true) then R, B = XL_R, XL_B end
    z.art:SetTexCoord(0, R, 0, B)
    -- Halb so groß wie zuvor (Wunsch nach Test im Spiel): 43 % der Bildschirmhöhe, höchstens 21 % der Breite,
    -- höchstens 450 Pixel breit – die 512er-HD-Bilder werden damit nur verkleinert, nie vergrößert
    local pw, ph = 1920, 1080
    if GetPhysicalScreenSize then local w, h = GetPhysicalScreenSize() if h and h > 0 then pw, ph = w, h end end
    local ppu = ph / 768 * UIParent:GetEffectiveScale()                    -- Bildschirm-Pixel je UI-Einheit
    local wpx = math.min(ph * 0.43 * 0.716, pw * 0.21, 450)
    local ZW = math.floor(wpx / ppu + 0.5)
    local ZH = math.floor(ZW / 0.716 + 0.5)
    z:SetSize(ZW, ZH)
    z.art:SetTexture(tex)
    z.art:SetAlpha(1); z.grid:Hide()
    if z.grid.ok and tiltOn() then tiltLayout(z.grid, ZW, ZH, tex, B, R) end
    z.foilOn = b.fxFoil
    z.foil:SetShown(b.fxFoil and true or false)
    local c = b.fxGlowColor or { 1, 0.85, 0.5 }
    z.glow:SetVertexColor(c[1], c[2], c[3])
    -- rechts neben der Karte, sonst links; vertikal am Bildschirm halten
    local s = b:GetEffectiveScale() / UIParent:GetEffectiveScale()
    local l, r, t, bt = (b:GetLeft() or 0) * s, (b:GetRight() or 0) * s, (b:GetTop() or 0) * s, (b:GetBottom() or 0) * s
    local W, H = UIParent:GetWidth(), UIParent:GetHeight()
    local x = (r + ZW + 16 < W) and (r + 14) or (l - ZW - 14)
    local y = clamp((t + bt) / 2 + ZH / 2, ZH + 4, H - 4)                -- neben der Karte, ganz auf dem Bildschirm
    z:ClearAllPoints(); z:SetPoint("TOPLEFT", UIParent, "BOTTOMLEFT", x, y)
    z:SetAlpha(0); z:Show()
    FX.Tween(0.14, function(p) z:SetAlpha(p); z:ClearAllPoints(); z:SetPoint("TOPLEFT", UIParent, "BOTTOMLEFT", x, y - 10 * (1 - easeOut(p))) end, nil, 0, "zoom")
end

local function hideZoom()
    local z = FX.zoomFrame
    if z and z:IsShown() then FX.Tween(0.08, function(p) z:SetAlpha(1 - p) end, function() z:Hide() end, 0, "zoom") end
end

-- ---------------------------------------------------------------------------
-- Kartenschaltfläche ausstatten
-- ---------------------------------------------------------------------------
function FX.Attach(b, opts)
    if b.fxAttached or not b.art then return end
    b.fxAttached = true
    opts = opts or {}
    b.fxNoTilt = opts.noTilt
    b.glow = b:CreateTexture(nil, "BACKGROUND", nil, -8)
    b.glow:SetTexture(TEX_GLOW); b.glow:SetBlendMode("ADD")
    b.glow:SetPoint("TOPLEFT", -22, 22); b.glow:SetPoint("BOTTOMRIGHT", 22, -22)
    b.glow:SetAlpha(0)
    b.foil = b:CreateTexture(nil, "ARTWORK", nil, 2)
    b.foil:SetTexture(TEX_FOIL); b.foil:SetBlendMode("ADD"); b.foil:SetAllPoints(b.art); b.foil:Hide()
    b.shine = b:CreateTexture(nil, "ARTWORK", nil, 3)
    b.shine:SetTexture(TEX_SHINE); b.shine:SetBlendMode("ADD"); b.shine:SetAllPoints(b.art); b.shine:SetAlpha(0)
    local enter, leave = b:GetScript("OnEnter"), b:GetScript("OnLeave")
    b:SetScript("OnEnter", function(self, ...)
        hovered = self
        FX.Tween(0.15, function(p) self.fxLift = 5 * easeOut(p); placeArt(self) end, nil, 0, self)
        self.fxShineSweep = 0
        if self.art:IsShown() then showZoom(self) end                     -- Vorschau zuerst (der Tooltip setzt sich daneben)
        if enter then enter(self, ...) end                                -- dann anheben (Ebene), dann neigen
        tiltStart(self)
    end)
    b:SetScript("OnLeave", function(self, ...)
        if hovered == self then hovered = nil end
        local l0 = self.fxLift or 0
        FX.Tween(0.15, function(p) self.fxLift = l0 * (1 - p); placeArt(self) end, nil, 0, self)
        if T.b == self then T.releasing = true end                        -- weich zurückkippen (wie im Browser)
        self.shine:SetAlpha(0)
        hideZoom()
        if leave then leave(self, ...) end
    end)
    FX.buttons[#FX.buttons + 1] = b
end

-- Nach dem Zeichnen einer Karte: Foil, Leuchtfarbe, neue Karte einblenden
function FX.Update(b, card, o)
    if not b.fxAttached then return end
    o = o or {}
    local db = ns.GetDB()
    local hasArt = b.art and b.art:IsShown()
    b.fxFoil = hasArt and card and (o.foil or card.isFoil) and db.foil ~= false
    b.foil:SetShown(b.fxFoil and true or false)
    if not hasArt then b.shine:SetAlpha(0) end
    -- Leuchtfarbe: Fraktion (Allianz blau, Horde rot), sonst Gold
    local c = { 1, 0.82, 0.45 }
    if card and card.faction == "Alliance" then c = { 0.35, 0.6, 1 } elseif card and card.faction == "Horde" then c = { 1, 0.3, 0.25 } end
    b.fxGlowColor = o.glow or c
    b.glow:SetVertexColor(b.fxGlowColor[1], b.fxGlowColor[2], b.fxGlowColor[3])
    b.fxPulse = o.pulse
    if not o.pulse and hovered ~= b then b.glow:SetAlpha(0) end
    -- neue Karte in Hand oder Party: von unten einblenden
    if card and card.uid and o.zone and (o.zone == "hand" or o.zone == "ally") and not FX.seen[card.uid] then
        FX.seen[card.uid] = true
        FX.Pop(b, o.zone == "hand" and -24 or 18)
    end
end

function FX.Pop(b, from)
    b:SetAlpha(0)
    FX.Tween(0.28, function(p) local e = easeOut(p); b:SetAlpha(e); b.fxDrop = (from or -20) * (1 - e); placeArt(b) end,
        function() b:SetAlpha(1); b.fxDrop = 0; placeArt(b) end, 0, "pop" .. tostring(b))
end

-- Zufälliges Foil für neue Karteninstanzen (reine Darstellung, wie im Browserspiel)
function FX.RollFoil() return math.random() < FOIL_CHANCE end

-- ---------------------------------------------------------------------------
-- Booster: Austeilen und Umdrehen
-- ---------------------------------------------------------------------------
-- b.homeX/homeY = Zielposition (TOPLEFT relativ zum Booster), von der Fenstermitte aus
function FX.Deal(b, i, fromX, fromY)
    b:SetAlpha(0)
    FX.Tween(0.35, function(p)
        local e = easeOut(p)
        b:ClearAllPoints()
        b:SetPoint("TOPLEFT", fromX + (b.homeX - fromX) * e, fromY + (b.homeY - fromY) * e)
        b:SetAlpha(clamp(p * 2, 0, 1))
    end, function() b:ClearAllPoints(); b:SetPoint("TOPLEFT", b.homeX, b.homeY) end, (i - 1) * 0.09, "deal" .. tostring(b))
end

-- Umdrehen: Breite über cos auf 0 und zurück; in der Mitte swap()
function FX.Flip(b, swap, done)
    local W = b.fxW or b:GetWidth()
    local swapped = false
    FX.Tween(0.32, function(p)
        local w = math.abs(math.cos(p * math.pi)) * W
        if p >= 0.5 and not swapped then swapped = true; swap() end
        b:SetWidth(math.max(1, w))
        b:ClearAllPoints(); b:SetPoint("TOPLEFT", (b.homeX or 0) + (W - w) / 2, b.homeY or 0)
    end, function()
        if not swapped then swap() end
        b:SetWidth(W); b:ClearAllPoints(); b:SetPoint("TOPLEFT", b.homeX or 0, b.homeY or 0)
        if done then done() end
    end, 0, "flip" .. tostring(b))
end

-- ---------------------------------------------------------------------------
-- Schadens- und Heilzahlen, Wackeln
-- ---------------------------------------------------------------------------
local floatPool = {}
local function floatText()
    for _, f in ipairs(floatPool) do if not f.busy then return f end end
    local host = FX.floatHost
    if not host then
        host = CreateFrame("Frame", nil, UIParent); host:SetAllPoints(UIParent); host:SetFrameStrata("FULLSCREEN_DIALOG")
        FX.floatHost = host
    end
    local f = host:CreateFontString(nil, "OVERLAY", "GameFontNormalHuge")
    floatPool[#floatPool + 1] = f
    return f
end

local function buttonFor(uid)
    for _, b in ipairs(FX.buttons) do
        if b:IsShown() and b.card and b.card.uid == uid then return b end
    end
end

function FX.Shake(b)
    FX.Tween(0.35, function(p) b.fxShake = math.sin(p * math.pi * 7) * 5 * (1 - p); placeArt(b) end,
        function() b.fxShake = 0; placeArt(b) end, 0, "shake" .. tostring(b))
end

function FX.Number(card, n, kind)
    if not card or not card.uid or (n or 0) <= 0 then return end
    local run = function()
        local b = buttonFor(card.uid)
        if not b then return end
        local s = b:GetEffectiveScale() / UIParent:GetEffectiveScale()
        local x, y = b:GetCenter()
        if not x then return end
        x, y = x * s, y * s
        local f = floatText(); f.busy = true
        f:SetText((kind == "heal" and "+" or "-") .. tostring(n))
        if kind == "heal" then f:SetTextColor(0.4, 1, 0.45) else f:SetTextColor(1, 0.25, 0.2) end
        f:Show()
        FX.Tween(1.0, function(p)
            f:ClearAllPoints(); f:SetPoint("CENTER", UIParent, "BOTTOMLEFT", x, y + 10 + 46 * easeOut(p))
            f:SetAlpha(p < 0.6 and 1 or (1 - (p - 0.6) / 0.4))
        end, function() f:Hide(); f.busy = false end)
        if kind ~= "heal" then FX.Shake(b) end
    end
    if C_Timer and C_Timer.After then C_Timer.After(0.03, run) else run() end   -- nach dem Neuzeichnen
end

-- Schadens-/Heilzahlen und Foil kommen aus der Engine (UI.lua vergleicht den Schaden je Zeichnen, makeCardInst würfelt Foil)

-- ---------------------------------------------------------------------------
-- Gemeinsamer Takt: Tweens, Foil-Wandern, Neigung, Glanz, Pulsieren
-- ---------------------------------------------------------------------------
function FX.OnUpdate(elapsed)
    time = time + elapsed
    -- Tweens
    local i = 1
    while i <= #tweens do
        local t = tweens[i]
        t.t = t.t + elapsed
        if t.t >= 0 then
            local p = t.dur > 0 and math.min(1, t.t / t.dur) or 1
            t.fn(p)
            if p >= 1 then table.remove(tweens, i); if t.done then t.done() end else i = i + 1 end
        else
            i = i + 1
        end
    end
    -- Maus über einer Karte: Glanz folgt der Maus, Zielwerte der Neigung
    local hx, hy = 0, 0
    local b = hovered
    local shineO, shineA = 0.25, 0
    if b and b:IsShown() and b.art and b.art:IsShown() then
        local cx, cy = GetCursorPosition()
        local s = b:GetEffectiveScale()
        local l, bt, w, h = b:GetLeft(), b:GetBottom(), b:GetWidth(), b:GetHeight()
        if l and w and w > 0 and h > 0 then
            hx = clamp((cx / s - l) / w - 0.5, -0.5, 0.5)
            hy = clamp((cy / s - bt) / h - 0.5, -0.5, 0.5)
        end
        if T.b == b and not T.releasing then T.tx, T.ty = hx + 0.5, 0.5 - hy end
        -- Glanz: erst einmal quer darüber, dann der Maus folgend
        local sw = b.fxShineSweep
        if sw and sw < 1 then
            sw = math.min(1, sw + elapsed / 0.45); b.fxShineSweep = sw
            shineO, shineA = -0.15 + 0.8 * sw, 0.55 * math.sin(sw * math.pi) + 0.15
        else
            shineO, shineA = 0.25 - hx * 0.5, 0.18
        end
        if T.b ~= b then b.shine:SetTexCoord(shineO, shineO + 0.5, 0, 1); b.shine:SetAlpha(shineA) end
        b.glow:SetAlpha(0.55 + 0.15 * math.sin(time * 4))
    end
    -- Neigung (weich nachgeführt wie im Browser: Position 22 %, Stärke 18 % je Frame bei 60 fps)
    local tb = T.b
    local tilting = false
    if tb then
        if not tb:IsShown() or not (tb.art and tb.art:IsShown()) or tb.fxRot then tiltStop()
        else
            local kp, kh = 1 - (0.78 ^ (elapsed * 60)), 1 - (0.82 ^ (elapsed * 60))
            T.x = T.x + (T.tx - T.x) * kp; T.y = T.y + (T.ty - T.y) * kp
            T.h = T.h + ((T.releasing and 0 or 1) - T.h) * kh
            if T.releasing and T.h < 0.02 then tiltStop()
            else
                tilting = true
                local dx, dy = (T.x - 0.5) * 2, (T.y - 0.5) * 2
                local g = FX.tiltGrid
                g:SetFrameLevel(tb:GetFrameLevel() + 1)
                if not g:IsShown() then g:Show() end
                tb.art:SetAlpha(0); tb.shine:SetAlpha(0); tb.foil:SetAlpha(0)
                local fo = (time * 0.035 + (T.x - 0.5) * 0.35) % 0.5
                local sa = (hovered == tb) and shineA or 0.18 * T.h
                tiltApply(g, -dy * TILT_CARD * T.h, dx * TILT_CARD * T.h, fo, tb.fxFoil and 0.42 or 0, shineO, sa)
            end
        end
    end
    -- Foil: Regenbogen wandert langsam, beim Überfahren mit der Maus
    for _, c in ipairs(FX.buttons) do
        if c.fxFoil and c:IsShown() and not (tilting and c == T.b) then
            local o = (time * 0.035 + ((c == hovered) and hx * 0.35 or 0)) % 0.5
            c.foil:SetTexCoord(o, o + 0.5, 0, 1)
            c.foil:SetAlpha((c == hovered) and 0.42 or 0.26)
        end
        if c.fxPulse and c:IsShown() and c ~= hovered then c.glow:SetAlpha(0.35 + 0.25 * math.sin(time * 3)) end
    end
    local z = FX.zoomFrame
    if z and z:IsShown() then
        local fo, so = (time * 0.035 + hx * 0.35) % 0.5, 0.25 - hx * 0.6
        if tilting and z.grid.ok then
            -- große Vorschau kippt stärker (13°)
            local dx, dy = (T.x - 0.5) * 2, (T.y - 0.5) * 2
            if not z.grid:IsShown() then z.grid:Show() end
            z.art:SetAlpha(0); z.foil:SetAlpha(0); z.shine:SetAlpha(0)
            tiltApply(z.grid, -dy * TILT_ZOOM * T.h, dx * TILT_ZOOM * T.h, fo, z.foilOn and 0.32 or 0, so, 0.22)
        else
            if z.grid:IsShown() then z.grid:Hide(); z.art:SetAlpha(1) end
            if z.foilOn then z.foil:SetTexCoord(fo, fo + 0.5, 0, 1); z.foil:SetAlpha(0.32) end
            z.shine:SetTexCoord(so, so + 0.5, 0, 1); z.shine:SetAlpha(0.22)
        end
        z.glow:SetAlpha(0.35 + 0.1 * math.sin(time * 3))
    end
end

local driver = CreateFrame("Frame")
driver:SetScript("OnUpdate", function(_, elapsed)
    local ok, err = pcall(FX.OnUpdate, elapsed)
    if not ok and not FX.errShown then FX.errShown = true; ns.Print("Effekt-Fehler: " .. tostring(err)) end
end)

return FX
