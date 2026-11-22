-- Attrappe der WoW-API, um das Addon außerhalb des Spiels zu testen (fengari im Browser, Lua 5.3).
-- Jeder Frame/Texture-Aufruf ist ein No-Op; Show/Hide, Text, Skripte und Texturen werden gemerkt.
unpack = unpack or table.unpack
__frames, __chat, __timers, __textures = {}, {}, {}, {}
local function mock()
    local o = { _shown = true, _scripts = {} }
    return setmetatable(o, { __index = function(t, k)
        if type(k) ~= "string" or not k:match("^%u") then return nil end   -- wie in WoW: nur Methoden (Großbuchstabe), eigene Felder sind nil
        if k == "Show" then return function(self) self._shown = true end end
        if k == "Hide" then return function(self) self._shown = false end end
        if k == "IsShown" then return function(self) return self._shown end end
        if k == "SetShown" then return function(self, v) self._shown = not not v end end
        if k == "SetScript" or k == "HookScript" then return function(self, ev, fn) self._scripts[ev] = fn end end
        if k == "GetScript" then return function(self, ev) return self._scripts[ev] end end
        if k == "CreateTexture" or k == "CreateFontString" then return function(self) return mock() end end
        if k == "SetText" then return function(self, s) self._text = s end end
        if k == "GetText" then return function(self) return self._text end end
        if k == "SetTexture" then return function(self, p) self._tex = p; if type(p) == "string" then __textures[#__textures + 1] = p end end end
        if k == "GetPoint" then return function() return "CENTER", nil, "CENTER", 0, 0 end end
        if k == "GetWidth" then return function(self) return self._w or 100 end end
        if k == "SetWidth" then return function(self, w) self._w = w end end
        if k == "SetAlpha" then return function(self, a) self._alpha = a end end
        if k == "GetAlpha" then return function(self) return self._alpha or 1 end end
        if k == "SetTexCoord" then return function(self, ...) self._tc = { ... } end end
        if k == "GetHeight" then return function(self) return self._h or 100 end end
        if k == "GetStringWidth" or k == "GetScale" then return function() return 100 end end
        if k == "GetEffectiveScale" then return function() return 1 end end
        if k == "GetLeft" then return function() return 100 end end
        if k == "GetRight" then return function() return 200 end end
        if k == "GetTop" then return function() return 300 end end
        if k == "GetBottom" then return function() return 160 end end
        if k == "GetCenter" then return function() return 150, 230 end end
        if k == "IsEnabled" then return function() return true end end
        if k == "SetPoint" then return function(self, p, rel, rp, x, y) self._pt = { p, rel, rp, x, y } end end
        if k == "ClearAllPoints" then return function(self) self._pt = nil end end
        if k == "AddMessage" then return function(self, m) self._msgs = self._msgs or {}; self._msgs[#self._msgs + 1] = m end end
        if k == "SetTextColor" or k == "SetVertexColor" then return function(self, r, g, b) self._col = { r, g, b } end end
        if k == "SetVertexOffset" then return function(self, i, x, y) self._vo = self._vo or {}; self._vo[i] = { x, y } end end
        if k == "GetFrameLevel" then return function(self) return self._lvl or 1 end end
        if k == "SetFrameLevel" then return function(self, l) self._lvl = l end end
        if k == "SetHeight" then return function(self, h) self._h = h end end
        if k == "SetSize" then return function(self, w, h) self._w, self._h = w, h end end
        if k == "GetChildren" or k == "GetRegions" then return function() end end
        return function() end
    end })
end
__mock = mock
CreateFrame = function(_, name) local f = mock(); __frames[#__frames + 1] = f; if name then _G[name] = f end return f end
UIParent, GameTooltip, WorldFrame = mock(), mock(), mock()
UISpecialFrames = {}
tinsert, tremove = table.insert, table.remove
function strsplit(sep, s)
    local out = {}
    for part in (s .. sep):gmatch("(.-)" .. sep:gsub("%p", "%%%0")) do out[#out + 1] = part end
    return table.unpack(out)
end
function strtrim(s) return (s:gsub("^%s+", ""):gsub("%s+$", "")) end
SlashCmdList = {}
DEFAULT_CHAT_FRAME = { AddMessage = function(_, m) __chat[#__chat + 1] = m end }
__now = 1000
function GetTime() return __now end
C_Timer = { After = function(d, fn) __timers[#__timers + 1] = fn end }
function __pump() local n = 0 while #__timers > 0 and n < 100000 do local fn = table.remove(__timers, 1); fn(); n = n + 1 end return n end
function InCombatLockdown() return false end
__npc = { guid = nil, name = nil, gossip = {} }
function UnitGUID(u) if u == "npc" or u == "target" then return __npc.guid end end
function UnitName(u) if u == "npc" or u == "target" then return __npc.name end end
C_GossipInfo = { GetOptions = function() return __npc.gossip end, CloseGossip = function() __npc.closed = true end }
function CloseMerchant() end
function CloseQuest() end
function SetPortraitTexture(tex, unit) tex._portrait = unit end
function PlaySound() end
SOUNDKIT = {}
function __fire(ev, ...) for _, f in ipairs(__frames) do local s = f._scripts.OnEvent; if s then s(f, ev, ...) end end end
__cursor = { 190, 280 }
function GetCursorPosition() return __cursor[1], __cursor[2] end
-- Zeit vergehen lassen: alle OnUpdate-Skripte in 0,05-s-Schritten
function __tick(sec) for _ = 1, math.floor(sec / 0.05) do __now = __now + 0.05; for _, f in ipairs(__frames) do local s = f._scripts.OnUpdate; if s then s(f, 0.05) end end; __pump() end end
