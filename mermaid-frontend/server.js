const express = require('express');
const path = require('path');

const app = express();
const PORT = 8095;

// Configuração do backend (pode ser alterada via variável de ambiente)
// No Docker, usa localhost pois ambos estão no mesmo container
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8096';

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rota para servir index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint de configuração para o frontend saber onde está o backend
app.get('/config', (req, res) => {
  res.json({
    backendUrl: BACKEND_URL,
    apiEndpoint: `${BACKEND_URL}/api/generate`
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Frontend Server rodando na porta ${PORT}`);
  console.log(`📝 Interface web: http://localhost:${PORT}`);
  console.log(`🔗 Backend configurado: ${BACKEND_URL}`);
});

