@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "BASE_URL=https://script.google.com/macros/s/AKfycbwsLBJEgIaxY74A-72mzNVeu_PhI1-81j1rmvFindpoZsae6vHsHgtglHIduogLXWZl/exec"
set /a FAIL_COUNT=0
set "RUN_ID=%RANDOM%%RANDOM%"

echo === LibItemsFlow MVP API Test Start (CMD) ===

call :get "health" "" RESP
call :assert_contains "!RESP!" "\"ok\":true" "Health endpoint returns ok=true"
call :assert_contains "!RESP!" "\"status\":\"ok\"" "Health endpoint status=ok"

set "BODY={\"Name\":\"MVP Item A %RUN_ID%\",\"Category\":\"Laptop\",\"AssetTag\":\"MVP-A-%RUN_ID%\",\"Status\":\"AVAILABLE\",\"Location\":\"HQ\",\"Note\":\"auto test item A\"}"
call :post "items" "!BODY!" RESP
call :assert_contains "!RESP!" "\"ok\":true" "Create item A"
call :extract_field "!RESP!" "ItemID" ITEM_A_ID
if not defined ITEM_A_ID (
  call :fail "Item A ID generated"
) else (
  call :pass "Item A ID generated"
)

set "BODY={\"ItemID\":\"!ITEM_A_ID!\",\"BorrowerName\":\"Auto Tester\",\"BorrowerUnit\":\"QA\",\"BorrowerContact\":\"0900000000\",\"LoanDate\":\"2026-02-11\",\"DueDate\":\"2026-02-18\",\"Note\":\"auto test loan A\"}"
call :post "loans" "!BODY!" RESP
call :assert_contains "!RESP!" "\"ok\":true" "Create loan A"
call :assert_contains "!RESP!" "\"Status\":\"ACTIVE\"" "Loan A status ACTIVE"
call :extract_field "!RESP!" "LoanID" LOAN_A_ID
if not defined LOAN_A_ID (
  call :fail "Loan A ID generated"
) else (
  call :pass "Loan A ID generated"
)

set "BODY={\"ItemID\":\"!ITEM_A_ID!\",\"BorrowerName\":\"Auto Tester 2\",\"BorrowerContact\":\"0911111111\",\"LoanDate\":\"2026-02-11\",\"DueDate\":\"2026-02-18\"}"
call :post "loans" "!BODY!" RESP
call :assert_contains "!RESP!" "\"ok\":false" "Duplicate loan blocked (ok=false)"
call :assert_contains "!RESP!" "\"code\":\"ITEM_UNAVAILABLE\"" "Duplicate loan blocked (ITEM_UNAVAILABLE)"

call :get "loans" "status=ACTIVE" RESP
call :assert_contains "!RESP!" "\"ok\":true" "Get ACTIVE loans"
call :assert_contains "!RESP!" "!LOAN_A_ID!" "Loan A appears in ACTIVE list"

set "BODY={\"LoanID\":\"!LOAN_A_ID!\",\"ReturnDate\":\"2026-02-11\",\"Note\":\"auto return\"}"
call :post "returns" "!BODY!" RESP
call :assert_contains "!RESP!" "\"ok\":true" "Return loan A"
call :assert_contains "!RESP!" "\"Status\":\"RETURNED\"" "Loan A status RETURNED"

call :post "returns" "!BODY!" RESP
call :assert_contains "!RESP!" "\"ok\":false" "Double return blocked (ok=false)"
call :assert_contains "!RESP!" "\"code\":\"LOAN_NOT_RETURNABLE\"" "Double return blocked (LOAN_NOT_RETURNABLE)"

call :get "loans" "status=RETURNED" RESP
call :assert_contains "!RESP!" "\"ok\":true" "Get RETURNED loans"
call :assert_contains "!RESP!" "!LOAN_A_ID!" "Loan A appears in RETURNED list"

set "BODY={\"Name\":\"MVP Item B %RUN_ID%\",\"Category\":\"Projector\",\"AssetTag\":\"MVP-B-%RUN_ID%\",\"Status\":\"AVAILABLE\",\"Location\":\"Room 2\",\"Note\":\"auto test item B\"}"
call :post "items" "!BODY!" RESP
call :assert_contains "!RESP!" "\"ok\":true" "Create item B"
call :extract_field "!RESP!" "ItemID" ITEM_B_ID
if not defined ITEM_B_ID (
  call :fail "Item B ID generated"
) else (
  call :pass "Item B ID generated"
)

set "BODY={\"ItemID\":\"!ITEM_B_ID!\",\"BorrowerName\":\"Overdue User\",\"BorrowerUnit\":\"QA\",\"BorrowerContact\":\"0922222222\",\"LoanDate\":\"2000-01-01\",\"DueDate\":\"2000-01-02\",\"Note\":\"overdue test\"}"
call :post "loans" "!BODY!" RESP
call :assert_contains "!RESP!" "\"ok\":true" "Create loan B"
call :assert_contains "!RESP!" "\"Status\":\"ACTIVE\"" "Loan B initial status ACTIVE"
call :extract_field "!RESP!" "LoanID" LOAN_B_ID
if not defined LOAN_B_ID (
  call :fail "Loan B ID generated"
) else (
  call :pass "Loan B ID generated"
)

call :get "loans" "status=OVERDUE" RESP
call :assert_contains "!RESP!" "\"ok\":true" "Get OVERDUE loans"
call :assert_contains "!RESP!" "!LOAN_B_ID!" "Loan B appears in OVERDUE list"

echo === Test Finished ===
if %FAIL_COUNT% GTR 0 (
  echo FAILED: %FAIL_COUNT% test^(s^)
  exit /b 1
)
echo SUCCESS: all tests passed
exit /b 0

:get
setlocal
set "action=%~1"
set "query=%~2"
if defined query (
  set "url=%BASE_URL%?action=%action%^&%query%"
) else (
  set "url=%BASE_URL%?action=%action%"
)
for /f "usebackq delims=" %%R in (`curl -s "%url%"`) do set "resp=%%R"
endlocal & set "%~3=%resp%"
exit /b 0

:post
setlocal
set "action=%~1"
set "body=%~2"
set "tmpfile=%TEMP%\lif_%RANDOM%_%RANDOM%.json"
> "%tmpfile%" (echo %body%)
for /f "usebackq delims=" %%R in (`curl -s -X POST "%BASE_URL%?action=%action%" -H "Content-Type: application/json" --data "@%tmpfile%"`) do set "resp=%%R"
del /q "%tmpfile%" >nul 2>nul
endlocal & set "%~3=%resp%"
exit /b 0

:extract_field
setlocal EnableDelayedExpansion
set "json=%~1"
set "field=%~2"
set "needle=\"%field%\":\""
set "tmp=!json:*%needle%=!"
if "!tmp!"=="!json!" (
  endlocal & set "%~3=" & exit /b 1
)
for /f "tokens=1 delims=\"" %%A in ("!tmp!") do set "val=%%A"
endlocal & set "%~3=%val%" & exit /b 0

:assert_contains
setlocal EnableDelayedExpansion
set "hay=%~1"
set "needle=%~2"
set "label=%~3"
if not "!hay:%needle%=!"=="!hay!" (
  endlocal & call :pass "%label%" & exit /b 0
)
endlocal & call :fail "%label%" & exit /b 1

:pass
echo [PASS] %~1
exit /b 0

:fail
set /a FAIL_COUNT+=1
echo [FAIL] %~1
exit /b 1
