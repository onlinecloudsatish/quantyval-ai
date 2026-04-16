# Quantyval AI - Deployment Guide

## Local Development

```bash
# Clone and install
npm install

# Run directly
npm start

# Or with custom config
QUANTYVAL_API_KEY=your-key npm start
```

## Docker

### Quick Start

```bash
# Build and run
cd deploy/docker
cp .env.example .env
# Edit .env with your API key
docker-compose up --build
```

### Services

| Service | Port | Description |
|--------|------|------------|
| quantyval | 3000 | Main agent API |
| redis | 6379 | Memory cache |
| telegram-bridge | 3001 | Telegram bot |
| discord-bridge | 3002 | Discord bot |
| nginx | 80/443 | Reverse proxy |

### Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f quantyval

# Stop
docker-compose down

# Rebuild
docker-compose build --no-cache
```

### Production

1. **Setup SSL** (optional):
```bash
mkdir ssl
# Add cert.pem and key.pem
```

2. **Edit .env**:
```
QUANTYVAL_API_KEY=your-key
LLM_PROVIDER=kilocode
LLM_MODEL=kilo-auto/free
```

3. **Deploy**:
```bash
docker-compose up -d --scale quantyval=3
```

### Kubernetes

```bash
# Deploy to K8s
kubectl apply -f k8s/
```

## Cloud Providers

### Railway
```bash
railway init
railway up
```

### Render
```bash
render-blueprint.yaml
```

### Fly.io
```bash
fly launch
```

## Health Checks

```bash
# Local
curl http://localhost:3000/health

# Docker
docker exec quantyval-ai wget -q -O- http://localhost:3000/health
```

## Scaling

```bash
# Scale to 3 instances
docker-compose up -d --scale quantyval=3
```

## Monitoring

```bash
# View metrics
docker stats quantyval-ai
```