// Pages-Funktion: /net/lobby und /net/room/<CODE> gehen an die Durable Objects des Workers "wowtcg-net" (server/net)
export async function onRequest({ request, env }) {
    const url = new URL(request.url);
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('wowtcg-net ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
    if (url.pathname === '/net/lobby') return env.LOBBY.get(env.LOBBY.idFromName('lobby')).fetch(request);
    const m = /^\/net\/room\/([A-Z0-9]{4,8})$/.exec(url.pathname);
    if (m) return env.ROOM.get(env.ROOM.idFromName(m[1])).fetch(request);
    return new Response('nicht gefunden', { status: 404 });
}
