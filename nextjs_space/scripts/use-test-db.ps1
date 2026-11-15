# Script para alternar para banco de dados de TESTE
# Execute: .\scripts\use-test-db.ps1

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Alternando para BANCO DE DADOS DE TESTE  " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Verifica se .env.test existe
if (-not (Test-Path ".env.test")) {
    Write-Host "ERRO: Arquivo .env.test não encontrado!" -ForegroundColor Red
    Write-Host "Crie o arquivo .env.test com as credenciais do banco de teste." -ForegroundColor Yellow
    exit 1
}

# Recusa hosts remotos: nunca sobrescreve .env com banco de produção/remoto
$envTestContent = Get-Content ".env.test" -Raw
$dbUrlLine = ($envTestContent -split "`n" | Where-Object { $_ -match "^DATABASE_URL=" }) -join "`n"
if ($dbUrlLine -and $dbUrlLine -notmatch "localhost|127\.0\.0\.1|::1") {
    Write-Host "ERRO: .env.test aponta a host de banco remoto. Recusando sobrescrever .env." -ForegroundColor Red
    exit 1
}

# Faz backup do .env atual (produção)
if (Test-Path ".env") {
    Copy-Item ".env" ".env.production.backup" -Force
    Write-Host "Backup do .env de produção salvo em .env.production.backup" -ForegroundColor Green
}

# Copia .env.test para .env
Copy-Item ".env.test" ".env" -Force
Write-Host "Banco de dados alterado para TESTE!" -ForegroundColor Green

Write-Host ""
Write-Host "ATENÇÃO: Você está usando o banco de TESTE agora." -ForegroundColor Yellow
Write-Host "Para voltar para produção, execute: .\scripts\use-prod-db.ps1" -ForegroundColor Yellow
Write-Host ""

# Reinicia o Prisma Client
Write-Host "Regenerando Prisma Client..." -ForegroundColor Cyan
npx prisma generate

Write-Host ""
Write-Host "Pronto! Reinicie o servidor de desenvolvimento (npm run dev)" -ForegroundColor Green
