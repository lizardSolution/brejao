#!/bin/sh
set -e

echo "Aguardando PostgreSQL ficar disponivel..."

# Retry connection to PostgreSQL up to 30 times (1 second intervals)
MAX_RETRIES=30
RETRIES=0

until node -e "
  const pg = require('pg');
  const client = process.env.DATABASE_URL
    ? new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    : new pg.Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: 'postgres'
      });
  client.connect().then(() => { client.end(); process.exit(0); }).catch((err) => { console.error(err.message); process.exit(1); });
" > /dev/null 2>&1; do
  RETRIES=$((RETRIES + 1))
  if [ $RETRIES -ge $MAX_RETRIES ]; then
    echo "ERRO: PostgreSQL nao ficou disponivel a tempo."
    exit 1
  fi
  echo "  tentativa $RETRIES/$MAX_RETRIES..."
  sleep 1
done

echo "PostgreSQL disponivel! Executando setup do banco..."
node server/setup.js

echo "Iniciando servidor..."
exec node server/index.js
