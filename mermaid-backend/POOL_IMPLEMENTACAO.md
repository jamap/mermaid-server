# 🏊 Implementação do Pool de Páginas

## Estrutura do Pool

```javascript
// Pool de páginas
const pagePool = [];
const MAX_POOL_SIZE = 5;
let poolReady = false;

// HTML base que será carregado em cada página
const BASE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 20px; background: white; }
    .mermaid { display: flex; justify-content: center; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</head>
<body>
  <div class="mermaid"></div>
  <script>
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
  </script>
</body>
</html>`;
```

## Passo a Passo da Implementação

### 1. Inicializar Pool (ao iniciar servidor)

```javascript
async function initPagePool() {
  if (poolReady) return;
  
  const browser = await getBrowser();
  console.log('🔄 Inicializando pool de páginas...');
  
  for (let i = 0; i < MAX_POOL_SIZE; i++) {
    // Cria página
    const page = await browser.newPage();
    
    // Configura viewport (uma vez só)
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });
    
    // Configura request interception (uma vez só)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'font', 'media'].includes(resourceType) && 
          !req.url().includes('jsdelivr')) {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    // Carrega HTML base (com Mermaid já incluído)
    await page.setContent(BASE_HTML, { waitUntil: 'domcontentloaded' });
    
    // Aguarda Mermaid estar pronto
    await page.evaluate(() => {
      return new Promise((resolve) => {
        if (window.mermaid) {
          resolve();
        } else {
          window.addEventListener('load', resolve);
        }
      });
    });
    
    // Adiciona ao pool
    pagePool.push(page);
  }
  
  poolReady = true;
  console.log(`✅ Pool de ${MAX_POOL_SIZE} páginas pronto!`);
}
```

### 2. Obter Página do Pool

```javascript
function getPageFromPool() {
  if (pagePool.length > 0) {
    const page = pagePool.shift(); // Remove do pool
    return page;
  }
  return null; // Pool vazio, vai criar nova
}

function returnPageToPool(page) {
  if (page && !page.isClosed() && pagePool.length < MAX_POOL_SIZE) {
    // Limpa listeners para reutilização
    page.removeAllListeners('request');
    page.setRequestInterception(false);
    
    // Limpa o conteúdo do diagrama (mas mantém Mermaid carregado)
    page.evaluate(() => {
      const div = document.querySelector('.mermaid');
      if (div) div.innerHTML = '';
    });
    
    // Retorna ao pool
    pagePool.push(page);
  } else if (page && !page.isClosed()) {
    // Pool cheio, fecha a página
    page.close();
  }
}
```

### 3. Usar Pool no Endpoint

```javascript
app.post('/api/generate', async (req, res) => {
  // ... validações e cache ...
  
  const browser = await getBrowser();
  
  // Tenta pegar página do pool
  let page = getPageFromPool();
  
  // Se pool vazio, cria nova (fallback)
  if (!page) {
    page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'font', 'media'].includes(req.resourceType()) && 
          !req.url().includes('jsdelivr')) {
        req.abort();
      } else {
        req.continue();
      }
    });
    await page.setContent(BASE_HTML, { waitUntil: 'domcontentloaded' });
  }
  
  try {
    // Atualiza apenas o código Mermaid (rápido!)
    await page.evaluate((code) => {
      const div = document.querySelector('.mermaid');
      div.textContent = code;
      
      // Renderiza usando Mermaid que já está pronto
      const id = 'mermaid-' + Date.now();
      mermaid.render(id, code, (svgCode) => {
        div.innerHTML = svgCode;
      });
    }, normalizedCode);
    
    // Aguarda renderização
    await page.waitForFunction(() => {
      const svg = document.querySelector('.mermaid svg');
      return svg !== null && svg.querySelector('g') !== null;
    }, { timeout: 3000 });
    
    // Extrai resultado...
    // ...
    
  } finally {
    // Retorna página ao pool (não fecha!)
    returnPageToPool(page);
  }
});
```

## Fluxo Visual

```
INÍCIO DO SERVIDOR:
┌─────────────────────────────────────────┐
│  Browser Puppeteer                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  │ Página 1 │  │ Página 2 │  │ Página 3 │
│  │          │  │          │  │          │
│  │ Mermaid  │  │ Mermaid  │  │ Mermaid  │
│  │ ✅       │  │ ✅       │  │ ✅       │
│  └──────────┘  └──────────┘  └──────────┘
│        ↑              ↑              ↑
│        └──────────────┴──────────────┘
│              POOL (pronto para uso)
└─────────────────────────────────────────┘

REQUISIÇÃO CHEGA:
1. Pega Página 1 do pool ──────────────┐
                                        │
2. Atualiza código Mermaid              │
   (Mermaid já está pronto!)            │
                                        │
3. Renderiza                            │
                                        │
4. Retorna página ao pool ←─────────────┘
   (Mermaid continua carregado!)

PRÓXIMA REQUISIÇÃO:
1. Pega Página 2 do pool (Mermaid já pronto!)
2. Atualiza código
3. Renderiza
4. Retorna ao pool
```

## Vantagens

✅ **Mermaid baixado uma vez**: CDN só é chamado 5x no início
✅ **Mermaid inicializado uma vez**: `mermaid.initialize()` roda 5x no início
✅ **Páginas reutilizáveis**: Não cria/fecha páginas toda vez
✅ **Muito mais rápido**: ~0.75s vs ~3.75s

## Desvantagens

⚠️ **Memória**: ~200-300MB para 5 páginas
⚠️ **Inicialização**: ~5-8s no início do servidor
⚠️ **Complexidade**: Mais código para gerenciar

