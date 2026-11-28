// ============================================================================
// Online-Server des Spiels (Cloudflare Worker + Durable Objects, WebSocket mit Hibernation)
//   /lobby            → Lobby (ein Objekt): Liste der öffentlichen Räume, Push an alle Verbundenen
//   /room/<CODE>      → Raum (ein Objekt je Code): reines Relais zwischen Host und Mitspielern
// Die Partie rechnet weiter der Host im Browser. Der Server leitet Nachrichten weiter (Absender setzt immer der Server),
// meldet Kommen/Gehen, merkt sich den letzten vollständigen Zustand des Hosts ("snap", nur für einen Host-Wechsel –
// den bekommt nie ein anderer Spieler zu sehen) und übergibt den Raum an einen Mitspieler, wenn der Host weg ist.
// Deploy: node bin/cfdeploy.js (oder npx wrangler deploy in server/net)
// ============================================================================
import { DurableObject } from 'cloudflare:workers';

const HOST_GONE_MS = 15000;                     // so lange muss der Host weg sein, bevor ein Mitspieler übernehmen darf
const LOBBY_STALE_MS = 90000;                   // Lobby-Eintrag ohne Lebenszeichen verschwindet
const MAX_MSG = 900000;

export default {
    async fetch(req, env) {
        const url = new URL(req.url);
        const cors = { 'Access-Control-Allow-Origin': '*' };
        if (url.pathname === '/' || url.pathname === '/health') return new Response('wowtcg-net ok', { headers: cors });
        if (req.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket erwartet', { status: 426, headers: cors });
        if (url.pathname.endsWith('/lobby')) return env.LOBBY.get(env.LOBBY.idFromName('lobby')).fetch(req);
        const m = /\/room\/([A-Z0-9]{4,8})$/.exec(url.pathname);
        if (m) return env.ROOM.get(env.ROOM.idFromName(m[1])).fetch(req);
        return new Response('nicht gefunden', { status: 404, headers: cors });
    }
};

const clean = (v, n) => String(v || '').slice(0, n);

// ---------------------------------------------------------------- Raum
export class Room extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env);
        this.meta = null;                        // { code, host, hostGoneAt, created, open }
        ctx.blockConcurrencyWhile(async () => { this.meta = (await ctx.storage.get('meta')) || null; });
    }
    async saveMeta() { await this.ctx.storage.put('meta', this.meta); }
    sockets() { return this.ctx.getWebSockets().filter(ws => ws.readyState === 1); }
    att(ws) { try { return ws.deserializeAttachment() || {}; } catch (e) { return {}; } }
    online() { return this.sockets().map(ws => this.att(ws)).filter(a => a.cid); }
    isOn(cid) { return this.online().some(a => a.cid === cid); }
    send(ws, m) { try { ws.send(typeof m === 'string' ? m : JSON.stringify(m)); } catch (e) {} }
    to(cid, m) { const s = JSON.stringify(m); for (const ws of this.sockets()) if (this.att(ws).cid === cid) this.send(ws, s); }
    all(m, except) { const s = JSON.stringify(m); for (const ws of this.sockets()) if (this.att(ws).cid !== except) this.send(ws, s); }

    async fetch(req) {
        const url = new URL(req.url), code = url.pathname.split('/').pop();
        const cid = clean(url.searchParams.get('cid'), 24).replace(/[^a-z0-9]/gi, ''), name = clean(url.searchParams.get('name'), 24) || '?';
        const create = url.searchParams.get('create') === '1';
        if (!cid) return new Response('cid fehlt', { status: 400 });
        const pair = new WebSocketPair(), [client, server] = Object.values(pair);
        this.ctx.acceptWebSocket(server);
        server.serializeAttachment({ cid, name });
        // Gleiche Kennung schon verbunden (Neuverbindung, bevor die alte Leitung zu ist): alte Leitung schließen
        for (const ws of this.ctx.getWebSockets()) if (ws !== server && this.att(ws).cid === cid) { try { ws.close(4000, 'replaced'); } catch (e) {} }
        const live = this.meta && this.meta.open;
        if (create) {
            if (live && this.meta.host !== cid && this.isOn(this.meta.host)) { this.send(server, { t: 'srv:err', why: 'exists' }); server.close(4001, 'exists'); return new Response(null, { status: 101, webSocket: client }); }
            if (!live || this.meta.host !== cid) { this.meta = { code, host: cid, hostGoneAt: 0, created: Date.now(), open: true }; await this.ctx.storage.delete('snap'); }
        } else if (!live) { this.send(server, { t: 'srv:err', why: 'notfound' }); server.close(4004, 'notfound'); return new Response(null, { status: 101, webSocket: client }); }
        if (this.meta.host === cid) this.meta.hostGoneAt = 0;
        await this.saveMeta();
        const members = this.online().filter(a => a.cid !== cid).map(a => ({ cid: a.cid, name: a.name }));
        this.send(server, { t: 'srv:hello', you: cid, host: this.meta.host, hostOn: this.isOn(this.meta.host) || this.meta.host === cid, members });
        this.all({ t: 'srv:presence', cid, name, on: true }, cid);
        return new Response(null, { status: 101, webSocket: client });
    }

    async webSocketMessage(ws, raw) {
        if (typeof raw !== 'string' || raw.length > MAX_MSG) return;
        let m; try { m = JSON.parse(raw); } catch (e) { return; }
        const me = this.att(ws), cid = me.cid;
        if (!cid || !this.meta || !this.meta.open) return;
        const isHost = this.meta.host === cid;
        switch (m.t) {
            case 'srv:ping': this.send(ws, { t: 'srv:pong' }); return;
            case 'srv:snap': if (isHost && typeof m.z === 'string') await this.ctx.storage.put('snap', m.z); return;   // nur gepackter Text, bleibt im Server
            case 'srv:announce':                                                                  // Lobby-Eintrag (null = entfernen)
                if (!isHost) return;
                await this.env.LOBBY.get(this.env.LOBBY.idFromName('lobby')).update(this.meta.code, m.info && typeof m.info === 'object' ? { ...m.info, code: this.meta.code, ts: Date.now() } : null);
                return;
            case 'srv:close':
                if (!isHost) return;
                this.meta.open = false; await this.saveMeta(); await this.ctx.storage.delete('snap');
                await this.env.LOBBY.get(this.env.LOBBY.idFromName('lobby')).update(this.meta.code, null);
                this.all({ t: 'close', from: cid }, cid);
                return;
            case 'srv:claim': {                                                                   // Host ist weg: dieser Spieler übernimmt den Raum
                const gone = !this.isOn(this.meta.host) && this.meta.hostGoneAt && Date.now() - this.meta.hostGoneAt >= HOST_GONE_MS;
                if (isHost || !gone) { this.send(ws, { t: 'srv:claim-no', host: this.meta.host }); return; }
                const old = this.meta.host;
                this.meta.host = cid; this.meta.hostGoneAt = 0; await this.saveMeta();
                const snap = (await this.ctx.storage.get('snap')) || null;
                this.send(ws, { t: 'srv:host', host: cid, old, snap });
                this.all({ t: 'srv:host', host: cid, old }, cid);
                return;
            }
        }
        // Weiterleiten: an einen Spieler (to = Kennung), an den Host (to = 'host') oder an alle anderen (to = '*')
        const to = m.to === 'host' ? this.meta.host : m.to;
        m.from = cid;
        if (to && to !== '*') { if (to !== cid) this.to(to, m); return; }
        this.all(m, cid);
    }

    async webSocketClose(ws) { await this.gone(ws); }
    async webSocketError(ws) { await this.gone(ws); }
    async gone(ws) {
        const a = this.att(ws); if (!a.cid) return;
        if (this.ctx.getWebSockets().some(w => w !== ws && w.readyState === 1 && this.att(w).cid === a.cid)) return;   // neue Leitung läuft schon
        if (this.meta && this.meta.open && this.meta.host === a.cid) { this.meta.hostGoneAt = Date.now(); await this.saveMeta(); }
        this.all({ t: 'srv:presence', cid: a.cid, name: a.name, on: false }, a.cid);
    }
}

