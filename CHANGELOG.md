# Changelog

## [1.0.0] - 2026-03-06

### Added
- Initial release
- `/stack init [preset]` command with minimal, standard, and full presets
- `/stack add <service>` to add services to existing compose files
- `/stack up` to start the stack
- `/stack down` to stop the stack
- `/stack status` to check service health
- `/stack env` to generate secure environment variables
- `stack_init` LLM tool for programmatic stack generation
- Support for 11 services: ollama, n8n, supabase, flowise, neo4j, searxng, qdrant, langfuse, openwebui, postgres, redis
- Automatic volume management
- Health checks for all services
- GPU support for Ollama via NVIDIA runtime
- Cryptographically secure random secrets generation
