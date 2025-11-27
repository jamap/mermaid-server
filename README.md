# 🎨 Mermaid Diagram Renderer - Standalone Backend API + Optional Frontend

A **high-performance standalone REST API** for rendering Mermaid diagrams into SVG, PNG, and PDF formats. Includes an **optional web-based editor** for interactive use.

**🔥 Key Concept**: The backend is a **fully independent REST API** that can be consumed **directly** by any application, tool, or service. The frontend is just **one optional way** to use it - you can skip the frontend entirely and integrate the backend API into your own applications.

[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![API](https://img.shields.io/badge/API-Standalone-brightgreen.svg)](./API_DOCUMENT.md)
[![REST](https://img.shields.io/badge/REST-Independent-orange.svg)](./QUICK_START_API.md)

> 🔥 **IMPORTANT**: This is a **standalone REST API** first, with an optional web UI. You can use the backend API **directly** from any application without the frontend!

---

## 🎯 Two Ways to Use This Project

<table>
<tr>
<td width="50%" valign="top">

### 1️⃣ **Backend API Only** 
**Recommended for Integration**

```bash
# Deploy only the API
docker run -d -p 8096:8096 \
  jamap/mermaid-server:latest
```

**Use from ANY application:**
```python
# Python example
import requests
response = requests.post(
  'http://localhost:8096/api/generate',
  json={'code': 'graph TD\n A-->B', 
        'format': 'png'}
)
```

✅ Integrate into apps (any language)<br>
✅ Automated generation (CI/CD)<br>
✅ Microservices architecture<br>
✅ No frontend needed<br>
🔌 Port: **8096** (Backend API)

**[→ See API Examples](./QUICK_START_API.md)**

</td>
<td width="50%" valign="top">

### 2️⃣ **Backend API + Frontend UI**
**Full Package**

```bash
# Deploy both services
docker-compose up -d
```

**Use from browser:**
- Open http://localhost:8095
- Edit diagrams interactively
- Live preview, samples, exports

✅ Interactive web editor<br>
✅ Live preview while editing<br>
✅ Sample library included<br>
✅ Browser-based (no install)<br>
🔌 Ports: **8095** (UI) + **8096** (API)

**[→ Try Web Editor](#-accessing-the-application)**

</td>
</tr>
</table>

> 💡 **Key Concept**: The backend API is **completely independent**. The frontend is just **one possible consumer**. You can use the API directly from your applications without the frontend.
>
> 📚 **Learn More**: See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed usage patterns and deployment scenarios.

---

## 📖 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture) (also see [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed patterns)
- [Quick Start](#-quick-start)
- [Usage Modes](#-usage-modes)
- [Accessing the Application](#-accessing-the-application)
- [Using Backend API Independently](#-using-the-backend-api-independently)
- [API Documentation](#-api-documentation)
- [Development](#-development)
- [Docker Commands](#-docker-commands)
- [Configuration](#-configuration)
- [Troubleshooting](#-troubleshooting)
- [Performance](#-performance)
- [Deployment](#-deployment)
- [FAQ](#-frequently-asked-questions-faq)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Features

### Backend API Features (Standalone - Can be used independently)
- **High-Performance Rendering** using Puppeteer
- **REST API** - Universal access from any programming language or tool
- **Multiple Formats**: SVG, PNG, PDF output
- **Page Pool Optimization**: Pre-loaded browser pages for instant rendering
- **In-Memory Cache**: Subsequent renders are near-instant
- **Multiple Rendering Strategies**: ImageMagick → Sharp → Screenshot fallback
- **Local Mermaid Library**: No CDN dependency
- **Health Check Endpoint**: Monitor service status
- **Graceful Shutdown**: Proper resource cleanup
- **Framework Agnostic**: Use from Node.js, Python, Go, Java, PHP, Ruby, etc.

### Frontend Features (Optional Web UI)
- **Live Editor** with syntax highlighting and line numbers
- **Real-time Preview** of Mermaid diagrams
- **Sample Diagrams** library (flowcharts, sequence, class, state, etc.)
- **Multiple Export Formats**: SVG, PNG, PDF
- **Zoom Controls**: In/Out/Reset/Fullscreen
- **Share Functionality**: Generate shareable links
- **Responsive Design**: Works on desktop and tablet
- **Error Handling**: Clear syntax error messages
- **Note**: The frontend is just one way to use the backend API

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Container                        │
│  ┌────────────────────┐         ┌─────────────────────────┐ │
│  │   Frontend         │         │   Backend API           │ │
│  │   (Port 8095)      │────────▶│   (Port 8096)           │ │
│  │                    │  HTTP   │                         │ │
│  │  - Live Editor     │         │  - Puppeteer            │ │
│  │  - Preview Panel   │         │  - Mermaid Renderer     │ │
│  │  - Export Tools    │         │  - Image Conversion     │ │
│  └────────────────────┘         │  - Page Pool (x5)       │ │
│           │                     │  - Cache                │ │
│           │                     └─────────────────────────┘ │
│           │                              ▲                   │
└───────────┼──────────────────────────────┼───────────────────┘
            │                              │
            ▼                              │
    Browser (localhost:8095)               │
                                          │
                                          │ Direct API Access
                                          │
    ┌─────────────────────────────────────┼───────────────┐
    │   External Consumers (Direct API Access)            │
    │   • Your Application (any language)                 │
    │   • Command-line tools (cURL, wget)                 │
    │   • CI/CD pipelines                                 │
    │   • Scripts (Python, Node.js, etc.)                 │
    │   • Other services/microservices                    │
    └─────────────────────────────────────────────────────┘
```

**Single Container Setup:**
- Both services run in one Docker container
- **Frontend (Port 8095)**: Optional web UI for interactive editing
- **Backend (Port 8096)**: **Standalone REST API** - can be used independently
- Frontend is just **ONE consumer** of the backend API
- **Any application can call the backend API directly** without using the frontend

**Important: The backend API is completely independent and can be consumed by:**
- The included frontend (browser-based editor)
- Your own applications (any programming language)
- Command-line tools and scripts
- CI/CD pipelines for automated diagram generation
- Other services in your infrastructure
- Mobile apps, desktop apps, or any HTTP client

---

## 🎯 Quick Start

### Prerequisites

- **Docker Desktop** installed and running
- **Docker Compose** (included with Docker Desktop)
- Minimum **1GB RAM** available for the container

### 1. Clone the Repository

```bash
git clone <repository-url>
cd mermaid-server
```

### 2. Start the Services

```bash
docker-compose up -d
```

This command will:
- Build the Docker image (first time only, ~2-3 minutes)
- Start both frontend and backend services
- Initialize the browser pool for fast rendering

### 3. Wait for Initialization

The services take ~5-10 seconds to initialize:
- Backend starts and creates Puppeteer browser pool
- Frontend starts and connects to backend
- Health check verifies everything is ready

**Check the logs:**
```bash
docker-compose logs -f
```

Look for these messages:
```
✅ Pool initialized in 2345ms - first request will be instant!
🚀 Backend Server running on port 8096
🚀 Frontend Server running on port 8095
```

### 4. Open in Browser

Navigate to: **http://localhost:8095**

You're ready! The editor will open with a sample diagram.

---

## 📊 Usage Modes

This project supports **two distinct usage modes**. Choose based on your needs:

| Mode | When to Use | What's Running | Ports | Access Method |
|------|-------------|----------------|-------|---------------|
| **API-Only** | Integrating into apps, automation, CI/CD | Backend API only | 8096 | Direct HTTP calls from your code |
| **Full Stack** | Interactive editing, prototyping, sharing | Backend + Frontend | 8095 + 8096 | Browser UI + API calls |

### Mode 1: API-Only Usage (Backend Only)

**Perfect for:**
- 🔧 Application integration (Python, Node.js, Go, Java, PHP, etc.)
- 🤖 Automation scripts and bots
- 📊 Generating diagrams from data programmatically
- 🔄 CI/CD pipelines (auto-generate documentation)
- 🌐 Microservices that need diagram rendering
- 📱 Mobile apps (iOS/Android calling the API)

**How to access:**
```bash
# Make direct HTTP calls to the API
curl -X POST http://localhost:8096/api/generate \
  -H "Content-Type: application/json" \
  -d '{"code":"graph TD\n A-->B","format":"png"}' \
  --output diagram.png
```

**You DON'T need:**
- ❌ The frontend (port 8095)
- ❌ A web browser
- ❌ The web editor interface

**You ONLY need:**
- ✅ The backend API (port 8096)
- ✅ HTTP client (cURL, requests, fetch, etc.)

---

### Mode 2: Full Stack Usage (Backend + Frontend)

**Perfect for:**
- 🎨 Interactive diagram creation and editing
- 👥 End-user facing applications
- 📚 Learning Mermaid syntax with examples
- 🔍 Quick prototyping and testing
- 🖼️ Visual diagram exploration

**How to access:**
```bash
# Open web browser
http://localhost:8095  # Interactive editor (uses API internally)
```

**Behind the scenes:**
- The web UI (frontend) calls the backend API
- Same API endpoints available for your apps
- Frontend is just a convenient consumer of the API

---

## 🌐 Accessing the Application

### Backend API (Primary Component - Direct Access)

**URL:** http://localhost:8096

⚠️ **IMPORTANT**: The backend is a **standalone REST API** that can be consumed **directly** by any application, script, or tool. You **DO NOT need** to use the frontend to access the backend functionality.

**Use Cases for Direct Backend Access:**
- 🔧 **Automated diagram generation** in your applications
- 📊 **CI/CD pipelines** - Generate documentation diagrams automatically
- 🤖 **Bots and automation** - Create diagrams programmatically
- 🌐 **Integration with your existing apps** - Any programming language
- 📱 **Mobile apps** - Call the API from iOS/Android apps
- 🖥️ **Desktop applications** - Integrate diagram generation
- 🔄 **Batch processing** - Generate hundreds of diagrams
- 🎨 **Custom UIs** - Build your own interface using this backend

### Backend (REST API)

**URL:** http://localhost:8096

**Available Endpoints:**

#### 1. **POST /api/generate** - Render Diagram

Converts Mermaid code into SVG, PNG, or PDF.

**Example with cURL:**
```bash
curl -X POST http://localhost:8096/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "graph TD\n    A[Start] --> B[End]",
    "format": "png"
  }' \
  --output diagram.png
```

**Example with JavaScript/Node.js:**
```javascript
const response = await fetch('http://localhost:8096/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: 'graph LR\n    A --> B --> C',
    format: 'svg'
  })
});

const svgText = await response.text();
console.log(svgText); // SVG markup
```

**Example with Python:**
```python
import requests

response = requests.post('http://localhost:8096/api/generate', json={
    'code': 'sequenceDiagram\n    Alice->>Bob: Hello!',
    'format': 'png'
})

with open('diagram.png', 'wb') as f:
    f.write(response.content)
```

**Example with Go:**
```go
package main

import (
    "bytes"
    "encoding/json"
    "io"
    "net/http"
    "os"
)

func main() {
    payload := map[string]string{
        "code":   "graph TD\n    A --> B",
        "format": "svg",
    }
    
    jsonData, _ := json.Marshal(payload)
    resp, _ := http.Post(
        "http://localhost:8096/api/generate",
        "application/json",
        bytes.NewBuffer(jsonData),
    )
    defer resp.Body.Close()
    
    file, _ := os.Create("diagram.svg")
    defer file.Close()
    io.Copy(file, resp.Body)
}
```

**Example with PHP:**
```php
<?php
$ch = curl_init('http://localhost:8096/api/generate');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'code' => "graph LR\n    A-->B",
    'format' => 'png'
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$result = curl_exec($ch);
file_put_contents('diagram.png', $result);
curl_close($ch);
?>
```

#### 2. **GET /health** - Health Check

Check if the service is running properly.

**Example:**
```bash
curl http://localhost:8096/health
```

**Response:**
```json
{
  "status": "ok",
  "browser": "connected",
  "pool": {
    "ready": true,
    "size": 5,
    "maxSize": 5
  },
  "uptime": 3600.5
}
```

---

### Frontend (Optional Web Interface)

**URL:** http://localhost:8095

> 💡 **Note**: The frontend is **optional**. It's a convenient web UI that uses the backend API, but you can skip it entirely and use the backend API directly from your own applications.

**What you can do:**
- Write/edit Mermaid diagrams in the live editor
- See real-time preview as you type
- Download diagrams in SVG, PNG, or PDF formats
- Load sample diagrams from the library
- Share diagrams via generated links
- Zoom and adjust the preview panel

**Example Usage:**
1. Open http://localhost:8095
2. Type your Mermaid code in the left editor panel
3. See the diagram render automatically in the right panel
4. Click "Download PNG" to export

**When to use the Frontend:**
- Quick prototyping and testing diagrams
- Interactive editing with live preview
- Sharing diagrams with non-technical users
- Exploring Mermaid syntax with examples

**When to use the Backend API directly:**
- Integrating diagram generation into your application
- Automated/batch processing
- CI/CD pipelines
- Server-side rendering
- Building custom interfaces

---

## 📚 API Documentation

**Quick Links:**
- 🚀 **[QUICK_START_API.md](./QUICK_START_API.md)** - Use backend API without frontend (examples in 8+ languages)
- 📖 **[API_DOCUMENT.md](./API_DOCUMENT.md)** - Complete API reference documentation

> 📖 **The backend API is fully documented and can be consumed by ANY client** - web apps, mobile apps, desktop apps, CLI tools, scripts, or any programming language that can make HTTP requests.

**Quick Reference:**

| Endpoint | Method | Purpose | Response Type | Access |
|----------|--------|---------|---------------|--------|
| `/api/generate` | POST | Render Mermaid diagram | Binary (SVG/PNG/PDF) | **Direct access from any client** |
| `/health` | GET | Service health status | JSON | **Direct access from any client** |

**Request Parameters for `/api/generate`:**

```json
{
  "code": "string (required)",           // Mermaid diagram code
  "format": "svg|png|pdf",               // Output format (default: svg)
  "backgroundColor": "string",           // Background color (default: transparent)
  "theme": "default|dark|forest|neutral", // Mermaid theme (default: default)
  "width": 800,                          // Width in pixels (PNG/PDF only)
  "height": 600                          // Height in pixels (PNG/PDF only)
}
```

---

## 🔌 Using the Backend API Independently

### You Don't Need the Frontend!

The backend API is a **fully independent REST service**. Here are practical examples of using it **without the frontend**:

### Example 1: Batch Diagram Generation Script (Python)

```python
#!/usr/bin/env python3
"""
Generate multiple diagrams from a directory of .mmd files
No frontend needed - pure backend API usage
"""
import os
import requests
from pathlib import Path

BACKEND_API = "http://localhost:8096/api/generate"
INPUT_DIR = "./diagrams"
OUTPUT_DIR = "./output"

def generate_diagram(mermaid_code, filename, format="png"):
    response = requests.post(BACKEND_API, json={
        "code": mermaid_code,
        "format": format,
        "backgroundColor": "white"
    })
    
    if response.ok:
        output_path = f"{OUTPUT_DIR}/{filename}.{format}"
        with open(output_path, 'wb') as f:
            f.write(response.content)
        print(f"✅ Generated: {output_path}")
    else:
        print(f"❌ Failed: {filename}")

# Process all .mmd files
Path(OUTPUT_DIR).mkdir(exist_ok=True)
for mmd_file in Path(INPUT_DIR).glob("*.mmd"):
    code = mmd_file.read_text()
    generate_diagram(code, mmd_file.stem)
```

### Example 2: CI/CD Pipeline Integration (GitHub Actions)

```yaml
# .github/workflows/generate-diagrams.yml
name: Generate Documentation Diagrams

on: [push]

jobs:
  generate-diagrams:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Start Mermaid Backend
        run: |
          docker run -d -p 8096:8096 jamap/mermaid-server:latest
          sleep 10  # Wait for backend to be ready
      
      - name: Generate Diagrams
        run: |
          for file in docs/diagrams/*.mmd; do
            curl -X POST http://localhost:8096/api/generate \
              -H "Content-Type: application/json" \
              -d "{\"code\":\"$(cat $file)\",\"format\":\"png\"}" \
              --output "docs/images/$(basename $file .mmd).png"
          done
      
      - name: Commit Generated Images
        run: |
          git add docs/images/*.png
          git commit -m "Auto-generate diagrams [skip ci]"
          git push
```

### Example 3: Web Application Integration (Express/Node.js)

```javascript
// Your existing Node.js application
const express = require('express');
const fetch = require('node-fetch');

const app = express();
const MERMAID_API = 'http://localhost:8096/api/generate';

// Endpoint in YOUR app that generates diagrams
app.post('/my-app/generate-report-diagram', async (req, res) => {
  const { reportData } = req.body;
  
  // Build Mermaid code from your data
  const mermaidCode = `
    graph TD
      A[Report: ${reportData.title}]
      A --> B[Total: ${reportData.total}]
      A --> C[Status: ${reportData.status}]
  `;
  
  // Call Mermaid backend API
  const response = await fetch(MERMAID_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: mermaidCode,
      format: 'png',
      backgroundColor: '#f0f0f0'
    })
  });
  
  const imageBuffer = await response.buffer();
  
  // Return image directly or save to database
  res.set('Content-Type', 'image/png');
  res.send(imageBuffer);
});

app.listen(3000);
```

### Example 4: Command-Line Tool

```bash
#!/bin/bash
# diagram-cli.sh - Generate diagram from command line

if [ -z "$1" ]; then
  echo "Usage: ./diagram-cli.sh <diagram-file.mmd> [format]"
  exit 1
fi

DIAGRAM_FILE=$1
FORMAT=${2:-svg}
OUTPUT="${DIAGRAM_FILE%.*}.$FORMAT"

CODE=$(cat "$DIAGRAM_FILE")

curl -X POST http://localhost:8096/api/generate \
  -H "Content-Type: application/json" \
  -d "{\"code\":$(jq -Rs . <<< "$CODE"),\"format\":\"$FORMAT\"}" \
  --output "$OUTPUT"

echo "Generated: $OUTPUT"
```

### Example 5: Microservice Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Your API      │      │  Mermaid        │      │   Database      │
│   Service       │─────▶│  Backend API    │      │                 │
│   (Port 3000)   │      │  (Port 8096)    │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
         │                                                  │
         └──────────────────────────────────────────────────┘
                    Store generated diagrams
```

**Use the Mermaid backend as a microservice:**
- Your main app calls the Mermaid API when needed
- Generate diagrams on-demand or scheduled
- Store results in your database or object storage
- No frontend dependency

### Example 6: Slack Bot Integration

```javascript
// Slack bot that generates diagrams from slash commands
app.post('/slack/commands/diagram', async (req, res) => {
  const { text } = req.body; // User's Mermaid code
  
  // Generate diagram via backend API
  const response = await fetch('http://localhost:8096/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: text, format: 'png' })
  });
  
  const imageBuffer = await response.buffer();
  
  // Upload to Slack and send response
  // ... Slack upload logic ...
  
  res.json({
    response_type: 'in_channel',
    text: 'Here is your diagram:',
    attachments: [{ image_url: uploadedUrl }]
  });
});
```

### Running Only the Backend (Without Frontend)

If you **only need the backend API** and don't want the frontend:

**Option 1: Docker with only backend port**
```bash
docker run -d -p 8096:8096 jamap/mermaid-server:latest
# Frontend port 8095 not exposed - only API available
```

**Option 2: Run backend directly**
```bash
cd mermaid-backend
npm install
npm start
# Only backend starts on port 8096
```

**Option 3: Custom docker-compose.yml**
```yaml
services:
  mermaid-backend:
    build:
      context: ./mermaid-backend
    ports:
      - "8096:8096"  # Only backend exposed
    # No frontend service defined
```

---

## 🛠️ Development

### Running Without Docker (Local Development)

#### Backend:
```bash
cd mermaid-backend
npm install
npm start
```
Backend runs on http://localhost:8096

#### Frontend:
```bash
cd mermaid-frontend
npm install
npm start
```
Frontend runs on http://localhost:8095

### Project Structure

```
mermaid-server/
├── mermaid-backend/          # Backend API service
│   ├── server.js            # Express server with Puppeteer
│   ├── package.json         # Backend dependencies
│   ├── examples/            # Sample Mermaid diagrams
│   └── test-api.js          # API test suite
├── mermaid-frontend/         # Frontend web application
│   ├── server.js            # Static file server
│   ├── public/              # Static assets
│   │   ├── index.html       # Main HTML page
│   │   ├── client.js        # Frontend JavaScript
│   │   └── style.css        # Styles
│   └── package.json         # Frontend dependencies
├── docker-compose.yml        # Docker Compose configuration
├── Dockerfile                # Multi-service Docker image
├── start-services.js         # Service orchestration script
├── API_DOCUMENT.md           # Complete API documentation
└── README.md                 # This file
```

### Testing

**Backend API Tests:**
```bash
cd mermaid-backend
npm test
```

This will test all diagram types in all formats (SVG, PNG, PDF) and save outputs to `test-outputs/` directory.

---

## 🐳 Docker Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All logs
docker-compose logs -f

# Backend only
docker-compose logs -f | grep "Backend"

# Frontend only  
docker-compose logs -f | grep "Frontend"
```

### Rebuild Image
```bash
# After code changes
docker-compose up -d --build

# Force rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

### Check Status
```bash
docker-compose ps
```

### Execute Commands Inside Container
```bash
# Open shell
docker-compose exec mermaid-app /bin/bash

# Check health
docker-compose exec mermaid-app curl http://localhost:8096/health
```

### Remove Everything
```bash
# Stop and remove containers, networks, volumes
docker-compose down -v

# Also remove the image
docker rmi jamap/mermaid-server:latest
```

---

## ⚙️ Configuration

### Environment Variables

You can customize the services using environment variables. Create a `.env` file:

```env
# Backend Configuration
BACKEND_PORT=8096
BACKEND_URL=http://localhost:8096

# Frontend Configuration
FRONTEND_PORT=8095

# Puppeteer Configuration
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Node Environment
NODE_ENV=production
```

### Port Mapping

To change the exposed ports, edit `docker-compose.yml`:

```yaml
ports:
  - "9095:8095"  # Frontend: host:container
  - "9096:8096"  # Backend: host:container
```

Then access:
- Frontend: http://localhost:9095
- Backend: http://localhost:9096

### Resource Limits

Add resource limits in `docker-compose.yml`:

```yaml
services:
  mermaid-app:
    # ... other config ...
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          memory: 512M
```

---

## 🐛 Troubleshooting

### Issue: Services Not Starting

**Check if Docker is running:**
```bash
docker ps
```

**Check container logs:**
```bash
docker-compose logs
```

**Common causes:**
- Ports 8095 or 8096 already in use
- Insufficient memory (need at least 512MB)
- Docker Desktop not running

### Issue: Frontend Shows "Failed to Connect"

**Verify backend is running:**
```bash
curl http://localhost:8096/health
```

**Check backend logs:**
```bash
docker-compose logs | grep "Backend"
```

**Solution:**
- Wait 10-15 seconds for backend initialization
- Restart services: `docker-compose restart`

### Issue: Slow Rendering

**Check pool status:**
```bash
curl http://localhost:8096/health | jq
```

Expected response:
```json
{
  "pool": {
    "ready": true,
    "size": 5
  }
}
```

**If pool is not ready:**
- Wait ~30 seconds after container start
- Check memory availability (minimum 1GB)

### Issue: "Browser Not Initialized"

**This usually happens if Chromium failed to start.**

**Solution:**
```bash
# Restart container
docker-compose restart

# If problem persists, rebuild
docker-compose down
docker-compose up -d --build
```

### Issue: Permission Errors

**On Linux, Puppeteer may have permission issues.**

**Solution:**
```bash
# Add to docker-compose.yml
services:
  mermaid-app:
    security_opt:
      - seccomp:unconfined
```

### Issue: Cannot Download Images

**Check if the download buttons work:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Click download button
4. Look for errors

**Common fix:**
- Clear browser cache
- Try a different browser
- Check backend API: `curl -X POST http://localhost:8096/api/generate -H "Content-Type: application/json" -d '{"code":"graph TD\n A-->B","format":"png"}' --output test.png`

### Complete Reset

If all else fails:
```bash
# Stop everything
docker-compose down -v

# Remove image
docker rmi jamap/mermaid-server:latest

# Clear Docker cache
docker system prune -a

# Rebuild and start
docker-compose up -d --build
```

---

## ⚡ Performance

### Rendering Speed

**First Request (Cold Start):**
- SVG: ~200-300ms
- PNG: ~300-500ms  
- PDF: ~400-600ms

**Subsequent Requests (Cached):**
- SVG: ~50ms
- PNG: ~100ms
- PDF: ~150ms

### Optimizations Implemented

1. **Page Pool**: 5 pre-loaded Puppeteer pages ready to render
2. **In-Memory Cache**: Diagrams cached across all formats
3. **Browser Singleton**: One shared browser instance
4. **Local Mermaid**: No CDN network delay
5. **Request Interception**: Blocks unnecessary resources
6. **Multiple Rendering Paths**: ImageMagick → Sharp → Screenshot

### Load Testing

The backend can handle:
- **5 concurrent requests** (limited by pool size)
- **Unlimited sequential requests** (with caching)
- **~1000 requests/hour** (assuming mixed cache hits/misses)

### Memory Usage

- **Container**: ~400-600MB baseline
- **Per Request**: +50-100MB during rendering
- **Recommended**: 1GB+ RAM for container

---

## 📦 Deployment

### Local Deployment (Current Setup)

Already configured! Just run:
```bash
docker-compose up -d
```

### Production Deployment

For production, consider:

1. **Reverse Proxy** (Nginx/Traefik)
2. **HTTPS/SSL** certificates
3. **Rate Limiting**
4. **Authentication** (if needed)
5. **Monitoring** (Prometheus/Grafana)

**Example Nginx Config:**
```nginx
# Frontend
location / {
    proxy_pass http://localhost:8095;
}

# Backend API
location /api {
    proxy_pass http://localhost:8096;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
}
```

### Cloud Deployment

**Docker Hub:**
```bash
# Build and push
docker-compose build
docker tag jamap/mermaid-server:latest yourusername/mermaid-server:latest
docker push yourusername/mermaid-server:latest
```

**Deploy anywhere that supports Docker:**
- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances
- DigitalOcean App Platform
- Heroku
- Railway.app

---

## 🔒 Security Considerations

### Current Setup
- No authentication (suitable for local/trusted networks)
- CORS enabled for all origins
- No rate limiting

### For Production
Consider adding:

```javascript
// Rate limiting (in server.js)
const rateLimit = require('express-rate-limit');
app.use('/api', rateLimit({
  windowMs: 60000,
  max: 100
}));

// CORS restriction
app.use(cors({
  origin: ['https://yourdomain.com']
}));

// Authentication
app.use('/api', requireAuth);
```

---

## 📖 Supported Diagram Types

All Mermaid diagram types are supported:

- ✅ Flowchart / Graph
- ✅ Sequence Diagram
- ✅ Class Diagram
- ✅ State Diagram
- ✅ Entity Relationship Diagram (ERD)
- ✅ User Journey
- ✅ Gantt Chart
- ✅ Pie Chart
- ✅ Quadrant Chart
- ✅ Requirement Diagram
- ✅ Git Graph
- ✅ Mindmap
- ✅ Timeline
- ✅ ZenUML
- ✅ Sankey Diagram

For syntax documentation: https://mermaid.js.org/

---

## ❓ Frequently Asked Questions (FAQ)

### Q: Do I need to use the frontend to access the backend API?

**A: No, absolutely not!** The backend API is completely standalone. The frontend is just one optional way to use it. You can call the backend API directly from:
- Your own applications (any programming language)
- Command-line tools (cURL, wget)
- Scripts (Python, Node.js, Bash, etc.)
- CI/CD pipelines
- Mobile apps
- Desktop applications
- Other microservices

### Q: Can I use only the backend without starting the frontend?

**A: Yes!** You can run only the backend:
```bash
# Expose only backend port
docker run -d -p 8096:8096 jamap/mermaid-server:latest

# Or run backend directly
cd mermaid-backend && npm start
```

### Q: What is the frontend for then?

**A: The frontend is an optional convenience tool** that provides:
- A visual editor for users who prefer GUI
- Real-time preview while editing
- Sample diagrams library
- Easy way to learn Mermaid syntax

But the **core functionality is in the backend API** - the frontend just makes HTTP calls to it, same as your application would.

### Q: Can I replace the frontend with my own UI?

**A: Yes, absolutely!** The backend API is framework-agnostic. Build your own frontend using:
- React, Vue, Angular, Svelte
- Mobile apps (React Native, Flutter, Swift, Kotlin)
- Desktop apps (Electron, Tauri)
- Or no UI at all - pure API usage

### Q: Can multiple applications use the same backend instance?

**A: Yes!** The backend is designed as a shared service:
```
┌──────────────┐
│ Your Web App │──┐
└──────────────┘  │
                  │    ┌─────────────────┐
┌──────────────┐  ├───▶│  Backend API    │
│ Mobile App   │──┤    │  (Port 8096)    │
└──────────────┘  │    └─────────────────┘
                  │
┌──────────────┐  │
│ CI/CD        │──┘
└──────────────┘
```

### Q: What's the difference between this and Mermaid.js CDN?

| Feature | This Backend API | Mermaid.js CDN |
|---------|-----------------|----------------|
| Server-side rendering | ✅ Yes | ❌ No (client-side only) |
| Generate images (PNG/PDF) | ✅ Yes | ❌ No (SVG only in browser) |
| No browser needed | ✅ Yes | ❌ Requires browser |
| API endpoint | ✅ Yes | ❌ No |
| Batch processing | ✅ Yes | ❌ Limited |
| Use in automation | ✅ Yes | ❌ Difficult |

### Q: How do I integrate this into my Python/Node.js/Go/Java app?

**A: Just make HTTP POST requests!** See examples in the [Using Backend API Independently](#-using-the-backend-api-independently) section. The backend accepts standard HTTP requests, so any HTTP client library works.

### Q: Can I run this in production for my application?

**A: Yes!** Many use cases:
- Generate diagrams for your documentation
- Create charts from your data
- Build visualization features
- Process diagrams in batch jobs

Just deploy the Docker container and call the API from your production code.

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Mermaid.js** - Amazing diagramming library
- **Puppeteer** - Headless Chrome automation
- **Express** - Web framework
- **ImageMagick & Sharp** - Image processing

---

## 📞 Support

For issues and questions:
- Check [API_DOCUMENT.md](./API_DOCUMENT.md) for API details
- Review [Troubleshooting](#-troubleshooting) section
- Open an issue on GitHub
- Check Mermaid documentation: https://mermaid.js.org/

---

**Made with ❤️ by the Mermaid community**

**Current Version:** 1.0.0  
**Last Updated:** 2025-November-27
