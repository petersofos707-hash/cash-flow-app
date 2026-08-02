$ErrorActionPreference = "Stop"
$expectedPath = "E:\cash-flow-app"
if ((Get-Location).Path -ne $expectedPath) { throw "Run this script from $expectedPath" }
$env:NPM_CONFIG_CACHE = "$expectedPath\.cache\npm"
$env:PLAYWRIGHT_BROWSERS_PATH = "$expectedPath\.cache\ms-playwright"
& "C:\Program Files\nodejs\npm.cmd" run format:check
& "C:\Program Files\nodejs\npm.cmd" run lint
& "C:\Program Files\nodejs\npm.cmd" run typecheck
& "C:\Program Files\nodejs\npm.cmd" run test
& "C:\Program Files\nodejs\npm.cmd" run test:e2e
& "C:\Program Files\nodejs\npm.cmd" run build
& "C:\Program Files\nodejs\npm.cmd" audit
