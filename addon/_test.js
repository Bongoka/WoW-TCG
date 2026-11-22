// Temporärer Test-Harness: lädt die Addon-Lua-Dateien in Fengari und simuliert Partien.
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
    'local t0 = os.clock()',
    'local results = { games = 0, errors = 0, timeouts = 0, stuck = 0, turns = 0 }',
    'local wins = {}',
    'local errs = {}',
    'local function addErr(msg)',
    '  results.errors = results.errors + 1',
    '  if #errs < 12 then errs[#errs + 1] = tostring(msg) end',
    'end',
    'local function runOne(a, b, seed)',
    '  math.randomseed(seed)',
    '  local g = Game.New(a, b, 0)',
    '  g.aiControlled = true',
    '  g.humanPid = 0',
    '  local ok, err = pcall(function() g:BeginMatch() end)',
    '  if not ok then addErr("start: " .. tostring(err)); return end',
    '  local guard = 0',
    '  while not g.gameOver and guard < 200 do',
    '    guard = guard + 1',
    '    if g.pending then results.stuck = results.stuck + 1; return end',
    '    if g.phase ~= "main" then results.stuck = results.stuck + 1; return end',
    '    if g.turn > 50 then results.timeouts = results.timeouts + 1; return end',
    '    local ok2, err2 = xpcall(function() g:AIFullTurn(g.active) end, debug.traceback)',
    '    if not ok2 then addErr("turn " .. tostring(g.turn) .. ": " .. tostring(err2)); return end',
    '  end',
    '  if not g.gameOver then results.timeouts = results.timeouts + 1; return end',
    '  results.games = results.games + 1',
    '  results.turns = results.turns + g.turn',
    '  local w = g.winner and g.players[g.winner] or nil',
    '  if w then wins[w.deckId] = (wins[w.deckId] or 0) + 1 end',
    'end',
    'for i = 1, math.min(4, #ns.Decks) do',
    '  for j = 1, math.min(4, #ns.Decks) do',
    '    runOne(ns.Decks[i].id, ns.Decks[j].id, i * 1000 + j)',
    '  end',
    'end',
    'for n = 1, 30 do',
    '  local i = math.random(#ns.Decks)',
    '  local j = math.random(#ns.Decks)',
    '  runOne(ns.Decks[i].id, ns.Decks[j].id, n * 7919)',
    'end',
    'local lines = {}',
    'lines[#lines + 1] = string.format("games=%d errors=%d timeouts=%d stuck=%d turnsAvg=%.1f elapsed=%.2fs",',
    '  results.games, results.errors, results.timeouts, results.stuck,',
    '  results.games > 0 and results.turns / results.games or 0, os.clock() - t0)',
    'local ids = {}',
    'for k in pairs(wins) do ids[#ids + 1] = k end',
    'table.sort(ids)',
    'for i = 1, #ids do lines[#lines + 1] = "win " .. ids[i] .. "=" .. wins[ids[i]] end',
    'for i = 1, #errs do lines[#lines + 1] = "ERR " .. errs[i] end',
    '__RESULT = table.concat(lines, "\\n")',
    'return "done:" .. tostring(#__RESULT)',
  ].join('\n');

  function stripBom(s) {
    return s.replace(/^\uFEFF/, '');
  }

  function wrap(name, code) {
    code = stripBom(code).replace(/local ADDON, ns = \.\.\./g, 'local ADDON, ns = "WoWTCG", __NS');
    // Modul-Rueckgaben entfernen, damit der zusammengefasste Chunk weiterlaeuft.
    code = code.replace(/^return [A-Za-z0-9_.]+\s*$/gm, '');
    return '-- ' + name + '\ndo\n' + code + '\nend\n';
  }

  window.__runAddonTests = async function () {
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
      var flag = fengari.load(lua)();
      var result = fengari.load('return __RESULT')();
      return '[' + flag + ']\n' + result;
    } catch (e) {
      return 'FENGARI ERROR: ' + String(e) + '\n' + (e && e.stack ? e.stack : '');
    }
  };
})();
