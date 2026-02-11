$ErrorActionPreference = "Stop"

$BaseUrl = "https://script.google.com/macros/s/AKfycbwsLBJEgIaxY74A-72mzNVeu_PhI1-81j1rmvFindpoZsae6vHsHgtglHIduogLXWZl/exec"
$script:FailCount = 0

function Assert-True([bool]$Condition, [string]$Message) {
  if ($Condition) {
    Write-Host "[PASS] $Message" -ForegroundColor Green
  } else {
    $script:FailCount++
    Write-Host "[FAIL] $Message" -ForegroundColor Red
  }
}

function Invoke-LifApi {
  param(
    [ValidateSet("GET","POST")] [string]$Method,
    [string]$Action,
    [hashtable]$Query = @{},
    [object]$Body = $null
  )

  $params = @{ action = $Action }
  foreach ($k in $Query.Keys) { $params[$k] = $Query[$k] }

  $qs = ($params.GetEnumerator() | ForEach-Object {
    "$([uri]::EscapeDataString([string]$_.Key))=$([uri]::EscapeDataString([string]$_.Value))"
  }) -join "&"

  $uri = "$BaseUrl`?$qs"

  if ($Method -eq "GET") {
    return Invoke-RestMethod -Method Get -Uri $uri
  } else {
    $json = $Body | ConvertTo-Json -Depth 10 -Compress
    return Invoke-RestMethod -Method Post -Uri $uri -ContentType "application/json" -Body $json
  }
}

$runId = Get-Date -Format "yyyyMMddHHmmss"
$today = Get-Date
$loanDate = $today.ToString("yyyy-MM-dd")
$dueFuture = $today.AddDays(7).ToString("yyyy-MM-dd")
$returnDate = $today.ToString("yyyy-MM-dd")
$loanDatePast = $today.AddDays(-3).ToString("yyyy-MM-dd")
$duePast = $today.AddDays(-1).ToString("yyyy-MM-dd")

Write-Host "=== LibItemsFlow MVP API Test Start ==="

# 1) Health
$r = Invoke-LifApi -Method GET -Action "health"
Assert-True ($r.ok -eq $true -and $r.data.status -eq "ok") "Health endpoint"

# 2) Create item A
$itemAReq = @{
  Name = "MVP Item A $runId"
  Category = "Laptop"
  AssetTag = "MVP-A-$runId"
  Status = "AVAILABLE"
  Location = "HQ"
  Note = "auto test item A"
}
$r = Invoke-LifApi -Method POST -Action "items" -Body $itemAReq
Assert-True ($r.ok -eq $true) "Create item A"
$itemAId = $r.data.ItemID
Assert-True (-not [string]::IsNullOrWhiteSpace($itemAId)) "Item A ID generated"

# 3) Loan item A
$loanAReq = @{
  ItemID = $itemAId
  BorrowerName = "Auto Tester"
  BorrowerUnit = "QA"
  BorrowerContact = "0900000000"
  LoanDate = $loanDate
  DueDate = $dueFuture
  Note = "auto test loan A"
}
$r = Invoke-LifApi -Method POST -Action "loans" -Body $loanAReq
Assert-True ($r.ok -eq $true -and $r.data.Status -eq "ACTIVE") "Create loan A"
$loanAId = $r.data.LoanID
Assert-True (-not [string]::IsNullOrWhiteSpace($loanAId)) "Loan A ID generated"

# 4) Duplicate loan should fail
$dupReq = @{
  ItemID = $itemAId
  BorrowerName = "Auto Tester 2"
  BorrowerContact = "0911111111"
  LoanDate = $loanDate
  DueDate = $dueFuture
}
$r = Invoke-LifApi -Method POST -Action "loans" -Body $dupReq
Assert-True ($r.ok -eq $false -and $r.error.code -eq "ITEM_UNAVAILABLE") "Duplicate loan blocked"

# 5) Active loans list should contain loan A
$r = Invoke-LifApi -Method GET -Action "loans" -Query @{ status = "ACTIVE" }
$activeLoans = @($r.data)
Assert-True ($r.ok -eq $true -and ($activeLoans | Where-Object { $_.LoanID -eq $loanAId }).Count -ge 1) "Loan A appears in ACTIVE list"

# 6) Return loan A
$returnReq = @{
  LoanID = $loanAId
  ReturnDate = $returnDate
  Note = "auto return"
}
$r = Invoke-LifApi -Method POST -Action "returns" -Body $returnReq
Assert-True ($r.ok -eq $true -and $r.data.Status -eq "RETURNED") "Return loan A"

# 7) Double return should fail
$r = Invoke-LifApi -Method POST -Action "returns" -Body $returnReq
Assert-True ($r.ok -eq $false -and $r.error.code -eq "LOAN_NOT_RETURNABLE") "Double return blocked"

# 8) Returned loan appears in RETURNED list
$r = Invoke-LifApi -Method GET -Action "loans" -Query @{ status = "RETURNED" }
$returnedLoans = @($r.data)
Assert-True ($r.ok -eq $true -and ($returnedLoans | Where-Object { $_.LoanID -eq $loanAId }).Count -ge 1) "Loan A appears in RETURNED list"

# 9) Create item B for overdue test
$itemBReq = @{
  Name = "MVP Item B $runId"
  Category = "Projector"
  AssetTag = "MVP-B-$runId"
  Status = "AVAILABLE"
  Location = "Room 2"
  Note = "auto test item B"
}
$r = Invoke-LifApi -Method POST -Action "items" -Body $itemBReq
Assert-True ($r.ok -eq $true) "Create item B"
$itemBId = $r.data.ItemID

# 10) Create past-due loan B
$loanBReq = @{
  ItemID = $itemBId
  BorrowerName = "Overdue User"
  BorrowerUnit = "QA"
  BorrowerContact = "0922222222"
  LoanDate = $loanDatePast
  DueDate = $duePast
  Note = "overdue test"
}
$r = Invoke-LifApi -Method POST -Action "loans" -Body $loanBReq
Assert-True ($r.ok -eq $true -and $r.data.Status -eq "ACTIVE") "Create loan B (initial ACTIVE)"
$loanBId = $r.data.LoanID

# 11) Trigger overdue transition and verify
$r = Invoke-LifApi -Method GET -Action "loans" -Query @{ status = "OVERDUE" }
$overdueLoans = @($r.data)
Assert-True ($r.ok -eq $true -and ($overdueLoans | Where-Object { $_.LoanID -eq $loanBId }).Count -ge 1) "Loan B transitions to OVERDUE"

Write-Host "=== Test Finished ==="
if ($script:FailCount -gt 0) {
  Write-Host "FAILED: $($script:FailCount) test(s)" -ForegroundColor Red
  exit 1
} else {
  Write-Host "SUCCESS: all tests passed" -ForegroundColor Green
  exit 0
}
