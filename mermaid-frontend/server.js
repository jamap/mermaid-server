const express = require('express');
const path = require('path');

const app = express();
const PORT = 8095;

// Configuração do backend (pode ser alterada via variável de ambiente)
// Se BACKEND_URL não estiver definido ou for localhost, detectar automaticamente o host
const BACKEND_URL_ENV = process.env.BACKEND_URL;

// Função para construir URL do backend baseada na requisição
function getBackendUrl(req) {
  // Se BACKEND_URL foi definido explicitamente e não é localhost, usar ele
  if (BACKEND_URL_ENV && !BACKEND_URL_ENV.includes('localhost')) {
    return BACKEND_URL_ENV;
  }
  
  // Caso contrário, construir URL baseada no host da requisição
  // Isso permite acesso via rede de outros equipamentos
  const protocol = req.protocol || 'http';
  const host = req.get('host') || req.hostname || 'localhost:8095';
  
  // Extrair apenas o hostname:porta (sem o path)
  const hostname = host.split(':')[0];
  const port = host.split(':')[1] || '8095';
  
  // Se for localhost, manter localhost. Caso contrário, usar o IP/hostname da requisição
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8096';
  }
  
  // Construir URL do backend na mesma máquina (porta 8096)
  return `${protocol}://${hostname}:8096`;
}

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rota para servir index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint de configuração para o frontend saber onde está o backend
app.get('/config', (req, res) => {
  const backendUrl = getBackendUrl(req);
  res.json({
    backendUrl: backendUrl,
    apiEndpoint: `${backendUrl}/api/generate`
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Frontend Server rodando na porta ${PORT}`);
  console.log(`📝 Interface web: http://localhost:${PORT}`);
  console.log(`🔗 Backend será detectado automaticamente baseado no host da requisição`);
  if (BACKEND_URL_ENV) {
    console.log(`   BACKEND_URL configurado: ${BACKEND_URL_ENV}`);
  }
});

