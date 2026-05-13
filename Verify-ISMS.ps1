<#
.SYNOPSIS
    Verifies file integrity of the Islamic School Management plugin against
    a SHA-256 manifest produced when the files were generated.

.PARAMETER Folder
    Path to the plugin folder on this machine. Defaults to C:\Users\Moham\Desktop\ISMS.

.PARAMETER Manifest
    Path to the .sha256 manifest. Defaults to a sibling 'ISMS-manifest.sha256'.

.EXAMPLE
    .\Verify-ISMS.ps1
    .\Verify-ISMS.ps1 -Folder "C:\Users\Moham\Desktop\ISMS"
#>

[CmdletBinding()]
param(
    [string]$Folder   = "C:\Users\Moham\Desktop\ISMS",
    [string]$Manifest = (Join-Path $PSScriptRoot "ISMS-manifest.sha256")
)

if (-not (Test-Path $Manifest)) {
    Write-Error "Manifest not found at: $Manifest"
    exit 2
}
if (-not (Test-Path $Folder)) {
    Write-Error "Folder not found at: $Folder"
    exit 2
}

$ok       = 0
$mismatch = @()
$missing  = @()
$entries  = Get-Content $Manifest | Where-Object { $_ -match '^[0-9a-f]{64}\s+\S' }

Write-Host ("Verifying {0} files in {1}" -f $entries.Count, $Folder) -ForegroundColor Cyan
Write-Host ("-" * 70)

foreach ($line in $entries) {
    # Manifest format: "<hash>  <relative/path/using/forward-slashes>"
    $parts    = $line -split '\s+', 2
    $expected = $parts[0]
    $rel      = $parts[1].Trim()

    $fullPath = Join-Path $Folder ($rel -replace '/', '\')

    if (-not (Test-Path $fullPath)) {
        $missing += $rel
        Write-Host ("MISSING  : {0}" -f $rel) -ForegroundColor Red
        continue
    }

    $actual = (Get-FileHash -Algorithm SHA256 -Path $fullPath).Hash.ToLower()
    if ($actual -eq $expected) {
        $ok++
        Write-Host ("OK       : {0}" -f $rel) -ForegroundColor DarkGreen
    } else {
        $mismatch += [pscustomobject]@{ File = $rel; Expected = $expected; Actual = $actual }
        Write-Host ("MISMATCH : {0}" -f $rel) -ForegroundColor Yellow
    }
}

# Detect extra files in target folder that aren't in the manifest.
$expectedSet = New-Object System.Collections.Generic.HashSet[string]
foreach ($line in $entries) {
    $rel = ($line -split '\s+', 2)[1].Trim()
    [void]$expectedSet.Add(($rel -replace '/', '\'))
}
$extras = @()
Get-ChildItem -Path $Folder -Recurse -File | ForEach-Object {
    $relWin = $_.FullName.Substring($Folder.Length).TrimStart('\')
    if (-not $expectedSet.Contains($relWin)) { $extras += $relWin }
}

Write-Host ("-" * 70)
Write-Host ("Summary") -ForegroundColor Cyan
Write-Host ("  OK       : {0}" -f $ok)            -ForegroundColor Green
Write-Host ("  Mismatch : {0}" -f $mismatch.Count) -ForegroundColor ($(if ($mismatch.Count) {'Yellow'} else {'Gray'}))
Write-Host ("  Missing  : {0}" -f $missing.Count)  -ForegroundColor ($(if ($missing.Count)  {'Red'}    else {'Gray'}))
Write-Host ("  Extras   : {0}" -f $extras.Count)   -ForegroundColor Gray

if ($extras.Count) {
    Write-Host "`nExtra files (in folder but not in manifest):" -ForegroundColor Gray
    $extras | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
}

if ($mismatch.Count -or $missing.Count) {
    exit 1
} else {
    Write-Host "`nAll files match. Plugin integrity verified." -ForegroundColor Green
    exit 0
}
