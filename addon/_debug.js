// Temporär: Partien mit Instruktions-Hook, um Endlosschleifen zu finden.
(function () {
  var FILES = [
    '/addon/WoWTCG/Core.lua',
    '/addon/WoWTCG/Cards.lua',
    '/addon/WoWTCG/Decks.lua',
    '/addon/WoWTCG/CardFx.lua',
    '/addon/WoWTCG/Effects.lua',
    '/addon/WoWTCG/Game.lua',
  ];

  var HEADER = [
    '__NS = {}',
    'CreateFrame = function() return { RegisterEvent = function() end, UnregisterEvent = function() end, SetScript = function() end } end',
    'SlashCmdList = {}',
    'DEFAULT_CHAT_FRAME = { AddMessage = function() end }',
  ].join('\n');

  var TEST = [
    'local ns = __NS',
    'local Game = ns.GameClass',
    'local lines = {}',
    'local function runGame(a, b, seed)',
    '  math.randomseed(seed)',
    '  local g = Game.New(a, b, 0)',
    '  g.aiControlled = true',
    '  g.humanPid = 0',
    '  local fired = false',
    '  if __HOOK and debug.sethook then',
    '    debug.sethook(function()',
    '      if fired then return end',
    '      fired = true',
    '      error("INSTRUCTION LIMIT", 2)',
    '    end, "", tonumber(__HOOK))',
    '  end',
    '  local ok, err = pcall(function() g:BeginMatch() end)',
    '  if not ok then',
    '    if debug.sethook then debug.sethook(nil) end',
    '    return "START-ERR " .. a .. " vs " .. b .. ": " .. tostring(err)',
    '  end',
    '  local steps = 0',
    '  while not g.gameOver and steps < 150 do',
    '    steps = steps + 1',
    '    if g.pending then',
    '      if debug.sethook then debug.sethook(nil) end',
    '      return "PENDING " .. a .. " vs " .. b .. " turn " .. tostring(g.turn)',
    '    end',
    '    if g.phase ~= "main" then',
    '      if debug.sethook then debug.sethook(nil) end',
    '      return "PHASE " .. tostring(g.phase) .. " " .. a .. " vs " .. b',
    '    end',
    '    if g.turn > 50 then',
    '      if debug.sethook then debug.sethook(nil) end',
    '      return "TIMEOUT " .. a .. " vs " .. b',
    '    end',
    '    local ok2, err2 = xpcall(function() g:AIFullTurn(g.active) end, debug.traceback)',
    '    if not ok2 then',
    '      if debug.sethook then debug.sethook(nil) end',
    '      local tb = tostring(err2)',
    '      local cut = tb:find("\\n", 1, true)',
    '      return "ERR " .. a .. " vs " .. b .. " turn " .. tostring(g.turn) .. ": " .. (cut and tb:sub(1, cut + 400) or tb)',
    '    end',
    '  end',
    '  if debug.sethook then debug.sethook(nil) end',
    '  if not g.gameOver then return "TIMEOUT " .. a .. " vs " .. b end',
    '  return nil',
    'end',
    'local from = tonumber(__START) or 1',
    'local to = tonumber(__STOP) or from',
    'local n = #ns.Decks',
    'for flat = from, to do',
    '  local i = math.floor((flat - 1) / n) + 1',
    '  local j = ((flat - 1) % n) + 1',
    '  if i <= n and j <= n then',
    '    local r = runGame(ns.Decks[i].id, ns.Decks[j].id, flat * 7919)',
    '    if r then lines[#lines + 1] = r end',
    '  end',
    'end',
    'lines[#lines + 1] = string.format("checked %d..%d (%d decks)", from, to, n)',
    '__RESULT = table.concat(lines, "\\n")',
    'return "done"',
  ].join('\n');

  function stripBom(s) { return s.replace(/^\uFEFF/, ''); }

  function wrap(name, code) {
    code = stripBom(code).replace(/local ADDON, ns = \.\.\./g, 'local ADDON, ns = "WoWTCG", __NS');
    code = code.replace(/^return [A-Za-z0-9_.]+\s*$/gm, '');
    return '-- ' + name + '\ndo\n' + code + '\nend\n';
  }

  window.__runAddonDebug = async function (opts) {
    opts = opts || {};
    var texts = [];
    for (var i = 0; i < FILES.length; i++) {
      var r = await fetch(FILES[i] + '?t=' + Date.now());
      if (!r.ok) return 'fetch ' + FILES[i] + ': ' + r.status;
      texts.push(await r.text());
    }
    var lua = HEADER + '\n';
    for (var k = 0; k < FILES.length; k++) lua += wrap(FILES[k], texts[k]);
    lua += '\n' + TEST;
    try {
      fengari.load('__START = ' + (opts.start || 1) + '; __STOP = ' + (opts.stop || 1) + '; __HOOK = ' + (opts.hook || 0))();
      fengari.load(lua)();
      return fengari.load('return __RESULT')();
    } catch (e) {
      return 'FENGARI ERROR: ' + String(e) + '\n' + (e && e.stack ? e.stack : '');
    }
  };
})();
