<#
  Windows replacement for the Makefile (make is usually not installed on Windows).
  Usage:  .\tirek.ps1 up | down | logs | seed | migrate | makemigrations | superuser | test | shell | reset
#>
param([Parameter(Position = 0)][string]$Command = "help")

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "Created .env from .env.example"
}

function Compose { docker compose @args; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }

switch ($Command) {
    "up" {
        # --renew-anon-volumes: pick up new npm packages in the frontend container
        Compose up -d --build --renew-anon-volumes
        $port = (Select-String -Path .env -Pattern '^TIREK_FRONTEND_PORT=(\d+)').Matches.Groups[1].Value
        if (-not $port) { $port = "3000" }
        Write-Host "`nTirek: http://localhost:$port  (the very first page load compiles for ~30 s - that is normal in dev)"
        Write-Host "Demo data: .\tirek.ps1 seed"
    }
    "down" { Compose down }
    "logs" { Compose logs -f backend worker frontend }
    "migrate" { Compose exec backend python manage.py migrate }
    "makemigrations" { Compose exec backend python manage.py makemigrations }
    "seed" { Compose exec backend python manage.py seed_demo }
    "superuser" { Compose exec backend python manage.py createsuperuser }
    "test" { Compose exec backend pytest }
    "shell" { Compose exec backend python manage.py shell }
    "reset" { Compose down -v }  # deletes the database and files volumes
    default {
        Write-Host "Commands: up, down, logs, seed, migrate, makemigrations, superuser, test, shell, reset"
    }
}
