# Mermaid Diagram Renderer - Backend API + Web Frontend

Complete Docker container with **Mermaid Backend API** and **Web Frontend Interface** for generating diagrams in SVG, PNG, and PDF formats.

**Repository**: `jamap/mermaid-server`

## ⚠️ DISCLAIMER

**Disclaimer**: This Docker component is released "as-is", at no cost, and no liability from the developer is implied whatsoever. Use of this software is entirely at your own discretion and risk. If you do not accept these terms, please do not use this software.

## Features

✅ **Single Container**: Both backend API (port 8096) and web frontend (port 8095)  
✅ **Multiple Formats**: Generate diagrams as SVG, PNG, or PDF  
✅ **High Performance**: Pre-loaded page pool, Sharp for fast PNG conversion, optimized Puppeteer  
✅ **All Diagram Types**: Flowchart, sequence, class, state, ER, Gantt, pie, gitgraph, mindmap, journey, C4, architecture  

## Quick Start

```bash
docker run -d -p 8095:8095 -p 8096:8096 --name mermaid-app jamap/mermaid-server:latest
```

**Access**:  
- Frontend: http://localhost:8095  
- Backend API: http://localhost:8096/api/generate  
- Health: http://localhost:8096/health  

## API Example

```bash
curl -X POST http://localhost:8096/api/generate \
  -H "Content-Type: application/json" \
  -d '{"code": "graph TD\n    A[Start] --> B[End]", "format": "svg"}'
```

Supports `svg`, `png`, and `pdf` formats.

## Architecture

- **Backend**: Express REST API with Puppeteer + Chromium rendering engine
- **Frontend**: Web-based editor with real-time preview
- **Performance**: Pre-loaded browser pages, Sharp SVG-to-PNG conversion, local Mermaid library

## Requirements

- Docker Desktop or Docker Engine
- Ports 8095 (frontend) and 8096 (backend) available

---

**Image Size**: ~1.2GB | **Base**: Node.js 20 Slim | **License**: MIT/Apache 2.0

