param([string]$Email, [string]$ApiBaseUrl = "http://127.0.0.1:4000")
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

if ([string]::IsNullOrWhiteSpace($Email)) {
  $dbUser = (& docker compose exec -T postgres printenv POSTGRES_USER).Trim()
  if ($LASTEXITCODE -ne 0) { throw "Could not read the PostgreSQL user from Docker Compose." }
  $dbName = (& docker compose exec -T postgres printenv POSTGRES_DB).Trim()
  if ($LASTEXITCODE -ne 0) { throw "Could not read the PostgreSQL database name from Docker Compose." }
  $Email = (& docker compose exec -T postgres psql -U $dbUser -d $dbName -Atc "SELECT email FROM public.users WHERE role = 'admin' ORDER BY id LIMIT 1").Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($Email)) { throw "Could not find an admin account in PostgreSQL." }
}

$webSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$recipeId = $null
$dishId = $null
$signedIn = $false

function Invoke-LC {
  param([string]$Method, [string]$Path, [object]$Body)
  $requestArgs = @{ Method = $Method; Uri = "$ApiBaseUrl$Path"; WebSession = $webSession; UseBasicParsing = $true; ErrorAction = "Stop" }
  if ($null -ne $Body) {
    $requestArgs.ContentType = "application/json; charset=utf-8"
    $requestArgs.Body = $Body | ConvertTo-Json -Depth 25 -Compress
  }
  try {
    $response = Invoke-WebRequest @requestArgs
    $data = $null
    if (-not [string]::IsNullOrWhiteSpace($response.Content)) { $data = ConvertFrom-Json $response.Content }
    return [pscustomobject]@{ Status = [int]$response.StatusCode; Data = $data }
  } catch {
    $status = 0
    if ($null -ne $_.Exception.Response) { try { $status = [int]$_.Exception.Response.StatusCode } catch {} }
    return [pscustomobject]@{ Status = $status; Data = $null }
  }
}

