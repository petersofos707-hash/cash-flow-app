$ErrorActionPreference = "Stop"
$expectedPath = "E:\cash-flow-app"
if ((Get-Location).Path -ne $expectedPath) { throw "Run this script from $expectedPath" }
Write-Host "The local application seeds fictional demo data automatically on first sign-in."
Write-Host "To reset it, use Settings > Data control > Reset fictional demo."
Write-Host "For local Supabase seed data, install Docker Desktop and run: npm run supabase:reset"
