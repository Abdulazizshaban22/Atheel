# AI Runtime Enablement Checklist
## Local
- [ ] Set VLLM_BASE_URL and VLLM_MODEL_NAME in .env
- [ ] Run Prisma migrate and generate client
- [ ] Start API and Web
- [ ] Open /ai page and verify runtime health
- [ ] Register provider (or use env provider)
- [ ] Ingest one knowledge document
- [ ] Execute RAG retrieve_only
- [ ] Execute RAG synthesize
- [ ] Execute Agent run

## Stage / Production-like
- [ ] TLS and reverse proxy for API/Web
- [ ] Private network routing to vLLM
- [ ] Resource sizing for vLLM (GPU/CPU/RAM)
- [ ] Secrets in vault (not .env files in image)
- [ ] Request/response logs and rate limiting
- [ ] Human approval gate before publish
- [ ] Prompt and model version pinning
- [ ] Monitoring latency / errors / token usage
