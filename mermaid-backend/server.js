const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// ⚡ CONVERSÃO DE IMAGENS: ImageMagick (prioridade) > Sharp > Screenshot
let imagemagick = null;
let sharp = null;

try {
  imagemagick = require('imagemagick');
  console.log('✅ ImageMagick carregado - conversão SVG->PNG (robusto com SVG malformado)');
} catch (error) {
  console.warn('⚠️ ImageMagick não disponível:', error.message);
  console.warn('   Instale: sudo apt-get install imagemagick');
}

try {
  sharp = require('sharp');
  console.log('✅ Sharp carregado - conversão SVG->PNG será usada como fallback');
} catch (error) {
  console.warn('⚠️ Sharp não disponível - usando screenshot do Puppeteer como último recurso');
}

const app = express();
const PORT = 8096;

// ==================== CARREGAR MERMAID LOCALMENTE ====================
let mermaidScript = null;

function loadMermaidScript() {
  try {
    // Tentar carregar do node_modules do backend
    const mermaidPath = path.join(__dirname, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js');
    
    if (fs.existsSync(mermaidPath)) {
      mermaidScript = fs.readFileSync(mermaidPath, 'utf8');
      console.log('✅ Mermaid carregado localmente do node_modules');
      return;
    }
    
    // Fallback: tentar do projeto raiz
    const rootMermaidPath = path.join(__dirname, '..', 'node_modules', 'mermaid', 'dist', 'mermaid.min.js');
    if (fs.existsSync(rootMermaidPath)) {
      mermaidScript = fs.readFileSync(rootMermaidPath, 'utf8');
      console.log('✅ Mermaid carregado localmente do projeto raiz');
      return;
    }
    
    throw new Error('Mermaid não encontrado localmente');
  } catch (error) {
    console.error('❌ Erro ao carregar Mermaid localmente:', error.message);
    console.warn('⚠️  Usando CDN como fallback (muito mais lento!)');
    mermaidScript = null;
  }
}

// Carregar Mermaid na inicialização do módulo
loadMermaidScript();

// Middleware
app.use(cors()); // Permitir chamadas do front-end
app.use(express.json({ limit: '10mb' }));

// ==================== POOL DE PÁGINAS PRÉ-CARREGADAS ====================
const pagePool = [];
const MAX_POOL_SIZE = 5;
let poolReady = false;
let poolInitPromise = null;

// HTML base com Mermaid já carregado (reutilizável)
function getBaseHTML() {
  const mermaidTag = mermaidScript 
    ? `<script>${mermaidScript}</script>`
    : `<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>`;
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 20px; background: white; }
    .mermaid { display: flex; justify-content: center; }
    /* ⚡ OTIMIZAÇÃO: Desabilitar animações para renderização mais rápida */
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }
  </style>
  ${mermaidTag}
</head>
<body>
  <div class="mermaid"></div>
  <script>
    mermaid.initialize({ 
      startOnLoad: false, 
      theme: 'default', 
      securityLevel: 'loose',
      // ⚡ OTIMIZAÇÃO: Desabilitar animações do Mermaid
      themeVariables: {
        animationDuration: 0
      }
    });
  </script>
