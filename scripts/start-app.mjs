// Starts the application under test with Docker, seeds its database and waits until it is ready.
// Node built-ins only, so it works on Windows, macOS and Linux and needs no `npm install` first.
//   node scripts/start-app.mjs          start and seed
//   node scripts/start-app.mjs --stop   stop and remove the containers and data
import { spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const composeFile = 'infra/toolshop/docker-compose.yml';
const apiUrl = process.env.API_URL ?? 'http://localhost:8091';
const uiUrl = process.env.UI_URL ?? 'http://localhost:4200';

function compose(...args) {
  const result = spawnSync('docker', ['compose', '-f', composeFile, ...args], { stdio: 'inherit' });
  if (result.error) {
    throw new Error(`Could not run docker: ${result.error.message}. Is Docker installed and running?`);
  }
  if (result.status !== 0) {
    throw new Error(`docker compose ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

async function waitFor(url, label, timeoutSeconds = 240) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (response.ok) {
        console.log(`ready: ${label} (${url})`);
        return;
      }
    } catch {
      // not up yet
    }
    await sleep(3000);
  }
  throw new Error(`${label} was not ready at ${url} after ${timeoutSeconds}s`);
}

if (process.argv.includes('--stop')) {
  compose('down', '-v');
} else {
  compose('up', '-d');
  await waitFor(`${apiUrl}/status`, 'API');
  console.log('seeding the database...');
  compose('exec', '-T', 'laravel-api', 'php', 'artisan', 'migrate:fresh', '--seed', '--force');
  await waitFor(`${apiUrl}/products`, 'API data');
  await waitFor(uiUrl, 'UI');
  console.log('\nThe application is ready.');
}
