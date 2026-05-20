#!/bin/bash
# Atheel Platform: Generate production secrets
# Usage: bash infra/init-secrets.sh

set -euo pipefail

SECRETS_DIR="$(dirname "$0")/../secrets"
mkdir -p "$SECRETS_DIR"

generate_secret() {
  openssl rand -base64 32 | tr -d '\n'
}

echo "Generating Atheel production secrets..."

# Database
DB_PASS=$(generate_secret)
echo -n "$DB_PASS" > "$SECRETS_DIR/db_password.txt"
echo -n "postgresql://atheel:${DB_PASS}@postgres:5432/atheel?schema=public" > "$SECRETS_DIR/database_url.txt"

# Auth
echo -n "$(generate_secret)" > "$SECRETS_DIR/jwt_secret.txt"
echo -n "$(generate_secret)" > "$SECRETS_DIR/refresh_pepper.txt"

# Worker
echo -n "$(generate_secret)" > "$SECRETS_DIR/worker_token.txt"

# Exports renderer
echo -n "$(generate_secret)" > "$SECRETS_DIR/renderer_token.txt"

# MinIO
echo -n "$(generate_secret)" > "$SECRETS_DIR/minio_password.txt"

# RabbitMQ
echo -n "$(generate_secret)" > "$SECRETS_DIR/rmq_password.txt"

# Set permissions
chmod 600 "$SECRETS_DIR"/*.txt

echo "✅ Secrets generated in $SECRETS_DIR/"
echo ""
echo "Next steps:"
echo "  1. Review and customize secrets if needed"
echo "  2. docker compose -f infra/docker-compose.prod.yml up -d"
echo "  3. Verify: curl http://localhost:3001/api/health"
