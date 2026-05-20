param(
    [switch]$Install
)

$ErrorActionPreference = "Stop"

$Domain = "laravel-next-stripe-pdf-demo.local"
$Root = Split-Path -Parent $PSScriptRoot
$ApiDir = Join-Path $Root "api"
$WebDir = Join-Path $Root "web"
$HostsPath = Join-Path $env:SystemRoot "System32\drivers\etc\hosts"
$HostsEntry = "127.0.0.1 $Domain"

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Copy-IfMissing {
    param(
        [string]$Source,
        [string]$Destination
    )

    if (-not (Test-Path -LiteralPath $Destination)) {
        Copy-Item -LiteralPath $Source -Destination $Destination
        Write-Host "Created $Destination"
    } else {
        Write-Host "Exists  $Destination"
    }
}

function Get-ComposerRunner {
    $composer = Get-Command composer -ErrorAction SilentlyContinue
    if ($composer) {
        return @{
            Program = $composer.Source
            Prefix = @()
        }
    }

    $composerDir = Join-Path $env:TEMP "codex-composer"
    $installer = Join-Path $composerDir "composer-setup.php"
    $signature = Join-Path $composerDir "composer-setup.sig"
    $composerPhar = Join-Path $composerDir "composer.phar"

    New-Item -ItemType Directory -Force -Path $composerDir | Out-Null

    if (-not (Test-Path -LiteralPath $composerPhar)) {
        Write-Host "Composer is not on PATH; downloading a temporary Composer PHAR..."
        Invoke-WebRequest -Uri "https://getcomposer.org/installer" -OutFile $installer
        Invoke-WebRequest -Uri "https://composer.github.io/installer.sig" -OutFile $signature

        $expected = (Get-Content -LiteralPath $signature -Raw).Trim()
        $actual = (Get-FileHash -Algorithm SHA384 -LiteralPath $installer).Hash.ToLowerInvariant()
        if ($actual -ne $expected.ToLowerInvariant()) {
            throw "Invalid Composer installer signature."
        }

        php $installer --install-dir=$composerDir --filename=composer.phar
    }

    return @{
        Program = "php"
        Prefix = @($composerPhar)
    }
}

Copy-IfMissing -Source (Join-Path $ApiDir ".env.example") -Destination (Join-Path $ApiDir ".env")
Copy-IfMissing -Source (Join-Path $WebDir ".env.example") -Destination (Join-Path $WebDir ".env.local")

$hostsContent = if (Test-Path -LiteralPath $HostsPath) {
    Get-Content -LiteralPath $HostsPath -Raw
} else {
    ""
}

if ($hostsContent -notmatch "(?m)^\s*127\.0\.0\.1\s+$([regex]::Escape($Domain))\s*$") {
    if (Test-IsAdministrator) {
        Add-Content -LiteralPath $HostsPath -Value $HostsEntry
        Write-Host "Added hosts entry: $HostsEntry"
    } else {
        Write-Warning "Run this script from an Administrator PowerShell to add the hosts entry:"
        Write-Host "  $HostsEntry"
    }
} else {
    Write-Host "Hosts entry already present for $Domain"
}

if ($Install) {
    $composerRunner = Get-ComposerRunner

    Push-Location $ApiDir
    & $composerRunner.Program @($composerRunner.Prefix + @("install"))
    php artisan key:generate
    Pop-Location

    Push-Location $WebDir
    npm.cmd install
    Pop-Location
}

Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Put your Stripe keys in api\.env and web\.env.local."
Write-Host "  2. Start Laravel: cd api; php artisan serve --host=127.0.0.1 --port=8000"
Write-Host "  3. Start Next: cd web; npm.cmd run dev"
Write-Host "  4. Restart Apache as Administrator if vhost config changed."
Write-Host "  5. Open https://$Domain/checkout"
