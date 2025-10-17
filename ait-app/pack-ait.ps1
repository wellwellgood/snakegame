$ErrorActionPreference = "Stop"
Write-Host "PACKER v2.1: slash-zip start"

if (-not (Test-Path .\build\index.html)) { throw "build/index.html 없음" }

# 1) manifest 고정(UTF-8 no BOM)
$enc = New-Object System.Text.UTF8Encoding($false)
$json = @{ platform="granite"; appName="snakegame"; version="1.0.0"; entry="index.html" } | ConvertTo-Json -Compress
[IO.File]::WriteAllText("$PWD\build\manifest.json", $json, $enc)

# 2) 어셈블리 로드
Add-Type -AssemblyName System.IO.Compression | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null

# 3) 이전 산출물 삭제
$ait = "$PWD\snakegame.ait"
Remove-Item $ait -ErrorAction SilentlyContinue

# 4) ZipArchive로 생성(경로 구분자 '/')
$fs  = [System.IO.File]::Open($ait, [System.IO.FileMode]::Create)
$zip = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create, $false)

Get-ChildItem -Path "$PWD\build" -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring(("$PWD\build\").Length) -replace '\\','/'
  $entry = $zip.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal)
  $es = $entry.Open()
  [System.IO.File]::OpenRead($_.FullName).CopyTo($es)
  $es.Dispose()
}

$zip.Dispose(); $fs.Dispose()

$size = (Get-Item $ait).Length
if ($size -lt 1024) { throw "AIT 크기 비정상: $size bytes" }
Write-Host "PACKER v2.1: $ait 생성 ($([math]::Round($size/1KB,2)) KB)"
