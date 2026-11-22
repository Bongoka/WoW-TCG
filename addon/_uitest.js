// Testhilfe: lädt WoW-Attrappe (_wowmock.lua) und das komplette Addon (Dateien wie in WoWTCG.toc) in einen frischen
// fengari-Zustand und führt danach testCode aus. Ergebnis: Rückgabewert des Tests als Text.
window.__runAddon = async function (testCode) {
    const { lua, lauxlib, lualib, to_luastring } = fengari;
    // __BASE: Origin im Blob-Worker (dort gehen nur absolute Adressen)
    const get = async (p) => { const r = await fetch((self.__BASE || "") + p + "?t=" + Date.now()); if (!r.ok) throw new Error(p + ' ' + r.status); return (await r.text()).replace(/^﻿/, ''); };
    const toc = await get('/addon/WoWTCG/WoWTCG.toc');
    const files = toc.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => l.replace(/\\/g, '/'));
    const L = lauxlib.luaL_newstate(); lualib.luaL_openlibs(L);
    const run = (code, name, withNs) => {
        if (lauxlib.luaL_loadbuffer(L, to_luastring(code), null, to_luastring('@' + name)) !== 0) return 'SYNTAX ' + lua.lua_tojsstring(L, -1);
        let n = 0;
        if (withNs) { lua.lua_pushstring(L, to_luastring('WoWTCG')); lua.lua_getglobal(L, to_luastring('__NS')); n = 2; }
        if (lua.lua_pcall(L, n, 1, 0) !== 0) return 'ERR ' + name + ': ' + lua.lua_tojsstring(L, -1);
        const r = lua.lua_isstring(L, -1) ? lua.lua_tojsstring(L, -1) : null; lua.lua_pop(L, 1); return r;
    };
    let e = run(await get('/addon/_wowmock.lua'), '_wowmock.lua', false); if (e) return e;
    run('__NS = {}', 'ns', false);
    for (const f of files) { e = run(await get('/addon/WoWTCG/' + f), f, true); if (e && /^(SYNTAX|ERR)/.test(e)) return e; }
    return run(testCode, 'test', false);
};
