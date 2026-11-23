import { readFile } from "node:fs/promises";
import { runChecks } from "./monitor.js";

function argumentsFrom(argv) {
  const args = { config: "endpoints.json", once: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--config" && argv[i + 1]) args.config = argv[++i];
    else if (argv[i] === "--once") args.once = true;
    else if (argv[i] === "--help" || argv[i] === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return args;
}

function validate(config) {
  if (!Array.isArray(config.endpoints) || config.endpoints.length === 0) {
    throw new Error("Config must contain a non-empty endpoints array.");
  }
  config.intervalSeconds ??= 60;
  config.timeoutMs ??= 8000;
  if (!Number.isFinite(config.intervalSeconds) || config.intervalSeconds < 1) {
    throw new Error("intervalSeconds must be at least 1.");
  }
  if (!Number.isFinite(config.timeoutMs) || config.timeoutMs < 100) {
    throw new Error("timeoutMs must be at least 100.");
  }
  for (const [index, endpoint] of config.endpoints.entries()) {
    if (!endpoint.name || !endpoint.url) throw new Error(`Endpoint ${index + 1} needs a name and url.`);
    const parsed = new URL(endpoint.url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error(`Endpoint ${endpoint.name} must use HTTP or HTTPS.`);
    }
    endpoint.expectedStatus ??= [200];
  }
  return config;
}

function printResults(results) {
  for (const result of results) {
    const state = result.ok ? "UP" : "DOWN";
    const status = result.status === null ? result.error : `HTTP ${result.status}`;
    console.log(`[${state}] ${result.name} — ${status} — ${result.durationMs} ms`);
  }
  const failed = results.filter(result => !result.ok).length;
  console.log(`Checked ${results.length} endpoint(s); ${failed} failed.`);
}

async function main() {
  const args = argumentsFrom(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: node src/index.js [--config file.json] [--once]");
    return;
  }
  const raw = await readFile(args.config, "utf8");
  const config = validate(JSON.parse(raw));
  const check = async () => printResults(await runChecks(config));
  await check();
  if (!args.once) {
    const timer = setInterval(() => {
      check().catch(error => console.error("Check failed:", error.message));
    }, config.intervalSeconds * 1000);
    process.on("SIGINT", () => {
      clearInterval(timer);
      console.log("\nStopped.");
      process.exit(0);
    });
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
