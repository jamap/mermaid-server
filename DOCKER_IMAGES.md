# 🐳 Imagens Docker Necessárias

## 📦 Imagens que serão baixadas automaticamente

Quando você executar `docker-compose build` ou `docker build`, o Docker baixará automaticamente as imagens necessárias. Você **não precisa** baixá-las manualmente, mas aqui está a lista:

### 1. Imagem Base (Obrigatória)
```bash
node:20-slim
```
- **Tamanho aproximado**: ~200-300 MB
- **Descrição**: Imagem Node.js 20 oficial (versão slim)
- **Baixada automaticamente**: Sim, quando você faz `docker-compose build`

### 2. Imagens para Buildx Multi-Arquitetura (Opcional)
Se você usar o script `build-multiarch.sh` ou `build-multiarch.ps1`:

```bash
moby/buildkit:buildx-stable-1
```
- **Tamanho aproximado**: ~50-100 MB
- **Descrição**: BuildKit para builds multi-arquitetura
- **Baixada automaticamente**: Sim, quando você cria o builder

```bash
tonistiigi/binfmt:latest
```
- **Tamanho aproximado**: ~10-20 MB
- **Descrição**: QEMU para emulação cross-platform (AMD64/ARM64)
- **Baixada automaticamente**: Sim, quando você configura QEMU

## 🚀 Como garantir que tudo está pronto

### Opção 1: Deixar o Docker baixar automaticamente (Recomendado)
```powershell
# No PowerShell do Windows
docker-compose build
```
O Docker baixará tudo automaticamente.

### Opção 2: Pré-baixar as imagens manualmente
```powershell
# Baixar imagem base Node.js
docker pull node:20-slim

# Se for usar multi-arquitetura
docker pull moby/buildkit:buildx-stable-1
docker pull tonistiigi/binfmt:latest
```

## 📊 Espaço em Disco Necessário

- **Imagem base**: ~200-300 MB
- **Dependências instaladas**: ~500-800 MB (apt-get packages)
- **Imagem final**: ~2-3 GB (com todas as dependências)
- **Total recomendado**: Pelo menos 5 GB livres

## ✅ Verificar Imagens Instaladas

```powershell
# Ver todas as imagens
docker images

# Verificar se node:20-slim está instalada
docker images node:20-slim

# Ver espaço usado
docker system df
```

## 🔄 Limpar Imagens Não Utilizadas

Se precisar liberar espaço:

```powershell
# Remover imagens não utilizadas
docker image prune -a

# Limpar tudo (cuidado!)
docker system prune -a
```

## 📝 Resumo

**Você NÃO precisa baixar nada manualmente!**

O Docker baixará automaticamente:
1. ✅ `node:20-slim` - quando você faz `docker-compose build`
2. ✅ `moby/buildkit` - quando você usa buildx pela primeira vez
3. ✅ `tonistiigi/binfmt` - quando você configura QEMU

Basta executar:
```powershell
docker-compose build
```

E tudo será baixado e configurado automaticamente! 🎉

