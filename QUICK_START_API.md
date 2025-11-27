# 🚀 Quick Start - Backend API (Without Frontend)

This guide shows how to use **only the backend API** without the frontend web interface.

---

## Why Use the Backend API Directly?

- ✅ **Integration**: Add diagram generation to your existing application
- ✅ **Automation**: Generate diagrams programmatically (CI/CD, scripts)
- ✅ **Performance**: Direct API calls, no browser needed
- ✅ **Flexibility**: Use any programming language
- ✅ **Headless**: Perfect for servers and automation environments

---

## Step 1: Start the Backend

### Using Docker (Recommended)

```bash
# Start only the backend API (port 8096)
docker run -d -p 8096:8096 jamap/mermaid-server:latest
```

### Using Node.js Directly

```bash
cd mermaid-backend
npm install
npm start
```

**Wait ~10 seconds** for initialization, then the API is ready at: `http://localhost:8096`

---

## Step 2: Verify Backend is Running

```bash
curl http://localhost:8096/health
```

Expected response:
```json
{
  "status": "ok",
  "browser": "connected",
  "pool": {
    "ready": true,
    "size": 5,
    "maxSize": 5
  },
  "uptime": 10.5
}
```

---

## Step 3: Generate Your First Diagram

### Example 1: Generate SVG (cURL)

```bash
curl -X POST http://localhost:8096/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "graph TD\n    A[Start] --> B[End]",
    "format": "svg"
  }' \
  --output diagram.svg
```

### Example 2: Generate PNG (cURL)

```bash
curl -X POST http://localhost:8096/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "sequenceDiagram\n    Alice->>Bob: Hello!\n    Bob-->>Alice: Hi!",
    "format": "png",
    "backgroundColor": "white"
  }' \
  --output diagram.png
```

### Example 3: Generate PDF (cURL)

```bash
curl -X POST http://localhost:8096/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "classDiagram\n    Animal <|-- Dog\n    Animal <|-- Cat",
    "format": "pdf"
  }' \
  --output diagram.pdf
```

---

## Language-Specific Examples

### Python

```python
import requests

# Generate PNG diagram
response = requests.post('http://localhost:8096/api/generate', json={
    'code': '''
    graph LR
        A[Client] --> B[Load Balancer]
        B --> C[Server1]
        B --> D[Server2]
    ''',
    'format': 'png',
    'backgroundColor': 'white',
    'width': 1024,
    'height': 768
})

# Save to file
with open('architecture.png', 'wb') as f:
    f.write(response.content)

print(f"Diagram generated! Size: {len(response.content)} bytes")
```

### Node.js / JavaScript

```javascript
const fs = require('fs');
const fetch = require('node-fetch');

async function generateDiagram() {
  const response = await fetch('http://localhost:8096/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: `
        stateDiagram-v2
          [*] --> Still
          Still --> Moving
          Moving --> Still
          Moving --> Crash
          Crash --> [*]
      `,
      format: 'svg'
    })
  });

  const svgContent = await response.text();
  fs.writeFileSync('state-diagram.svg', svgContent);
  console.log('✅ Diagram saved as state-diagram.svg');
}

generateDiagram();
```

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "io"
    "net/http"
    "os"
)

type DiagramRequest struct {
    Code   string `json:"code"`
    Format string `json:"format"`
}

func main() {
    payload := DiagramRequest{
        Code: `
            flowchart TD
                A[Christmas] -->|Get money| B(Go shopping)
                B --> C{Let me think}
                C -->|One| D[Laptop]
                C -->|Two| E[iPhone]
        `,
        Format: "png",
    }

    jsonData, _ := json.Marshal(payload)
    
    resp, err := http.Post(
        "http://localhost:8096/api/generate",
        "application/json",
        bytes.NewBuffer(jsonData),
    )
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    file, _ := os.Create("flowchart.png")
    defer file.Close()
    
    io.Copy(file, resp.Body)
    println("✅ Diagram saved as flowchart.png")
}
```

### PHP

```php
<?php
$ch = curl_init('http://localhost:8096/api/generate');

