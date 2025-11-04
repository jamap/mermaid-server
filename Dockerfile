# Dockerfile único para Backend + Frontend Mermaid
FROM node:20-slim

# Instalar dependências do sistema necessárias para Puppeteer/Chromium e Sharp
RUN apt-get update && apt-get install -y \
    # Dependências do Puppeteer/Chromium
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatspi2.0-0 \
    libxss1 \
    libfontconfig1 \
    libx11-xcb1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    xdg-utils \
    # Dependências do Sharp (bibliotecas de imagem)
    libvips-dev \
    # Chrome/Chromium para Puppeteer
    chromium \
    chromium-driver \
    && rm -rf /var/lib/apt/lists/* \
    # Verificar e criar symlink se necessário
    && (test -f /usr/bin/chromium && echo "✅ Chromium encontrado em /usr/bin/chromium" || \
        (test -f /usr/bin/chromium-browser && ln -s /usr/bin/chromium-browser /usr/bin/chromium && echo "✅ Symlink criado" || \
         echo "⚠️ Chromium não encontrado"))

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências do backend
COPY mermaid-backend/package.json mermaid-backend/package-lock.json* ./backend/
COPY mermaid-frontend/package.json mermaid-frontend/package-lock.json* ./frontend/

# Instalar dependências do backend
WORKDIR /app/backend
RUN npm ci --production && npm cache clean --force

# Instalar dependências do frontend
WORKDIR /app/frontend
RUN npm ci --production && npm cache clean --force

# Voltar para diretório raiz
WORKDIR /app

# Copiar código da aplicação
COPY mermaid-backend/ ./backend/
COPY mermaid-frontend/ ./frontend/

# Copiar script de inicialização
COPY start-services.js ./

# Criar diretório para arquivos temporários do Puppeteer
RUN mkdir -p /tmp/puppeteer && chmod -R 777 /tmp/puppeteer

# Variáveis de ambiente
ENV PUPPETEER_CACHE_DIR=/tmp/puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
# Fallback: tentar chromium-browser se chromium não existir
ENV CHROMIUM_PATH=/usr/bin/chromium
ENV NODE_ENV=production
ENV BACKEND_PORT=8096
ENV FRONTEND_PORT=8095

# Expor as portas
EXPOSE 8095 8096

# Health check (backend)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8096/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando para iniciar ambos os serviços
CMD ["node", "start-services.js"]
