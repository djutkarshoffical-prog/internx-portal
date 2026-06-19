$ports = 8050..8060
$listener = $null
$selectedPort = $null

foreach ($port in $ports) {
    $tempListener = New-Object System.Net.HttpListener
    $tempListener.Prefixes.Add("http://localhost:$port/")
    try {
        $tempListener.Start()
        $listener = $tempListener
        $selectedPort = $port
        break
    } catch {
        # Port in use, try next
        $tempListener.Close()
    }
}

if ($null -eq $listener) {
    Write-Host "Error starting server: No free port found in range 8050-8060."
    Read-Host "Press Enter to exit"
    exit
}

Write-Host "------------------------------------------------"
Write-Host "InternX Local Web Server is Running!"
Write-Host "URL: http://localhost:$selectedPort/"
Write-Host "To stop the server, close this window or press Ctrl+C."
Write-Host "------------------------------------------------"

# Launch default browser
Start-Process "http://localhost:$selectedPort/"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $path = $request.Url.LocalPath
        if ($path -eq "/") { $path = "/index.html" }
        
        # Clean query parameters or hash from path
        $path = $path.Split("?")[0].Split("#")[0]
        
        # Decode URL encoding (e.g. %20 for spaces)
        $path = [Uri]::UnescapeDataString($path)
        
        $localPath = Join-Path -Path (Get-Location) -ChildPath $path
        
        if (Test-Path $localPath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            
            # Resolve Content-Type
            $contentType = "application/octet-stream"
            if ($path.EndsWith(".html")) { $contentType = "text/html; charset=utf-8" }
            elseif ($path.EndsWith(".css")) { $contentType = "text/css; charset=utf-8" }
            elseif ($path.EndsWith(".js")) { $contentType = "application/javascript; charset=utf-8" }
            elseif ($path.EndsWith(".png")) { $contentType = "image/png" }
            elseif ($path.EndsWith(".jpg") -or $path.EndsWith(".jpeg")) { $contentType = "image/jpeg" }
            elseif ($path.EndsWith(".gif")) { $contentType = "image/gif" }
            elseif ($path.EndsWith(".webp")) { $contentType = "image/webp" }
            elseif ($path.EndsWith(".svg")) { $contentType = "image/svg+xml" }
            elseif ($path.EndsWith(".webm")) { $contentType = "video/webm" }
            elseif ($path.EndsWith(".json")) { $contentType = "application/json; charset=utf-8" }
            
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errorBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
            $response.ContentType = "text/plain"
            $response.ContentLength64 = $errorBytes.Length
            $response.OutputStream.Write($errorBytes, 0, $errorBytes.Length)
        }
        $response.Close()
    } catch {
        # Silent ignore context close errors or client aborts
    }
}
