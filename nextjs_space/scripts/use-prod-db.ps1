# Script para alternar para banco de dados de PRODUÇÃO
# Execute: .\scripts\use-prod-db.ps1

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Alternando para BANCO DE DADOS DE PRODUÇÃO  " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Verifica se .env.production.backup existe
if (-not (Test-Path ".env.production.backup")) {
    Write-Host "ERRO: Backup do .env de produção não encontrado!" -ForegroundColor Red
    Write-Host "O arquivo .env.production.backup não existe." -ForegroundColor Yellow
    exit 1
}

# Restaura o .env de produção
Copy-Item ".env.production.backup" ".env" -Force
Write-Host "Banco de dados alterado para PRODUÇÃO!" -ForegroundColor Green

Write-Host ""
Write-Host "ATENÇÃO: Você está usando o banco de PRODUÇÃO agora." -ForegroundColor Yellow
Write-Host "Tenha cuidado com alterações!" -ForegroundColor Yellow
Write-Host ""

# Reinicia o Prisma Client
Write-Host "Regenerando Prisma Client..." -ForegroundColor Cyan
npx prisma generate

Write-Host ""
Write-Host "Pronto! Reinicie o servidor de desenvolvimento (npm run dev)" -ForegroundColor Green
