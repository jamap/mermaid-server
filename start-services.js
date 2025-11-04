/**
 * Script para iniciar Backend e Frontend simultaneamente
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando serviços Mermaid...\n');

// Configurações
const backendDir = path.join(__dirname, 'backend');
const frontendDir = path.join(__dirname, 'frontend');

// Função para iniciar um serviço
function startService(name, dir, script) {
  console.log(`📦 Iniciando ${name}...`);
  
  const serviceProcess = spawn('node', [script], {
    cwd: dir,
    stdio: 'inherit', // Herdar stdout/stderr para ver logs
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'production'
    }
  });

  serviceProcess.on('error', (error) => {
    console.error(`❌ Erro ao iniciar ${name}:`, error);
    process.exit(1);
  });

  serviceProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ ${name} encerrou com código ${code}`);
      process.exit(code);
    }
  });

  return serviceProcess;
}

// Iniciar Backend
const backend = startService('Backend', backendDir, 'server.js');

// Aguardar um pouco antes de iniciar o frontend (opcional, mas ajuda)
setTimeout(() => {
  // Iniciar Frontend
  // O frontend já está configurado para usar localhost:8096 como backend
  const frontend = startService('Frontend', frontendDir, 'server.js');
}, 2000);

// Tratamento de sinais para encerrar graciosamente
process.on('SIGTERM', () => {
  console.log('\n🛑 Recebido SIGTERM, encerrando serviços...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Recebido SIGINT, encerrando serviços...');
  process.exit(0);
});

