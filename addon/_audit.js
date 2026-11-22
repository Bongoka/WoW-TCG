// Temporär: Abdeckungs-Audit für CardFx gegen Effects/Game.
(function () {
  var FILES = [
    '/addon/WoWTCG/Core.lua',
    '/addon/WoWTCG/Cards.lua',
    '/addon/WoWTCG/Decks.lua',
    '/addon/WoWTCG/CardFx.lua',
    '/addon/WoWTCG/Effects.lua',
    '/addon/WoWTCG/Game.lua',
  ];

  var MOCK = [
    '__NS = {}',
    'function CreateFrame() return { RegisterEvent = function() end, SetScript = function() end } end',
    'SlashCmdList = {}',
    'DEFAULT_CHAT_FRAME = { AddMessage = function() end }',
    '',
  ].join('\n');

  var TEST = [
    'local ns = __NS',
    'local lines = {}',
    'local function add(...)',
    '  local t = {}',
    '  for i = 1, select("#", ...) do t[#t + 1] = tostring(select(i, ...)) end',
    '  lines[#lines + 1] = table.concat(t, "|")',
    'end',
    'local function collect(set)',
    '  local t = {}',
    '  for k in pairs(set) do t[#t + 1] = k end',
    '  table.sort(t)',
    '  return table.concat(t, ",")',
    'end',
    'local effects, ongoing, static, costs, rewards, conds = {}, {}, {}, {}, {}, {}',
    'local fxCount, unsupported, noPlay = 0, 0, 0',
    'function setv(t, k) if k ~= nil then t[tostring(k)] = true end end',
    'for id, fx in pairs(ns.CardFx) do',
    '  fxCount = fxCount + 1',
    '  if fx.unsupported then unsupported = unsupported + 1 end',
    '  if fx.noPlay then noPlay = noPlay + 1 end',
    '  for i = 1, #(fx.effects or {}) do setv(effects, fx.effects[i].k) end',
    '  for k in pairs(fx.ongoing or {}) do setv(ongoing, k) end',
    '  for k in pairs(fx.static or {}) do setv(static, k) end',
    '  for i = 1, #(fx.costs or {}) do setv(costs, fx.costs[i].k) end',
    '  for i = 1, #(fx.questCosts or {}) do setv(costs, fx.questCosts[i].k) end',
    '  for i = 1, #(fx.reward or {}) do setv(rewards, fx.reward[i].k) end',
    '  if fx.condition then setv(conds, fx.condition) end',
    'end',
    'add("fxCount", fxCount, "unsupported", unsupported, "noPlay", noPlay)',
    'add("EFFECTS", collect(effects))',
    'add("ONGOING", collect(ongoing))',
    'add("STATIC", collect(static))',
    'add("COSTS", collect(costs))',
    'add("REWARDS", collect(rewards))',
    'add("CONDITIONS", collect(conds))',
    'local known = ns.CardFxHardcoded or {}',
    'local missing, noted = {}, {}',
    'local cardCount = 0',
    'for id, card in pairs(ns.Cards) do',
    '  cardCount = cardCount + 1',
    '  if card.type ~= "Hero" then',
    '    local text = card.text or ""',
    '    if card.fxNote then noted[#noted + 1] = id .. ":" .. card.name .. ":" .. card.fxNote end',
    '    if text ~= "" and not card.fx and not known[id] and not card.fxNote then',
    '      missing[#missing + 1] = id .. ":" .. card.name .. ":" .. text:sub(1, 70)',
    '    end',
    '  end',
    'end',
    'table.sort(noted)',
    'table.sort(missing)',
    'add("CARDS", cardCount)',
    'add("NOTED", #noted)',
    'for i = 1, #noted do add("NOTE", noted[i]) end',
    'add("MISSING", #missing)',
    'for i = 1, #missing do add("MISS", missing[i]) end',
    '__RESULT = table.concat(lines, "\\n")',
    'return "done"',
  ].join('\n');

  function stripBom(s) { return s.replace(/^\uFEFF/, ''); }

  function wrap(name, code) {
    code = stripBom(code).replace(/local ADDON, ns = \.\.\./g, 'local ADDON, ns = "WoWTCG", __NS');
    code = code.replace(/^return [A-Za-z0-9_.]+\s*$/gm, '');
    return '-- ' + name + '\ndo\n' + code + '\nend\n';
  }

  window.__runAudit = async function () {
    var texts = [];
    for (var i = 0; i < FILES.length; i++) {
      var r = await fetch(FILES[i] + '?t=' + Date.now());
      if (!r.ok) return 'fetch ' + FILES[i] + ': ' + r.status;
      texts.push(await r.text());
    }
    var lua = MOCK;
    for (var k = 0; k < FILES.length; k++) lua += wrap(FILES[k], texts[k]);
    lua += '\n' + TEST;
    try {
      fengari.load(lua)();
      var result = fengari.load('return __RESULT')();
      var src = texts[4] + '\n' + texts[5];
      var missingKeys = [];
      var lines = String(result).split('\n');
      var wanted = { EFFECTS: 1, ONGOING: 1, STATIC: 1, COSTS: 1, REWARDS: 1, CONDITIONS: 1 };
      for (var i = 0; i < lines.length; i++) {
        var parts = lines[i].split('|');
        if (wanted[parts[0]]) {
          var keys = (parts[1] || '').split(',');
          for (var j = 0; j < keys.length; j++) {
            var key = keys[j];
            if (!key) continue;
            if (src.indexOf('"' + key + '"') < 0) missingKeys.push(parts[0] + ':' + key);
          }
        }
      }
      return { result: result, missingKeys: missingKeys };
    } catch (e) {
      return { error: 'FENGARI ERROR: ' + String(e) + '\n' + (e && e.stack ? e.stack : '') };
    }
  };
})();
