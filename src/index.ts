import type { Extension } from "./types.js";
import { randomBytes } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

// Service template definitions
const serviceTemplates = {
  ollama: `  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    runtime: nvidia  # GPU support (requires NVIDIA Docker runtime)
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 30s
      timeout: 10s
      retries: 3`,

  n8n: `  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
    environment:
      - N8N_ENCRYPTION_KEY=\${N8N_ENCRYPTION_KEY}
      - N8N_HOST=\${N8N_HOST:-localhost}
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:5678/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3`,

  supabase: `  supabase-db:
    image: supabase/postgres:15.1.0.117
    container_name: supabase-db
    ports:
      - "54322:5432"
    volumes:
      - supabase_db:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
      - POSTGRES_DB=postgres
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  supabase-studio:
    image: supabase/studio:latest
    container_name: supabase-studio
    ports:
      - "54321:3000"
    environment:
      - SUPABASE_URL=http://supabase-kong:8000
      - SUPABASE_ANON_KEY=\${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_KEY=\${SUPABASE_SERVICE_ROLE_KEY}
    restart: unless-stopped

  supabase-kong:
    image: kong:2.8.1
    container_name: supabase-kong
    ports:
      - "8000:8000"
    environment:
      - KONG_DATABASE=off
      - KONG_DECLARATIVE_CONFIG=/var/lib/kong/kong.yml
      - KONG_DNS_ORDER=LAST,A,CNAME
      - KONG_PLUGINS=request-transformer,cors,key-auth,acl
    volumes:
      - ./kong.yml:/var/lib/kong/kong.yml:ro
    restart: unless-stopped
    depends_on:
      - supabase-db`,

  flowise: `  flowise:
    image: flowiseai/flowise:latest
    container_name: flowise
    ports:
      - "3001:3000"
    volumes:
      - flowise_data:/root/.flowise
    environment:
      - PORT=3000
      - DATABASE_PATH=/root/.flowise
      - APIKEY_PATH=/root/.flowise
      - SECRETKEY_PATH=/root/.flowise
      - LOG_LEVEL=info
    restart: unless-stopped`,

  neo4j: `  neo4j:
    image: neo4j:5-community
    container_name: neo4j
    ports:
      - "7474:7474"  # Browser
      - "7687:7687"  # Bolt
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
    environment:
      - NEO4J_AUTH=\${NEO4J_AUTH:-neo4j/password}
      - NEO4J_PLUGINS=["apoc"]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "cypher-shell", "-u", "neo4j", "-p", "password", "RETURN 1"]
      interval: 30s
      timeout: 10s
      retries: 3`,

  searxng: `  searxng:
    image: searxng/searxng:latest
    container_name: searxng
    ports:
      - "8080:8080"
    volumes:
      - searxng_data:/etc/searxng
    environment:
      - SEARXNG_BASE_URL=http://localhost:8080
    restart: unless-stopped`,

  qdrant: `  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant
    ports:
      - "6333:6333"  # HTTP API
      - "6334:6334"  # gRPC
    volumes:
      - qdrant_storage:/qdrant/storage
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 30s
      timeout: 10s
      retries: 3`,

  langfuse: `  langfuse:
    image: langfuse/langfuse:latest
    container_name: langfuse
    ports:
      - "3002:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:\${POSTGRES_PASSWORD}@postgres:5432/langfuse
      - NEXTAUTH_SECRET=\${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=http://localhost:3002
      - SALT=\${LANGFUSE_SALT}
    depends_on:
      - postgres
    restart: unless-stopped`,

  openwebui: `  openwebui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: openwebui
    ports:
      - "3000:8080"
    volumes:
      - openwebui_data:/app/backend/data
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
    restart: unless-stopped`,

  postgres: `  postgres:
    image: postgres:16-alpine
    container_name: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
      - POSTGRES_USER=postgres
      - POSTGRES_DB=postgres
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 10s
      timeout: 5s
      retries: 5`,

  redis: `  redis:
    image: redis:7-alpine
    container_name: redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5`,
};

// Volume definitions
const volumeMap: Record<string, string[]> = {
  ollama: ["ollama_data"],
  n8n: ["n8n_data"],
  supabase: ["supabase_db"],
  flowise: ["flowise_data"],
  neo4j: ["neo4j_data", "neo4j_logs"],
  searxng: ["searxng_data"],
  qdrant: ["qdrant_storage"],
  langfuse: [],
  openwebui: ["openwebui_data"],
  postgres: ["postgres_data"],
  redis: ["redis_data"],
};

// Preset configurations
const presets: Record<string, string[]> = {
  minimal: ["ollama"],
  standard: ["ollama", "n8n", "supabase"],
  full: ["ollama", "n8n", "supabase", "flowise", "neo4j", "searxng"],
};

