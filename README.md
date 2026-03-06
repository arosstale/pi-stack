# pi-stack

Docker Compose configuration generator for local AI infrastructure stacks.

## Installation

```bash
npm install -g @artale/pi-stack
```

Add to your pi `settings.json`:

```json
{
  "extensions": ["@artale/pi-stack"]
}
```

## Commands

### `/stack init [preset]`

Generate a docker-compose.yml with a preset configuration.

**Presets:**
- `minimal` - Ollama only
- `standard` - Ollama + n8n + Supabase (default)
- `full` - Ollama + n8n + Supabase + Flowise + Neo4j + SearXNG

```bash
/stack init full
```

### `/stack add <service>`

Add a service to existing docker-compose.yml.

**Available services:**
- `ollama` - Local LLM server (port 11434)
- `n8n` - Workflow automation (port 5678)
- `supabase` - Backend-as-a-Service (ports 8000, 54321, 54322)
- `flowise` - LLM app builder (port 3001)
- `neo4j` - Graph database (ports 7474, 7687)
- `searxng` - Privacy-respecting search (port 8080)
- `qdrant` - Vector database (ports 6333, 6334)
- `langfuse` - LLM observability (port 3002)
- `openwebui` - Ollama web UI (port 3000)
- `postgres` - PostgreSQL database (port 5432)
- `redis` - In-memory cache (port 6379)

```bash
/stack add qdrant
```

### `/stack up`

Start the stack with `docker compose up -d`.

```bash
/stack up
```

### `/stack down`

Stop the stack with `docker compose down`.

```bash
/stack down
```

### `/stack status`

Check health of running services.

```bash
/stack status
```

### `/stack env`

Generate `.env.example` template with secure random secrets.

```bash
/stack env
```

## LLM Tool

The extension also provides a `stack_init` tool that LLMs can use to generate docker-compose configurations:

```typescript
{
  name: "stack_init",
  description: "Generate a docker-compose.yml configuration for specified AI infrastructure services",
  schema: {
    services: ["ollama", "n8n", "qdrant"],
    output_path: "."
  }
}
```

## Service Details

Each service includes:
- ✓ Proper port mappings
- ✓ Volume mounts for persistence
- ✓ Health checks
- ✓ Environment variables with sensible defaults
- ✓ Restart policies
- ✓ Comments explaining purpose

### Ollama
- **Ports:** 11434
- **Features:** GPU support via NVIDIA runtime
- **Use case:** Run local LLMs (Llama, Mistral, etc.)

### n8n
- **Ports:** 5678
- **Features:** Visual workflow automation
- **Use case:** Integrate AI services with apps and APIs

### Supabase
- **Ports:** 8000 (API), 54321 (Studio), 54322 (Postgres)
- **Features:** Complete backend with auth, storage, realtime
- **Use case:** Backend for AI applications

### Flowise
- **Ports:** 3001
- **Features:** Low-code LLM app builder
- **Use case:** Build LangChain flows visually

### Neo4j
- **Ports:** 7474 (browser), 7687 (bolt)
- **Features:** Graph database with APOC plugins
- **Use case:** Knowledge graphs, RAG applications

### SearXNG
- **Ports:** 8080
- **Features:** Privacy-respecting metasearch
- **Use case:** Web search for AI agents

### Qdrant
- **Ports:** 6333 (HTTP), 6334 (gRPC)
- **Features:** Vector similarity search
- **Use case:** Embeddings storage for RAG

### Langfuse
- **Ports:** 3002
- **Features:** LLM observability and analytics
- **Use case:** Monitor and debug LLM applications

### Open WebUI
- **Ports:** 3000
- **Features:** ChatGPT-style UI for Ollama
- **Use case:** User-friendly interface for local models

## Workflow

1. Initialize stack with preset:
   ```bash
   /stack init full
   ```

2. Copy environment template:
   ```bash
   cp .env.example .env
   ```

3. Review and adjust `.env` if needed

4. Start services:
   ```bash
   /stack up
   ```

5. Check status:
   ```bash
   /stack status
   ```

6. Add more services as needed:
   ```bash
   /stack add qdrant
   /stack up
   ```

## Environment Variables

All secrets are generated using cryptographically secure random bytes:
- `N8N_ENCRYPTION_KEY` - n8n credential encryption (64 chars)
- `POSTGRES_PASSWORD` - PostgreSQL password (32 chars)
- `SUPABASE_ANON_KEY` - Supabase anonymous key (64 chars)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key (64 chars)
- `JWT_SECRET` - JWT signing secret (64 chars)
- `NEO4J_AUTH` - Neo4j username/password
- `NEXTAUTH_SECRET` - NextAuth.js secret (64 chars)
- `LANGFUSE_SALT` - Langfuse encryption salt (64 chars)

## Requirements

- Docker with Docker Compose v2
- (Optional) NVIDIA Docker runtime for GPU support

## License

MIT © 2026 Artale
