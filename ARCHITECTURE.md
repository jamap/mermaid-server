# 🏗️ Architecture and Usage Patterns

## Overview

This project consists of **two independent components**:
1. **Backend API** (Port 8096) - **Standalone REST service** for diagram rendering
2. **Frontend UI** (Port 8095) - **Optional** web interface that consumes the backend API

---

## Component Independence

```
┌─────────────────────────────────────────────────────────────────┐
│  Backend API (Port 8096)                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ✅ FULLY INDEPENDENT - Can run without frontend                │
│  ✅ REST API - Standard HTTP requests                           │
│  ✅ Framework Agnostic - Use from any language                  │
│  ✅ Production Ready - Cache, pooling, optimization             │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTP Requests
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        │                     │                     │
┌───────┴────────┐   ┌────────┴────────┐   ┌───────┴────────┐
│  Frontend UI   │   │  Your Apps      │   │  CLI Tools     │
│  (Optional)    │   │  (Any Language) │   │  (cURL, etc)   │
│  Port 8095     │   │                 │   │                │
└────────────────┘   └─────────────────┘   └────────────────┘
```

**Key Point**: The frontend is just **one consumer** among many possible consumers of the backend API.

---

## Usage Pattern 1: API-Only (Backend Standalone)

**Perfect for**: Production applications, CI/CD, automation, integrations

```
┌──────────────────────────────────────────────────────────────┐
│  Your Application Stack                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  ┌──────────────┐       ┌──────────────┐                    │
│  │  Web App     │       │  Mobile App  │                    │
│  │  (React/Vue) │       │  (iOS/And.)  │                    │
│  └──────┬───────┘       └──────┬───────┘                    │
│         │                      │                             │
│         │   HTTP POST          │   HTTP POST                 │
│         │   /api/generate      │   /api/generate             │
│         │                      │                             │
│         └──────────┬───────────┘                             │
│                    │                                         │
│                    ▼                                         │
│         ┌────────────────────┐                               │
│         │  Mermaid Backend   │◀──────┐                      │
│         │  API (Port 8096)   │       │ Direct API Calls     │
│         └────────────────────┘       │                      │
│                                      │                      │
│  ┌──────────────┐                   │                      │
│  │  CI/CD       │───────────────────┘                      │
│  │  Pipeline    │  Generate docs                           │
│  └──────────────┘  automatically                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘

NO FRONTEND NEEDED ❌
Backend API handles everything ✅
```

### How to Deploy API-Only:

```bash
# Docker - expose only backend port
docker run -d -p 8096:8096 jamap/mermaid-server:latest

# Direct Node.js
cd mermaid-backend && npm start
```

### Example API Call:

```bash
curl -X POST http://localhost:8096/api/generate \
  -H "Content-Type: application/json" \
  -d '{"code":"graph TD\n A-->B","format":"png"}' \
  --output diagram.png
```

---

## Usage Pattern 2: Full Stack (Backend + Frontend)

**Perfect for**: Interactive editing, prototyping, end-user tools, learning

```
┌──────────────────────────────────────────────────────────────┐
│  Complete Solution                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│                    User's Browser                             │
│                          │                                    │
│                          │ HTTP                               │
│                          ▼                                    │
│         ┌────────────────────────────┐                        │
│         │  Frontend UI (Port 8095)   │                        │
│         │  ━━━━━━━━━━━━━━━━━━━━━━━   │                        │
│         │  • Live Editor             │                        │
│         │  • Preview Panel           │                        │
│         │  • Sample Diagrams         │                        │
│         │  • Export Tools            │                        │
│         └───────────┬────────────────┘                        │
│                     │                                         │
│                     │ HTTP POST                               │
│                     │ /api/generate                           │
│                     ▼                                         │
│         ┌────────────────────────────┐                        │
│         │  Backend API (Port 8096)   │                        │
│         │  ━━━━━━━━━━━━━━━━━━━━━━━   │                        │
│         │  • Puppeteer               │                        │
│         │  • Mermaid Renderer        │                        │
│         │  • Image Conversion        │                        │
│         └────────────────────────────┘                        │
│                                                               │
└──────────────────────────────────────────────────────────────┘

Both components running ✅
Frontend uses backend internally ✅
```

