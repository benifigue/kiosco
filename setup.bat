@echo off
echo 🏪 Kiosco Manager - Setup
echo ==========================
echo.

echo 📦 Installing dependencies...
call npm install
if errorlevel 1 (
  echo ❌ Error installing dependencies
  pause
  exit /b 1
)

echo.
echo 🗄 Creating database...
call npm run db:push
if errorlevel 1 (
  echo ❌ Error creating database
  pause
  exit /b 1
)

echo.
echo 🌱 Loading seed data...
call npm run db:seed
if errorlevel 1 (
  echo ❌ Error loading seed data
  pause
  exit /b 1
)

echo.
echo ✅ Setup complete!
echo.
echo 👤 Users created:
echo    admin / admin123 (ADMIN)
echo    colaborador / colab123 (COLABORADOR)
echo.
echo 🚀 Run 'npm run dev' to start
echo    Then open: http://localhost:3000
echo.
pause
