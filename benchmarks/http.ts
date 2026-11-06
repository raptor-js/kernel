import { once } from "node:events";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

import autocannon from "autocannon";

import { scenarios } from "./scenarios.ts";

const frameworks = ["raptor", "hono", "h3", "express", "koa", "fastify"];

const PORT = 3100;
const APP_URL = `http://127.0.0.1:${PORT}/`;
const SERVER = fileURLToPath(new URL("./http-server.ts", import.meta.url));

/**
 * Wait for the server that was just started to answer.
 */
const waitUntilReady = async (): Promise<void> => {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      await fetch(APP_URL);

      return;
    } catch {
      await sleep(50);
    }
  }

  throw new Error(`No server answered on ${APP_URL}`);
};

for (const [index, scenario] of scenarios.entries()) {
  console.log(`\n${scenario.name}`);

  for (const name of frameworks) {
    // Each server runs in its own process, so no framework shares a heap or event loop with the load.
    const server = spawn(
      process.execPath,
      [SERVER, name, String(index), String(PORT)],
      {
        stdio: "ignore",
      },
    );

    try {
      await waitUntilReady();

      // A short unmeasured run first, so the JIT has warmed up before the one that counts.
      await autocannon({ url: APP_URL, connections: 50, duration: 1 });

      const result = await autocannon({
        url: APP_URL,
        connections: 50,
        duration: 5,
      });

      const failed = result.non2xx + result.errors;
      const rate = Math.round(result.requests.average).toLocaleString("en");

      console.log(
        `  ${name.padEnd(8)} ${rate.padStart(8)} req/s   p50 ${result.latency.p50} ms   p99 ${result.latency.p99} ms${failed ? `   ${failed} failed` : ""}`,
      );
    } finally {
      server.kill();

      await once(server, "exit");
    }
  }
}