$payload = json_encode([
    'code' => "
        erDiagram
            CUSTOMER ||--o{ ORDER : places
            ORDER ||--|{ LINE-ITEM : contains
            CUSTOMER }|..|{ DELIVERY-ADDRESS : uses
    ",
    'format' => 'png',
    'backgroundColor' => 'white'
]);

curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$result = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    file_put_contents('er-diagram.png', $result);
    echo "✅ Diagram saved as er-diagram.png\n";
} else {
    echo "❌ Error: HTTP $httpCode\n";
}
?>
```

### Java

```java
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class MermaidClient {
    public static void main(String[] args) throws IOException {
        String apiUrl = "http://localhost:8096/api/generate";
        String mermaidCode = """
            gantt
                title Project Timeline
                section Planning
                Requirements :a1, 2024-01-01, 30d
                Design :after a1, 20d
                section Development
                Backend :2024-02-01, 45d
                Frontend :2024-02-15, 40d
        """;
        
        String jsonPayload = String.format(
            "{\"code\":\"%s\",\"format\":\"png\"}",
            mermaidCode.replace("\n", "\\n")
        );
        
        URL url = new URL(apiUrl);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);
        
        try (OutputStream os = conn.getOutputStream()) {
            os.write(jsonPayload.getBytes(StandardCharsets.UTF_8));
        }
        
        try (InputStream is = conn.getInputStream();
             FileOutputStream fos = new FileOutputStream("gantt.png")) {
            is.transferTo(fos);
        }
        
        System.out.println("✅ Diagram saved as gantt.png");
    }
}
```

### Ruby

```ruby
require 'net/http'
require 'json'
require 'uri'

uri = URI('http://localhost:8096/api/generate')
request = Net::HTTP::Post.new(uri, 'Content-Type' => 'application/json')

request.body = {
  code: <<~MERMAID,
    pie title Pets Distribution
        "Dogs" : 386
        "Cats" : 85
        "Rabbits" : 15
  MERMAID
  format: 'png',
  backgroundColor: '#f5f5f5'
}.to_json

response = Net::HTTP.start(uri.hostname, uri.port) do |http|
  http.request(request)
end

File.open('pie-chart.png', 'wb') do |file|
  file.write(response.body)
end

puts "✅ Diagram saved as pie-chart.png"
```

### Bash Script

```bash
#!/bin/bash

# generate-diagram.sh
# Usage: ./generate-diagram.sh <diagram-file.mmd> [format]

DIAGRAM_FILE="$1"
FORMAT="${2:-svg}"
OUTPUT_FILE="${DIAGRAM_FILE%.*}.$FORMAT"

if [ ! -f "$DIAGRAM_FILE" ]; then
    echo "❌ File not found: $DIAGRAM_FILE"
    exit 1
fi

DIAGRAM_CODE=$(cat "$DIAGRAM_FILE")

curl -X POST http://localhost:8096/api/generate \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg code "$DIAGRAM_CODE" --arg format "$FORMAT" \
    '{code: $code, format: $format}')" \
  --output "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Diagram saved as $OUTPUT_FILE"
else
    echo "❌ Failed to generate diagram"
    exit 1
fi
```

---

## Advanced Use Cases

### 1. Batch Processing Script

```python
#!/usr/bin/env python3
"""
Generate diagrams from all .mmd files in a directory
"""
import os
import requests
from pathlib import Path

API_URL = "http://localhost:8096/api/generate"
INPUT_DIR = "./diagrams"
OUTPUT_DIR = "./output"

