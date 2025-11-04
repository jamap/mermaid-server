# Mermaid Backend

API backend otimizada para renderização de diagramas Mermaid.

## Instalação

```bash
npm install
```

## Executar

```bash
npm start
```

O servidor estará disponível em `http://localhost:8096`

## Endpoints

- `POST /api/generate` - Renderizar diagrama Mermaid
- `GET /health` - Health check

## Testes

```bash
npm test
```

## Performance

- Browser singleton (reutilizado entre requisições)
- Cache em memória para todos os formatos
- Otimizações do Puppeteer com `--single-process`
- Request interception para bloquear recursos desnecessários

