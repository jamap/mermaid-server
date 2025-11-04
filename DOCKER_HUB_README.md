# Mermaid Backend & Frontend - Docker Container

A complete Docker container that runs both the **Mermaid Backend API** and **Frontend Web Interface** for rendering Mermaid diagrams in multiple formats (SVG, PNG, PDF).

**Repository**: `jamap/mermaid-server`

---

## ⚠️ DISCLAIMER

**Disclaimer**: This Docker component is released "as-is", at no cost, and no liability from the developer is implied whatsoever. Use of this software is entirely at your own discretion and risk. If you do not accept these terms, please do not use this software.

**The developer provides no warranties, express or implied, regarding the functionality, reliability, or fitness for any particular purpose of this software. You assume full responsibility for any consequences arising from the use of this software.**

---

## 🚀 Features

- **Complete Stack**: Backend API + Frontend Web Interface in a single container
- **Multiple Formats**: Generate diagrams as SVG, PNG, or PDF
- **High Performance**: 
  - Optimized SVG-to-PNG conversion using Sharp library
  - Pre-loaded page pool for faster rendering
  - Mermaid library pre-loaded for instant processing
- **Full Mermaid Support**: Supports all Mermaid diagram types (flowchart, sequence, class, state, ER, Gantt, pie, gitgraph, mindmap, journey, C4, architecture)
- **Production Ready**: Includes health checks, graceful shutdown, and error handling

## 📦 What's Included

- **Backend API** (Port 8096): RESTful API for diagram generation
  - Powered by Puppeteer + Chromium for rendering
  - Sharp library for fast SVG-to-PNG conversion
  - Pool of pre-loaded pages for optimal performance
  
- **Frontend Web Interface** (Port 8095): User-friendly web editor
  - Real-time preview
  - Code editor with syntax highlighting
  - Download diagrams in multiple formats
  - Responsive design

## 🔧 Usage

### Quick Start

```bash
docker run -d \
  -p 8095:8095 \
  -p 8096:8096 \
  --name mermaid-app \
  jamap/mermaid-server:latest
```

### Using Docker Compose

```yaml
services:
  mermaid-app:
    image: jamap/mermaid-server:latest
    ports:
      - "8095:8095"  # Frontend
      - "8096:8096"  # Backend
    restart: unless-stopped
```

Then run:
```bash
docker compose up -d
```

## 🌐 Access

After starting the container:

- **Frontend Web Interface**: http://localhost:8095
- **Backend API**: http://localhost:8096/api/generate
- **Health Check**: http://localhost:8096/health

## 📡 API Usage

### Generate Diagram

```bash
curl -X POST http://localhost:8096/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "graph TD\n    A[Start] --> B[End]",
    "format": "svg"
  }'
```

**Supported formats**: `svg`, `png`, `pdf`

### Request Body

```json
{
  "code": "graph TD\n    A[Start] --> B[End]",
  "format": "svg"
}
```

### Response

- **Success (200)**: Returns the diagram file (SVG/PNG/PDF) as binary data
- **Error (400/500)**: Returns JSON with error message

## 🏗️ Architecture

The container runs two Node.js services:

1. **Backend Service** (`/backend/server.js`)
   - Express REST API
   - Puppeteer + Chromium for rendering
   - Sharp for SVG-to-PNG conversion
   - Pre-loaded page pool for performance

2. **Frontend Service** (`/frontend/server.js`)
   - Express static file server
   - Serves web interface to users
   - Communicates with backend via HTTP

Both services start automatically using a process manager script.

## ⚡ Performance Optimizations

- **Pre-loaded Page Pool**: 5 browser pages ready for instant diagram rendering
- **Local Mermaid Library**: Mermaid.js loaded from node_modules (no CDN delays)
- **Fast PNG Conversion**: Sharp library for direct SVG-to-PNG conversion (10-50ms vs 14+ seconds)
- **Disabled Animations**: Faster rendering by disabling CSS animations
- **Optimized Puppeteer**: Configured with performance flags

## 🔒 Security

- Runs in headless mode (no display required)
- Sandboxed Chromium processes
- CORS enabled for frontend-backend communication
- Input validation on all API endpoints

## 📊 Supported Diagram Types

- Flowchart
- Sequence Diagram
- Class Diagram
- State Diagram
- Entity Relationship (ER) Diagram
- Gantt Chart
- Pie Chart
- Git Graph
- Mindmap
- User Journey
- C4 Diagram
- Architecture Diagram

## 🐛 Troubleshooting

### Container keeps restarting

Check logs:
```bash
docker logs mermaid-app
```

### Port already in use

Stop any local services on ports 8095/8096:
```bash
# Windows
netstat -ano | findstr :8095
netstat -ano | findstr :8096
```

### Health check failing

The backend needs ~40 seconds to initialize (browser + pool setup). Wait a bit and check:
```bash
curl http://localhost:8096/health
```

## 📝 Environment Variables

- `NODE_ENV`: Set to `production` (default)
- `BACKEND_URL`: Backend URL for frontend (default: `http://localhost:8096`)
- `PUPPETEER_EXECUTABLE_PATH`: Path to Chromium (auto-detected)
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD`: Set to `true` (uses system Chromium)

## 🎯 Use Cases

- **Documentation**: Generate diagrams for documentation sites
- **CI/CD Pipelines**: Automated diagram generation
- **API Integration**: Embed diagram generation in your applications
- **Web Applications**: Add Mermaid diagram editing to your app
- **Documentation Tools**: Integrate with wiki or documentation platforms

## 📄 License

This container includes:
- Mermaid.js (Apache 2.0)
- Express (MIT)
- Puppeteer (Apache 2.0)
- Sharp (Apache 2.0)

## 🤝 Contributing

Issues and pull requests are welcome!

## 🔗 Resources

- **Repository**: [jamap/mermaid-server](https://hub.docker.com/r/jamap/mermaid-server)
- [Mermaid Documentation](https://mermaid.js.org/)
- [Example Diagrams](https://mermaid.js.org/intro/getting-started.html)

---

**Maintained by**: [Your Name/Organization]  
**Image Size**: ~1.2GB (includes Chromium and all dependencies)  
**Based on**: Node.js 20 Slim + Debian Bookworm

