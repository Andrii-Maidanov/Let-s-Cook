param(
  [string]$DumpPath,
  [string]$ApiBaseUrl = "http://localhost:4000"
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
  if ($expected[$table] -ne $actualCounts[$table]) {
    throw "$table count mismatch: dump=$($expected[$table]), database=$($actualCounts[$table])"
  }
  "$($table): $($actualCounts[$table]) rows (matches dump)"
}

# Windows PowerShell 5.1 can return a JSON array as one array-valued pipeline
# object; assigning directly preserves its actual Count (wrapping with @()
# would incorrectly report one).
$recipes = Invoke-RestMethod -Uri "$ApiBaseUrl/api/recipes"
$menuItems = Invoke-RestMethod -Uri "$ApiBaseUrl/api/menu-items"
$categories = Invoke-RestMethod -Uri "$ApiBaseUrl/api/categories"
foreach ($check in @(
  @{ Name = "recipes"; Expected = [int]$expected["recipes"]; Actual = $recipes.Count },
  @{ Name = "menu_items"; Expected = [int]$expected["menu_items"]; Actual = $menuItems.Count },
  @{ Name = "app_categories"; Expected = [int]$expected["app_categories"]; Actual = $categories.Count }
)) {
  if ($check.Expected -ne $check.Actual) {
    throw "$($check.Name) count mismatch: dump=$($check.Expected), API=$($check.Actual)"
  }
  "$($check.Name): $($check.Actual) rows (matches dump)"
}

if ($recipes.Count -eq 0 -or $menuItems.Count -eq 0) { throw "Expected non-empty recipe and menu-item collections." }
$recipe = $recipes[0]
$recipeById = Invoke-RestMethod -Uri "$ApiBaseUrl/api/recipes/$([uri]::EscapeDataString($recipe.id))"
if ($recipeById.id -ne $recipe.id) { throw "GET recipe by ID returned the wrong row." }
$menuItem = $menuItems[0]
$menuById = Invoke-RestMethod -Uri "$ApiBaseUrl/api/menu-items/$([uri]::EscapeDataString($menuItem.id))"
if ($menuById.id -ne $menuItem.id) { throw "GET menu item by ID returned the wrong row." }

$searchUri = "$ApiBaseUrl/api/search?q=$([uri]::EscapeDataString($recipe.name))"
$searchResult = Invoke-RestMethod -Uri $searchUri
if (-not (@($searchResult.recipes | Where-Object { $_.id -eq $recipe.id }).Count)) { throw "Name search did not return the selected real recipe." }
if ($null -ne $recipe.section) {
  $categoryUri = "$ApiBaseUrl/api/recipes?category=$([uri]::EscapeDataString($recipe.section))"
  $categoryResult = Invoke-RestMethod -Uri $categoryUri
  if (-not (@($categoryResult | Where-Object { $_.id -eq $recipe.id }).Count)) { throw "Category filter did not return the selected recipe." }
}
"API checks passed: recipe by ID, menu item by ID, name search, category filter."
"Verified recipe: $($recipe.name) ($($recipe.id)); menu item: $($menuItem.name) ($($menuItem.id))."
