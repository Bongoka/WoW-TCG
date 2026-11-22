-- ============================================================================
-- WoW TCG – Engine-Grundlage (Lua-Port des Browserspiels, siehe addon/PORT.md)
-- Umgebung ns.E: alle Engine-Namen (wie in JS: q, evt, EK, FX, CARDS …) sind Felder von E.
-- Array-Helfer ersetzen die JS-Methoden (filter, map, some …). Arrays sind 1-basiert.
-- ============================================================================
local ADDON, ns = ...
local G0 = _G
local E = setmetatable({}, { __index = G0 })
ns.E = E
E.ns = ns
E.ADDON = ADDON
if setfenv then setfenv(1, E) else _ENV = E end

local type, pairs, ipairs, next, tostring, tonumber, select = type, pairs, ipairs, next, tostring, tonumber, select
unpack = G0.unpack or table.unpack   -- Lua 5.1 (WoW) und 5.3 (Test im Browser)
local tinsert, tremove, tsort, tconcat = table.insert, table.remove, table.sort, table.concat
local floor, random = math.floor, math.random

-- ---------------------------------------------------------------- Arrays
function filter(t, f) local o = {} if t then for i = 1, #t do local v = t[i] if f(v, i) then o[#o + 1] = v end end end return o end
function map(t, f) local o = {} if t then for i = 1, #t do o[i] = f(t[i], i) end end return o end
function some(t, f) if t then for i = 1, #t do if f(t[i], i) then return true end end end return false end
function every(t, f) if t then for i = 1, #t do if not f(t[i], i) then return false end end end return true end
function find(t, f) if t then for i = 1, #t do local v = t[i] if f(v, i) then return v end end end return nil end
function findIndex(t, f) if t then for i = 1, #t do if f(t[i], i) then return i end end end return nil end
function includes(t, v) if t then for i = 1, #t do if t[i] == v then return true end end end return false end
function indexOf(t, v) if t then for i = 1, #t do if t[i] == v then return i end end end return nil end
function push(t, ...) for i = 1, select('#', ...) do t[#t + 1] = (select(i, ...)) end return #t end
function slice(t, i, j) local o = {} if not t then return o end i = i or 1; j = j or #t for k = i, j do o[#o + 1] = t[k] end return o end
function copyArr(t) return slice(t) end
-- concat(a, b, …): neue Liste aus mehreren Listen (nil wird übersprungen)
function concat(...) local o = {} for a = 1, select('#', ...) do local t = select(a, ...) if t then for i = 1, #t do o[#o + 1] = t[i] end end end return o end
-- Element entfernen (erstes Vorkommen); gibt true zurück, wenn gefunden
function removeVal(t, v) local i = indexOf(t, v) if i then tremove(t, i) return true end return false end
function removeAt(t, i) return tremove(t, i) end
function insertFront(t, ...) local n = select('#', ...) for i = n, 1, -1 do tinsert(t, 1, (select(i, ...))) end end
function sum(t, f) local s = 0 if t then for i = 1, #t do s = s + (f and f(t[i], i) or t[i] or 0) end end return s end
function count(t, f) local n = 0 if t then for i = 1, #t do if f(t[i], i) then n = n + 1 end end end return n end
function reverse(t) local o = {} for i = #t, 1, -1 do o[#o + 1] = t[i] end return o end
function sortBy(t, f) tsort(t, function(a, b) return f(a) < f(b) end) return t end
-- stabile Sortierung (JS Array.sort ist stabil): f(a, b) < 0 = a vor b
function stableSort(t, cmp)
    for i = 2, #t do
        local v, j = t[i], i - 1
        while j >= 1 and cmp(t[j], v) > 0 do t[j + 1] = t[j]; j = j - 1 end
        t[j + 1] = v
    end
    return t
end
function uniq(t) local o, seen = {}, {} for i = 1, #t do local v = t[i] if not seen[v] then seen[v] = true; o[#o + 1] = v end end return o end
function keys(m) local o = {} for k in pairs(m) do o[#o + 1] = k end return o end
function values(m) local o = {} for _, v in pairs(m) do o[#o + 1] = v end return o end
function isEmpty(m) return m == nil or next(m) == nil end
function len(t) return t and #t or 0 end
function last(t) return t and t[#t] or nil end

-- ---------------------------------------------------------------- Werte
-- JS-Wahrheitswert (0, "", nil, false sind falsch) – nur wo nötig
function truthy(v) return v ~= nil and v ~= false and v ~= 0 and v ~= "" end
function num(v) return v or 0 end
function clamp(v, a, b) if v < a then return a elseif v > b then return b end return v end
function mathMax(a, b) if a > b then return a end return b end

-- Tiefenkopie für cloneState; statische Kartenlisten werden geteilt (CLONE_SHARED, dürfen nie verändert werden)
CLONE_SHARED = { limitTags = true, allowedClasses = true, allowedFactions = true, subtypes = true, allyTypes = true }
function deepCopy(v)
    if type(v) ~= "table" then return v end
    local o = {}
    for k, x in pairs(v) do
        if type(x) == "table" and not CLONE_SHARED[k] then o[k] = deepCopy(x) else o[k] = x end
    end
    return o
end
-- Flache Kopie ({ ...o })
function assign(dst, ...) for a = 1, select('#', ...) do local src = select(a, ...) if src then for k, v in pairs(src) do dst[k] = v end end end return dst end
function spread(...) return assign({}, ...) end

-- Gleichheit wie JSON.stringify(a) === JSON.stringify(b) (für Ziel-Listen u. ä.)
function sameV(a, b)
    if type(a) ~= type(b) then return false end
    if type(a) ~= "table" then return a == b end
    for k, v in pairs(a) do if not sameV(v, b[k]) then return false end end
    for k in pairs(b) do if a[k] == nil then return false end end
    return true
end

-- ---------------------------------------------------------------- Zufall
-- rand(): Zahl in [0, 1). Standard math.random; für gleichen Zufall in Kopien (choiceMatters) per seededRandom ersetzbar.
RNG = function() return random() end
function rand() return RNG() end
-- Park-Miller (ohne Bit-Operationen, WoW = Lua 5.1): reproduzierbarer Zufall ab seed
function seededRandom(seed)
    local a = (floor(seed) % 2147483646) + 1
    return function() a = (a * 16807) % 2147483647; return (a - 1) / 2147483646 end
end
local uidChars = "0123456789abcdefghijklmnopqrstuvwxyz"
function newUid(p)
    local t = {}
    for i = 1, 9 do local r = floor(rand() * 36) + 1 t[i] = uidChars:sub(r, r) end
    return (p or "c_") .. tconcat(t)
end
function randInt(n) return floor(rand() * n) + 1 end      -- 1..n
function shuffleDeck(arr)
    local a = copyArr(arr)
    for i = #a, 2, -1 do local j = floor(rand() * i) + 1; a[i], a[j] = a[j], a[i] end
    return a
end
-- Eindeutige Textform einer Tabelle (Schlüssel sortiert) – wie JSON.stringify für Vergleiche
function serialize(v)
    local t = type(v)
    if t ~= "table" then return tostring(v) end
    local ks = {}
    for k in pairs(v) do ks[#ks + 1] = k end
    tsort(ks, function(x, y) return tostring(x) < tostring(y) end)
    local parts = {}
    for i = 1, #ks do parts[i] = tostring(ks[i]) .. "=" .. serialize(v[ks[i]]) end
    return "{" .. tconcat(parts, ",") .. "}"
end

-- ---------------------------------------------------------------- Texte (wie tr() im Browser)
-- Schlüssel = deutscher Text, Platzhalter {0}, {1} … ; englische Fassung in I18N_EN (Engine/Lang.lua)
I18N_EN = I18N_EN or {}
LANG = (G0.GetLocale and G0.GetLocale() == "deDE") and "de" or "en"
function tr(s, ...)
    if LANG ~= "de" and I18N_EN[s] then s = I18N_EN[s] end
    local n = select('#', ...)
    if n > 0 then
        local args = { ... }
        s = s:gsub("{(%d+)}", function(d) local v = args[tonumber(d) + 1] if v == nil then return "" end return tostring(v) end)
    end
    return s
end

-- Ausgabe für Fehlersuche
function dbg(...) if G0.print then G0.print(...) end end
