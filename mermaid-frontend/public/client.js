// Obter URL do backend
let API_BASE_URL = 'http://localhost:8096';

// Carregar configuração do backend ao iniciar
fetch('/config')
  .then(res => res.json())
  .then(config => {
    API_BASE_URL = config.backendUrl;
    console.log('✅ Backend configurado:', API_BASE_URL);
  })
  .catch(() => {
    console.warn('⚠️ Usando URL padrão do backend');
  });

// Referências aos elementos DOM
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const errorLog = document.getElementById('error-log');
const errorContainer = document.getElementById('error-container');
const loadingIndicator = document.getElementById('loading');
const lineNumbers = document.getElementById('line-numbers');
const errorClose = document.getElementById('error-close');

// Zoom do preview
let currentZoom = 1;
const minZoom = 0.5;
const maxZoom = 3;
const zoomStep = 0.1;

// Cache e controle de performance
let lastRenderedCode = '';
let currentRequestController = null;
let isRendering = false;

// Sample Diagrams - Exemplos de código
const sampleDiagrams = {
    flowchart: `graph TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    C --> D[Rethink]
    D --> B
    B ---->|No| E[End]`,
    
    sequence: `sequenceDiagram
    participant Alice
    participant Bob
    Alice->>John: Hello John, how are you?
    loop Healthcheck
        John->>John: Fight against hypochondria
    end
    Note right of John: Rational thoughts <br/>prevail!
    John-->>Alice: Great!
    John->>Bob: How about you?
    Bob-->>John: Jolly good!`,
    
    class: `classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal <|-- Zebra
    Animal : +int age
    Animal : +String gender
    Animal: +isMammal()
    Animal: +mate()
    class Duck{
        +String beakColor
        +swim()
        +quack()
    }
    class Fish{
        -int sizeInFeet
        -canEat()
    }
    class Zebra{
        +bool is_wild
        +run()
    }`,
    
    state: `stateDiagram-v2
    [*] --> Still
    Still --> [*]
    
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]`,
    
    er: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses`,
    
    gantt: `gantt
    title A Gantt Diagram
    dateFormat  YYYY-MM-DD
    section Section
    A task           :a1, 2014-01-01, 30d
    Another task     :after a1  , 20d
    section Another
    Task in sec      :2014-01-12  , 12d
    another task      : 24d`,
    
    pie: `pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15`,
    
    gitgraph: `gitGraph
    commit
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop`,
    
    mindmap: `mindmap
    root((mindmap))
      Origins
        Long history
        Popularisation
          British popular psychology
      Research
        On effectiveness<br/>and features
        On Automatic creation
          Uses
            Creative techniques
            Strategic planning
            Argument mapping
      Tools
        Pen and paper
        Mermaid`,
    
    journey: `journey
    title My working day
    section Morning
      Make tea: 5: Me
      Go upstairs: 3: Me
      Do work: 1: Me, Cat
    section Afternoon
      Eat lunch: 2: Me
      More work: 1: Me, Cat`,
    
    c4: `C4Context
    title System Context diagram for Internet Banking System
    
    Person(customerA, "Banking Customer A", "A customer of the bank, with personal bank accounts.")
    Person(customerB, "Banking Customer B", "A customer of the bank, with personal bank accounts.")
    Person(customerC, "Banking Customer C", "A customer of the bank, with personal bank accounts.")
    
    System(bankingSystem, "Internet Banking System", "Allows customers to check their accounts.")
    
    Rel(customerA, bankingSystem, "Uses")
    Rel(customerB, bankingSystem, "Uses")
    Rel(customerC, bankingSystem, "Uses")`,
    
    architecture: `C4Container
    title Container diagram for Internet Banking System
    
    Person(customer, "Customer", "A customer of the bank, with personal bank accounts.")
    
    System_Ext(emailSystem, "E-mail System", "The internal Microsoft Exchange e-mail system.")
    System_Ext(bankingSystem, "Mainframe Banking System", "Stores all of the core banking information.")
    
    Container(webApp, "Web Application", "Java, Spring MVC", "Delivers the static content and the Internet banking single page application.")
    Container(spa, "Single-Page Application", "JavaScript, Angular", "Provides all the Internet banking functionality to customers via their web browser.")
    Container(mobileApp, "Mobile App", "C#, Xamarin", "Provides a limited subset of the Internet banking functionality to customers via their mobile device.")
    
    Rel(customer, webApp, "Uses", "HTTPS")
    Rel(customer, spa, "Uses", "HTTPS")
    Rel(customer, mobileApp, "Uses")
    
    Rel(webApp, spa, "Delivers")
    Rel(spa, api, "Uses", "JSON/HTTPS")
    Rel(mobileApp, api, "Uses", "JSON/HTTPS")
    
    SystemDb_Ext(database, "Database", "SQL Database", "Stores user registration information, hashed authentication credentials, access logs, etc.")
    Container(api, "API Application", "Java, Spring MVC", "Provides Internet banking functionality via a JSON/HTTPS API.")
    
    Rel(api, database, "Uses")
    Rel(api, emailSystem, "Sends e-mail using")
    Rel(api, bankingSystem, "Uses", "XML/HTTPS")`
};

// Atualizar numeração de linhas
function updateLineNumbers() {
    const lines = editor.value.split('\n').length;
    lineNumbers.innerHTML = Array.from({ length: Math.max(lines, 20) }, (_, i) => i + 1).join('<br>');
}

// Ajustar altura do editor para corresponder às linhas
editor.addEventListener('input', () => {
    updateLineNumbers();
});

editor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = editor.scrollTop;
});

// Inicializar numeração de linhas
updateLineNumbers();

// Função debounce otimizada com cancelamento de requisições anteriores
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        // Cancelar requisição anterior se existir
        if (currentRequestController) {
            currentRequestController.abort();
            currentRequestController = null;
        }
        
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Função para limpar preview e erros
function clearOutput() {
    preview.innerHTML = `
        <div class="preview-placeholder">
            <div class="placeholder-icon">📊</div>
            <p>Seu diagrama aparecerá aqui</p>
        </div>
    `;
    errorContainer.style.display = 'none';
    errorLog.textContent = '';
    resetZoom();
}

// Função principal de renderização com cache e otimizações
async function renderMermaid(format = 'svg', force = false) {
    const code = editor.value.trim();
    
    // Se o editor estiver vazio, limpar preview
    if (!code) {
        clearOutput();
        lastRenderedCode = '';
        return;
    }
    
    // Cache: não renderizar se o código não mudou e já está renderizando
    if (!force && code === lastRenderedCode && isRendering) {
        return;
    }
    
    // Se o código não mudou e já foi renderizado com sucesso, não renderizar novamente
    if (!force && code === lastRenderedCode && format === 'svg' && preview.querySelector('svg')) {
        return;
    }
    
    // Cancelar requisição anterior se existir
    if (currentRequestController) {
        currentRequestController.abort();
    }
    
    // Criar novo AbortController para esta requisição
    currentRequestController = new AbortController();
    const signal = currentRequestController.signal;
    
    isRendering = true;
    
    // Limpar erros anteriores
    errorContainer.style.display = 'none';
    errorLog.textContent = '';
    
    // Mostrar indicador de carregamento apenas para SVG
    if (format === 'svg') {
        loadingIndicator.style.display = 'flex';
        // Não limpar preview imediatamente - manter o anterior até carregar o novo
    }
    
    try {
        // Fazer requisição para a API do BACKEND com signal de cancelamento
        const response = await fetch(`${API_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code: code,
                format: format
            }),
            signal: signal
        });
        
        // Verificar se a requisição foi cancelada
        if (signal.aborted) {
            return null;
        }
        
        // Esconder indicador de carregamento
        loadingIndicator.style.display = 'none';
        
        if (response.ok) {
            if (format === 'svg') {
                // Sucesso - obter o SVG como texto
                const svgText = await response.text();
                
                // Verificar novamente se foi cancelado
                if (signal.aborted) {
                    return null;
                }
                
                preview.innerHTML = svgText;
                errorContainer.style.display = 'none';
                lastRenderedCode = code; // Atualizar cache
                resetZoom();
            } else {
                // Para PNG/PDF, retornar blob para download
                const blob = await response.blob();
                lastRenderedCode = code; // Atualizar cache
                return blob;
            }
        } else {
            // Erro - obter mensagem de erro
            const errorText = await response.text();
            errorLog.textContent = errorText || 'Erro desconhecido ao renderizar o diagrama';
            errorContainer.style.display = 'block';
            if (format === 'svg') {
                preview.innerHTML = `
                    <div class="preview-placeholder">
                        <div class="placeholder-icon">❌</div>
                        <p>Erro ao renderizar o diagrama</p>
                    </div>
                `;
            }
            lastRenderedCode = ''; // Limpar cache em caso de erro
            return null;
        }
    } catch (error) {
        // Ignorar erros de cancelamento
        if (error.name === 'AbortError') {
            return null;
        }
        
        // Erro de rede ou outro erro
        loadingIndicator.style.display = 'none';
        errorLog.textContent = `Erro de conexão com o backend: ${error.message}`;
        errorContainer.style.display = 'block';
        if (format === 'svg') {
            preview.innerHTML = `
                <div class="preview-placeholder">
                    <div class="placeholder-icon">⚠️</div>
                    <p>Erro de conexão com o backend</p>
                </div>
            `;
        }
        lastRenderedCode = ''; // Limpar cache em caso de erro
        return null;
    } finally {
        isRendering = false;
        currentRequestController = null;
    }
}

