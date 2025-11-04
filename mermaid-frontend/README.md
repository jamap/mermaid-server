# Mermaid Frontend

Frontend para o editor Mermaid.

## Instalação

```bash
npm install
```

## Executar

```bash
npm start
```

O servidor estará disponível em `http://localhost:8095`

## Configuração

A URL do backend pode ser configurada via variável de ambiente:

```bash
BACKEND_URL=http://localhost:8096 npm start
```

## Estrutura

- `public/` - Arquivos estáticos (HTML, CSS, JS)
- `server.js` - Servidor Express para servir arquivos estáticos