try {
  if ((Invoke-LC GET "/api/recipes" $null).Status -ne 401) { throw "Unauthenticated recipes endpoint did not return HTTP 401." }
  $wrong = Invoke-LC POST "/api/auth/login" @{ email = $Email; password = "definitely-not-the-valid-password" }
  if ($wrong.Status -ne 401) { throw "Wrong password returned HTTP $($wrong.Status), expected 401." }
  "Wrong password: rejected with HTTP 401."

  $secure = Read-Host "Enter the existing admin password (input is hidden)" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    $login = Invoke-LC POST "/api/auth/login" @{ email = $Email; password = $plain }
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    $plain = $null
    $secure.Dispose()
  }
  if ($login.Status -ne 200 -or -not $login.Data.user) { throw "Existing admin login failed with HTTP $($login.Status)." }
  $cookie = $webSession.Cookies.GetCookies([uri]$ApiBaseUrl) | Where-Object { $_.Name -eq "lets_cook_session" } | Select-Object -First 1
  if ($null -eq $cookie -or -not $cookie.HttpOnly) { throw "Login did not set an HTTP-only cookie." }
  if (@($login.Data.user.PSObject.Properties.Name | Where-Object { $_ -match "password|hash|token|session" }).Count) { throw "Login response contains sensitive fields." }
  $signedIn = $true
  "Correct login: accepted; HTTP-only cookie set; response contains only public user fields."

  $current = Invoke-LC GET "/api/auth/session" $null
  if ($current.Status -ne 200 -or $current.Data.user.id -ne $login.Data.user.id) { throw "Current-session lookup failed." }
  $recipes = Invoke-LC GET "/api/recipes" $null
  $dishes = Invoke-LC GET "/api/menu-items" $null
  $categories = Invoke-LC GET "/api/categories" $null
  if ($recipes.Status -ne 200 -or $recipes.Data.Count -ne 407) { throw "Recipes API count mismatch: $($recipes.Data.Count)." }
  if ($dishes.Status -ne 200 -or $dishes.Data.Count -ne 296) { throw "Menu-items API count mismatch: $($dishes.Data.Count)." }
  if ($categories.Status -ne 200 -or $categories.Data.Count -ne 20) { throw "Categories API count mismatch: $($categories.Data.Count)." }
  $realRecipe = $recipes.Data[0]
  $realDish = $dishes.Data[0]
  if ((Invoke-LC GET "/api/recipes/$([uri]::EscapeDataString($realRecipe.id))" $null).Status -ne 200) { throw "Real recipe lookup by ID failed." }
  if ((Invoke-LC GET "/api/menu-items/$([uri]::EscapeDataString($realDish.id))" $null).Status -ne 200) { throw "Real menu item lookup by ID failed." }

  $marker = "LCAuthSmoke-$([guid]::NewGuid().ToString('N'))"
  $recipe = Invoke-LC POST "/api/recipes" @{ name = "$marker-recipe"; section = $realRecipe.section; station = "smoke"; ingredients = @(@{ item = "test"; amount = "1" }); steps = @("test"); criticalPoints = @(); servingNotes = "" }
  if ($recipe.Status -ne 201) { throw "Recipe create failed with HTTP $($recipe.Status)." }
  $recipeId = $recipe.Data.id
  $recipeUpdate = Invoke-LC PATCH "/api/recipes/$recipeId" @{ name = "$marker-recipe-edited" }
  if ($recipeUpdate.Status -ne 200 -or $recipeUpdate.Data.name -ne "$marker-recipe-edited") { throw "Recipe update failed." }
  $search = Invoke-LC GET "/api/search?q=$([uri]::EscapeDataString($marker))" $null
  if ($search.Status -ne 200 -or @($search.Data.recipes | Where-Object { $_.id -eq $recipeId }).Count -ne 1) { throw "Recipe name search failed." }
  $category = Invoke-LC GET "/api/recipes?category=$([uri]::EscapeDataString($realRecipe.section))" $null
  if ($category.Status -ne 200 -or @($category.Data | Where-Object { $_.id -eq $recipeId }).Count -ne 1) { throw "Recipe category filtering failed." }

  $dish = Invoke-LC POST "/api/menu-items" @{ name = "$marker-dish"; section = $realDish.section; components = @("test") }
  if ($dish.Status -ne 201) { throw "Menu-item create failed with HTTP $($dish.Status)." }
  $dishId = $dish.Data.id
  $dishUpdate = Invoke-LC PATCH "/api/menu-items/$dishId" @{ name = "$marker-dish-edited" }
  if ($dishUpdate.Status -ne 200 -or $dishUpdate.Data.name -ne "$marker-dish-edited") { throw "Menu-item update failed." }
  $dishSearch = Invoke-LC GET "/api/search?q=$([uri]::EscapeDataString($marker))" $null
  if ($dishSearch.Status -ne 200 -or @($dishSearch.Data.menuItems | Where-Object { $_.id -eq $dishId }).Count -ne 1) { throw "Menu-item name search failed." }

  if ((Invoke-LC DELETE "/api/recipes/$recipeId" $null).Status -ne 204) { throw "Recipe delete failed." }
  $recipeId = $null
  if ((Invoke-LC DELETE "/api/menu-items/$dishId" $null).Status -ne 204) { throw "Menu-item delete failed." }
  $dishId = $null
  "Authenticated API: real lists and IDs, recipe/menu-item create-update-delete, search, and category filtering passed."

  if ((Invoke-LC POST "/api/auth/logout" $null).Status -ne 204) { throw "Logout did not return HTTP 204." }
  $signedIn = $false
  $after = Invoke-LC GET "/api/auth/session" $null
  if ($after.Status -ne 200 -or $null -ne $after.Data.user) { throw "Session remained active after logout." }
  if ((Invoke-LC GET "/api/recipes" $null).Status -ne 401) { throw "Protected API remained available after logout." }
  "Logout: session cleared; protected endpoint now returns HTTP 401."
} finally {
  if ($signedIn -and $recipeId) { [void](Invoke-LC DELETE "/api/recipes/$recipeId" $null) }
  if ($signedIn -and $dishId) { [void](Invoke-LC DELETE "/api/menu-items/$dishId" $null) }
  if ($signedIn) { [void](Invoke-LC POST "/api/auth/logout" $null) }
}
