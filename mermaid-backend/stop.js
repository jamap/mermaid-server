/**
 * Script para encerrar processos do backend na porta 8096
 * Suporta Linux e Windows
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const PORT = 8096;
const isWindows = process.platform === 'win32';

/**
 * Encontra PIDs de processos usando a porta no Linux
 */
async function findPidsLinux() {
  try {
    // Usar lsof primeiro (mais comum)
    const { stdout } = await execPromise(`lsof -ti:${PORT}`);
    if (stdout && stdout.trim()) {
      return stdout.trim().split('\n').filter(pid => pid);
    }
  } catch (error) {
    // Se lsof não estiver disponível, tentar fuser
    try {
      const { stdout } = await execPromise(`fuser ${PORT}/tcp 2>/dev/null`);
      if (stdout && stdout.trim()) {
        // fuser retorna: PORT/tcp: PID PID PID
        const match = stdout.match(/\d+\/tcp:\s*(.+)/);
        if (match) {
          return match[1].trim().split(/\s+/).filter(pid => pid);
        }
      }
    } catch (fuserError) {
      // Se fuser também falhar, tentar ss
      try {
        const { stdout } = await execPromise(`ss -tlnp | grep :${PORT}`);
        if (stdout && stdout.trim()) {
          // ss retorna: LISTEN 0 128 *:PORT *:* users:(("node",pid=PID,fd=...))
          const pids = new Set();
          const lines = stdout.trim().split('\n');
          lines.forEach(line => {
            const match = line.match(/pid=(\d+)/);
            if (match) {
              pids.add(match[1]);
            }
          });
          return Array.from(pids);
        }
      } catch (ssError) {
        // Nenhum método funcionou
        return [];
      }
    }
  }
  return [];
}

/**
 * Encontra PIDs de processos usando a porta no Windows
 */
async function findPidsWindows() {
  try {
    const { stdout } = await execPromise(`netstat -ano | findstr :${PORT}`);
    
    if (!stdout || stdout.trim().length === 0) {
      return [];
    }
    
    const lines = stdout.trim().split('\n');
    const pids = new Set();
    
    lines.forEach(line => {
      const match = line.trim().match(/\s+(\d+)\s*$/);
      if (match) {
        pids.add(match[1]);
      }
    });
    
    return Array.from(pids);
  } catch (error) {
    // Se não encontrar processos, netstat retorna erro - isso é normal
    if (error.code === 1 || error.message.includes('findstr')) {
      return [];
    }
    throw error;
  }
}

/**
 * Mata um processo no Linux
 */
async function killProcessLinux(pid) {
  try {
    await execPromise(`kill -9 ${pid}`);
    return true;
  } catch (error) {
    // Processo pode já ter sido encerrado
    if (error.message.includes('No such process')) {
      return false;
    }
    throw error;
  }
}

/**
 * Mata um processo no Windows
 */
async function killProcessWindows(pid) {
  try {
    await execPromise(`taskkill /F /PID ${pid}`);
    return true;
  } catch (error) {
    // Processo pode já ter sido encerrado
    if (error.message.includes('não foi encontrado') || 
        error.message.includes('not found') ||
        error.code === 128) {
      return false;
    }
    throw error;
  }
}

/**
 * Verifica se ainda há processos usando a porta
 */
async function checkPortStillInUse() {
  if (isWindows) {
    try {
      const { stdout } = await execPromise(`netstat -ano | findstr :${PORT}`);
      return stdout && stdout.trim().length > 0;
    } catch (e) {
      return false;
    }
  } else {
    try {
      const pids = await findPidsLinux();
      return pids.length > 0;
    } catch (e) {
      return false;
    }
  }
}

async function stopBackend() {
  console.log('🛑 Verificando processos na porta 8096...\n');
  
  try {
    // Encontrar PIDs baseado no sistema operacional
    let pids = [];
    if (isWindows) {
      pids = await findPidsWindows();
    } else {
      pids = await findPidsLinux();
    }
    
    if (pids.length === 0) {
      console.log('✅ Nenhum processo encontrado na porta 8096');
      return;
    }
    
    console.log(`📋 Encontrados ${pids.length} processo(s) na porta 8096:`);
    pids.forEach(pid => console.log(`   - PID: ${pid}`));
    console.log('');
    
    // Encerrar cada processo
    for (const pid of pids) {
      try {
        console.log(`🔄 Encerrando processo ${pid}...`);
        let success = false;
        if (isWindows) {
          success = await killProcessWindows(pid);
        } else {
          success = await killProcessLinux(pid);
        }
        
        if (success) {
          console.log(`✅ Processo ${pid} encerrado com sucesso`);
        } else {
          console.log(`⚠️  Processo ${pid} já não existe`);
        }
      } catch (error) {
        console.error(`❌ Erro ao encerrar processo ${pid}:`, error.message);
      }
    }
    
    // Verificar novamente após um pequeno delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const stillInUse = await checkPortStillInUse();
    if (stillInUse) {
      console.log('\n⚠️  Ainda há processos na porta 8096');
    } else {
      console.log('\n✅ Porta 8096 está livre!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar processos:', error.message);
    process.exit(1);
  }
}

// Executar
stopBackend().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

