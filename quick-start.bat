@echo off
setlocal
chcp 65001 >nul
title IOBS Unified App - Quick Start

cd /d "%~dp0"

echo ================================================
echo   IOBS Unified App - 快速安装依赖并启动
echo ================================================
echo.

where npm >nul 2>&1
if errorlevel 1 (
  echo [错误] 未检测到 npm。请先安装 Node.js: https://nodejs.org/
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [1/2] 正在安装依赖（npm ci）...
  call npm ci
  if errorlevel 1 (
    echo.
    echo [错误] 依赖安装失败。
    pause
    exit /b 1
  )
) else (
  echo [1/2] 已检测到 node_modules，跳过安装。
  echo        如需强制重装，请先删除 node_modules 后重试。
)

echo.
echo [2/2] 正在启动开发服务器（npm run dev）...
echo -----------------------------------------------
call npm run dev

echo.
echo 开发服务器已退出。
pause
exit /b 0
