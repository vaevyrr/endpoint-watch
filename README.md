# Endpoint Watch

A small Node.js uptime checker for HTTP endpoints. It reads a JSON config, records status/latency results as JSON Lines, and can run once or poll continuously.

## Requirements

Node.js 20+. No dependencies; uses the built-in `fetch` API.

## Setup

Edit `endpoints.example.json` or make your own config file:

```json
{
  "intervalSeconds": 60,
  "timeoutMs": 8000,
  "historyFile": "history.jsonl",
  "endpoints": [
    { "name": "Example", "url": "https://example.com", "expectedStatus": [200, 204] }
  ]
}
```

Run one check:

```bash
node src/index.js --config endpoints.example.json --once
```

Poll until stopped with Ctrl+C:

```bash
node src/index.js --config endpoints.example.json
```

Each result is appended to the configured history file. The tool reports HTTP status and response time; it does not claim an endpoint is healthy merely because a TCP connection was made. Redirects are followed by default, as in Node's fetch.

## License

MIT