// ---------------------------------------------------------------- Lobby
export class Lobby extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env);
        this.rooms = {};
        ctx.blockConcurrencyWhile(async () => { this.rooms = (await ctx.storage.get('rooms')) || {}; });
    }
    fresh() {
        const now = Date.now(); let changed = false;
        for (const k of Object.keys(this.rooms)) if (now - this.rooms[k].ts > LOBBY_STALE_MS) { delete this.rooms[k]; changed = true; }
        if (changed) this.ctx.storage.put('rooms', this.rooms);
        return this.rooms;
    }
    async update(code, info) {
        if (info) this.rooms[code] = info; else delete this.rooms[code];
        await this.ctx.storage.put('rooms', this.rooms);
        const s = JSON.stringify({ t: 'lobby', code, info: info || null });
        for (const ws of this.ctx.getWebSockets()) { try { ws.send(s); } catch (e) {} }
        return true;
    }
    async fetch() {
        const pair = new WebSocketPair(), [client, server] = Object.values(pair);
        this.ctx.acceptWebSocket(server);
        server.send(JSON.stringify({ t: 'lobby-all', rooms: this.fresh() }));
        return new Response(null, { status: 101, webSocket: client });
    }
    async webSocketMessage(ws, raw) {
        if (raw === 'ping' || raw === '{"t":"srv:ping"}') { try { ws.send('{"t":"srv:pong"}'); } catch (e) {} return; }
        if (raw === '{"t":"list"}') { try { ws.send(JSON.stringify({ t: 'lobby-all', rooms: this.fresh() })); } catch (e) {} }
    }
    async webSocketClose() {}
}
