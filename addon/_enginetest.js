// Testhilfe: lädt die Engine-Dateien des Addons als einzelne Lua-Chunks (wie WoW: Varargs ADDON, ns) in einen frischen fengari-Zustand.
window.__ENGINE_FILES = ['Base', 'Cards', 'State', 'Core', 'Core2', 'Queue', 'Play', 'Powers', 'Damage', 'Combat', 'Rules', 'CardFx', 'CardFx2', 'CardFx3', 'CardFx4', 'CardFx5', 'CardFx6', 'CardFx7', 'CardFx8', 'CardFx9', 'AI'];
window.__luaRun = async function (files, testCode) {
    const { lua, lauxlib, lualib, to_luastring } = fengari;
    const L = lauxlib.luaL_newstate(); lualib.luaL_openlibs(L);
    // gemeinsamer Namensraum ns als Registry-Global __NS
    lauxlib.luaL_dostring(L, to_luastring('__NS = {}'));
    for (const f of files) {
        const r = await fetch('/addon/WoWTCG/Engine/' + f + '.lua?t=' + Date.now());
        if (!r.ok) { if (r.status === 404) continue; return 'fetch ' + f + ' ' + r.status; }
        const code = (await r.text()).replace(/^\uFEFF/, '');
        if (lauxlib.luaL_loadbuffer(L, to_luastring(code), null, to_luastring('@' + f + '.lua')) !== 0) return 'SYNTAX ' + lua.lua_tojsstring(L, -1);
        lua.lua_pushstring(L, to_luastring('WoWTCG'));
        lua.lua_getglobal(L, to_luastring('__NS'));
        if (lua.lua_pcall(L, 2, 0, 0) !== 0) return 'LOAD ' + f + ': ' + lua.lua_tojsstring(L, -1);
    }
    if (lauxlib.luaL_loadbuffer(L, to_luastring(testCode), null, to_luastring('@test')) !== 0) return 'SYNTAX test ' + lua.lua_tojsstring(L, -1);
    if (lua.lua_pcall(L, 0, 1, 0) !== 0) return 'ERR ' + lua.lua_tojsstring(L, -1);
    return lua.lua_tojsstring(L, -1);
};
