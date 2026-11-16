package de.wowtcg.game;

import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.URL;
import java.net.URLEncoder;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Holt geänderte Spieldateien vom PC im selben WLAN (bin/SyncServer.java, Port 8766).
 * Vergleich: Textdateien (js, css, html …) über MD5, Bilder/Töne über Größe und die zuletzt geladene Änderungszeit
 * (gemerkt in den App-Einstellungen). Gelöscht wird nichts.
 */
class Sync {
    static String run(MainActivity act, File base) throws Exception {
        SharedPreferences prefs = act.getSharedPreferences("sync", 0);
        act.syncStatus("Suche PC im WLAN …");
        String host = find(prefs.getString("host", null));
        if (host == null) return null;                                              // kein PC: offline weiter, ohne Meldung
        prefs.edit().putString("host", host).apply();
        act.syncStatus("PC gefunden (" + host + ") – vergleiche Dateien …");
        JSONArray man = new JSONArray(new String(get("http://" + host + ":" + MainActivity.SYNC_PORT + "/__manifest", 20000), "UTF-8"));
        SharedPreferences idx = act.getSharedPreferences("sync-index", 0);
        SharedPreferences.Editor ed = idx.edit();
        List<JSONObject> need = new ArrayList<>();
        long bytes = 0;
        for (int i = 0; i < man.length(); i++) {
            JSONObject e = man.getJSONObject(i);
            String p = e.getString("p"); long s = e.getLong("s"); String st = s + ":" + e.getLong("t");
            File f = new File(base, p);
            boolean get;
            if (e.has("h")) get = !f.isFile() || f.length() != s || !e.getString("h").equals(md5(f));
            else { String known = idx.getString(p, null); get = !f.isFile() || f.length() != s || (known != null && !known.equals(st)); }
            if (get) { need.add(e); bytes += s; } else ed.putString(p, st);
        }
        ed.apply();
        if (need.isEmpty()) return null;
        long done = 0; int n = 0;
        for (JSONObject e : need) {
            String p = e.getString("p");
            n++;
            act.syncStatus("Aktualisiere vom PC: " + n + " / " + need.size() + " Dateien (" + (bytes > 0 ? 100 * done / bytes : 100) + " %)\n" + p);
            StringBuilder u = new StringBuilder("http://" + host + ":" + MainActivity.SYNC_PORT);
            for (String part : p.split("/")) u.append('/').append(URLEncoder.encode(part, "UTF-8").replace("+", "%20"));
            File f = new File(base, p), tmp = new File(base, p + ".part");
            f.getParentFile().mkdirs();
            download(u.toString(), tmp);
            if (f.exists() && !f.delete()) throw new Exception("kann " + p + " nicht ersetzen");
            if (!tmp.renameTo(f)) throw new Exception("kann " + p + " nicht speichern");
            idx.edit().putString(p, e.getLong("s") + ":" + e.getLong("t")).apply();
            done += e.getLong("s");
        }
        return need.size() + (need.size() == 1 ? " Datei" : " Dateien") + " vom PC aktualisiert";
    }

    /** PC suchen: zuerst die zuletzt bekannte Adresse, sonst alle Adressen im eigenen /24-Netz parallel. */
    static String find(String last) throws Exception {
        if (last != null && ping(last, 600)) return last;
        String own = null;
        for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
            if (!ni.isUp() || ni.isLoopback()) continue;
            for (InetAddress a : Collections.list(ni.getInetAddresses()))
                if (a instanceof Inet4Address && a.isSiteLocalAddress() && (own == null || ni.getName().startsWith("wlan"))) own = a.getHostAddress();
        }
        if (own == null) return null;
        final String prefix = own.substring(0, own.lastIndexOf('.') + 1);
        final AtomicReference<String> found = new AtomicReference<>();
        ExecutorService pool = Executors.newFixedThreadPool(64);
        for (int i = 1; i < 255; i++) {
            final String ip = prefix + i;
            if (ip.equals(own)) continue;
            pool.execute(new Runnable() { @Override public void run() { if (found.get() == null && ping(ip, 700)) found.compareAndSet(null, ip); } });
        }
        pool.shutdown();
        pool.awaitTermination(4, TimeUnit.SECONDS);
        pool.shutdownNow();
        return found.get();
    }

    static boolean ping(String host, int ms) {
        try { return "wowtcg".equals(new String(get("http://" + host + ":" + MainActivity.SYNC_PORT + "/__ping", ms), "UTF-8").trim()); }
        catch (Exception e) { return false; }
    }

    static byte[] get(String url, int ms) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(ms); c.setReadTimeout(Math.max(ms, 5000));
        try (InputStream in = c.getInputStream()) {
            java.io.ByteArrayOutputStream o = new java.io.ByteArrayOutputStream();
            byte[] b = new byte[65536]; int r; while ((r = in.read(b)) > 0) o.write(b, 0, r);
            return o.toByteArray();
        } finally { c.disconnect(); }
    }

    static void download(String url, File to) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(3000); c.setReadTimeout(20000);
        if (c.getResponseCode() != 200) throw new Exception("HTTP " + c.getResponseCode() + " bei " + url);
        try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(to)) {
            byte[] b = new byte[262144]; int r; while ((r = in.read(b)) > 0) out.write(b, 0, r);
        } finally { c.disconnect(); }
    }

    static String md5(File f) {
        try (InputStream in = new FileInputStream(f)) {
            MessageDigest d = MessageDigest.getInstance("MD5");
            byte[] b = new byte[65536]; int r; while ((r = in.read(b)) > 0) d.update(b, 0, r);
            StringBuilder s = new StringBuilder(); for (byte x : d.digest()) s.append(String.format("%02x", x)); return s.toString();
        } catch (Exception e) { return ""; }
    }
}
