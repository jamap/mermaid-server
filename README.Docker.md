# 🐳 Docker Setup - Mermaid Backend e Frontend

Este projeto inclui configuração Docker para executar tanto o backend quanto o frontend em um único container.

## 📋 Pré-requisitos

- Docker Desktop instalado e rodando
- Docker Compose (incluído no Docker Desktop)

## 🚀 Como usar

### Iniciar o serviço

```bash
docker-compose up -d
```

Isso irá:
- Construir a imagem única com backend + frontend
- Iniciar ambos os serviços no mesmo container
- Expor as portas:
  - **Frontend**: http://localhost:8095
  - **Backend**: http://localhost:8096

### Ver logs

```bash
# Ver logs do container
docker-compose logs -f

# Ver logs em tempo real
docker-compose logs -f mermaid-app
```

### Parar o serviço

```bash
docker-compose down
```

### Reconstruir a imagem

Se você fez mudanças no código e precisa reconstruir:

```bash
docker-compose up -d --build
```

### Verificar status

```bash
docker-compose ps
```

## 🏗️ Estrutura

- `docker-compose.yml` - Configuração do serviço único
- `Dockerfile` - Imagem única com backend e frontend
- `start-services.js` - Script que inicia ambos os serviços simultaneamente

## 🔧 Configurações

### Variáveis de Ambiente

Você pode criar um arquivo `.env` na raiz do projeto para configurar:

```env
BACKEND_URL=http://localhost:8096
NODE_ENV=production
```

### Portas

- Frontend: `8095`
- Backend: `8096`

Se precisar alterar as portas, edite o `docker-compose.yml` e os arquivos de configuração.

## 🐛 Troubleshooting

### Serviços não estão respondendo

```bash
# Verificar se o container está rodando
docker-compose ps

# Ver logs
docker-compose logs

# Verificar health check do backend
docker-compose exec mermaid-app node -e "require('http').get('http://localhost:8096/health', (r) => {console.log('Status:', r.statusCode)})"
```

### Limpar tudo e recomeçar

```bash
# Parar e remover containers, volumes e redes
docker-compose down -v

# Reconstruir do zero
docker-compose up -d --build
```

## 📝 Notas

- Ambos os serviços (backend e frontend) rodam no mesmo container
- O frontend se conecta ao backend via `localhost:8096` (mesmo container)
- O backend inclui todas as dependências do Puppeteer e Sharp
- O script `start-services.js` gerencia ambos os processos
- Health check verifica se o backend está respondendo

