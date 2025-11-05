#!/bin/bash
# Script para construir e fazer push de imagens multi-arquitetura (AMD64 + ARM64)
# Gera ambas as imagens de uma vez e faz push de uma única imagem multi-arquitetura

set -e

IMAGE_NAME="jamap/mermaid-server"
VERSION="${1:-latest}"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  🔨 Build Multi-Arquitetura: AMD64 + ARM64                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "📦 Imagem: ${IMAGE_NAME}:${VERSION}"
echo "🏗️  Arquiteturas: linux/amd64, linux/arm64"
echo ""

# Verificar se está logado no Docker Hub
if ! docker info | grep -q "Username"; then
    echo "⚠️  Não detectado login no Docker Hub"
    echo "   Execute: docker login"
    echo ""
    read -p "Deseja fazer login agora? (s/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        docker login
    else
        echo "❌ Login necessário para fazer push"
        exit 1
    fi
fi

# Verificar se buildx está disponível
if ! docker buildx version &> /dev/null; then
    echo "❌ Docker Buildx não está disponível"
    echo "   Instale: https://docs.docker.com/buildx/working-with-buildx/"
    exit 1
fi

echo "✅ Docker Buildx disponível: $(docker buildx version | head -n1)"
echo ""

# Criar builder multi-arquitetura (se não existir)
BUILDER_NAME="mermaid-multiarch-builder"
if ! docker buildx ls | grep -q "$BUILDER_NAME"; then
    echo "🔧 Criando builder multi-arquitetura..."
    docker buildx create --name "$BUILDER_NAME" --driver docker-container --use --bootstrap
    echo "✅ Builder criado e configurado"
else
    echo "✅ Builder já existe"
    docker buildx use "$BUILDER_NAME"
fi

# Verificar se QEMU está disponível para emulação (necessário para cross-platform)
if ! docker run --rm --privileged tonistiigi/binfmt --version 2>/dev/null; then
    echo "⚠️  QEMU pode não estar configurado (necessário para cross-platform)"
    echo "   Tentando instalar..."
    docker run --rm --privileged tonistiigi/binfmt --install all || true
fi

echo ""
echo "🚀 Construindo ambas as arquiteturas (AMD64 + ARM64)..."
echo "   Isso pode demorar alguns minutos..."
echo ""

# Construir e fazer push para ambas as arquiteturas
# O Docker cria uma única imagem multi-arquitetura (manifest)
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --tag "${IMAGE_NAME}:${VERSION}" \
    --tag "${IMAGE_NAME}:latest" \
    --push \
    --progress=plain \
    .

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  ✅ SUCESSO! Imagem multi-arquitetura publicada              ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "📦 Imagem: ${IMAGE_NAME}:${VERSION}"
echo "📦 Tags: ${IMAGE_NAME}:${VERSION}, ${IMAGE_NAME}:latest"
echo ""
echo "📋 Verificar no Docker Hub:"
echo "   docker buildx imagetools inspect ${IMAGE_NAME}:${VERSION}"
echo ""
echo "🔍 Verificar arquiteturas suportadas:"
echo "   docker manifest inspect ${IMAGE_NAME}:${VERSION}"

