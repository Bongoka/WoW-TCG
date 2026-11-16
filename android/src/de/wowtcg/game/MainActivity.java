package de.wowtcg.game;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.view.Display;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.MimeTypeMap;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * WoW TCG ohne Browser und ohne Server: eine WebView, die die Spieldateien direkt aus
 * /sdcard/Documents/WoWTCG liest (Adresse https://appassets.androidplatform.net/ – von Android für
 * App-eigene Inhalte vorgesehen, verlässt nie das Gerät). Das Fenster fordert die höchste
 * Bildwiederholrate des Displays an (Xiaomi Pad 7: 144 Hz), läuft im Vollbild und hält den Bildschirm an.
 */
public class MainActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net";
    static final String START = "https://" + HOST + "/index.html";
    File base;
    WebView web;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        base = new File(Environment.getExternalStorageDirectory(), "Documents/WoWTCG");
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        requestHighestRefreshRate();
        if (Environment.isExternalStorageManager()) syncThenStart(); else askPermission();
    }

    @Override
    protected void onResume() {
        super.onResume();
        immersive();
        requestHighestRefreshRate();
        if (web == null && Environment.isExternalStorageManager()) syncThenStart();
        if (web != null) web.onResume();
    }

    // ------------------------------------------------------------------ WLAN-Abgleich mit dem PC (bin/SyncServer.java)
    // Beim Start: PC im WLAN suchen (zuletzt bekannte Adresse, sonst das ganze Netz /24 auf Port 8766), geänderte Dateien
    // in den Spielordner laden, dann das Spiel starten. Kein PC erreichbar → sofort offline mit dem vorhandenen Stand.
    static final int SYNC_PORT = 8766;
    boolean starting;
    TextView status;

    void syncThenStart() {
        if (starting || web != null) return;
        starting = true;
        status = new TextView(this);
        status.setTextColor(Color.rgb(232, 220, 200)); status.setTextSize(18); status.setGravity(Gravity.CENTER);
        status.setBackgroundColor(Color.rgb(10, 7, 5)); status.setText("WoW TCG …");
        setContentView(status);
        new Thread(new Runnable() { @Override public void run() {
            String msg = null;
            try { msg = Sync.run(MainActivity.this, base); } catch (Throwable t) { msg = "Abgleich abgebrochen: " + t.getMessage(); }
            final String m = msg;
            runOnUiThread(new Runnable() { @Override public void run() {
                starting = false;
                if (m != null) android.widget.Toast.makeText(MainActivity.this, m, android.widget.Toast.LENGTH_LONG).show();
                startGame();
            } });
        } }).start();
    }

    void syncStatus(final String s) {
        runOnUiThread(new Runnable() { @Override public void run() { if (status != null) status.setText(s); } });
    }

    @Override
    protected void onPause() {
        if (web != null) web.onPause();
        super.onPause();
    }

    @Override
    public void onWindowFocusChanged(boolean focus) {
        super.onWindowFocusChanged(focus);
        if (focus) immersive();
    }

    /**
     * Bildrate nach Bedarf: bei Berührung oder Bewegung im Spiel (Seite meldet über WTCG.active) die höchste Rate,
     * sonst die niedrigste – ein stehendes Bild braucht keine 120 Hz (Akku).
     */
    boolean high = true;
    final android.os.Handler ui = new android.os.Handler(android.os.Looper.getMainLooper());
    final Runnable toLow = new Runnable() { @Override public void run() { setHigh(false); } };

    void requestHighestRefreshRate() { setHigh(true); ui.removeCallbacks(toLow); ui.postDelayed(toLow, 2000); }

    void setHigh(boolean h) {
        Display d = getDisplay();
        if (d == null) return;
        Display.Mode cur = d.getMode(), pick = null;
        for (Display.Mode m : d.getSupportedModes()) {
            if (m.getPhysicalWidth() != cur.getPhysicalWidth() || m.getPhysicalHeight() != cur.getPhysicalHeight()) continue;
            if (pick == null || (h ? m.getRefreshRate() > pick.getRefreshRate() : m.getRefreshRate() < pick.getRefreshRate())) pick = m;
        }
        if (pick == null) return;
        high = h;
        WindowManager.LayoutParams lp = getWindow().getAttributes();
        if (lp.preferredDisplayModeId == pick.getModeId()) return;
        lp.preferredDisplayModeId = pick.getModeId();
        lp.preferredRefreshRate = pick.getRefreshRate();
        getWindow().setAttributes(lp);
    }

    /** Berührung: sofort hoch, nach 2 s Ruhe wieder runter (sofern die Seite keine Bewegung meldet). */
    @Override
    public boolean dispatchTouchEvent(android.view.MotionEvent e) {
        if (!high) setHigh(true);
        ui.removeCallbacks(toLow); ui.postDelayed(toLow, 2000);
        return super.dispatchTouchEvent(e);
    }

    /** Aufrufe aus der Seite (window.WTCG.active()): gerade bewegt sich etwas (Animation, CPU-Zug …). */
    public class Bridge {
        @android.webkit.JavascriptInterface
        public void active() {
            ui.post(new Runnable() { @Override public void run() {
                if (!high) setHigh(true);
                ui.removeCallbacks(toLow); ui.postDelayed(toLow, 700);
            } });
        }
    }

    void immersive() {
        WindowInsetsController c = getWindow().getInsetsController();
        if (c == null) return;
        c.hide(WindowInsets.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }

    /** Einmalig: Zugriff auf alle Dateien (das Spiel liegt mit ~3,7 GB Bildern in Documents/WoWTCG). */
    void askPermission() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setBackgroundColor(Color.rgb(10, 7, 5));
        TextView t = new TextView(this);
        t.setTextColor(Color.rgb(232, 220, 200));
        t.setTextSize(20);
        t.setGravity(Gravity.CENTER);
        t.setPadding(60, 0, 60, 40);
        t.setText("WoW TCG liest das Spiel aus dem Ordner Documents/WoWTCG.\n"
                + "Bitte einmal „Zugriff auf alle Dateien“ erlauben.");
        Button b = new Button(this);
        b.setText("Zugriff erlauben");
        b.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) {
                try {
                    startActivity(new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION,
                            Uri.parse("package:" + getPackageName())));
                } catch (Exception e) {
                    startActivity(new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION));
                }
            }
        });
        box.addView(t);
        box.addView(b);
        setContentView(box);
    }

    void startGame() {
        if (!new File(base, "index.html").isFile()) {
            TextView t = new TextView(this);
            t.setTextColor(Color.WHITE);
            t.setTextSize(20);
            t.setGravity(Gravity.CENTER);
            t.setBackgroundColor(Color.rgb(10, 7, 5));
            t.setText("Spiel nicht gefunden:\n" + base.getAbsolutePath() + "/index.html\n\nAm PC: bash bin/tablet-sync.sh --all");
            setContentView(t);
            return;
        }
        WebView.setWebContentsDebuggingEnabled(true);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(10, 7, 5));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setLoadWithOverviewMode(false);
        s.setUseWideViewPort(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setTextZoom(100);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (!HOST.equals(u.getHost())) return null;                    // alles andere (Online-Spiel) normal übers Netz
                return serve(u, req.getRequestHeaders());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                if (HOST.equals(req.getUrl().getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, req.getUrl())); } catch (Exception e) { }
                return true;                                                    // fremde Links im Browser öffnen
            }
        });
        web.addJavascriptInterface(new Bridge(), "WTCG");
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(web);
        web.loadUrl(START);
    }

    /** Datei aus dem Spielordner ausliefern (mit Range-Anfragen für Audio). */
    WebResourceResponse serve(Uri u, Map<String, String> reqHeaders) {
        String path = u.getPath() == null ? "/" : u.getPath();
        if (path.endsWith("/")) path += "index.html";
        File f = new File(base, path);
        Map<String, String> h = new HashMap<>();
        h.put("Access-Control-Allow-Origin", "*");
        h.put("Cache-Control", "no-cache");
        try {
            if (!f.getCanonicalPath().startsWith(base.getCanonicalPath()) || !f.isFile())
                return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", h, new ByteArrayInputStream(new byte[0]));
            String mime = mimeOf(f.getName());
            String enc = mime.startsWith("text/") || mime.endsWith("javascript") || mime.endsWith("json") ? "utf-8" : null;
            long len = f.length();
            h.put("Accept-Ranges", "bytes");
            String range = null;
            for (Map.Entry<String, String> e : reqHeaders.entrySet()) if ("range".equalsIgnoreCase(e.getKey())) range = e.getValue();
            if (range != null && range.startsWith("bytes=")) {
                String[] p = range.substring(6).split("-", 2);
                long start = p[0].isEmpty() ? 0 : Long.parseLong(p[0].trim());
                long end = p.length > 1 && !p[1].trim().isEmpty() ? Long.parseLong(p[1].trim()) : len - 1;
                if (start >= len) start = len - 1;
                if (end >= len) end = len - 1;
                InputStream in = new FileInputStream(f);
                long skipped = 0;
                while (skipped < start) { long k = in.skip(start - skipped); if (k <= 0) break; skipped += k; }
                h.put("Content-Range", "bytes " + start + "-" + end + "/" + len);
                h.put("Content-Length", String.valueOf(end - start + 1));
                return new WebResourceResponse(mime, enc, 206, "Partial Content", h, new LimitedStream(in, end - start + 1));
            }
            h.put("Content-Length", String.valueOf(len));
            return new WebResourceResponse(mime, enc, 200, "OK", h, new FileInputStream(f));
        } catch (IOException | NumberFormatException e) {
            return new WebResourceResponse("text/plain", "utf-8", 500, "Error", h, new ByteArrayInputStream(new byte[0]));
        }
    }

    static String mimeOf(String name) {
        String ext = name.contains(".") ? name.substring(name.lastIndexOf('.') + 1).toLowerCase() : "";
        switch (ext) {
            case "html": return "text/html";
            case "js": return "text/javascript";
            case "css": return "text/css";
            case "json": return "application/json";
            case "webp": return "image/webp";
            case "png": return "image/png";
            case "jpg": case "jpeg": return "image/jpeg";
            case "svg": return "image/svg+xml";
            case "mp3": return "audio/mpeg";
            case "ogg": return "audio/ogg";
            case "wav": return "audio/wav";
            case "mp4": return "video/mp4";
            case "webm": return "video/webm";
            case "woff2": return "font/woff2";
            case "ttf": return "font/ttf";
        }
        String m = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
        return m != null ? m : "application/octet-stream";
    }

    /** Liest höchstens n Bytes (Antwort auf eine Range-Anfrage). */
    static class LimitedStream extends InputStream {
        final InputStream in; long left;
        LimitedStream(InputStream in, long n) { this.in = in; this.left = n; }
        @Override public int read() throws IOException { if (left <= 0) return -1; int b = in.read(); if (b >= 0) left--; return b; }
        @Override public int read(byte[] b, int off, int len) throws IOException {
            if (left <= 0) return -1;
            int n = in.read(b, off, (int) Math.min(len, left)); if (n > 0) left -= n; return n;
        }
        @Override public void close() throws IOException { in.close(); }
    }

    @Override
    public void onBackPressed() {
        // Zurück-Geste: ins Hauptmenü (eine laufende Partie bleibt erhalten), nicht die App schließen
        if (web != null) web.evaluateJavascript("typeof openMainMenu==='function'&&openMainMenu()", null);
        else super.onBackPressed();
    }
}
