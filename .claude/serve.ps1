# Minimaler statischer Webserver für die Vorschau (kein Node/Python nötig)
param([int]$Port = 8765)
$root = Split-Path -Parent $PSScriptRoot
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8';
            '.png'='image/png'; '.jpg'='image/jpeg'; '.pdf'='application/pdf'; '.json'='application/json'; '.svg'='image/svg+xml' }
$l = [System.Net.HttpListener]::new(); $l.Prefixes.Add("http://localhost:$Port/"); $l.Start()
Write-Host "Serving $root on http://localhost:$Port/"
while ($l.IsListening) {
    $ctx = $l.GetContext()
    try {
        $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/')); if (-not $rel) { $rel = 'index.html' }
        $path = [IO.Path]::GetFullPath((Join-Path $root $rel))
        if ($path.StartsWith($root) -and (Test-Path $path -PathType Leaf)) {
            $bytes = [IO.File]::ReadAllBytes($path)
            $ct = $types[[IO.Path]::GetExtension($path).ToLower()]; if ($ct) { $ctx.Response.ContentType = $ct }
            $ctx.Response.Headers.Add('Cache-Control', 'no-store')
            $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else { $ctx.Response.StatusCode = 404 }
    } catch { $ctx.Response.StatusCode = 500 } finally { $ctx.Response.Close() }
}
