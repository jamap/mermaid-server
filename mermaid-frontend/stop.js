/**
 * Script para encerrar processos do frontend na porta 8095
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function stopFrontend() {
  console.log('🛑 Verificando processos na porta 8095...\n');
  
  try {
    // Verificar processos na porta 8095 (Windows)
    const { stdout, stderr } = await execPromise('netstat -ano | findstr :8095');
    
    if (!stdout || stdout.trim().length === 0) {
      console.log('✅ Nenhum processo encontrado na porta 8095');
      return;
    }
    
    // Extrair PIDs das linhas do netstat
    const lines = stdout.trim().split('\n');
    const pids = new Set();
    
    lines.forEach(line => {
      const match = line.trim().match(/\s+(\d+)\s*$/);
      if (match) {
        pids.add(match[1]);
      }
    });
    
    if (pids.size === 0) {
      console.log('✅ Nenhum processo encontrado na porta 8095');
      return;
    }
    
    console.log(`📋 Encontrados ${pids.size} processo(s) na porta 8095:`);
    pids.forEach(pid => console.log(`   - PID: ${pid}`));
    console.log('');
    
    // Encerrar cada processo
    for (const pid of pids) {
      try {
        console.log(`🔄 Encerrando processo ${pid}...`);
        await execPromise(`taskkill /F /PID ${pid}`);
        console.log(`✅ Processo ${pid} encerrado com sucesso`);
      } catch (error) {
        if (error.message.includes('não foi encontrado')) {
          console.log(`⚠️  Processo ${pid} já não existe`);
        } else {
          console.error(`❌ Erro ao encerrar processo ${pid}:`, error.message);
        }
      }
    }
    
    // Verificar novamente
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const { stdout: checkStdout } = await execPromise('netstat -ano | findstr :8095');
      if (checkStdout && checkStdout.trim().length > 0) {
        console.log('\n⚠️  Ainda há processos na porta 8095');
      } else {
        console.log('\n✅ Porta 8095 está livre!');
      }
    } catch (e) {
      console.log('\n✅ Porta 8095 está livre!');
    }
    
  } catch (error) {
    // Se não encontrar processos, netstat retorna erro - isso é normal
    if (error.message.includes('findstr') || error.code === 1) {
      console.log('✅ Nenhum processo encontrado na porta 8095');
    } else {
      console.error('❌ Erro ao verificar processos:', error.message);
      process.exit(1);
    }
  }
}

// Executar
stopFrontend().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

