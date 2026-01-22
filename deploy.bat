@echo off
REM Script de deploy para Windows
REM Uso: deploy.bat [vercel|netlify|build]

echo 🚀 Conversor XML → Excel - Deploy Script
echo.

if "%1"=="build" goto build
if "%1"=="vercel" goto vercel
if "%1"=="netlify" goto netlify
goto menu

:build
echo 📦 Construindo aplicacao...
call npm run build
echo ✅ Build concluido! Pasta 'dist' gerada.
goto end

:vercel
echo 🔵 Fazendo deploy na Vercel...
where vercel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Vercel CLI nao encontrado. Instalando...
    call npm install -g vercel
)
call vercel --prod
echo ✅ Deploy na Vercel concluido!
goto end

:netlify
echo 🟢 Fazendo deploy na Netlify...
where netlify >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Netlify CLI nao encontrado. Instalando...
    call npm install -g netlify-cli
)
call npm run build
call netlify deploy --prod --dir=dist
echo ✅ Deploy na Netlify concluido!
goto end

:menu
echo Escolha uma opcao:
echo   deploy.bat build      - Apenas build local
echo   deploy.bat vercel     - Deploy na Vercel
echo   deploy.bat netlify    - Deploy na Netlify
echo.
echo Ou use os comandos diretos:
echo   npm run build         - Build local
echo   npm run preview       - Preview do build
goto end

:end
