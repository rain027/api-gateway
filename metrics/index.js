const client = require('prom-client');

// Collect default Node.js metrics (memory, CPU etc) for free
client.collectDefaultMetrics();

const requestsTotal = new client.Counter({
  name: 'gateway_requests_total',
  help: 'Total requests',
  labelNames: ['route', 'status'],
});

const requestDuration = new client.Histogram({
  name: 'gateway_request_duration_ms',
  help: 'Request duration in ms',
  labelNames: ['route'],
  buckets: [5, 10, 25, 50, 100, 250, 500],
});

const throttledTotal = new client.Counter({
  name: 'gateway_requests_throttled_total',
  help: 'Total throttled requests',
  labelNames: ['route'],
});

function recordRequest(route, latencyMs, throttled) {
  const status = throttled ? '429' : '200';
  requestsTotal.inc({ route, status });
  requestDuration.observe({ route }, latencyMs);
  if (throttled) throttledTotal.inc({ route });
}

async function getMetrics() {
  return client.register.metrics();
}

function getContentType() {
  return client.register.contentType;
}

module.exports = { recordRequest, getMetrics, getContentType };