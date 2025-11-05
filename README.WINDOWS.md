# 🪟 Guia de Instalação no Windows

Este projeto funciona perfeitamente no Windows usando Docker Desktop.

## 📋 Pré-requisitos

1. **Docker Desktop para Windows**
   - Baixe em: https://www.docker.com/products/docker-desktop/
   - Certifique-se de que o WSL2 está habilitado (Docker Desktop faz isso automaticamente)

2. **Git Bash** (opcional, para scripts .sh)
   - Ou use PowerShell/CMD para comandos Docker

## 🚀 Como usar

### 1. Usando Docker Compose (Recomendado)

```powershell
# No PowerShell ou CMD
docker-compose up -d --build
```

Isso irá:
- Construir a imagem automaticamente
- Iniciar os serviços
- Expor as portas:
  - **Frontend**: http://localhost:8095
  - **Backend**: http://localhost:8096

### 2. Ver logs

```powershell
docker-compose logs -f
```

### 3. Parar os serviços

```powershell
docker-compose down
```

### 4. Reconstruir após mudanças

```powershell
docker-compose up -d --build
```

## 📝 Scripts Multi-Arquitetura

Os scripts `.sh` (build-multiarch.sh) não funcionam nativamente no Windows PowerShell/CMD.

### Opções:

**Opção 1: Usar Git Bash**
```bash
# No Git Bash
./build-multiarch.sh latest
```

**Opção 2: Usar WSL**
```bash
# No WSL
cd /mnt/c/caminho/para/mermaid-server
./build-multiarch.sh latest
```

**Opção 3: Comandos Docker Diretos (PowerShell)**
```powershell
# Criar builder multi-arquitetura
docker buildx create --name mermaid-multiarch-builder --driver docker-container --use --bootstrap

# Construir e fazer push
docker buildx build --platform linux/amd64,linux/arm64 --tag jamap/mermaid-server:latest --push .
```

## ⚠️ Considerações Importantes

1. **Arquitetura**: O Windows geralmente é AMD64/x86_64, então o Docker usará `linux/amd64` automaticamente

2. **Caminhos**: O Dockerfile usa caminhos Linux (`/app`, `/usr/bin`), mas isso funciona porque roda dentro do container Linux

3. **Portas**: As portas 8095 e 8096 devem estar livres no Windows

4. **Permissões**: O Docker Desktop gerencia permissões automaticamente

## 🔧 Troubleshooting

### Docker não inicia
- Verifique se o WSL2 está habilitado
- Reinicie o Docker Desktop

### Portas ocupadas
```powershell
# Verificar portas no Windows
netstat -ano | findstr :8095
netstat -ano | findstr :8096
```

### Erro de permissão
- Execute o PowerShell como Administrador
- Ou ajuste as permissões do Docker Desktop

## ✅ Compatibilidade

- ✅ Dockerfile: **100% compatível** (roda em container Linux)
- ✅ docker-compose.yml: **100% compatível**
- ⚠️ Scripts .sh: Requerem Git Bash ou WSL
- ✅ Comandos Docker: **100% compatíveis** no PowerShell/CMD