</body>
</html>`;
}

// ==================== BROWSER SINGLETON ====================
let browserInstance = null;
let browserInitPromise = null;

/**
 * Encontra o executável do Chromium/Chrome no sistema Linux
 */
function findSystemChromium() {
  const { execSync } = require('child_process');
  const fs = require('fs');
  
  // Lista de caminhos comuns para Chromium/Chrome no Linux
  const commonPaths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chrome',
    '/snap/bin/chromium',
    '/usr/local/bin/chromium',
    '/usr/local/bin/chromium-browser',
    // Para sistemas ARM (Jetson, Raspberry Pi)
    '/usr/bin/chromium-browser',
    '/opt/google/chrome/chrome'
  ];
  
  // Verificar caminhos comuns
  for (const path of commonPaths) {
    if (fs.existsSync(path)) {
      try {
        // Verificar se é executável
        fs.accessSync(path, fs.constants.X_OK);
        return path;
      } catch (e) {
        // Não é executável, continuar procurando
      }
    }
  }
  
  // Tentar usar 'which' para encontrar no PATH
  const whichCommands = ['chromium', 'chromium-browser', 'google-chrome'];
  for (const cmd of whichCommands) {
    try {
      const chromiumPath = execSync(`which ${cmd} 2>/dev/null`, { encoding: 'utf8' }).trim();
      if (chromiumPath && fs.existsSync(chromiumPath)) {
        return chromiumPath;
      }
    } catch (e) {
      // Comando não encontrado, continuar
    }
  }
  
  return null;
}

async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }
  
  if (browserInitPromise) {
    return browserInitPromise;
  }
  
  // Determinar caminho do executável Chromium
  let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  
  // No Linux, tentar encontrar Chromium do sistema primeiro
  if (process.platform !== 'win32' && !executablePath) {
    const systemChromium = findSystemChromium();
    if (systemChromium) {
      executablePath = systemChromium;
      console.log(`🔍 Usando Chromium do sistema: ${executablePath}`);
    } else {
      console.log('⚠️  Chromium do sistema não encontrado, tentando usar o do Puppeteer...');
    }
  }
  
  // Se foi fornecido via env mas não existe, tentar alternativas
  if (executablePath && !fs.existsSync(executablePath)) {
    if (process.platform !== 'win32') {
      const systemChromium = findSystemChromium();
      if (systemChromium) {
        executablePath = systemChromium;
        console.log(`🔍 Caminho fornecido não existe, usando: ${executablePath}`);
      } else {
        executablePath = undefined; // Tentar usar o do Puppeteer
      }
    } else {
      // Windows: manter caminho fornecido ou undefined
      executablePath = undefined;
    }
  }
  
  // Função auxiliar para tentar iniciar o browser
  const tryLaunch = async (execPath) => {
    return puppeteer.launch({
      headless: true,
      executablePath: execPath || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-extensions',
        '--disable-default-apps',
        '--mute-audio',
        '--no-first-run',
        '--disable-sync',
        '--disable-background-networking',
        // ⚡ OTIMIZAÇÕES ADICIONAIS para acelerar renderização e screenshots
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-accelerated-2d-canvas',
        '--disable-accelerated-video-decode',
        '--run-all-compositor-stages-before-draw',
        '--disable-threaded-animation',
        '--disable-threaded-scrolling'
        // Nota: --single-process pode ajudar em sistemas ARM, mas pode causar problemas
        // Se necessário, adicione: '--single-process' como último item do array
      ],
      ignoreHTTPSErrors: true,
      defaultViewport: { width: 1200, height: 800 },
      timeout: 60000
    });
  };
  
  browserInitPromise = (async () => {
    let lastError = null;
    
    // Tentativa 1: Usar caminho fornecido/encontrado
    if (executablePath) {
      try {
        const browser = await tryLaunch(executablePath);
        const testPage = await browser.newPage();
        await testPage.close();
        console.log(`✅ Browser inicializado com sucesso: ${executablePath}`);
        return browser;
      } catch (error) {
        console.warn(`⚠️  Falha ao usar ${executablePath}: ${error.message}`);
        lastError = error;
      }
    }
    
    // Tentativa 2: Tentar usar Chromium do sistema (se ainda não tentou)
    if (!executablePath || process.platform !== 'win32') {
      const systemChromium = findSystemChromium();
      if (systemChromium && systemChromium !== executablePath) {
        try {
          const browser = await tryLaunch(systemChromium);
          const testPage = await browser.newPage();
          await testPage.close();
          console.log(`✅ Browser inicializado com Chromium do sistema: ${systemChromium}`);
          return browser;
        } catch (error) {
          console.warn(`⚠️  Falha ao usar Chromium do sistema: ${error.message}`);
          lastError = error;
        }
      }
    }
    
    // Tentativa 3: Usar o Chrome baixado pelo Puppeteer (pode falhar em ARM)
    try {
      console.log('🔄 Tentando usar Chrome do Puppeteer...');
      const browser = await tryLaunch(undefined);
      const testPage = await browser.newPage();
      await testPage.close();
      console.log('✅ Browser inicializado com Chrome do Puppeteer');
      return browser;
    } catch (error) {
      console.error(`❌ Falha ao usar Chrome do Puppeteer: ${error.message}`);
      lastError = error;
      
      // Se o erro indica problema com o executável, sugerir instalação
      if (error.message.includes('Syntax error') || error.message.includes('chrome-linux64')) {
        console.error('\n💡 SOLUÇÃO: O Chrome do Puppeteer está corrompido ou incompatível.');
        console.error('   Instale o Chromium do sistema:');
        console.error('   Ubuntu/Debian: sudo apt-get install chromium-browser');
        console.error('   Ou defina: export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser');
      }
      
      throw new Error(`Não foi possível inicializar o browser: ${lastError.message}`);
    }
  })();
  
  try {
    browserInstance = await browserInitPromise;
    browserInitPromise = null;
    return browserInstance;
  } catch (error) {
    browserInitPromise = null;
    console.error('❌ Erro ao inicializar browser:', error.message);
    throw error;
  }
}

// ==================== INICIALIZAR POOL DE PÁGINAS ====================
async function initPagePool() {
  if (poolReady) return;
  if (poolInitPromise) return poolInitPromise;
  
  poolInitPromise = (async () => {
    try {
      const browser = await getBrowser();
      console.log(`🔄 Inicializando pool de ${MAX_POOL_SIZE} páginas pré-carregadas...`);
      
      const baseHTML = getBaseHTML();
      
      // ⚡ OTIMIZAÇÃO: Criar páginas em paralelo (muito mais rápido!)
      const pagePromises = [];
      
      for (let i = 0; i < MAX_POOL_SIZE; i++) {
        pagePromises.push((async () => {
          const page = await browser.newPage();
          
          // Viewport já otimizado no default, mas garantimos aqui também
          await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });
          
          // Carregar HTML base com Mermaid
          await page.setContent(baseHTML, { 
            waitUntil: 'domcontentloaded',
            timeout: 15000
          });
          
          // Aguardar Mermaid estar realmente pronto (garantir que está carregado e inicializado)
          await page.evaluate(() => {
            return new Promise((resolve) => {
              let attempts = 0;
              const maxAttempts = 100; // 5 segundos máximo
              
              const checkMermaid = () => {
                attempts++;
                if (window.mermaid && 
                    typeof window.mermaid.run === 'function' && 
                    typeof window.mermaid.render === 'function') {
                  resolve();
                } else if (attempts >= maxAttempts) {
                  // Timeout: aceitar mesmo que não esteja perfeito (pode funcionar)
                  resolve();
                } else {
                  setTimeout(checkMermaid, 50);
                }
              };
              checkMermaid();
            });
          });
          
          return page;
        })());
      }
      
      // Aguardar todas as páginas estarem prontas em paralelo
      const pages = await Promise.all(pagePromises);
      
      // Adicionar todas ao pool
      pages.forEach(page => pagePool.push(page));
      
      poolReady = true;
      console.log(`✅ Pool de ${MAX_POOL_SIZE} páginas pronto! (Mermaid pré-carregado)`);
    } catch (error) {
      console.error('❌ Erro ao inicializar pool:', error.message);
      throw error;
    }
  })();
  
  return poolInitPromise;
}

// Obter página do pool
function getPageFromPool() {
  if (pagePool.length > 0) {
    return pagePool.shift();
  }
  return null;
}

// Retornar página ao pool
function returnPageToPool(page) {
  if (!page || page.isClosed()) return;
  
  if (pagePool.length < MAX_POOL_SIZE) {
    // Limpar conteúdo mas manter Mermaid carregado
    page.evaluate(() => {
      const div = document.querySelector('.mermaid');
      if (div) div.innerHTML = '';
    }).catch(() => {
      // Se página quebrou, não adicionar ao pool
    });
    
    pagePool.push(page);
  } else {
    // Pool cheio, fechar página
    page.close().catch(() => {});
  }
}

// Template HTML para renderização (fallback quando pool não disponível)
function getHTMLTemplate(code) {
  const mermaidTag = mermaidScript 
    ? `<script>${mermaidScript}</script>`
    : `<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>`;
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 20px; background: white; }
    .mermaid { display: flex; justify-content: center; }
    /* ⚡ OTIMIZAÇÃO: Desabilitar animações para renderização mais rápida */
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }
  </style>
  ${mermaidTag}
</head>
<body>
  <div class="mermaid">${code}</div>
  <script>
    mermaid.initialize({ 
      startOnLoad: true, 
      theme: 'default', 
      securityLevel: 'loose',
      // ⚡ OTIMIZAÇÃO: Desabilitar animações do Mermaid
      themeVariables: {
        animationDuration: 0
      }
    });
  </script>
</body>
</html>`;
}

