const redis = require('../redis');

const SLIDING_WINDOW_SCRIPT = `
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])
  local clearBefore = now - window

  redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)
  local count = redis.call('ZCARD', key)

  if count >= limit then
    return -1
  end

  redis.call('ZADD', key, now, now .. '-' .. math.random(100000))
  redis.call('PEXPIRE', key, window)

  return limit - count - 1
`;

function extractKey(req, route) {
  const keyBy = route.rate_limit.key_by;

  if (keyBy === 'ip') {
    return req.ip || req.connection.remoteAddress;
  }

  if (keyBy === 'api_key') {
    const header = req.headers['authorization'] || '';
    const parts = header.split(' ');
    return parts[1] || 'anonymous';
  }

  if (keyBy === 'user_id') {
    return req.user?.id || 'anonymous';
  }

  return 'global';
}

function rateLimiter(route) {
  const { requests, window_seconds } = route.rate_limit;
  const windowMs = window_seconds * 1000;

  return async function (req, res, next) {
    const identifier = extractKey(req, route);
    const redisKey = `rl:${identifier}:${route.path}`;
    const now = Date.now();

    try {
      const remaining = await redis.eval(
        SLIDING_WINDOW_SCRIPT,
        1,
        redisKey,
        now,
        windowMs,
        requests
      );

      res.setHeader('X-RateLimit-Limit', requests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));

      if (remaining === -1) {
        res.setHeader('Retry-After', window_seconds);
        return res.status(429).json({
          error: 'Too Many Requests',
          retryAfter: window_seconds
        });
      }

      next();
    } catch (err) {
      console.error('Rate limiter error:', err);
      next(); // fail open
    }
  };
}

module.exports = rateLimiter;