// Environment variable requirements
const envVars: Record<string, string[]> = {
  n8n: ["N8N_ENCRYPTION_KEY"],
  supabase: ["POSTGRES_PASSWORD", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "JWT_SECRET"],
  neo4j: ["NEO4J_AUTH"],
  langfuse: ["NEXTAUTH_SECRET", "LANGFUSE_SALT", "POSTGRES_PASSWORD"],
  postgres: ["POSTGRES_PASSWORD"],
};

function generateSecret(bytes: number = 32): string {
  return randomBytes(bytes).toString("hex");
}

function generateDockerCompose(services: string[]): string {
  const servicesYaml = services.map((s) => serviceTemplates[s as keyof typeof serviceTemplates]).join("\n\n");

  const allVolumes = new Set<string>();
  services.forEach((s) => {
    const vols = volumeMap[s] || [];
    vols.forEach((v) => allVolumes.add(v));
  });

  const volumesYaml = Array.from(allVolumes)
    .map((v) => `  ${v}:`)
    .join("\n");

  return `# Generated by pi-stack
# AI Infrastructure Stack
version: "3.8"

services:
${servicesYaml}

volumes:
${volumesYaml}

networks:
  default:
    name: ai-stack
`;
}

function generateEnv(services: string[]): string {
  const requiredVars = new Set<string>();
  services.forEach((s) => {
    const vars = envVars[s] || [];
    vars.forEach((v) => requiredVars.add(v));
  });

  const lines = ["# Generated by pi-stack", "# Environment variables for AI stack", ""];

  if (requiredVars.has("N8N_ENCRYPTION_KEY")) {
    lines.push(`N8N_ENCRYPTION_KEY=${generateSecret()}`);
    lines.push('N8N_HOST=localhost');
    lines.push("");
  }

  if (requiredVars.has("POSTGRES_PASSWORD")) {
    lines.push(`POSTGRES_PASSWORD=${generateSecret(16)}`);
    lines.push("");
  }

  if (requiredVars.has("SUPABASE_ANON_KEY")) {
    lines.push(`SUPABASE_ANON_KEY=${generateSecret(32)}`);
    lines.push(`SUPABASE_SERVICE_ROLE_KEY=${generateSecret(32)}`);
    lines.push(`JWT_SECRET=${generateSecret(32)}`);
    lines.push("");
  }

  if (requiredVars.has("NEO4J_AUTH")) {
    lines.push(`NEO4J_AUTH=neo4j/${generateSecret(16)}`);
    lines.push("");
  }

  if (requiredVars.has("NEXTAUTH_SECRET")) {
    lines.push(`NEXTAUTH_SECRET=${generateSecret()}`);
    lines.push(`LANGFUSE_SALT=${generateSecret()}`);
    lines.push("");
  }

  return lines.join("\n");
}

function parseExistingCompose(path: string): string[] {
  try {
    const content = readFileSync(path, "utf-8");
    const services: string[] = [];
    
    // Simple regex to extract service names
    const serviceMatches = content.matchAll(/^  (\w+[-\w]*):$/gm);
    for (const match of serviceMatches) {
      const serviceName = match[1];
      // Map container names back to our service keys
      if (serviceName === "supabase-db") services.push("supabase");
      else if (serviceName.startsWith("supabase-")) continue; // Skip other supabase services
      else if (Object.keys(serviceTemplates).includes(serviceName)) {
        services.push(serviceName);
      }
    }
    
    return services;
  } catch {
    return [];
  }
}

