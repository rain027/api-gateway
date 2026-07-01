# API Gateway with Distributed Rate Limiting

A lightweight API gateway built to understand how real infrastructure works — 
not just use it. This handles request routing, rate limiting, authentication, 
and observability, the same things production gateways like Kong or AWS API 
Gateway do, just without the enterprise complexity.

---

## What it does

- **Routes requests** to backend services based on a YAML config file — 
no code changes needed to add a new route
- **Rate limits** each client using a sliding window algorithm backed by Redis, 
enforced correctly even when multiple gateway instances are running
- **Authenticates** requests using JWT tokens, blocks unauthenticated access 
to protected routes, and passes user identity downstream
- **Tracks metrics** — request rate, throttle rate, and p99 latency — 
visible in a live Grafana dashboard

---

## Architecture

Client Request
|
↓
API Gateway:  1. JWT Auth ( for protected route)
|             2. Rate Limit Check -> Redis
|             3. Reverse Proxy
|
↓
Service A, Service B ( Dummy )


## Tech Stack

- **Node.js + Express** — gateway server
- **Redis** — shared rate limit state across instances
- **Docker + Docker Compose** — runs the entire stack with one command
- **Prometheus** — scrapes metrics from the gateway every 5 seconds
- **Grafana** — live dashboard for request rate, throttle rate, latency


## How to run it

Make sure Docker Desktop is running, then:

```bash
git clone https://github.com/rain027/api-gateway/
cd api-gateway
cp .env.example .env        # add your JWT_SECRET in here
docker compose up --build
```

That's it. Five containers start: gateway, Redis, mock services, 
Prometheus, and Grafana.

| Service | URL |
|---|---|
| Gateway | http://localhost:3000 |
| Grafana | http://localhost:3001 |
| Prometheus | http://localhost:9090 |


## How to test it

**Generate a JWT token:**
```bash
node utils/generateToken.js
```

**Hit a public route:**
```bash
curl http://localhost:3000/users
```

**Hit a protected route:**
```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/payments
```

**Trigger rate limiting** (hit /users 15 times rapidly):
```bash
for ($i=1; $i -le 15; $i++) { 
  curl.exe -s -o NUL -w "%{http_code}`n" http://localhost:3000/users 
}
```
You'll see 200s, then 429s after the limit is hit.

**Check metrics:**
```bash
curl http://localhost:3000/_metrics
```


## Route config

Routes are defined in `config.yaml` — no code changes needed:

```yaml
routes:
  - path: /users
    target: http://localhost:4001
    protected: false
    rate_limit:
      requests: 10
      window_seconds: 60
      key_by: ip

  - path: /payments
    target: http://localhost:4002
    protected: true
    rate_limit:
      requests: 5
      window_seconds: 60
      key_by: user_id
```

`key_by: ip` limits per IP address. `key_by: user_id` limits per 
authenticated user — so two different users each get their own 
independent limit.


## Key decisions and why

**Why sliding window instead of fixed window?**
Fixed windows have a burst problem — a client can use their full limit 
at the end of one window and immediately again at the start of the next, 
effectively doubling their allowed rate. Sliding window tracks requests 
over a rolling time period, so this can't happen.

**Why a Lua script for rate limiting?**
The rate limit check involves multiple steps: remove old entries, count 
remaining, add the new request. If two requests hit simultaneously and 
both do these steps separately, both can slip through even when only one 
slot remains. Running it as a Lua script in Redis makes the whole thing 
atomic — it executes as a single operation with no gaps for race conditions.

**Why fail-open when Redis is down?**
If Redis goes down and we block all traffic, every user sees errors — 
the gateway becomes the outage. Failing open means we temporarily stop 
enforcing rate limits instead, which is the lesser of two problems for 
most systems.

**Why forward user identity via headers?**
The gateway verifies the JWT once and passes `x-user-id` and 
`x-user-email` as headers to downstream services. This means backend 
services don't need to verify tokens themselves — they just trust the 
gateway, which is the standard pattern in internal service architecture.

**Why secrets in environment variables?**
Secrets in config files get committed to git, accidentally shared, or 
end up in logs. Environment variables keep them out of the codebase 
entirely.


## Grafana Dashboard

<img width="1547" height="892" alt="Screenshot 2026-07-01 180219" src="https://github.com/user-attachments/assets/49d7dfb1-be82-4494-a62e-e23a56f6a29a" />




Shows live request rate, throttle rate percentage, and p99 latency 
updating in real time during a load test.

## Load test results

Run using k6:
```bash
k6 run load-test.js
```
<img width="1467" height="786" alt="Screenshot 2026-07-01 173326" src="https://github.com/user-attachments/assets/724a3c50-a0bc-4ba1-8a4e-27d3444b3d10" />

<img width="1503" height="777" alt="Screenshot 2026-07-01 173359" src="https://github.com/user-attachments/assets/4345b3bf-b8fa-4224-ac86-dfdde831b420" />



## Security features

- JWT validation on protected routes
- HTTP security headers via Helmet.js
- Request size capped at 10kb to prevent payload-based DoS
- Non-root user inside Docker container
- Secrets loaded from environment variables, never hardcoded

## What I'd do differently at scale

- **Redis is a single point of failure** — at scale this would move to 
Redis Cluster, or a hybrid approach where each instance tracks limits 
locally and syncs to Redis periodically
- **In-memory metrics survive restarts** with Prometheus, but a 
high-traffic system would want persistent storage and alerting rules
- **Sliding Window works well here, but other algorithms may be better** —
 production gateways often use Token Bucket for burst tolerance or Leaky Bucket
for smoother traffic shaping, depending on the application's requirements.
- **Rate limiting could be adaptive** — instead of fixed limits, production
systems often apply different quotas based on user tier, endpoint sensitivity,
or current system load.
- **JWT secret rotation** — in production this would come from a secret 
manager like AWS Secrets Manager or Vault, not a static env var
- **The config file would become an API** — a real gateway lets you 
update routes without restarting, via an admin API backed by a database



