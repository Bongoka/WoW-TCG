-- ============================================================================
-- WoW TCG - Optionen
-- Einstellungen liegen in WoWTCGDB und wirken sofort auf die UI.
-- ============================================================================
local ADDON, ns = ...

local Options = {}
ns.Options = Options

local GOLD = { 0.85, 0.72, 0.35 }
local WHITE = { 1, 1, 1 }
local GREY = { 0.75, 0.75, 0.75 }

local function AddText(parent, font, color)
    local fs = parent:CreateFontString(nil, "OVERLAY")
    fs:SetFontObject(_G[font] or GameFontNormalSmall)
    if color then fs:SetTextColor(color[1], color[2], color[3]) end
    fs:SetJustifyH("LEFT")
    return fs
end

local function MakeButton(parent, text, width, height)
    local b = CreateFrame("Button", nil, parent)
    b:SetSize(width or 100, height or 24)
    local bg = b:CreateTexture(nil, "BACKGROUND")
    bg:SetAllPoints()
    bg:SetColorTexture(0.18, 0.18, 0.22, 1)
    b.bg = bg
    local border = b:CreateTexture(nil, "BORDER")
    border:SetPoint("TOPLEFT", -1, 1)
    border:SetPoint("BOTTOMRIGHT", 1, -1)
    border:SetColorTexture(0.5, 0.45, 0.3, 1)
    b.border = border
    local fs = AddText(b, "GameFontNormalSmall", WHITE)
    fs:SetPoint("CENTER", 0, 0)
    fs:SetText(text or "")
    b.label = fs
    b:SetScript("OnEnter", function(self) self.bg:SetColorTexture(0.26, 0.26, 0.32, 1) end)
    b:SetScript("OnLeave", function(self) self.bg:SetColorTexture(0.18, 0.18, 0.22, 1) end)
    return b
end

local function MakeRow(parent, y, label, onChange, step, minValue, maxValue)
    local row = CreateFrame("Frame", nil, parent)
    row:SetPoint("TOPLEFT", 12, y)
    row:SetSize(390, 28)

    local text = AddText(row, "GameFontNormalSmall", WHITE)
    text:SetPoint("LEFT", 0, 0)
    text:SetWidth(170)
    text:SetText(label)

    local minus = MakeButton(row, "-", 26, 22)
    minus:SetPoint("LEFT", 178, 0)
    local plus = MakeButton(row, "+", 26, 22)
    plus:SetPoint("LEFT", 342, 0)

    local value = AddText(row, "GameFontNormalSmall", GOLD)
    value:SetPoint("LEFT", 214, 0)
    value:SetWidth(120)
    value:SetJustifyH("CENTER")

    local function apply(delta)
        local db = ns.GetDB()
        local v = (db[onChange] or 0) + delta * step
        v = math.max(minValue, math.min(maxValue, v))
        -- Rundung auf die Schrittweite
        v = math.floor(v / step + 0.5) * step
        db[onChange] = v
        value:SetText(string.format(step < 1 and "%.2f" or "%.0f", v))
        if ns.UI and ns.UI.ApplySettings then ns.UI.ApplySettings() end
    end

    minus:SetScript("OnClick", function() apply(-1) end)
    plus:SetScript("OnClick", function() apply(1) end)
    return row, value
end

local function MakeCheck(parent, y, label, key)
    local b = MakeButton(parent, "", 390, 24)
    b:SetPoint("TOPLEFT", 12, y)
    b.label:SetPoint("LEFT", 8, 0)
    b.label:SetJustifyH("LEFT")
    b.label:SetText(label)
    b.checkKey = key
    b:SetScript("OnClick", function(self)
        local db = ns.GetDB()
        db[key] = not db[key]
        Options.Refresh()
        if ns.UI and ns.UI.ApplySettings then ns.UI.ApplySettings() end
    end)
    return b
end

