import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { checkEndpoint } from "../src/monitor.js";

test("reports an expected HTTP response as healthy", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(204);
    response.end();
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    const result = await checkEndpoint(
      { name: "local", url: `http://127.0.0.1:${address.port}`, expectedStatus: [204] },
      1000
    );
    assert.equal(result.ok, true);
    assert.equal(result.status, 204);
    assert.equal(typeof result.durationMs, "number");
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test("marks an unexpected status as unhealthy", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(503);
    response.end("maintenance");
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    const result = await checkEndpoint(
      { name: "local", url: `http://127.0.0.1:${address.port}`, expectedStatus: [200] },
      1000
    );
    assert.equal(result.ok, false);
    assert.equal(result.status, 503);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
