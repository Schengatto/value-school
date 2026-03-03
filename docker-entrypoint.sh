#!/bin/sh
set -e

echo "Running database migrations..."
npx drizzle-kit migrate

echo "Starting Nuxt server..."
exec node .output/server/index.mjs