function getContentType(format) {
  const map = { 
    'svg': 'image/svg+xml', 
    'png': 'image/png', 
    'pdf': 'application/pdf' 
  };
  return map[format] || 'application/octet-stream';
}

/**
 * Limpa e repara SVG malformado (especialmente útil para mindmaps)
 * Repara tags não fechadas e garante estrutura XML válida
 */
function cleanAndRepairSVG(svgString) {
  if (!svgString || typeof svgString !== 'string') {
    return svgString;
  }
  
  let cleaned = svgString.trim();
  
  // Remover scripts, comentários e estilos
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Extrair o tag de abertura do SVG
  const svgOpenMatch = cleaned.match(/<svg([^>]*)>/i);
  if (!svgOpenMatch) {
    return cleaned; // Não é um SVG válido
  }
  
  let svgAttrs = svgOpenMatch[1];
  
  // Remover atributos problemáticos (event handlers)
  svgAttrs = svgAttrs.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Garantir xmlns
  if (!svgAttrs.includes('xmlns=')) {
    svgAttrs += ' xmlns="http://www.w3.org/2000/svg"';
  }
  
  // Extrair conteúdo entre <svg> e </svg>
  const svgContentMatch = cleaned.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  let svgContent = '';
  
  if (svgContentMatch && svgContentMatch[1]) {
    svgContent = svgContentMatch[1];
  } else {
    // Se não encontrou </svg>, tentar pegar tudo após <svg>
    const afterSvgMatch = cleaned.match(/<svg[^>]*>([\s\S]*)$/i);
    if (afterSvgMatch) {
      svgContent = afterSvgMatch[1];
    }
  }
  
  // Reparar tags não fechadas usando uma pilha
  const tagStack = [];
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
  let match;
  const allTags = [];
  
  while ((match = tagRegex.exec(svgContent)) !== null) {
    const isClosing = match[0].startsWith('</');
    const tagName = match[1].toLowerCase();
    allTags.push({
      tag: match[0],
      name: tagName,
      isClosing: isClosing,
      index: match.index
    });
  }
  
  // Processar tags em ordem e construir conteúdo reparado
  let repairedContent = svgContent;
  const openTags = [];
  
  // Para tags auto-fechadas ou sem conteúdo, não precisamos fechar
  const selfClosingTags = ['rect', 'circle', 'ellipse', 'line', 'path', 'polyline', 'polygon', 'text', 'use', 'image'];
  
  // Contar tags <g> abertas e fechadas
  const openGTags = (svgContent.match(/<g[^>]*>/gi) || []).length;
  const closeGTags = (svgContent.match(/<\/g>/gi) || []).length;
  
  // Contar todas as tags que precisam ser fechadas
  const allOpenTags = (svgContent.match(/<([a-zA-Z][a-zA-Z0-9]*)[^>]*>/gi) || [])
    .filter(tag => !tag.includes('/>') && !selfClosingTags.includes(tag.match(/<(\w+)/)?.[1]?.toLowerCase()));
  const allCloseTags = (svgContent.match(/<\/([a-zA-Z][a-zA-Z0-9]*)>/gi) || []).length;
  
  // Se há mais tags abertas que fechadas, fechar tags <g> primeiro
  if (openGTags > closeGTags) {
    const missingClose = openGTags - closeGTags;
    // Inserir fechamentos antes do </svg> ou no final
    if (repairedContent.includes('</svg>')) {
      repairedContent = repairedContent.replace(/<\/svg>/i, '</g>'.repeat(missingClose) + '</svg>');
    } else {
      repairedContent += '</g>'.repeat(missingClose) + '</svg>';
    }
  }
  
  // Reconstruir SVG completo
  if (!repairedContent.trim().endsWith('</svg>')) {
    if (!repairedContent.includes('</svg>')) {
      repairedContent += '</svg>';
    }
  }
  
  // Garantir que começa com <svg
  if (!repairedContent.trim().startsWith('<svg')) {
    repairedContent = `<svg${svgAttrs}>${repairedContent}`;
  } else {
    // Substituir o tag de abertura para garantir atributos corretos
    repairedContent = repairedContent.replace(/<svg[^>]*>/i, `<svg${svgAttrs}>`);
  }
  
  // Garantir que termina com </svg>
  if (!repairedContent.trim().endsWith('</svg>')) {
    repairedContent += '</svg>';
  }
  
  // Remover múltiplos </svg> no final
  repairedContent = repairedContent.replace(/<\/svg>\s*<\/svg>/gi, '</svg>');
  
  return repairedContent.trim();
}

