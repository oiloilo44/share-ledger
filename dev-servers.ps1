#!/usr/bin/env pwsh
# ShareLedger 개발 서버 관리 스크립트 (Windows PowerShell)

param(
    [Parameter(Position=0)]
    [ValidateSet('start', 'stop', 'status', 'logs')]
    [string]$Action,

    [Parameter(Position=1)]
    [ValidateSet('backend', 'frontend', 'all')]
    [string]$Target = 'all'
)

$ErrorActionPreference = 'Stop'
$RootDir = $PSScriptRoot
$PidDir = Join-Path $RootDir '.devserver'
$BackendPidFile = Join-Path $PidDir 'backend.pid'
$FrontendPidFile = Join-Path $PidDir 'frontend.pid'
$BackendLog = Join-Path $PidDir 'backend.log'
$FrontendLog = Join-Path $PidDir 'frontend.log'

# 디렉터리 생성
if (-not (Test-Path $PidDir)) {
    New-Item -ItemType Directory -Path $PidDir | Out-Null
}

function Show-Usage {
    Write-Host @"
사용법: .\dev-servers.ps1 <start|stop|status|logs> [backend|frontend|all]

  start   백엔드(uvicorn)와 프론트엔드(Vite) 개발 서버를 백그라운드에서 시작합니다.
  stop    실행 중인 개발 서버를 종료합니다.
  status  현재 실행 상태를 확인합니다.
  logs    최근 로그 파일(.devserver/*.log)을 확인합니다.

예제:
  .\dev-servers.ps1 start
  .\dev-servers.ps1 stop
  .\dev-servers.ps1 status
  .\dev-servers.ps1 logs backend
"@
}

function Test-CommandExists {
    param([string]$Command)

    $exists = $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
    if (-not $exists) {
        Write-Error "필수 명령어 '$Command'을(를) 찾을 수 없습니다. PATH를 확인하거나 설치해주세요."
        exit 1
    }
    return $exists
}

function Test-ProcessRunning {
    param([string]$PidFile)

    if (-not (Test-Path $PidFile)) {
        return $false
    }

    try {
        $pid = Get-Content $PidFile -Raw | ForEach-Object { $_.Trim() }
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue

        if ($null -ne $process) {
            return $true
        }
    } catch {
        # PID 파일은 있지만 프로세스가 없음
    }

    # 오래된 PID 파일 제거
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    return $false
}

function Test-BackendEnv {
    $pythonPath = Join-Path $RootDir 'backend\.venv\Scripts\python.exe'

    if (-not (Test-Path $pythonPath)) {
        Write-Error @"
backend\.venv가 준비되어 있지 않습니다. 아래 명령으로 가상환경과 의존성을 먼저 설치해주세요:
  uv venv backend\.venv --python 3.11
  cd backend
  uv sync --python .venv\Scripts\python.exe --extra dev
"@
        exit 1
    }
}

function Start-BackendServer {
    if (Test-ProcessRunning $BackendPidFile) {
        $pid = Get-Content $BackendPidFile
        Write-Host "백엔드 서버가 이미 실행 중입니다. (pid: $pid)"
        return
    }

    Test-BackendEnv

    Write-Host "백엔드 서버를 시작합니다..."

    $pythonPath = Join-Path $RootDir 'backend\.venv\Scripts\python.exe'
    $backendPath = Join-Path $RootDir 'backend'

    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = $pythonPath
    $processInfo.Arguments = '-m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000'
    $processInfo.WorkingDirectory = $RootDir
    $processInfo.UseShellExecute = $false
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true
    $processInfo.CreateNoWindow = $true
    $processInfo.EnvironmentVariables['PYTHONPATH'] = $backendPath

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processInfo

    # 로그 파일로 출력 리다이렉트
    $outputHandler = {
        param($sender, $e)
        if (-not [string]::IsNullOrEmpty($e.Data)) {
            Add-Content -Path $BackendLog -Value $e.Data
        }
    }

    Register-ObjectEvent -InputObject $process -EventName OutputDataReceived -Action $outputHandler | Out-Null
    Register-ObjectEvent -InputObject $process -EventName ErrorDataReceived -Action $outputHandler | Out-Null

    $process.Start() | Out-Null
    $process.BeginOutputReadLine()
    $process.BeginErrorReadLine()

    # PID 저장
    $process.Id | Out-File -FilePath $BackendPidFile -Encoding utf8

    Write-Host "백엔드 서버 시작됨 (pid: $($process.Id))"
    Write-Host "백엔드 로그: $BackendLog"
}

function Start-FrontendServer {
    if (Test-ProcessRunning $FrontendPidFile) {
        $pid = Get-Content $FrontendPidFile
        Write-Host "프론트엔드 서버가 이미 실행 중입니다. (pid: $pid)"
        return
    }

    Test-CommandExists 'pnpm'

    Write-Host "프론트엔드 서버를 시작합니다..."

    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = 'pnpm'
    $processInfo.Arguments = '--filter frontend dev -- --host 0.0.0.0 --port 5173'
    $processInfo.WorkingDirectory = $RootDir
    $processInfo.UseShellExecute = $false
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true
    $processInfo.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processInfo

    # 로그 파일로 출력 리다이렉트
    $outputHandler = {
        param($sender, $e)
        if (-not [string]::IsNullOrEmpty($e.Data)) {
            Add-Content -Path $FrontendLog -Value $e.Data
        }
    }

    Register-ObjectEvent -InputObject $process -EventName OutputDataReceived -Action $outputHandler | Out-Null
    Register-ObjectEvent -InputObject $process -EventName ErrorDataReceived -Action $outputHandler | Out-Null

    $process.Start() | Out-Null
    $process.BeginOutputReadLine()
    $process.BeginErrorReadLine()

    # PID 저장
    $process.Id | Out-File -FilePath $FrontendPidFile -Encoding utf8

    Write-Host "프론트엔드 서버 시작됨 (pid: $($process.Id))"
    Write-Host "프론트엔드 로그: $FrontendLog"
}

function Stop-ServerProcess {
    param(
        [string]$PidFile,
        [string]$Name
    )

    if (-not (Test-ProcessRunning $PidFile)) {
        Write-Host "$Name 서버는 실행 중이 아닙니다."
        return
    }

    $pid = Get-Content $PidFile -Raw | ForEach-Object { $_.Trim() }
    Write-Host "$Name 서버(pid: $pid)를 종료합니다..."

    try {
        $process = Get-Process -Id $pid -ErrorAction Stop
        $process.Kill()

        # 프로세스 종료 대기 (최대 5초)
        $process.WaitForExit(5000) | Out-Null

        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
        Write-Host "$Name 서버가 종료되었습니다."
    } catch {
        Write-Warning "$Name 서버 종료에 실패했습니다: $_"
    }
}

function Stop-PortProcesses {
    param(
        [int]$Port,
        [string]$Description
    )

    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

        if ($null -eq $connections) {
            return
        }

        $knownPids = @()
        if (Test-Path $BackendPidFile) {
            $knownPids += Get-Content $BackendPidFile -Raw | ForEach-Object { $_.Trim() }
        }
        if (Test-Path $FrontendPidFile) {
            $knownPids += Get-Content $FrontendPidFile -Raw | ForEach-Object { $_.Trim() }
        }

        Write-Host "${Description} 포트($Port)를 점유한 잔여 프로세스를 정리합니다..."

        foreach ($conn in $connections) {
            $pid = $conn.OwningProcess

            if ($knownPids -contains $pid) {
                continue
            }

            try {
                $process = Get-Process -Id $pid -ErrorAction Stop
                $process.Kill()
                Write-Host " - 추가 프로세스(pid: $pid) 종료"
            } catch {
                # 프로세스 종료 실패는 무시
            }
        }
    } catch {
        # Get-NetTCPConnection 실패 시 무시
    }
}

function Show-ServerStatus {
    Write-Host "`n=== ShareLedger 개발 서버 상태 ===`n"

    if (Test-ProcessRunning $BackendPidFile) {
        $pid = Get-Content $BackendPidFile
        Write-Host "백엔드:     실행 중 (pid: $pid)" -ForegroundColor Green
        Write-Host "            http://localhost:8000"
    } else {
        Write-Host "백엔드:     정지됨" -ForegroundColor Red
    }

    if (Test-ProcessRunning $FrontendPidFile) {
        $pid = Get-Content $FrontendPidFile
        Write-Host "프론트엔드: 실행 중 (pid: $pid)" -ForegroundColor Green
        Write-Host "            http://localhost:5173"
    } else {
        Write-Host "프론트엔드: 정지됨" -ForegroundColor Red
    }

    Write-Host ""
}

function Show-Logs {
    param([string]$LogTarget)

    switch ($LogTarget) {
        'backend' {
            if (Test-Path $BackendLog) {
                Write-Host "`n=== 백엔드 로그 (최근 50줄) ===" -ForegroundColor Cyan
                Get-Content $BackendLog -Tail 50
            } else {
                Write-Host "백엔드 로그 파일이 없습니다."
            }
        }
        'frontend' {
            if (Test-Path $FrontendLog) {
                Write-Host "`n=== 프론트엔드 로그 (최근 50줄) ===" -ForegroundColor Cyan
                Get-Content $FrontendLog -Tail 50
            } else {
                Write-Host "프론트엔드 로그 파일이 없습니다."
            }
        }
        'all' {
            if (Test-Path $BackendLog) {
                Write-Host "`n=== 백엔드 로그 (최근 50줄) ===" -ForegroundColor Cyan
                Get-Content $BackendLog -Tail 50
            } else {
                Write-Host "백엔드 로그 파일이 없습니다."
            }

            Write-Host ""

            if (Test-Path $FrontendLog) {
                Write-Host "`n=== 프론트엔드 로그 (최근 50줄) ===" -ForegroundColor Cyan
                Get-Content $FrontendLog -Tail 50
            } else {
                Write-Host "프론트엔드 로그 파일이 없습니다."
            }
        }
    }
}

# 메인 로직
if (-not $Action) {
    Show-Usage
    exit 1
}

switch ($Action) {
    'start' {
        Stop-PortProcesses -Port 8000 -Description '백엔드 개발 서버'
        Stop-PortProcesses -Port 5173 -Description '프론트엔드 개발 서버'

        Start-BackendServer
        Start-FrontendServer

        Write-Host "`n서버 시작 완료!" -ForegroundColor Green
        Write-Host "  백엔드:     http://localhost:8000"
        Write-Host "  프론트엔드: http://localhost:5173"
        Write-Host "  API 문서:   http://localhost:8000/docs"
    }
    'stop' {
        Stop-ServerProcess -PidFile $BackendPidFile -Name '백엔드'
        Stop-ServerProcess -PidFile $FrontendPidFile -Name '프론트엔드'

        Stop-PortProcesses -Port 8000 -Description '백엔드 개발 서버'
        Stop-PortProcesses -Port 5173 -Description '프론트엔드 개발 서버'

        Write-Host "`n모든 서버가 종료되었습니다." -ForegroundColor Yellow
    }
    'status' {
        Show-ServerStatus
    }
    'logs' {
        Show-Logs -LogTarget $Target
    }
}