### How to Deploy Full Stack:

```bash
# Docker - expose both ports
docker run -d -p 8095:8095 -p 8096:8096 jamap/mermaid-server:latest

# Or use docker-compose
docker-compose up -d
```

### Access Points:
- **Web UI**: http://localhost:8095 (interactive editor)
- **API**: http://localhost:8096 (direct API access)

---

## Usage Pattern 3: Hybrid (Both Simultaneously)

**Perfect for**: Teams, organizations, mixed use cases

```
┌─────────────────────────────────────────────────────────────────────┐
│  Shared Backend API (Port 8096)                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Single backend instance serves multiple consumers                  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 │ All consumers share
                                 │ same backend instance
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌───────────────┐       ┌────────────────┐      ┌────────────────┐
│ Frontend UI   │       │ Production App │      │ CI/CD Pipeline │
│ (Port 8095)   │       │ (Your Code)    │      │ (Automation)   │
│               │       │                │      │                │
│ End Users     │       │ API Calls      │      │ Batch Jobs     │
│ edit diagrams │       │ from app       │      │ docs gen       │
└───────────────┘       └────────────────┘      └────────────────┘

Use Case Examples:
• Developers use Frontend UI for quick prototyping
• Production app calls API directly for generated reports
• CI/CD pipeline generates documentation diagrams
• All share the same backend instance (cost efficient)
```

### Deploy Hybrid Setup:

```bash
# Full deployment - all consumers can access
docker-compose up -d

# Backend available at: http://localhost:8096
# Frontend available at: http://localhost:8095
```

---

## Comparison: Backend API vs Frontend UI

| Feature | Backend API | Frontend UI |
|---------|-------------|-------------|
| **Type** | REST API | Web Application |
| **Port** | 8096 | 8095 |
| **Independence** | Fully standalone | Depends on backend |
| **Access Method** | HTTP requests | Web browser |
| **Consumers** | Any (apps, CLI, scripts) | Humans via browser |
| **Automation** | ✅ Perfect | ❌ Not suitable |
| **Interactive** | ❌ No UI | ✅ Yes |
| **Production Use** | ✅ Yes | ⚠️ Optional |
| **CI/CD** | ✅ Ideal | ❌ Not applicable |
| **Programming** | ✅ All languages | ❌ N/A |
| **Batch Processing** | ✅ Yes | ❌ No |
| **Live Preview** | ❌ No | ✅ Yes |
| **Sample Library** | ❌ No | ✅ Yes |

---

## Real-World Scenarios

### Scenario 1: Software Company

```
Development Team:
└─▶ Uses Frontend UI (8095) for quick diagram prototypes
    during design meetings

Production Application:
└─▶ Calls Backend API (8096) to generate system architecture
    diagrams dynamically from database data

CI/CD Pipeline:
└─▶ Calls Backend API (8096) to auto-generate documentation
    diagrams on every commit

Customer Portal:
└─▶ Calls Backend API (8096) to show personalized workflow
    diagrams for each customer

Result: One backend instance serves 4 different use cases
```

### Scenario 2: Documentation Team

```
Technical Writers:
└─▶ Use Frontend UI (8095) to create and edit diagrams
    interactively with live preview

Documentation Build System:
└─▶ Calls Backend API (8096) during static site generation
    to convert .mmd files to .png images

Version Control:
└─▶ Store .mmd files (source) in Git
    Generate images via API during build

Result: Source control for diagrams, automated generation
```

### Scenario 3: SaaS Product

```
SaaS Application:
└─▶ Calls Backend API (8096) to generate custom reports
    with charts and diagrams for each tenant

Admin Dashboard:
└─▶ Uses Frontend UI (8095) for admins to create
    template diagrams

Customer API:
└─▶ Exposes proxy endpoint that calls Backend API (8096)
    allowing customers to generate diagrams via your API

Result: Multi-tenant diagram generation with white-label support
```

---

## Data Flow Comparison

### Frontend UI Data Flow
```
User Types in Editor
       │
       ▼
JavaScript validates syntax
       │
       ▼
POST to Backend API (8096)
       │
       ▼
Backend renders diagram
       │
       ▼
Returns image/svg
       │
       ▼
Frontend displays in preview panel
```

