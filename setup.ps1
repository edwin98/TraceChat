# TraceChat 一键初始化脚本
# 首次克隆后运行：.\setup.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Check-Command($name) {
    return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

Write-Host "TraceChat Setup" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan

# --- 检查 uv ---
if (-not (Check-Command "uv")) {
    Write-Host ""
    Write-Host "未找到 uv，请先安装：" -ForegroundColor Red
    Write-Host "  PowerShell: irm https://astral.sh/uv/install.ps1 | iex" -ForegroundColor Yellow
    Write-Host "  或参考：https://docs.astral.sh/uv/getting-started/installation/" -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] uv $(uv --version)" -ForegroundColor Green

# --- 检查 Node.js ---
if (-not (Check-Command "node")) {
    Write-Host ""
    Write-Host "未找到 Node.js，请先安装：https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Node.js $(node --version)" -ForegroundColor Green

# --- 配置 .env ---
$envFile = "$PSScriptRoot\backend\.env"
$envExample = "$PSScriptRoot\backend\.env.example"

if (-not (Test-Path $envFile)) {
    Copy-Item $envExample $envFile
    Write-Host ""
    Write-Host "[!] 已创建 backend\.env，请编辑并填入 API Key：" -ForegroundColor Yellow
    Write-Host "    $envFile" -ForegroundColor White
    Write-Host ""
    Write-Host "至少填写以下之一：" -ForegroundColor Yellow
    Write-Host "  ANTHROPIC_API_KEY  / OPENAI_API_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY" -ForegroundColor White
    Write-Host ""
    Read-Host "填写完毕后按 Enter 继续"
} else {
    Write-Host "[OK] backend\.env 已存在" -ForegroundColor Green
}

# --- 安装后端依赖 ---
Write-Host ""
Write-Host "安装后端依赖（uv sync）..." -ForegroundColor Cyan
Push-Location "$PSScriptRoot\backend"
try {
    uv sync
    if ($LASTEXITCODE -ne 0) { throw "uv sync 失败" }
} finally {
    Pop-Location
}
Write-Host "[OK] 后端依赖安装完成" -ForegroundColor Green

# --- 安装前端依赖 ---
Write-Host ""
Write-Host "安装前端依赖（npm install）..." -ForegroundColor Cyan
Push-Location "$PSScriptRoot\frontend"
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install 失败" }
} finally {
    Pop-Location
}
Write-Host "[OK] 前端依赖安装完成" -ForegroundColor Green

# --- 完成 ---
Write-Host ""
Write-Host "初始化完成！" -ForegroundColor Cyan
Write-Host "运行 .\start.ps1 启动应用" -ForegroundColor White
