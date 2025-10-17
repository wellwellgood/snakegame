# pack-ait.ps1
param(
  [string]$DistPath = ".\dist",
  [string]$OutFile = ".\snakegame.ait"
)

if (!(Test-Path "$DistPath\index.html")) { throw "dist/index.html 없음" }

# manifest.json 없으면 생성
if (!(Test-Path "$DistPath\manifest.json")) {
  $manifest = @{
    appName = "snakegame"; platform = "web"; version = "1.0.0"; entry = "index.html"
  } | ConvertTo-Json -Compress
  Set-Content -Path "$DistPath\manifest.json" -Value $manifest -Encoding UTF8
}

if (Test-Path $OutFile) { Remove-Item $OutFile -Force }
$zip = "$([System.IO.Path]::ChangeExtension($OutFile,'zip'))"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path "$DistPath\*" -DestinationPath $zip -Force
Rename-Item $zip $OutFile -Force
Write-Host "OK: $OutFile 생성"