def generate_diagram(code, filename, format="png"):
    response = requests.post(API_URL, json={
        "code": code,
        "format": format,
        "backgroundColor": "white"
    })
    
    if response.ok:
        output_path = f"{OUTPUT_DIR}/{filename}.{format}"
        with open(output_path, 'wb') as f:
            f.write(response.content)
        print(f"✅ {output_path}")
        return True
    else:
        print(f"❌ Failed: {filename}")
        return False

# Create output directory
Path(OUTPUT_DIR).mkdir(exist_ok=True)

# Process all .mmd files
success_count = 0
for mmd_file in Path(INPUT_DIR).glob("*.mmd"):
    code = mmd_file.read_text()
    if generate_diagram(code, mmd_file.stem):
        success_count += 1

print(f"\n✅ Generated {success_count} diagrams")
```

### 2. CI/CD Integration (GitHub Actions)

```yaml
# .github/workflows/docs-diagrams.yml
name: Generate Documentation Diagrams

on:
  push:
    paths:
      - 'docs/diagrams/*.mmd'

jobs:
  generate-diagrams:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Start Mermaid Backend
        run: |
          docker run -d -p 8096:8096 --name mermaid jamap/mermaid-server:latest
          sleep 15  # Wait for initialization
          curl http://localhost:8096/health
      
      - name: Generate all diagrams
        run: |
          mkdir -p docs/images
          for file in docs/diagrams/*.mmd; do
            filename=$(basename "$file" .mmd)
            curl -X POST http://localhost:8096/api/generate \
              -H "Content-Type: application/json" \
              -d "{\"code\":\"$(cat $file)\",\"format\":\"png\",\"backgroundColor\":\"white\"}" \
              --output "docs/images/$filename.png"
            echo "✅ Generated $filename.png"
          done
      
      - name: Commit generated images
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add docs/images/*.png
          git diff --staged --quiet || git commit -m "🤖 Auto-generate diagrams [skip ci]"
          git push
```

### 3. Web Application Integration

```javascript
// Express.js middleware
const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

// Your app's endpoint that generates diagrams
app.post('/api/reports/:reportId/diagram', async (req, res) => {
  const { reportId } = req.params;
  
  // Fetch report data from your database
  const report = await getReportFromDB(reportId);
  
  // Build Mermaid code from report data
  const mermaidCode = `
    pie title Report #${reportId} - Status Distribution
      "Completed" : ${report.completed}
      "In Progress" : ${report.inProgress}
      "Pending" : ${report.pending}
  `;
  
  // Call Mermaid backend API
  const response = await fetch('http://localhost:8096/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: mermaidCode,
      format: 'png',
      backgroundColor: 'white',
      width: 800,
      height: 600
    })
  });
  
  // Stream the generated image back to client
  response.body.pipe(res);
});

app.listen(3000);
```

### 4. Slack Bot

```javascript
const { App } = require('@slack/bolt');
const fetch = require('node-fetch');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

// Command: /diagram graph TD\n A-->B
app.command('/diagram', async ({ command, ack, respond }) => {
  await ack();
  
  const mermaidCode = command.text;
  
  // Generate diagram via API
  const response = await fetch('http://localhost:8096/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: mermaidCode,
      format: 'png',
      backgroundColor: 'white'
    })
  });
  
  const imageBuffer = await response.buffer();
  
  // Upload to Slack
  // ... upload logic ...
  
  await respond({
    text: 'Here is your diagram:',
    attachments: [{ image_url: uploadedUrl }]
  });
});

app.start(3001);
```

---

## Common API Patterns

### Check Health Before Processing

```python
import requests

def is_backend_ready():
    try:
        response = requests.get('http://localhost:8096/health', timeout=5)
        health = response.json()
        return health.get('status') == 'ok' and health.get('pool', {}).get('ready')
    except:
        return False

if is_backend_ready():
    print("✅ Backend ready, generating diagrams...")
    # ... your code ...
else:
    print("❌ Backend not ready, waiting...")
```

### Error Handling

```javascript
async function generateDiagram(code, format = 'png') {
  try {
    const response = await fetch('http://localhost:8096/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, format })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.error}`);
    }
    
    return await response.buffer();
  } catch (error) {
    console.error('Failed to generate diagram:', error.message);
    throw error;
  }
}
```

### Performance Monitoring

```python
import time
import requests

def generate_with_timing(code, format='png'):
    start = time.time()
    
    response = requests.post('http://localhost:8096/api/generate', json={
        'code': code,
        'format': format
    })
    
    duration = time.time() - start
    render_time = response.headers.get('X-Render-Time', 'N/A')
    
    print(f"Total time: {duration:.2f}s")
    print(f"Backend render time: {render_time}ms")
    print(f"Network overhead: {(duration * 1000) - float(render_time):.0f}ms")
    
    return response.content
```

---

## Tips and Best Practices

### 1. **Cache Diagrams Client-Side**
The backend caches diagrams, but you should too:
```python
import hashlib

def get_cache_key(mermaid_code):
    return hashlib.md5(mermaid_code.encode()).hexdigest()

# Store in Redis, filesystem, or database
cache_key = get_cache_key(mermaid_code)
if cache_exists(cache_key):
    return get_from_cache(cache_key)
else:
    diagram = generate_diagram(mermaid_code)
    save_to_cache(cache_key, diagram)
    return diagram
```

### 2. **Use Appropriate Formats**
- **SVG**: Best for web, scalable, smallest file size
- **PNG**: Good for embedding in documents, predictable rendering
- **PDF**: Best for print, reports, presentations

### 3. **Optimize for Batch Processing**
```python
import asyncio
import aiohttp

async def generate_async(session, code, filename):
    async with session.post('http://localhost:8096/api/generate',
                           json={'code': code, 'format': 'png'}) as response:
        content = await response.read()
        with open(filename, 'wb') as f:
            f.write(content)
        print(f"✅ {filename}")

async def batch_generate(diagrams):
    async with aiohttp.ClientSession() as session:
        tasks = [generate_async(session, code, filename) 
                for code, filename in diagrams]
        await asyncio.gather(*tasks)

# Process multiple diagrams concurrently
asyncio.run(batch_generate([
    ("graph TD\n A-->B", "diagram1.png"),
    ("graph LR\n C-->D", "diagram2.png"),
    ("flowchart TD\n E-->F", "diagram3.png")
]))
```

### 4. **Monitor Backend Health**
```python
import requests
import time

def wait_for_backend(timeout=30):
    start = time.time()
    while time.time() - start < timeout:
        try:
            response = requests.get('http://localhost:8096/health')
            if response.json().get('status') == 'ok':
                return True
        except:
            pass
        time.sleep(1)
    return False

if wait_for_backend():
    print("✅ Backend is ready!")
else:
    print("❌ Backend failed to start")
    exit(1)
```

---

## Troubleshooting

### Backend Not Responding

```bash
# Check if backend is running
curl http://localhost:8096/health

# Check Docker logs
docker logs -f <container-id>

# Restart backend
docker restart <container-id>
```

### Slow Rendering

```bash
# Check pool status
curl http://localhost:8096/health | jq '.pool'

# Expected: {"ready": true, "size": 5}
```

### Invalid Syntax Error

```bash
# Test with minimal diagram
curl -X POST http://localhost:8096/api/generate \
  -H "Content-Type: application/json" \
  -d '{"code":"graph TD\n A-->B","format":"svg"}' \
  -v
```

---

## Next Steps

1. ✅ **Integrate into your application** using examples above
2. 📚 **Read [API_DOCUMENT.md](./API_DOCUMENT.md)** for complete API reference
3. 🎨 **Learn Mermaid syntax** at https://mermaid.js.org/
4. 🚀 **Deploy to production** (see [README.md](./README.md#-deployment))

---

**You're now ready to use the Mermaid Backend API in your applications! 🎉**