const extension: Extension = {
  name: "pi-stack",

  commands: [
    {
      name: "/stack init",
      description: "Generate docker-compose.yml with preset configuration",
      handler: async (args, _context, view) => {
        const preset = args[0] || "standard";

        if (!presets[preset]) {
          view.addMessage({
            role: "assistant",
            text: `Unknown preset: ${preset}\n\nAvailable presets:\n- minimal: Ollama only\n- standard: Ollama + n8n + Supabase\n- full: Ollama + n8n + Supabase + Flowise + Neo4j + SearXNG`,
          });
          return;
        }

        const services = presets[preset];
        const composeYaml = generateDockerCompose(services);
        const envContent = generateEnv(services);

        writeFileSync("docker-compose.yml", composeYaml);
        writeFileSync(".env.example", envContent);

        view.addMessage({
          role: "assistant",
          text: `✓ Generated docker-compose.yml with ${preset} preset (${services.join(", ")})\n✓ Generated .env.example with secure random secrets\n\nNext steps:\n1. Copy .env.example to .env: cp .env.example .env\n2. Review and adjust .env if needed\n3. Start stack: /stack up`,
        });
      },
    },

    {
      name: "/stack add",
      description: "Add a service to existing docker-compose.yml",
      handler: async (args, _context, view) => {
        const service = args[0];

        if (!service || !serviceTemplates[service as keyof typeof serviceTemplates]) {
          view.addMessage({
            role: "assistant",
            text: `Invalid service: ${service}\n\nAvailable services:\n${Object.keys(serviceTemplates).join(", ")}`,
          });
          return;
        }

        if (!existsSync("docker-compose.yml")) {
          view.addMessage({
            role: "assistant",
            text: "No docker-compose.yml found. Run /stack init first.",
          });
          return;
        }

        const existing = parseExistingCompose("docker-compose.yml");
        if (existing.includes(service)) {
          view.addMessage({
            role: "assistant",
            text: `Service ${service} already exists in docker-compose.yml`,
          });
          return;
        }

        const allServices = [...existing, service];
        const composeYaml = generateDockerCompose(allServices);
        const envContent = generateEnv(allServices);

        writeFileSync("docker-compose.yml", composeYaml);
        writeFileSync(".env.example", envContent);

        view.addMessage({
          role: "assistant",
          text: `✓ Added ${service} to docker-compose.yml\n✓ Updated .env.example\n\nDon't forget to update your .env file with new variables if needed.`,
        });
      },
    },

    {
      name: "/stack up",
      description: "Start the stack with docker compose up -d",
      handler: async (_args, _context, view) => {
        if (!existsSync("docker-compose.yml")) {
          view.addMessage({
            role: "assistant",
            text: "No docker-compose.yml found. Run /stack init first.",
          });
          return;
        }

        try {
          const output = execSync("docker compose up -d", { encoding: "utf-8" });
          view.addMessage({
            role: "assistant",
            text: `✓ Stack started\n\n${output}\n\nRun /stack status to check service health.`,
          });
        } catch (error: any) {
          view.addMessage({
            role: "assistant",
            text: `Failed to start stack:\n${error.message}`,
          });
        }
      },
    },

    {
      name: "/stack down",
      description: "Stop the stack with docker compose down",
      handler: async (_args, _context, view) => {
        try {
          const output = execSync("docker compose down", { encoding: "utf-8" });
          view.addMessage({
            role: "assistant",
            text: `✓ Stack stopped\n\n${output}`,
          });
        } catch (error: any) {
          view.addMessage({
            role: "assistant",
            text: `Failed to stop stack:\n${error.message}`,
          });
        }
      },
    },

    {
      name: "/stack status",
      description: "Check health of running services",
      handler: async (_args, _context, view) => {
        try {
          const output = execSync("docker compose ps", { encoding: "utf-8" });
          view.addMessage({
            role: "assistant",
            text: `Current stack status:\n\n${output}`,
          });
        } catch (error: any) {
          view.addMessage({
            role: "assistant",
            text: `Failed to get status:\n${error.message}`,
          });
        }
      },
    },

    {
      name: "/stack env",
      description: "Generate .env template with secure random secrets",
      handler: async (_args, _context, view) => {
        if (!existsSync("docker-compose.yml")) {
          view.addMessage({
            role: "assistant",
            text: "No docker-compose.yml found. Run /stack init first.",
          });
          return;
        }

        const existing = parseExistingCompose("docker-compose.yml");
        const envContent = generateEnv(existing);

        writeFileSync(".env.example", envContent);

        view.addMessage({
          role: "assistant",
          text: `✓ Generated .env.example with secure random secrets\n\nCopy to .env: cp .env.example .env`,
        });
      },
    },
  ],

  tools: [
    {
      name: "stack_init",
      description: "Generate a docker-compose.yml configuration for specified AI infrastructure services",
      schema: {
        type: "object",
        properties: {
          services: {
            type: "array",
            items: {
              type: "string",
              enum: Object.keys(serviceTemplates),
            },
            description: "List of services to include in the stack",
          },
          output_path: {
            type: "string",
            description: "Path where docker-compose.yml should be written (default: current directory)",
            default: ".",
          },
        },
        required: ["services"],
      },
      handler: async (params) => {
        const { services, output_path = "." } = params;

        const composeYaml = generateDockerCompose(services);
        const envContent = generateEnv(services);

        const composePath = join(output_path, "docker-compose.yml");
        const envPath = join(output_path, ".env.example");

        writeFileSync(composePath, composeYaml);
        writeFileSync(envPath, envContent);

        return {
          success: true,
          compose_path: composePath,
          env_path: envPath,
          services: services,
          message: `Generated docker-compose.yml with ${services.length} services. Copy .env.example to .env and run 'docker compose up -d' to start.`,
        };
      },
    },
  ],
};

export default extension;
