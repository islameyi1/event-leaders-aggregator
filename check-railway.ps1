# PowerShell скрипт для проверки конфигурации Railway

Write-Host "🔍 Проверка конфигурации для Railway..." -ForegroundColor Cyan

# Проверяем структуру проекта
Write-Host "`n📁 Проверка структуры проекта:" -ForegroundColor Yellow

$requiredFolders = @("backend", "frontend")
foreach ($folder in $requiredFolders) {
    if (Test-Path $folder) {
        Write-Host "   ✅ $folder существует" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $folder не найден" -ForegroundColor Red
    }
}

# Проверяем необходимые файлы
Write-Host "`n📄 Проверка конфигурационных файлов:" -ForegroundColor Yellow

$requiredFiles = @(
    "backend/package.json",
    "backend/server.js",
    "railway.toml",
    "Dockerfile"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file существует" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file не найден" -ForegroundColor Red
    }
}

# Проверяем package.json
Write-Host "`n📦 Проверка package.json:" -ForegroundColor Yellow
if (Test-Path "backend/package.json") {
    $packageJson = Get-Content "backend/package.json" -Raw | ConvertFrom-Json
    
    # Проверяем скрипты
    if ($packageJson.scripts.start) {
        Write-Host "   ✅ start script: $($packageJson.scripts.start)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Нет start script" -ForegroundColor Red
    }
    
    # Проверяем зависимости
    $requiredDeps = @("express", "pg", "bcryptjs", "jsonwebtoken")
    foreach ($dep in $requiredDeps) {
        if ($packageJson.dependencies.$dep) {
            Write-Host "   ✅ $dep: $($packageJson.dependencies.$dep)" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  $dep не найден в зависимостях" -ForegroundColor Yellow
        }
    }
}

# Проверяем server.js
Write-Host "`n🚀 Проверка server.js:" -ForegroundColor Yellow
if (Test-Path "backend/server.js") {
    $serverContent = Get-Content "backend/server.js" -First 50
    if ($serverContent -match "PORT.*3000") {
        Write-Host "   ✅ Порт 3000 настроен" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Порт не найден в server.js" -ForegroundColor Yellow
    }
    
    if ($serverContent -match "health") {
        Write-Host "   ✅ Health check endpoint найден" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Health check endpoint не найден" -ForegroundColor Yellow
    }
}

# Проверяем Railway конфигурацию
Write-Host "`n⚙️ Проверка railway.toml:" -ForegroundColor Yellow
if (Test-Path "railway.toml") {
    $railwayConfig = Get-Content "railway.toml"
    if ($railwayConfig -match "startCommand.*npm start") {
        Write-Host "   ✅ startCommand настроен" -ForegroundColor Green
    }
    if ($railwayConfig -match "healthcheckPath") {
        Write-Host "   ✅ healthcheckPath настроен" -ForegroundColor Green
    }
}

# Проверяем Dockerfile
Write-Host "`n🐳 Проверка Dockerfile:" -ForegroundColor Yellow
if (Test-Path "Dockerfile") {
    $dockerContent = Get-Content "Dockerfile"
    if ($dockerContent -match "EXPOSE 3000") {
        Write-Host "   ✅ Порт 3000 экспозирован" -ForegroundColor Green
    }
    if ($dockerContent -match "CMD.*node.*server.js") {
        Write-Host "   ✅ CMD настроен правильно" -ForegroundColor Green
    }
}

# Итоговая проверка
Write-Host "`n🎯 ИТОГОВАЯ ПРОВЕРКА:" -ForegroundColor Cyan

$allChecks = @(
    (Test-Path "backend"),
    (Test-Path "frontend"),
    (Test-Path "backend/package.json"),
    (Test-Path "backend/server.js"),
    (Test-Path "railway.toml"),
    (Test-Path "Dockerfile")
)

$passedChecks = ($allChecks | Where-Object { $_ -eq $true }).Count
$totalChecks = $allChecks.Count

if ($passedChecks -eq $totalChecks) {
    Write-Host "✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!" -ForegroundColor Green
    Write-Host "   Проект готов к развертыванию на Railway" -ForegroundColor Green
} else {
    Write-Host "⚠️  НЕ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ: $passedChecks/$totalChecks" -ForegroundColor Yellow
}

Write-Host "`n📋 СЛЕДУЮЩИЕ ШАГИ:" -ForegroundColor Cyan
Write-Host "1. Залить проект на GitHub:"
Write-Host "   git add ."
Write-Host "   git commit -m 'готово для Railway'"
Write-Host "   git push origin main"
Write-Host "`n2. Создать проект на Railway:"
Write-Host "   https://railway.app → New Project → Deploy from GitHub"
Write-Host "`n3. Подключить репозиторий"
Write-Host "`n4. Railway сделает все автоматически 🚀"