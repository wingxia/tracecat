#!/usr/bin/env bash
# Verify that the external PostgreSQL override removes the bundled database
# service and its migration dependency for every supported Compose base.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
work_dir="$(mktemp -d)"
cleanup() {
    result=$?
    if [[ $result != 0 && -f "$work_dir/warnings.log" ]]; then
        tail -10 "$work_dir/warnings.log" >&2
    fi
    rm -R "$work_dir"
}
trap cleanup EXIT

# Test only synthetic settings, regardless of the caller's shell or .env.
unset COMPOSE_FILE COMPOSE_PROFILES COMPOSE_PROJECT_NAME COMPOSE_ENV_FILES
unset TRACECAT__DB_URI

cat > "$work_dir/.env" <<'EOF'
PUBLIC_APP_PORT=8080
TRACECAT__LOCAL_REPOSITORY_PATH=/tmp/synthetic-registry
TRACECAT__DB_URI=postgresql+psycopg://tracecat:synthetic-password@db.example.com:5432/tracecat
EOF

for compose_file in docker-compose.yml docker-compose.local.yml docker-compose.dev.yml; do
    cp "$repo_root/$compose_file" "$work_dir/base.yml"
    cp "$repo_root/docker-compose.external-db.yml" "$work_dir/external-db.yml"
    docker compose \
        --env-file "$work_dir/.env" \
        -f "$work_dir/base.yml" \
        -f "$work_dir/external-db.yml" \
        config --format json > "$work_dir/config.json" 2> "$work_dir/warnings.log"

    python3 - "$work_dir/config.json" "$compose_file" <<'PY'
import json
import sys

config = json.load(open(sys.argv[1]))
compose_file = sys.argv[2]
services = config["services"]
assert "postgres_db" not in services, compose_file
assert "depends_on" not in services["migrations"], compose_file
expected_uri = "postgresql+psycopg://tracecat:synthetic-password@db.example.com:5432/tracecat"
for service in services.values():
    environment = service.get("environment", {})
    if "TRACECAT__DB_URI" in environment:
        assert environment["TRACECAT__DB_URI"] == expected_uri, compose_file
assert services["api"]["depends_on"]["migrations"]["condition"] == "service_completed_successfully"
PY

    echo "PASS: $compose_file supports the external PostgreSQL override"
done

cp "$repo_root/docker-compose.dev.yml" "$work_dir/dev.yml"
cp "$repo_root/docker-compose.lite.yml" "$work_dir/lite.yml"
docker compose \
    --env-file "$work_dir/.env" \
    -f "$work_dir/dev.yml" \
    -f "$work_dir/lite.yml" \
    -f "$work_dir/external-db.yml" \
    config --format json > "$work_dir/lite-config.json" 2> "$work_dir/warnings.log"

python3 - "$work_dir/lite-config.json" <<'PY'
import json
import sys

services = json.load(open(sys.argv[1]))["services"]
assert "postgres_db" not in services, "docker-compose.dev.yml + docker-compose.lite.yml"
assert "depends_on" not in services["migrations"], (
    "docker-compose.dev.yml + docker-compose.lite.yml"
)
PY

echo "PASS: docker-compose.dev.yml + docker-compose.lite.yml supports the external PostgreSQL override"