/**
 * Detecta se o código Mermaid é um mindmap (que requer mais tempo para renderizar)
 */
function isMindmap(code) {
  if (!code) return false;
  const normalized = code.toLowerCase().trim();
  return normalized.startsWith('mindmap') || normalized.includes('mindmap');
}

// ==================== ENDPOINT PRINCIPAL ====================
app.post('/api/generate', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { code, format = 'svg' } = req.body;

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({ error: 'Código Mermaid obrigatório' });
    }

    const normalizedCode = code.endsWith('\n') ? code : code + '\n';
    const validFormats = ['svg', 'png', 'pdf'];
    
    if (!validFormats.includes(format)) {
      return res.status(400).json({ error: `Formato inválido: ${validFormats.join(', ')}` });
    }

    // Garantir que pool está inicializado
    await initPagePool();
    
    const browser = await getBrowser();
    
    // Tentar pegar página do pool (rápido!)
    let page = getPageFromPool();
    let usePool = false;
    
    if (!page) {
      // Pool vazio, criar nova página (fallback)
      page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });
      
      // ⚡ OTIMIZAÇÃO: Bloquear recursos desnecessários para acelerar
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        // Bloquear imagens, fontes e mídia que não são necessários
        if (['image', 'font', 'media'].includes(resourceType) && 
            !req.url().includes('mermaid') && !req.url().includes('jsdelivr')) {
          req.abort();
        } else {
          req.continue();
        }
      });
      
      const html = getHTMLTemplate(normalizedCode);
      await page.setContent(html, { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
    } else {
      // Página do pool - Mermaid já está pronto! ⚡
      usePool = true;
      
      // Apenas atualizar o código Mermaid (muito mais rápido!)
      // Para mindmaps, usar render() diretamente para garantir SVG bem formado
      const isMindmapDiagram = isMindmap(normalizedCode);
      
      await page.evaluate((code, useRender) => {
        const container = document.querySelector('.mermaid');
        container.innerHTML = ''; // Limpar antes
        
        // Renderizar usando Mermaid que já está pronto
        return new Promise((resolve, reject) => {
          try {
            // Para mindmaps, usar render() diretamente (mais confiável)
            if (useRender && window.mermaid && window.mermaid.render) {
              const id = 'mermaid-' + Date.now();
              window.mermaid.render(id, code).then((result) => {
                // Verificar se o SVG está bem formado
                if (result && result.svg) {
                  // Criar um elemento temporário para validar o SVG
                  const tempDiv = document.createElement('div');
                  tempDiv.innerHTML = result.svg;
                  const svg = tempDiv.querySelector('svg');
                  
                  if (svg) {
                    container.innerHTML = result.svg;
                    resolve();
                  } else {
                    reject(new Error('SVG gerado não contém elemento <svg> válido'));
                  }
                } else {
                  reject(new Error('Resultado do render() não contém SVG'));
                }
              }).catch((err) => {
                reject(err);
              });
            } else if (window.mermaid && window.mermaid.run) {
              // Para outros diagramas, usar run() que é mais rápido
              const newDiv = document.createElement('div');
              newDiv.className = 'mermaid';
              newDiv.textContent = code;
              container.appendChild(newDiv);
              
              window.mermaid.run({ nodes: [newDiv] }).then(() => {
                // Aguardar um pouco para garantir que renderização está completa
                setTimeout(() => {
                  const svg = newDiv.querySelector('svg');
                  if (svg) {
                    container.innerHTML = '';
                    container.appendChild(svg);
                    resolve();
                  } else {
                    reject(new Error('SVG não foi gerado após run()'));
                  }
                }, 100);
              }).catch((err) => {
                reject(err);
              });
            } else if (window.mermaid && window.mermaid.render) {
              // Fallback: usar render() se run() não estiver disponível
              const id = 'mermaid-' + Date.now();
              window.mermaid.render(id, code).then((result) => {
                container.innerHTML = result.svg;
                resolve();
              }).catch((err) => {
                reject(err);
              });
            } else {
              reject(new Error('Mermaid não está disponível'));
            }
          } catch (err) {
            reject(err);
          }
        });
      }, normalizedCode, isMindmapDiagram);
    }
    
    try {
      // Aguardar renderização (mais rápido com pool pois Mermaid já está pronto)
      // ⚡ OTIMIZAÇÃO: Reduzir polling de 100ms para 50ms (verifica 2x mais rápido)
      await page.waitForFunction(() => {
        const svg = document.querySelector('.mermaid svg');
        return svg !== null && svg.querySelector('g') !== null;
      }, { 
        timeout: usePool ? 6000 : 8000,  // Reduzido pois polling é mais rápido
        polling: 50  // ⚡ Verifica 2x mais rápido (50ms vs 100ms)
      });
      
      let outputData;
      
      if (format === 'svg') {
        // Extrair SVG
        outputData = await page.evaluate(() => {
          const svg = document.querySelector('.mermaid svg');
          return svg ? svg.outerHTML : null;
        });
        
        if (!outputData) throw new Error('SVG não renderizado');
        outputData = Buffer.from(outputData, 'utf8');
        
      } else if (format === 'png') {
        // ⚡ OTIMIZAÇÃO CRÍTICA: Converter SVG diretamente para PNG usando Sharp
        // Isso é MUITO mais rápido e confiável que screenshots do Puppeteer
        
        // Primeiro, obter o SVG (já está renderizado)
        const isMindmapDiagram = isMindmap(normalizedCode);
        const svgData = await page.evaluate((isMindmap) => {
          const svg = document.querySelector('.mermaid svg');
          if (!svg) return null;
          
          // Para mindmaps, validar estrutura do SVG antes de extrair
          let isValid = true;
          if (isMindmap) {
            // Verificar se há tags não fechadas
            const svgHTML = svg.outerHTML;
            const openGTags = (svgHTML.match(/<g[^>]*>/gi) || []).length;
            const closeGTags = (svgHTML.match(/<\/g>/gi) || []).length;
            
            if (openGTags !== closeGTags) {
              console.warn(`⚠️ SVG do mindmap tem tags desbalanceadas: ${openGTags} abertas, ${closeGTags} fechadas`);
              isValid = false;
            }
            
            // Verificar se o SVG tem estrutura válida
            if (isValid) {
              try {
                const parser = new DOMParser();
                const parsed = parser.parseFromString(svgHTML, 'image/svg+xml');
                const parseError = parsed.querySelector('parsererror');
                if (parseError) {
                  console.warn('⚠️ SVG do mindmap tem erro de parsing:', parseError.textContent);
                  isValid = false;
                }
              } catch (e) {
                console.warn('⚠️ Não foi possível validar SVG do mindmap:', e.message);
                // Continuar mesmo assim, mas pode falhar no Sharp
                isValid = false;
              }
            }
          }
          
          // Obter dimensões do SVG renderizado
          const rect = svg.getBoundingClientRect();
          const viewBox = svg.getAttribute('viewBox');
          
          // Calcular dimensões
          let width = rect.width || parseInt(svg.getAttribute('width')) || 1200;
          let height = rect.height || parseInt(svg.getAttribute('height')) || 800;
          
          // Se tem viewBox mas não tem width/height explícitos, usar viewBox
          if (viewBox && (!svg.getAttribute('width') || !svg.getAttribute('height'))) {
            const [x, y, vbWidth, vbHeight] = viewBox.split(/\s+|,/).map(Number);
            if (vbWidth && vbHeight) {
              width = vbWidth;
              height = vbHeight;
            }
          }
          
          // Obter SVG como string
          let svgHTML = svg.outerHTML;
          
          // Garantir que SVG tem width e height explícitos (necessário para Sharp)
          if (!svgHTML.match(/width\s*=\s*["']?\d+/i)) {
            svgHTML = svgHTML.replace(/<svg/i, `<svg width="${Math.ceil(width)}"`);
          }
          if (!svgHTML.match(/height\s*=\s*["']?\d+/i)) {
            svgHTML = svgHTML.replace(/<svg/i, `<svg height="${Math.ceil(height)}"`);
          }
          
          return {
            svg: svgHTML,
            width: Math.ceil(width),
            height: Math.ceil(height),
            isValid: isValid
          };
        }, isMindmapDiagram);
        
        // Se o SVG do mindmap está inválido, pular Sharp e usar screenshot
        let useScreenshot = false;
        if (!svgData || !svgData.svg) {
          throw new Error('SVG não encontrado na página');
        }
        
        // Estratégia de conversão: ImageMagick > Sharp > Screenshot
        // ImageMagick é mais tolerante com SVG malformado
        if (!useScreenshot && svgData && svgData.svg) {
          let cleanSvg = svgData.svg;
          
          // Preparar SVG: garantir dimensões
          const minSize = 100;
          const finalWidth = Math.max(minSize, svgData.width);
          const finalHeight = Math.max(minSize, svgData.height);
          
          // Adicionar width/height se não existirem
          if (!/width\s*=/i.test(cleanSvg)) {
            cleanSvg = cleanSvg.replace(/<svg([^>]*)>/i, `<svg$1 width="${finalWidth}">`);
          }
          if (!/height\s*=/i.test(cleanSvg)) {
            cleanSvg = cleanSvg.replace(/<svg([^>]*)>/i, `<svg$1 height="${finalHeight}">`);
          }
          
          // Tentativa 1: ImageMagick (mais robusto com SVG malformado)
          if (imagemagick) {
            try {
              const convert = promisify(imagemagick.convert);
              
              // ImageMagick funciona com arquivo temporário ou buffer
              const tempSvgPath = path.join(__dirname, 'temp-' + Date.now() + '.svg');
              const tempPngPath = path.join(__dirname, 'temp-' + Date.now() + '.png');
              
              try {
                // Escrever SVG temporário
                fs.writeFileSync(tempSvgPath, cleanSvg, 'utf8');
                
                // Converter com ImageMagick
                await Promise.race([
                  convert([tempSvgPath, '-background', 'white', '-density', '300', tempPngPath]),
                  new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('ImageMagick timeout')), 15000)
                  )
                ]);
                
                // Ler PNG resultante
                outputData = fs.readFileSync(tempPngPath);
                
                console.log(`⚡ PNG via ImageMagick (${finalWidth}x${finalHeight})`);
                
                // Limpar arquivos temporários
                try { fs.unlinkSync(tempSvgPath); } catch (e) {}
                try { fs.unlinkSync(tempPngPath); } catch (e) {}
              } catch (cleanupError) {
                // Limpar arquivos temporários mesmo em caso de erro
                try { fs.unlinkSync(tempSvgPath); } catch (e) {}
                try { fs.unlinkSync(tempPngPath); } catch (e) {}
                throw cleanupError;
              }
            } catch (imError) {
              console.warn(`⚠️ ImageMagick falhou: ${imError.message}`);
              // Tentar Sharp como fallback
            }
          }
          
          // Tentativa 2: Sharp (se ImageMagick não disponível ou falhou)
          if (!outputData && sharp) {
            try {
              let sharpSvg = cleanSvg;
              
              // Para Sharp, fazer limpeza adicional se necessário
              if (isMindmapDiagram) {
                sharpSvg = cleanAndRepairSVG(sharpSvg);
              } else {
                sharpSvg = sharpSvg.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
                if (!sharpSvg.includes('xmlns=')) {
                  sharpSvg = sharpSvg.replace(/<svg/i, `<svg xmlns="http://www.w3.org/2000/svg"`);
                }
              }
              
              const svgBuffer = Buffer.from(sharpSvg, 'utf8');
              const sharpTimeout = isMindmapDiagram ? 10000 : 5000;
              
              outputData = await Promise.race([
                sharp(svgBuffer, { density: 300 })
                  .png({ quality: 100, compressionLevel: 6 })
                  .toBuffer(),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Sharp timeout')), sharpTimeout)
                )
              ]);
              
              console.log(`⚡ PNG via Sharp (${finalWidth}x${finalHeight})`);
            } catch (sharpError) {
              console.warn(`⚠️ Sharp falhou: ${sharpError.message}`);
              useScreenshot = true;
            }
          } else if (!outputData && !sharp && !imagemagick) {
            // Nenhuma biblioteca disponível
            useScreenshot = true;
          }
        } else {
          useScreenshot = true;
        }
        
        // ⚡ FALLBACK FINAL: Se ImageMagick e Sharp falharem ou não estiverem disponíveis, usar screenshot
        if (useScreenshot || !outputData) {
          console.log('📸 Usando screenshot do Puppeteer (fallback)');
          
          // Aguardar SVG estar totalmente renderizado e estável
          // Timeout maior para diagramas complexos como mindmap
          const isMindmapDiagram = isMindmap(normalizedCode);
          const screenshotTimeout = isMindmapDiagram ? 15000 : 8000;
          
          try {
            await page.waitForFunction(() => {
              const svg = document.querySelector('.mermaid svg');
              if (!svg) return false;
              const rect = svg.getBoundingClientRect();
              // Verificar se está renderizado
              const hasVisibleContent = svg.querySelector('g, path, circle, rect, text') !== null;
              return rect.width > 0 && rect.height > 0 && hasVisibleContent;
            }, {
              timeout: screenshotTimeout,
              polling: isMindmapDiagram ? 150 : 100
            });
            
            // Delay maior para garantir estabilidade (especialmente mindmap)
            await new Promise(resolve => setTimeout(resolve, isMindmapDiagram ? 800 : 500));
            
            const svgElement = await page.$('.mermaid svg');
            if (!svgElement) throw new Error('SVG não encontrado para screenshot');
            
            // Tentativa 1: Screenshot direto do elemento com timeout maior
            try {
              // Para mindmaps, garantir que o elemento está visível e estável
              if (isMindmapDiagram) {
                // Aguardar um pouco mais para garantir que animações terminaram
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Verificar se o elemento ainda está presente e visível
                const isVisible = await page.evaluate(() => {
                  const svg = document.querySelector('.mermaid svg');
                  if (!svg) return false;
                  const rect = svg.getBoundingClientRect();
                  const style = window.getComputedStyle(svg);
                  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
                });
                
                if (!isVisible) {
                  throw new Error('SVG não está visível para screenshot');
                }
              }
              
              const screenshotTimeoutMs = isMindmapDiagram ? 30000 : 15000;
              outputData = await Promise.race([
                svgElement.screenshot({ 
                  type: 'png',
                  omitBackground: false,
                  fullPage: false,
                }),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Screenshot timeout')), screenshotTimeoutMs)
                )
              ]);
            } catch (screenshotError1) {
              console.warn('⚠️ Screenshot direto falhou, tentando coordenadas');
              
              // Tentativa 2: Screenshot usando coordenadas
              try {
                const svgInfo = await page.evaluate(() => {
                  const svg = document.querySelector('.mermaid svg');
                  if (!svg) return null;
                  
                  // Scroll para garantir visibilidade
                  svg.scrollIntoView({ behavior: 'instant', block: 'center' });
                  
                  // Aguardar um frame para scroll completar
                  return new Promise((resolve) => {
                    requestAnimationFrame(() => {
                      const rect = svg.getBoundingClientRect();
                      const style = window.getComputedStyle(svg);
                      
                      resolve({
                        x: Math.max(0, Math.floor(rect.x) - 20),  // Margem maior
                        y: Math.max(0, Math.floor(rect.y) - 20),
                        width: Math.ceil(rect.width) + 40 || 1200,
                        height: Math.ceil(rect.height) + 40 || 800,
                        visible: rect.width > 0 && rect.height > 0 && style.display !== 'none'
                      });
                    });
                  });
                });
                
                if (svgInfo && svgInfo.visible && svgInfo.width > 0 && svgInfo.height > 0) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                  
                  outputData = await Promise.race([
                    page.screenshot({
                      type: 'png',
                      clip: {
                        x: svgInfo.x,
                        y: svgInfo.y,
                        width: Math.min(svgInfo.width, 5000),  // Aumentado para mindmaps grandes
                        height: Math.min(svgInfo.height, 5000)
                      },
                      omitBackground: false
                    }),
                    new Promise((_, reject) => 
                      setTimeout(() => reject(new Error('Screenshot coordenadas timeout')), 15000)
                    )
                  ]);
                } else {
                  throw new Error('Informações de coordenadas inválidas');
                }
              } catch (screenshotError2) {
                // Tentativa 3: Screenshot da página inteira (último recurso)
                console.warn('⚠️ Screenshot coordenadas falhou, tentando página completa');
                outputData = await Promise.race([
                  page.screenshot({
                    type: 'png',
                    fullPage: true,
                    omitBackground: false
                  }),
                  new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Screenshot página completa timeout')), 15000)
                  )
                ]);
              }
            }
          } catch (waitError) {
            throw new Error(`SVG não renderizado corretamente: ${waitError.message}`);
          }
        }
        
      } else if (format === 'pdf') {
        // PDF
        outputData = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
        });
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ ${format.toUpperCase()}: ${duration}ms`);
      
      res.setHeader('Content-Type', getContentType(format));
      res.setHeader('X-Response-Time', `${duration}ms`);
      res.send(outputData);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Erro (${duration}ms):`, error.message);
      
      if (!res.headersSent) {
        res.status(500).json({ 
          error: error.message,
          duration: `${duration}ms`
        });
      }
    } finally {
      // Retornar página ao pool (se veio do pool) ou fechar
      if (usePool) {
        returnPageToPool(page);
      } else {
        await page.close();
      }
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Erro fatal (${duration}ms):`, error.message);
    
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    browser: browserInstance ? 'connected' : 'disconnected',
    pool: {
      ready: poolReady,
      size: pagePool.length,
      maxSize: MAX_POOL_SIZE
    },
    uptime: process.uptime()
  });
});

// ==================== GRACEFUL SHUTDOWN ====================
async function shutdown() {
  console.log('🛑 Encerrando servidor backend...');
  
  // Fechar todas as páginas do pool
  for (const page of pagePool) {
    try {
      if (!page.isClosed()) {
        await page.close();
      }
    } catch (e) {
      // Ignorar erros ao fechar
    }
  }
  pagePool.length = 0;
  
  if (browserInstance) {
    try {
      await browserInstance.close();
      browserInstance = null;
    } catch (e) {
      console.error('Erro ao fechar browser:', e);
    }
  }
  
  console.log('✅ Servidor backend encerrado');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, async () => {
  console.log(`🚀 Backend Server rodando na porta ${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/api/generate`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
  
  if (mermaidScript) {
    const mermaidSizeKB = (mermaidScript.length / 1024).toFixed(2);
    console.log(`✅ Mermaid local carregado (${mermaidSizeKB} KB)`);
  } else {
    console.warn(`⚠️  Mermaid será carregado do CDN (muito mais lento!)`);
  }
  
  // ⚡ PRÉ-INICIALIZAÇÃO BLOQUEANTE: Aguardar pool estar pronto antes de aceitar requisições
  // Isso elimina o delay da primeira requisição!
  console.log(`🔄 Inicializando browser e pool de páginas (aguarde...)`);
  const initStartTime = Date.now();
  
  try {
    await initPagePool();
    const initDuration = Date.now() - initStartTime;
    console.log(`✅ Pool inicializado em ${initDuration}ms - primeira requisição será instantânea!`);
  } catch (err) {
    console.error('❌ Erro ao inicializar pool:', err.message);
    console.log(`⚠️  Servidor funcionará, mas sem pool (primeira requisição será mais lenta)`);
  }
  
  console.log(`✅ Servidor backend pronto e otimizado!`);
});

