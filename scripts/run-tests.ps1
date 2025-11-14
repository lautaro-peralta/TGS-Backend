# TGS Backend - Test Runner Script (PowerShell)
# Convenient script for running different test suites on Windows

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('unit', 'integration', 'e2e', 'performance', 'security', 'regression', 'all', 'coverage')]
    [string]$TestType
)

# Functions
function Write-Header {
    param([string]$Message)
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host $Message -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Test-DockerServices {
    Write-Header "Checking Docker Services"

    $dockerRunning = docker-compose -f docker-compose.test.yml ps | Select-String "Up"

    if (-not $dockerRunning) {
        Write-Warning "Docker services not running. Starting..."
        docker-compose -f docker-compose.test.yml up -d
        Start-Sleep -Seconds 5
        Write-Success "Docker services started"
    } else {
        Write-Success "Docker services already running"
    }
}

function Invoke-Tests {
    param([string]$Type)

    switch ($Type) {
        'unit' {
            Write-Header "Running Unit Tests"
            pnpm run test:unit
        }
        'integration' {
            Write-Header "Running Integration Tests"
            Test-DockerServices
            pnpm run test:integration
        }
        'e2e' {
            Write-Header "Running E2E Tests"
            Test-DockerServices
            pnpm run test:e2e
        }
        'performance' {
            Write-Header "Running Performance Tests"
            Test-DockerServices
            pnpm run test:performance
        }
        'security' {
            Write-Header "Running Security Tests"
            pnpm run test:security
        }
        'regression' {
            Write-Header "Running Regression Tests"
            Test-DockerServices
            pnpm run test:regression
        }
        'all' {
            Write-Header "Running All Tests"
            Test-DockerServices
            pnpm run test:ci
        }
        'coverage' {
            Write-Header "Running Tests with Coverage"
            Test-DockerServices
            pnpm run test:coverage
        }
    }
}

# Main execution
try {
    Write-Header "Environment Information"
    Write-Host "Node version: $(node --version)"
    Write-Host "pnpm version: $(pnpm --version)"
    Write-Host "Test type: $TestType"
    Write-Host ""

    Invoke-Tests -Type $TestType

    Write-Success "All tests passed!"
    exit 0
}
catch {
    Write-Error "Tests failed: $_"
    exit 1
}
