# Seeds a user's debts via the running DebtTracker API.
# Usage:  powershell -ExecutionPolicy Bypass -File .\seed-data.ps1

$ErrorActionPreference = "Stop"
$BaseUrl = "http://localhost:8080"

function Show-ErrorBody($err) {
    # Print the JSON error body the API returned (Invoke-RestMethod throws on 4xx/5xx).
    $resp = $err.Exception.Response
    if ($resp -and $resp.GetResponseStream) {
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        Write-Host $reader.ReadToEnd() -ForegroundColor Red
    } else {
        Write-Host $err.Exception.Message -ForegroundColor Red
    }
}

# 1. Log in to obtain a JWT.
Write-Host "==> POST /api/auth/login" -ForegroundColor Cyan
$loginBody = @{ email = "dhia@test.com"; password = "password123" } | ConvertTo-Json

try {
    $login = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
} catch {
    Write-Host "Login failed:" -ForegroundColor Red
    Show-ErrorBody $_
    exit 1
}

$login | ConvertTo-Json -Depth 6
$token = $login.data.token

if (-not $token) {
    Write-Host "No token in login response - aborting." -ForegroundColor Red
    exit 1
}

# 2. Save the debts for the authenticated user.
Write-Host ""
Write-Host "==> POST /api/debts" -ForegroundColor Cyan
$debts = @(
    @{ name = "Credit Card";   balance = 6250; interestRate = 18.99; minimumPayment = 350 },
    @{ name = "Personal Loan"; balance = 8000; interestRate = 10.50; minimumPayment = 450 },
    @{ name = "Car Loan";      balance = 7200; interestRate = 6.20;  minimumPayment = 350 },
    @{ name = "Student Loan";  balance = 4500; interestRate = 4.50;  minimumPayment = 100 }
)
$debtsBody = ConvertTo-Json $debts -Depth 6
$headers = @{ Authorization = "Bearer $token" }

try {
    $saved = Invoke-RestMethod -Uri "$BaseUrl/api/debts" -Method Post -ContentType "application/json" -Body $debtsBody -Headers $headers
} catch {
    Write-Host "Saving debts failed:" -ForegroundColor Red
    Show-ErrorBody $_
    exit 1
}

$saved | ConvertTo-Json -Depth 6
Write-Host ""
Write-Host "Done - seeded $($saved.data.Count) debts." -ForegroundColor Green