function Options.Initialize()
    if Options.frame then return end
    local db = ns.GetDB()

    local f = CreateFrame("Frame", "WoWTCGOptionsFrame", UIParent)
    f:SetSize(420, 230)
    f:SetPoint("CENTER", UIParent, "CENTER", 0, 0)
    f:SetFrameStrata("DIALOG")
    f:SetMovable(true)
    f:EnableMouse(true)
    f:RegisterForDrag("LeftButton")
    f:SetClampedToScreen(true)
    f:SetScript("OnDragStart", function(self) self:StartMoving() end)
    f:SetScript("OnDragStop", function(self) self:StopMovingOrSizing() end)
    f:Hide()
    Options.frame = f

    local bg = f:CreateTexture(nil, "BACKGROUND")
    bg:SetAllPoints()
    bg:SetColorTexture(0.04, 0.04, 0.05, 0.98)
    f.bg = bg
    local edge = f:CreateTexture(nil, "BORDER")
    edge:SetAllPoints()
    edge:SetColorTexture(0.45, 0.38, 0.22, 1)
    edge:SetAlpha(0.6)

    local title = AddText(f, "GameFontNormal", GOLD)
    title:SetPoint("TOPLEFT", 12, -10)
    title:SetText("WoW TCG - Optionen")

    local close = MakeButton(f, "Schließen", 90, 22)
    close:SetPoint("TOPRIGHT", -10, -8)
    close:SetScript("OnClick", function() Options.Hide() end)

    local _, scaleValue = MakeRow(f, -48, "Fenstergröße", "scale", 0.05, 0.6, 1.3)
    Options.scaleValue = scaleValue

    Options.lockCheck = MakeCheck(f, -84, "Fenster fixieren", "locked")
    Options.tooltipCheck = MakeCheck(f, -112, "Tooltips anzeigen", "showTooltips")

    local resetPos = MakeButton(f, "Position zurücksetzen", 170, 24)
    resetPos:SetPoint("BOTTOMLEFT", 12, 44)
    resetPos:SetScript("OnClick", function()
        if ns.UI and ns.UI.ResetPosition then ns.UI.ResetPosition() end
        ns.Print("Fensterposition zurückgesetzt.")
    end)

    local resetAll = MakeButton(f, "Alle Einstellungen zurücksetzen", 220, 24)
    resetAll:SetPoint("BOTTOMLEFT", 12, 12)
    resetAll:SetScript("OnClick", function()
        ns.ResetDB()
        if ns.UI and ns.UI.ApplySettings then ns.UI.ApplySettings() end
        Options.Refresh()
        ns.Print("Einstellungen zurückgesetzt.")
    end)

    -- ESC schließt das Fenster (falls die globale Liste vorhanden ist).
    if UISpecialFrames then
        local found = false
        for i = 1, #UISpecialFrames do
            if UISpecialFrames[i] == "WoWTCGOptionsFrame" then found = true; break end
        end
        if not found then UISpecialFrames[#UISpecialFrames + 1] = "WoWTCGOptionsFrame" end
    end

    Options.Refresh()
end

function Options.Refresh()
    if not Options.frame then return end
    local db = ns.GetDB()
    if Options.scaleValue then Options.scaleValue:SetText(string.format("%.2f", db.scale or 0.9)) end
    if Options.lockCheck then
        Options.lockCheck.label:SetText((db.locked and "[X] " or "[ ] ") .. "Fenster fixieren")
    end
    if Options.tooltipCheck then
        Options.tooltipCheck.label:SetText((db.showTooltips ~= false and "[X] " or "[ ] ") .. "Tooltips anzeigen")
    end
end

function Options.Show()
    if not Options.frame then Options.Initialize() end
    Options.Refresh()
    Options.frame:Show()
end

function Options.Hide()
    if Options.frame then Options.frame:Hide() end
end

function Options.Toggle()
    if not Options.frame then Options.Initialize() end
    if Options.frame:IsShown() then
        Options.frame:Hide()
    else
        Options.Show()
    end
end

return Options
