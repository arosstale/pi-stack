# Basic Stack Example

This example shows how to create a minimal AI stack with Ollama and n8n.

## Steps

1. Create a new directory for your stack:
```bash
mkdir my-ai-stack
cd my-ai-stack
```

2. Initialize with standard preset:
```bash
/stack init standard
```

This creates:
- `docker-compose.yml` with Ollama, n8n, and Supabase
- `.env.example` with secure random secrets

3. Copy environment template:
```bash
cp .env.example .env
```

4. Start the stack:
```bash
/stack up
```

5. Check status:
```bash
/stack status
```

## Services Available

After starting, you can access:

- **Ollama API**: http://localhost:11434
- **n8n**: http://localhost:5678
- **Supabase Studio**: http://localhost:54321
- **Supabase API**: http://localhost:8000

## Adding More Services

Add Qdrant for vector search:
```bash
/stack add qdrant
/stack up
```

Add Flowise for visual LLM workflows:
```bash
/stack add flowise
/stack up
```

## Stopping the Stack

```bash
/stack down
```

## Cleanup

To remove all volumes and data:
```bash
docker compose down -v
```
