const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// ⚡ OTIMIZAÇÃO: Sharp para conversão rápida SVG -> PNG
let sharp = null;
try {
  sharp = require('sharp');
  console.log('✅ Sharp carregado - conversão SVG->PNG será muito mais rápida');
} catch (error) {
  console.warn('⚠️ Sharp não disponível - usando screenshot do Puppeteer (mais lento)');
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

async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }
  
  if (browserInitPromise) {
    return browserInitPromise;
  }
  
  // Determinar caminho do executável Chromium
  let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (executablePath) {
    const fs = require('fs');
    // Verificar se o caminho existe, caso contrário tentar alternativas
    if (!fs.existsSync(executablePath)) {
      const alternatives = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'];
      for (const alt of alternatives) {
        if (fs.existsSync(alt)) {
          executablePath = alt;
          break;
        }
      }
    }
  }
  
  browserInitPromise = puppeteer.launch({
    headless: true,
    executablePath: executablePath || undefined, // Usar Chromium do sistema se disponível
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
    ],
    ignoreHTTPSErrors: true,
    defaultViewport: { width: 1200, height: 800 }, // ✅ Otimizado desde o início
    timeout: 60000
  });
  
  try {
    browserInstance = await browserInitPromise;
    browserInitPromise = null;
    
    // Testar se o browser está realmente funcionando
    const testPage = await browserInstance.newPage();
    await testPage.close();
    
    console.log('✅ Browser Puppeteer inicializado e testado');
    
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
      await page.evaluate((code) => {
        const container = document.querySelector('.mermaid');
        container.innerHTML = ''; // Limpar antes
        
        // Criar novo elemento para renderização
        const newDiv = document.createElement('div');
        newDiv.className = 'mermaid';
        newDiv.textContent = code;
        container.appendChild(newDiv);
        
        // Renderizar usando Mermaid que já está pronto
        return new Promise((resolve, reject) => {
          try {
            // Mermaid 11.x: usar mermaid.run() que é mais direto
            if (window.mermaid && window.mermaid.run) {
              window.mermaid.run({ nodes: [newDiv] }).then(() => {
                // Após renderizar, mover o SVG para o container principal
                const svg = newDiv.querySelector('svg');
                if (svg) {
                  container.innerHTML = '';
                  container.appendChild(svg);
                }
                resolve();
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
      }, normalizedCode);
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
        const svgData = await page.evaluate(() => {
          const svg = document.querySelector('.mermaid svg');
          if (!svg) return null;
          
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
            height: Math.ceil(height)
          };
        });
        
        if (!svgData || !svgData.svg) throw new Error('SVG não encontrado');
        
        // Tentar conversão rápida com Sharp primeiro
        let useScreenshot = false;
        
        if (sharp) {
          try {
            let cleanSvg = svgData.svg;
            
            // Remover scripts (não necessários para conversão)
            cleanSvg = cleanSvg.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
            
            // Garantir xmlns
            if (!cleanSvg.includes('xmlns=')) {
              cleanSvg = cleanSvg.replace(/<svg/i, `<svg xmlns="http://www.w3.org/2000/svg"`);
            }
            
            // Apenas garantir dimensões mínimas se não existirem
            const minSize = 100;
            const finalWidth = Math.max(minSize, svgData.width);
            const finalHeight = Math.max(minSize, svgData.height);
            
            // Adicionar width/height apenas se não existirem
            if (!/width\s*=/i.test(cleanSvg)) {
              cleanSvg = cleanSvg.replace(/<svg([^>]*)>/i, `<svg$1 width="${finalWidth}">`);
            }
            if (!/height\s*=/i.test(cleanSvg)) {
              cleanSvg = cleanSvg.replace(/<svg([^>]*)>/i, `<svg$1 height="${finalHeight}">`);
            }
            
            const svgBuffer = Buffer.from(cleanSvg, 'utf8');
            
            // Converter SVG -> PNG com Sharp
            outputData = await Promise.race([
              sharp(svgBuffer, { density: 300 })
                .png({ quality: 100, compressionLevel: 6 })
                .toBuffer(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Sharp timeout')), 5000)
              )
            ]);
            
            console.log(`⚡ PNG via Sharp (${finalWidth}x${finalHeight})`);
          } catch (sharpError) {
            console.warn(`⚠️ Sharp falhou: ${sharpError.message}`);
            useScreenshot = true;
          }
        } else {
          useScreenshot = true;
        }
        
        // ⚡ FALLBACK: Se Sharp falhar ou não estiver disponível, usar screenshot
        if (useScreenshot || !outputData) {
          console.log('📸 Usando screenshot do Puppeteer (fallback)');
          
          // Aguardar SVG estar totalmente renderizado e estável
          // Timeout maior para diagramas complexos como mindmap
          try {
            await page.waitForFunction(() => {
              const svg = document.querySelector('.mermaid svg');
              if (!svg) return false;
              const rect = svg.getBoundingClientRect();
              // Para mindmap, pode demorar mais para estabilizar
              return rect.width > 0 && rect.height > 0;
            }, {
              timeout: 8000,  // Aumentado para 8s para diagramas complexos
              polling: 100
            });
            
            // Delay maior para garantir estabilidade (especialmente mindmap)
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const svgElement = await page.$('.mermaid svg');
            if (!svgElement) throw new Error('SVG não encontrado para screenshot');
            
            // Tentativa 1: Screenshot direto do elemento com timeout maior
            try {
              outputData = await Promise.race([
                svgElement.screenshot({ 
                  type: 'png',
                  omitBackground: false,
                  fullPage: false,
                }),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Screenshot timeout')), 15000)  // 15s para mindmap
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