// Versão com debounce otimizado (800ms de espera - melhor para performance)
const debouncedRender = debounce(() => renderMermaid('svg', false), 800);

// Event listener para mudanças no editor
editor.addEventListener('keyup', () => {
    updateLineNumbers();
    debouncedRender();
});

editor.addEventListener('paste', () => {
    // Aguardar um pouco após colar para garantir que o conteúdo foi inserido
    setTimeout(() => {
        updateLineNumbers();
        debouncedRender();
    }, 100);
});

// Fechar painel de erro
if (errorClose) {
    errorClose.addEventListener('click', () => {
        errorContainer.style.display = 'none';
    });
}

// Sample Diagrams - Carregar exemplo
document.querySelectorAll('.sample-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Remover active de todos
        document.querySelectorAll('.sample-btn').forEach(b => b.classList.remove('active'));
        // Adicionar active ao clicado
        btn.classList.add('active');
        
        const sampleType = btn.dataset.sample;
        if (sampleDiagrams[sampleType]) {
            editor.value = sampleDiagrams[sampleType];
            updateLineNumbers();
            lastRenderedCode = ''; // Forçar renderização
            setTimeout(() => renderMermaid('svg', true), 100); // force = true
        }
    });
});

// Collapse/Expand sections
document.querySelectorAll('.collapse-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        const section = document.getElementById(`section-${target}`);
        const isActive = btn.classList.contains('active');
        
        if (isActive) {
            btn.classList.remove('active');
            section.classList.remove('active');
        } else {
            btn.classList.add('active');
            section.classList.add('active');
        }
    });
});

