# Entwicklungshilfe (nur lokal): nimmt POST /write?name=<datei> an und schreibt den Text nach addon/_gen/<datei>.
# Damit kann die Browser-Seite erzeugte Lua-Dateien (Kartendaten, Decks) ablegen. Nur Dateinamen aus [A-Za-z0-9_.-].
param([int]$Port = 8766)
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'addon/_gen'
New-Item -ItemType Directory -Force $out | Out-Null
$l = [System.Net.HttpListener]::new(); $l.Prefixes.Add("http://localhost:$Port/"); $l.Start()
Write-Host "Receiving into $out on http://localhost:$Port/"
while ($l.IsListening) {
    $ctx = $l.GetContext()
    try {
        $ctx.Response.Headers.Add('Access-Control-Allow-Origin', '*')
        $name = $ctx.Request.QueryString['name']
        if ($ctx.Request.HttpMethod -eq 'POST' -and $name -match '^[A-Za-z0-9_.-]+$') {
            $reader = New-Object IO.StreamReader($ctx.Request.InputStream, [Text.Encoding]::UTF8)
            $text = $reader.ReadToEnd(); $reader.Close()
            [IO.File]::WriteAllText((Join-Path $out $name), $text, (New-Object Text.UTF8Encoding($false)))
            $bytes = [Text.Encoding]::UTF8.GetBytes("ok $($text.Length)")
            $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else { $ctx.Response.StatusCode = 400 }
    } catch { $ctx.Response.StatusCode = 500 } finally { $ctx.Response.Close() }
}
