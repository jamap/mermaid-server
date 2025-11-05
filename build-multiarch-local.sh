#!/bin/bash
# Script para construir imagem multi-arquitetura localmente (sem push)
# Útil para testar antes de fazer push

set -e

IMAGE_NAME="jamap/mermaid-server"
VERSION="${1:-latest}"
PLATFORM="${2:-linux/arm64}"  # Por padrão, ARM64. Use 'linux/amd64' ou 'linux/amd64,linux/arm64'

echo "🔨 Construindo imagem local: ${IMAGE_NAME}:${VERSION}"
echo "📦 Arquitetura(s): ${PLATFORM}"
echo ""

# Verificar se buildx está disponível
if ! docker buildx version &> /dev/null; then
    echo "❌ Docker Buildx não está disponível"
    echo "   Instale: https://docs.docker.com/buildx/working-with-buildx/"
    exit 1
fi

# Criar builder multi-arquitetura (se não existir)
BUILDER_NAME="mermaid-multiarch-builder"
if ! docker buildx ls | grep -q "$BUILDER_NAME"; then
    echo "🔧 Criando builder multi-arquitetura..."
    docker buildx create --name "$BUILDER_NAME" --use --bootstrap
else
    echo "✅ Builder já existe"
    docker buildx use "$BUILDER_NAME"
fi

# Construir localmente (sem push)
echo ""
echo "🚀 Construindo..."
docker buildx build \
    --platform "${PLATFORM}" \
    --tag "${IMAGE_NAME}:${VERSION}" \
    --load \
    .

echo ""
echo "✅ Imagem ${IMAGE_NAME}:${VERSION} construída localmente!"
echo ""
echo "📋 Verificar:"
echo "   docker images | grep ${IMAGE_NAME}"

