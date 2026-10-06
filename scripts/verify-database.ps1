param(
  [string]$DumpPath
)

$ErrorActionPreference = "Stop"
$dumpName = "database-dump-2026-10-05.sql"
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

$expected = @{}
$reader = [System.IO.StreamReader]::new((Resolve-Path -LiteralPath $DumpPath).Path)
$activeTable = $null
try {
  while (($line = $reader.ReadLine()) -ne $null) {
    if ($line -match '^COPY public\.(\w+)\s*\(') {
      $activeTable = $Matches[1]
      $expected[$activeTable] = 0
      continue
    }
    if ($null -ne $activeTable) {
      if ($line -eq '\.') { $activeTable = $null }
      else { $expected[$activeTable]++ }
    }
  }
}
finally { $reader.Dispose() }

$dbUser = (& docker compose exec -T postgres printenv POSTGRES_USER).Trim()
if ($LASTEXITCODE -ne 0) { throw "Could not reach the PostgreSQL Compose service." }
$dbName = (& docker compose exec -T postgres printenv POSTGRES_DB).Trim()
if ($LASTEXITCODE -ne 0) { throw "Could not read POSTGRES_DB from the PostgreSQL container." }
$countQuery = "SELECT 'app_categories', count(*) FROM public.app_categories UNION ALL SELECT 'login_attempts', count(*) FROM public.login_attempts UNION ALL SELECT 'menu_items', count(*) FROM public.menu_items UNION ALL SELECT 'recipes', count(*) FROM public.recipes UNION ALL SELECT 'sessions', count(*) FROM public.sessions UNION ALL SELECT 'user_passwords', count(*) FROM public.user_passwords UNION ALL SELECT 'users', count(*) FROM public.users ORDER BY 1"
$countLines = @(& docker compose exec -T postgres psql -U $dbUser -d $dbName -At -F '|' -c $countQuery)
if ($LASTEXITCODE -ne 0) { throw "Could not read row counts from PostgreSQL." }
$actualCounts = @{}
foreach ($line in $countLines) {
  $parts = $line -split '\|'
  if ($parts.Count -eq 2) { $actualCounts[$parts[0]] = [int]$parts[1] }
}
foreach ($table in @("app_categories", "login_attempts", "menu_items", "recipes", "sessions", "user_passwords", "users")) {
  if ($table -in @("login_attempts", "sessions")) {
    # These tables are operational and naturally change after logins, failed
    # login tests, session expiry, and logout. Report them without requiring
    # the restored snapshot count to remain frozen.
    "$($table): $($actualCounts[$table]) current rows (dump snapshot: $($expected[$table]))"
    continue
  }
  if ($expected[$table] -ne $actualCounts[$table]) {
    throw "$table count mismatch: dump=$($expected[$table]), database=$($actualCounts[$table])"
  }
  "$($table): $($actualCounts[$table]) rows (matches dump)"
}

"Database row counts match the source dump. Authenticated API checks are performed by scripts/auth-api-smoke.ps1."