// Actions
const actions = {
    clear: () => {
        if (confirm('Deseja limpar o editor?')) {
            editor.value = '';
            updateLineNumbers();
            clearOutput();
        }
    },
    
    format: () => {
        // Formatação básica - indentação
        const code = editor.value;
        const lines = code.split('\n');
        let indent = 0;
        const formatted = lines.map(line => {
            const trimmed = line.trim();
            if (trimmed.endsWith('{') || trimmed.includes('-->')) {
                const result = '    '.repeat(indent) + trimmed;
                if (trimmed.endsWith('{')) indent++;
                return result;
            } else if (trimmed.startsWith('}') || trimmed === 'end') {
                indent = Math.max(0, indent - 1);
                return '    '.repeat(indent) + trimmed;
            }
            return '    '.repeat(indent) + trimmed;
        }).join('\n');
        editor.value = formatted;
        updateLineNumbers();
        renderMermaid('svg');
    },
    
    copyCode: async () => {
        try {
            await navigator.clipboard.writeText(editor.value);
            showToast('Código copiado!');
        } catch (error) {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = editor.value;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('Código copiado!');
        }
    },
    
    downloadSVG: async () => {
        const code = editor.value.trim();
        if (!code) {
            showToast('Editor vazio!');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code: code,
                    format: 'svg'
                })
            });
            
            if (response.ok) {
                const svgText = await response.text();
                const blob = new Blob([svgText], { type: 'image/svg+xml' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `mermaid-diagram-${Date.now()}.svg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                showToast('SVG baixado!');
            } else {
                showToast('Erro ao gerar SVG');
            }
        } catch (error) {
            showToast(`Erro: ${error.message}`);
        }
    },
    
    downloadPNG: async () => {
        const blob = await renderMermaid('png');
        if (blob) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mermaid-diagram-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast('PNG baixado!');
        }
    },
    
    downloadPDF: async () => {
        const blob = await renderMermaid('pdf');
        if (blob) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mermaid-diagram-${Date.now()}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast('PDF baixado!');
        }
    }
};

// Atribuir ações aos botões
document.getElementById('action-clear')?.addEventListener('click', actions.clear);
document.getElementById('action-format')?.addEventListener('click', actions.format);
document.getElementById('action-copy-code')?.addEventListener('click', actions.copyCode);
document.getElementById('action-download-svg')?.addEventListener('click', actions.downloadSVG);
document.getElementById('action-download-png')?.addEventListener('click', actions.downloadPNG);
document.getElementById('action-download-pdf')?.addEventListener('click', actions.downloadPDF);

// Zoom functions
function applyZoom() {
    const svg = preview.querySelector('svg');
    if (svg) {
        svg.style.transform = `scale(${currentZoom})`;
        svg.style.transformOrigin = 'center center';
    }
}

function resetZoom() {
    currentZoom = 1;
    applyZoom();
}

function zoomIn() {
    currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
    applyZoom();
}

function zoomOut() {
    currentZoom = Math.max(minZoom, currentZoom - zoomStep);
    applyZoom();
}

document.getElementById('btn-zoom-in')?.addEventListener('click', zoomIn);
document.getElementById('btn-zoom-out')?.addEventListener('click', zoomOut);
document.getElementById('btn-zoom-reset')?.addEventListener('click', resetZoom);

// Fullscreen
document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        preview.requestFullscreen().catch(err => {
            console.error('Erro ao entrar em tela cheia:', err);
        });
    } else {
        document.exitFullscreen();
    }
});

// Funcionalidade de download do header
const btnDownload = document.getElementById('btn-download');
if (btnDownload) {
    btnDownload.addEventListener('click', actions.downloadPNG);
}

// Funcionalidade de compartilhamento (copiar URL)
const btnShare = document.getElementById('btn-share');
if (btnShare) {
    btnShare.addEventListener('click', () => {
        const code = encodeURIComponent(editor.value.trim());
        const url = `${window.location.origin}${window.location.pathname}?code=${code}`;
        
        navigator.clipboard.writeText(url).then(() => {
            showToast('URL copiada!');
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = url;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('URL copiada!');
        });
    });
}

// Toast notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--surface-light);
        color: var(--text-primary);
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        border: 1px solid var(--border-color);
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Adicionar animações CSS para toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Carregar código da URL se existir
window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('code');
    
    if (codeFromUrl) {
        editor.value = decodeURIComponent(codeFromUrl);
        updateLineNumbers();
        setTimeout(() => renderMermaid('svg'), 500);
    } else if (editor.value.trim()) {
        updateLineNumbers();
        renderMermaid('svg');
    } else {
        // Carregar exemplo flowchart por padrão
        editor.value = sampleDiagrams.flowchart;
        updateLineNumbers();
        setTimeout(() => renderMermaid('svg'), 500);
    }
});

// Suporte para Tab no editor
editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + 4;
        updateLineNumbers();
    }
});
