# Script PowerShell para construir e fazer push de imagens multi-arquitetura (AMD64 + ARM64)
# Para Windows PowerShell

param(
    [string]$Version = "latest"
)

$IMAGE_NAME = "jamap/mermaid-server"

Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🔨 Build Multi-Arquitetura: AMD64 + ARM64                  ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "📦 Imagem: ${IMAGE_NAME}:${Version}" -ForegroundColor Blue
Write-Host "🏗️  Arquiteturas: linux/amd64, linux/arm64" -ForegroundColor Blue
Write-Host ""

# Verificar se Docker está rodando
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker não está rodando. Inicie o Docker Desktop." -ForegroundColor Red
    exit 1
}

# Verificar se buildx está disponível
try {
    $buildxVersion = docker buildx version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Buildx não disponível"
    }
    Write-Host "✅ Docker Buildx disponível: $($buildxVersion -split "`n" | Select-Object -First 1)" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Buildx não está disponível" -ForegroundColor Red
    Write-Host "   Instale: https://docs.docker.com/buildx/working-with-buildx/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Criar builder multi-arquitetura (se não existir)
$BUILDER_NAME = "mermaid-multiarch-builder"
$builders = docker buildx ls 2>&1
if ($builders -notmatch $BUILDER_NAME) {
    Write-Host "🔧 Criando builder multi-arquitetura..." -ForegroundColor Yellow
    docker buildx create --name $BUILDER_NAME --driver docker-container --use --bootstrap
    Write-Host "✅ Builder criado e configurado" -ForegroundColor Green
} else {
    Write-Host "✅ Builder já existe" -ForegroundColor Green
    docker buildx use $BUILDER_NAME
}

# Verificar se QEMU está disponível para emulação
Write-Host ""
Write-Host "🔧 Configurando QEMU para cross-platform..." -ForegroundColor Yellow
docker run --rm --privileged tonistiigi/binfmt --install all 2>&1 | Out-Null

Write-Host ""
Write-Host "🚀 Construindo ambas as arquiteturas (AMD64 + ARM64)..." -ForegroundColor Yellow
Write-Host "   Isso pode demorar alguns minutos..." -ForegroundColor Yellow
Write-Host ""

# Construir e fazer push para ambas as arquiteturas
docker buildx build `
    --platform linux/amd64,linux/arm64 `
    --tag "${IMAGE_NAME}:${Version}" `
    --tag "${IMAGE_NAME}:latest" `
    --push `
    --progress=plain `
    .

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  ✅ SUCESSO! Imagem multi-arquitetura publicada              ║" -ForegroundColor Green
    Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "📦 Imagem: ${IMAGE_NAME}:${Version}" -ForegroundColor Blue
    Write-Host "📦 Tags: ${IMAGE_NAME}:${Version}, ${IMAGE_NAME}:latest" -ForegroundColor Blue
    Write-Host ""
    Write-Host "📋 Verificar no Docker Hub:" -ForegroundColor Cyan
    Write-Host "   docker buildx imagetools inspect ${IMAGE_NAME}:${Version}" -ForegroundColor White
    Write-Host ""
    Write-Host "🔍 Verificar arquiteturas suportadas:" -ForegroundColor Cyan
    Write-Host "   docker manifest inspect ${IMAGE_NAME}:${Version}" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Erro ao construir imagem" -ForegroundColor Red
    exit 1
}

