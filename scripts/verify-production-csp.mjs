import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = Number(process.env.CSP_VERIFY_PORT || 3010);
const origin = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
  {
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  },
);
let serverOutput = "";
server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

async function fetchWhenReady() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      return await fetch(origin);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error(`Next production server tidak siap. ${serverOutput}`);
}

try {
  const firstResponse = await fetchWhenReady();
  const firstHtml = await firstResponse.text();
  const secondResponse = await fetch(origin);
  const secondHtml = await secondResponse.text();
  const firstCsp = firstResponse.headers.get("content-security-policy") || "";
  const secondCsp = secondResponse.headers.get("content-security-policy") || "";
  const firstNonce = firstCsp.match(/'nonce-([^']+)'/)?.[1] || "";
  const secondNonce = secondCsp.match(/'nonce-([^']+)'/)?.[1] || "";
  const firstScripts = firstHtml.match(/<script\b[^>]*>/gi) || [];
  const secondScripts = secondHtml.match(/<script\b[^>]*>/gi) || [];
  const nonceFromScript = (tag) => tag.match(/\bnonce="([^"]+)"/i)?.[1] || "";

  assert.equal(firstResponse.status, 200);
  assert.match(firstCsp, /frame-ancestors 'none'/);
  assert.doesNotMatch(firstCsp, /script-src[^;]*'unsafe-inline'/);
  assert.ok(firstNonce && secondNonce && firstNonce !== secondNonce);
  assert.ok(firstScripts.length > 0);
  assert.ok(secondScripts.length > 0);
  assert.ok(firstScripts.every((tag) => nonceFromScript(tag) === firstNonce));
  assert.ok(secondScripts.every((tag) => nonceFromScript(tag) === secondNonce));

  process.stdout.write(
    `${JSON.stringify({
      status: "passed",
      csp_present: true,
      nonce_changes_per_request: true,
      script_unsafe_inline: false,
      scripts_checked: firstScripts.length + secondScripts.length,
    })}\n`,
  );
} finally {
  server.kill();
  await new Promise((resolve) => {
    if (server.exitCode !== null) return resolve();
    server.once("exit", resolve);
    setTimeout(resolve, 3000).unref();
  });
}