### Direct API Usage Data Flow
```
Your Application
       │
       ▼
Build Mermaid code string
       │
       ▼
POST to Backend API (8096)
       │
       ▼
Backend renders diagram
       │
       ▼
Returns image/svg
       │
       ▼
Your app uses the result
(save to DB, send to user, etc.)
```

**Notice**: Both paths use the same backend API endpoint!

---

## Performance Characteristics

### Backend API (Standalone)
- **Cold Start**: 200-300ms (first request)
- **Warm Cache**: 50-150ms (subsequent identical requests)
- **Throughput**: ~5 concurrent requests (pool size)
- **Memory**: ~400-600MB baseline

### Frontend UI (Additional)
- **Load Time**: 1-2 seconds (static assets)
- **Memory**: +50-100MB (web server)
- **Network**: Minimal (static files cached)

### Recommendation:
If you only need API functionality, **don't deploy the frontend** - save resources!

---

## Deployment Architectures

### Option A: Minimal (API Only)
```
┌─────────────────────┐
│  Single Container   │
│  ━━━━━━━━━━━━━━━━   │
│  Backend API: 8096  │
│  Frontend: disabled │
│  Memory: ~600MB     │
└─────────────────────┘
```

### Option B: Full (API + UI)
```
┌─────────────────────┐
│  Single Container   │
│  ━━━━━━━━━━━━━━━━   │
│  Backend API: 8096  │
│  Frontend UI: 8095  │
│  Memory: ~700MB     │
└─────────────────────┘
```

### Option C: Separate Containers
```
┌────────────────┐    ┌────────────────┐
│  Backend       │    │  Frontend      │
│  Port: 8096    │◀───│  Port: 8095    │
│  Memory: 600MB │    │  Memory: 100MB │
└────────────────┘    └────────────────┘
```

### Option D: Load Balanced
```
         ┌──────────────┐
         │ Load Balancer│
         └──────┬───────┘
                │
       ┌────────┴────────┐
       │                 │
   ┌───▼────┐       ┌───▼────┐
   │Backend1│       │Backend2│
   │:8096   │       │:8096   │
   └────────┘       └────────┘
```

---

## Summary

### ✅ DO: Use Backend API Directly If...
- Building production applications
- Automating diagram generation
- Integrating with existing systems
- Running in CI/CD pipelines
- Need programmatic access
- Building custom UIs

### ✅ DO: Use Frontend UI If...
- Need interactive editing
- Want live preview
- Learning Mermaid syntax
- Quick prototyping
- Sharing with non-technical users
- Want visual diagram builder

### ✅ DO: Use Both If...
- Team has mixed needs
- Need both interactive and programmatic access
- Running a shared service for multiple teams
- Want full capabilities

### ❌ DON'T: Think Frontend is Required
- Backend API works **completely independently**
- Frontend is just **one optional consumer**
- Most production use cases **only need the API**

---

## Quick Start Commands

### API-Only Deployment
```bash
# Docker (recommended)
docker run -d -p 8096:8096 jamap/mermaid-server:latest

# Direct
cd mermaid-backend && npm start
```

### Full Stack Deployment
```bash
# Docker Compose (recommended)
docker-compose up -d

# Ports: 8095 (Frontend), 8096 (Backend)
```

### Test Backend API
```bash
curl -X POST http://localhost:8096/api/generate \
  -H "Content-Type: application/json" \
  -d '{"code":"graph TD\n A-->B","format":"svg"}' \
  --output test.svg
```

### Test Frontend UI
```bash
# Open browser
open http://localhost:8095
```

---

## Learn More

- 📖 **[README.md](./README.md)** - Complete project documentation
- 🚀 **[QUICK_START_API.md](./QUICK_START_API.md)** - Direct API usage examples
- 📚 **[API_DOCUMENT.md](./API_DOCUMENT.md)** - Full API reference
- 🌐 **[Mermaid Docs](https://mermaid.js.org/)** - Mermaid syntax guide

---

**Remember**: The backend API is the core. Everything else is optional! 🎯
