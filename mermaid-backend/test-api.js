/**
 * Script de Testes para API Mermaid Backend
 * 
 * Este script lê todos os arquivos de exemplo da pasta examples/
 * e testa a renderização em todos os formatos (svg, png, pdf)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const API_URL = 'http://localhost:8096/api/generate'; // Porta do BACKEND
const EXAMPLES_DIR = path.join(__dirname, 'examples');
const OUTPUT_DIR = path.join(__dirname, 'test-outputs');
const FORMATS = ['svg', 'png', 'pdf'];

// Cores para output no terminal
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

// Estatísticas
const stats = {
    total: 0,
    success: 0,
    failed: 0,
    errors: []
};

// Criar diretório de saída se não existir
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Detecta se o código é um mindmap
 */
function isMindmap(code) {
    if (!code) return false;
    const normalized = code.toLowerCase().trim();
    return normalized.startsWith('mindmap') || normalized.includes('mindmap');
}

/**
 * Faz uma requisição POST para a API
 */
function makeRequest(code, format) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ code, format });
        
        // Timeout maior para mindmaps PNG (podem precisar de screenshot)
        const isMindmapDiagram = isMindmap(code);
        const timeout = (isMindmapDiagram && format === 'png') ? 35000 : 20000;
        
        const options = {
            hostname: 'localhost',
            port: 8096, // Porta do BACKEND
            path: '/api/generate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: timeout
        };

        const req = http.request(options, (res) => {
            const chunks = [];
            const statusCode = res.statusCode;

            res.on('data', (chunk) => {
                chunks.push(chunk);
            });

            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                
                if (statusCode === 200) {
                    resolve({
                        success: true,
                        data: buffer,
                        contentType: res.headers['content-type']
                    });
                } else {
                    const errorText = buffer.toString();
                    resolve({
                        success: false,
                        error: errorText,
                        statusCode
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Request timeout após ${timeout / 1000} segundos`));
        });

        req.write(postData);
        req.end();
    });
}

/**
 * Processa um arquivo de exemplo
 */
async function processExampleFile(filePath) {
    const fileName = path.basename(filePath, '.mmd');
    const diagramName = fileName.replace(/^\d+-/, ''); // Remove prefixo numérico
    
    console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.blue}📊 Processando: ${diagramName}${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    
    // Ler o conteúdo do arquivo
    let code;
    try {
        code = fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        console.error(`${colors.red}❌ Erro ao ler arquivo: ${error.message}${colors.reset}`);
        stats.failed++;
        stats.errors.push({ file: fileName, error: `Erro ao ler arquivo: ${error.message}` });
        return;
    }

    // Testar cada formato
    for (const format of FORMATS) {
        stats.total++;
        const outputFileName = `${fileName}.${format}`;
        const outputPath = path.join(OUTPUT_DIR, outputFileName);
        
        process.stdout.write(`  ${colors.yellow}⏳ Testando ${format.toUpperCase()}...${colors.reset} `);
        
        try {
            const startTime = Date.now();
            const result = await makeRequest(code, format);
            const duration = Date.now() - startTime;
            
            if (result.success) {
                // Salvar arquivo de saída
                fs.writeFileSync(outputPath, result.data);
                
                const sizeKB = (result.data.length / 1024).toFixed(2);
                console.log(`${colors.green}✓${colors.reset} ${colors.green}${format.toUpperCase()}${colors.reset} (${sizeKB} KB, ${duration}ms)`);
                
                stats.success++;
            } else {
                console.log(`${colors.red}✗${colors.reset} ${colors.red}${format.toUpperCase()}${colors.reset} - Erro ${result.statusCode}: ${result.error.substring(0, 100)}`);
                stats.failed++;
                stats.errors.push({
                    file: outputFileName,
                    format,
                    error: result.error,
                    statusCode: result.statusCode
                });
            }
        } catch (error) {
            console.log(`${colors.red}✗${colors.reset} ${colors.red}${format.toUpperCase()}${colors.reset} - ${error.message}`);
            stats.failed++;
            stats.errors.push({
                file: outputFileName,
                format,
                error: error.message
            });
        }
    }
}

/**
 * Função principal
 */
async function main() {
    console.log(`${colors.cyan}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║     🧪 Teste Automatizado da API Mermaid Backend            ║${colors.reset}`);
    console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════════════╝${colors.reset}`);
    console.log(`\n${colors.blue}📁 Diretório de exemplos: ${EXAMPLES_DIR}${colors.reset}`);
    console.log(`${colors.blue}📁 Diretório de saída: ${OUTPUT_DIR}${colors.reset}`);
    console.log(`${colors.blue}🔌 API URL: ${API_URL}${colors.reset}`);
    console.log(`${colors.blue}📦 Formatos: ${FORMATS.join(', ')}${colors.reset}\n`);

    // Verificar se o diretório de exemplos existe
    if (!fs.existsSync(EXAMPLES_DIR)) {
        console.error(`${colors.red}❌ Diretório de exemplos não encontrado: ${EXAMPLES_DIR}${colors.reset}`);
        process.exit(1);
    }

    // Listar todos os arquivos .mmd
    const files = fs.readdirSync(EXAMPLES_DIR)
        .filter(file => file.endsWith('.mmd'))
        .sort()
        .map(file => path.join(EXAMPLES_DIR, file));

    if (files.length === 0) {
        console.error(`${colors.red}❌ Nenhum arquivo .mmd encontrado em ${EXAMPLES_DIR}${colors.reset}`);
        process.exit(1);
    }

    console.log(`${colors.cyan}📝 Encontrados ${files.length} arquivo(s) de exemplo${colors.reset}\n`);

    // Processar cada arquivo
    for (const file of files) {
        await processExampleFile(file);
    }

    // Exibir estatísticas finais
    console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}📊 ESTATÍSTICAS FINAIS${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.blue}Total de testes: ${stats.total}${colors.reset}`);
    console.log(`${colors.green}Sucessos: ${stats.success}${colors.reset}`);
    console.log(`${colors.red}Falhas: ${stats.failed}${colors.reset}`);
    console.log(`${colors.blue}Taxa de sucesso: ${((stats.success / stats.total) * 100).toFixed(2)}%${colors.reset}`);

    if (stats.errors.length > 0) {
        console.log(`\n${colors.red}❌ ERROS ENCONTRADOS:${colors.reset}`);
        stats.errors.forEach((err, index) => {
            console.log(`\n${colors.yellow}[${index + 1}]${colors.reset} ${err.file} (${err.format || 'N/A'})`);
            console.log(`   ${colors.red}${err.error}${colors.reset}`);
        });
    }

    console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    
    // Exit code baseado no resultado
    process.exit(stats.failed > 0 ? 1 : 0);
}

// Executar
main().catch(error => {
    console.error(`${colors.red}❌ Erro fatal: ${error.message}${colors.reset}`);
    console.error(error);
    process.exit(1);
});

