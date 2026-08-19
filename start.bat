@echo off
title Portal WebGIS Defesa Civil Passo Fundo
echo =========================================================
echo  INICIANDO PORTAL DEFESA CIVIL PASSO FUNDO / RS - WEBGIS
echo =========================================================
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
