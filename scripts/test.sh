#!/bin/bash
# Lokaler Ende-zu-Ende-Test: fake-store (8788) + wrangler dev (8787) mit lokaler D1/R2, dann scripts/test.mjs
set -e
cd "$(dirname "$0")/.."
npm run -s check
printf 'STORE_URL=http://127.0.0.1:8788\nSTORE_SCHLUESSEL=test-schluessel\n' > .dev.vars.test
rm -rf .wrangler-test
npx wrangler d1 migrations apply inventar --local --persist-to .wrangler-test >/dev/null
node scripts/fake-store.mjs > .wrangler-test/store.log 2>&1 & S=$!
npx wrangler dev --port 8787 --ip 127.0.0.1 --persist-to .wrangler-test --env-file .dev.vars.test --show-interactive-dev-session=false > .wrangler-test/dev.log 2>&1 & W=$!
trap 'kill $S $W 2>/dev/null; rm -f .dev.vars.test' EXIT
for i in $(seq 1 60); do curl -s -o /dev/null http://127.0.0.1:8787/kit/version && break; sleep 1; done
node scripts/test.mjs || { echo "--- dev.log"; tail -40 .wrangler-test/dev.log; exit 1; }
