param(
  [Parameter(Position = 0)]
  [string]$DumpPath
)

$ErrorActionPreference = "Stop"
$dumpName = "database-dump-2026-10-05.sql"

if ($null -ne $DumpPath) {
  # pnpm/PowerShell argument forwarding can preserve wrapper quotes or a leading
  # `--`; normalize those without interpreting the path as a command.
  $DumpPath = $DumpPath.Trim()
  if ($DumpPath.StartsWith('--DumpPath=')) {
    $DumpPath = $DumpPath.Substring('--DumpPath='.Length)
  }
  $DumpPath = $DumpPath.Trim('"').Trim("'")
}

if ([string]::IsNullOrWhiteSpace($DumpPath)) {
  $desktop = [Environment]::GetFolderPath('Desktop')
  $candidates = @(
    (Join-Path $desktop "lets cook backups\$dumpName"),
    (Join-Path $desktop "Lets Cook\lets cook backups\$dumpName"),
    (Join-Path $HOME "Desktop\lets cook backups\$dumpName")
  )
  $DumpPath = $candidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
}

if ([string]::IsNullOrWhiteSpace($DumpPath) -or -not (Test-Path -LiteralPath $DumpPath -PathType Leaf)) {
  throw "SQL dump not found. Pass -DumpPath with the backup path."
}

$resolvedDump = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $DumpPath).Path)
$dumpInfo = Get-Item -LiteralPath $resolvedDump
if ($dumpInfo.Length -eq 0) { throw "SQL dump is empty: $resolvedDump" }
$resolvedDump = $dumpInfo.FullName
$readTest = [System.IO.File]::Open($resolvedDump, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
$readTest.Dispose()

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker CLI is unavailable. Install/start Docker Desktop separately, then run docker compose up -d postgres."
}

$dbUser = (& docker compose exec -T postgres printenv POSTGRES_USER).Trim()
if ($LASTEXITCODE -ne 0) { throw "PostgreSQL service is not running. Start it with docker compose up -d postgres." }
$dbName = (& docker compose exec -T postgres printenv POSTGRES_DB).Trim()
if ($LASTEXITCODE -ne 0) { throw "Could not read POSTGRES_DB from the running database container." }

$tableCount = (& docker compose exec -T postgres psql -U $dbUser -d $dbName -Atqc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'").Trim()
if ($LASTEXITCODE -ne 0) { throw "Could not inspect the target database." }
if ($tableCount -ne "0") {
  throw "Refusing to restore over a non-empty public schema ($tableCount tables). Use a fresh local Docker volume for a reproducible import."
}

$roleSql = 'DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ''neondb_owner'') THEN CREATE ROLE neondb_owner NOLOGIN; END IF; IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ''cloud_admin'') THEN CREATE ROLE cloud_admin NOLOGIN; END IF; IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ''neon_superuser'') THEN CREATE ROLE neon_superuser NOLOGIN; END IF; END; $$;'
& docker compose exec -T postgres psql -U $dbUser -d $dbName -v ON_ERROR_STOP=1 -c $roleSql
if ($LASTEXITCODE -ne 0) { throw "Could not prepare the compatibility roles required by the dump." }

$containerDump = "/tmp/letscook-database-restore.sql"
& docker compose cp $resolvedDump "postgres:$containerDump"
if ($LASTEXITCODE -ne 0) { throw "Could not copy the read-only backup into the temporary container path." }
try {
  & docker compose exec -T postgres psql -U $dbUser -d $dbName -v ON_ERROR_STOP=1 -f $containerDump
  if ($LASTEXITCODE -ne 0) { throw "PostgreSQL rejected the dump; import did not complete." }
  "Restore completed from: $resolvedDump"
  "The source SQL file was opened read-only and was not changed."
}
finally {
  & docker compose exec -T postgres rm -f $containerDump | Out-Null
}
