import { appendFile } from "node:fs/promises";

export async function checkEndpoint(endpoint, timeoutMs) {
  const started = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let result;

  try {
    const response = await fetch(endpoint.url, {
      method: endpoint.method || "GET",
      headers: endpoint.headers || {},
      signal: controller.signal,
      redirect: "follow"
    });
    const durationMs = Math.round(performance.now() - started);
    const expected = endpoint.expectedStatus || [200];
    result = {
      timestamp: new Date().toISOString(),
      name: endpoint.name,
      url: endpoint.url,
      ok: expected.includes(response.status),
      status: response.status,
      durationMs,
      error: null
    };
    // Do not download response bodies; monitoring should stay lightweight.
    await response.body?.cancel().catch(() => {});
  } catch (error) {
    result = {
      timestamp: new Date().toISOString(),
      name: endpoint.name,
      url: endpoint.url,
      ok: false,
      status: null,
      durationMs: Math.round(performance.now() - started),
      error: error.name === "AbortError" ? `Timed out after ${timeoutMs} ms` : error.message
    };
  } finally {
    clearTimeout(timeout);
  }
  return result;
}

export async function runChecks(config) {
  const results = await Promise.all(config.endpoints.map(endpoint =>
    checkEndpoint(endpoint, config.timeoutMs)
  ));
  if (config.historyFile) {
    const lines = results.map(result => JSON.stringify(result)).join("\n") + "\n";
    await appendFile(config.historyFile, lines, "utf8");
  }
  return results;
}
