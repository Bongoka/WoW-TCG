// WLAN-Abgleich für die Tablet-App (android/): liefert die Spieldateien dieses Projekts im Heimnetz aus.
//   GET /__manifest  → Liste aller Spieldateien: Pfad, Größe, Änderungszeit, bei Textdateien MD5
//   GET /<Pfad>      → Datei (nur lesen; nur Spieldateien, keine Werkzeuge/Git/Dokumente)
//   GET /__ping      → "wowtcg" (die App sucht damit den PC im WLAN)
// Start: bash bin/sync-server.sh   (Port 8766; beim ersten Start fragt die Windows-Firewall nach – „Private Netzwerke“ erlauben)
import com.sun.net.httpserver.*;
import java.io.*;
import java.net.*;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.Executors;

public class SyncServer {
    static Path root;
    // Wie bin/tablet-sync.sh: nicht aufs Tablet
    static final Set<String> SKIP_DIRS = new HashSet<>(Arrays.asList(".git", "addon", "bin", "docs", "tools", "android", ".claude", "node_modules"));
    static final Set<String> TEXT = new HashSet<>(Arrays.asList("js", "css", "html", "json", "md", "txt", "svg"));
    static String cache; static long cacheAt;

    public static void main(String[] args) throws Exception {
        root = Paths.get(args.length > 0 ? args[0] : ".").toAbsolutePath().normalize();
        int port = args.length > 1 ? Integer.parseInt(args[1]) : 8766;
        HttpServer srv = HttpServer.create(new InetSocketAddress(port), 0);
        srv.createContext("/", SyncServer::handle);
        srv.setExecutor(Executors.newFixedThreadPool(8));
        srv.start();
        System.out.println("WoW-TCG-Sync: " + root + " auf Port " + port);
        for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces()))
            for (InetAddress a : Collections.list(ni.getInetAddresses()))
                if (a instanceof Inet4Address && !a.isLoopbackAddress() && ni.isUp()) System.out.println("  http://" + a.getHostAddress() + ":" + port + "  (" + ni.getDisplayName() + ")");
    }

    static boolean allowed(Path rel) {
        if (rel.getNameCount() == 0) return false;
        if (SKIP_DIRS.contains(rel.getName(0).toString())) return false;
        String n = rel.getFileName().toString();
        return !n.startsWith(".tablet-sync") && !n.endsWith(".png.tmp");
    }

    static void handle(HttpExchange ex) throws IOException {
        try {
            String p = URLDecoder.decode(ex.getRequestURI().getRawPath(), "UTF-8");
            if (!"GET".equals(ex.getRequestMethod())) { send(ex, 405, "text/plain", "nur GET".getBytes("UTF-8")); return; }
            if (p.equals("/__ping")) { send(ex, 200, "text/plain", "wowtcg".getBytes("UTF-8")); return; }
            if (p.equals("/__manifest")) { send(ex, 200, "application/json", manifest().getBytes("UTF-8")); return; }
            Path rel = Paths.get(p.replaceFirst("^/+", "")).normalize();
            Path f = root.resolve(rel).normalize();
            if (!f.startsWith(root) || rel.startsWith("..") || !allowed(rel) || !Files.isRegularFile(f)) { send(ex, 404, "text/plain", new byte[0]); return; }
            ex.getResponseHeaders().set("Content-Type", "application/octet-stream");
            ex.sendResponseHeaders(200, Files.size(f));
            try (OutputStream o = ex.getResponseBody()) { Files.copy(f, o); }
        } catch (Exception e) {
            try { send(ex, 500, "text/plain", String.valueOf(e).getBytes("UTF-8")); } catch (Exception ignore) { }
        } finally { ex.close(); }
    }

    static void send(HttpExchange ex, int code, String type, byte[] body) throws IOException {
        ex.getResponseHeaders().set("Content-Type", type + "; charset=utf-8");
        ex.sendResponseHeaders(code, body.length == 0 ? -1 : body.length);
        if (body.length > 0) try (OutputStream o = ex.getResponseBody()) { o.write(body); }
    }

    // Manifest höchstens alle 3 s neu (ca. 27 000 Dateien)
    static synchronized String manifest() throws IOException {
        if (cache != null && System.currentTimeMillis() - cacheAt < 3000) return cache;
        StringBuilder sb = new StringBuilder("[");
        Files.walkFileTree(root, new SimpleFileVisitor<Path>() {
            @Override public FileVisitResult preVisitDirectory(Path d, BasicFileAttributes a) {
                Path rel = root.relativize(d);
                return rel.getNameCount() > 0 && !rel.toString().isEmpty() && SKIP_DIRS.contains(rel.getName(0).toString()) ? FileVisitResult.SKIP_SUBTREE : FileVisitResult.CONTINUE;
            }
            @Override public FileVisitResult visitFile(Path f, BasicFileAttributes a) {
                Path rel = root.relativize(f);
                if (!allowed(rel)) return FileVisitResult.CONTINUE;
                String r = rel.toString().replace('\\', '/');
                String ext = r.contains(".") ? r.substring(r.lastIndexOf('.') + 1).toLowerCase() : "";
                if (sb.length() > 1) sb.append(',');
                sb.append("{\"p\":\"").append(r.replace("\\", "\\\\").replace("\"", "\\\"")).append("\",\"s\":").append(a.size())
                  .append(",\"t\":").append(a.lastModifiedTime().toMillis());
                if (TEXT.contains(ext)) sb.append(",\"h\":\"").append(md5(f)).append('"');
                sb.append('}');
                return FileVisitResult.CONTINUE;
            }
        });
        cache = sb.append(']').toString(); cacheAt = System.currentTimeMillis();
        return cache;
    }

    static String md5(Path f) {
        try {
            MessageDigest d = MessageDigest.getInstance("MD5");
            byte[] h = d.digest(Files.readAllBytes(f));
            StringBuilder s = new StringBuilder(); for (byte b : h) s.append(String.format("%02x", b)); return s.toString();
        } catch (Exception e) { return ""; }
    }
}
