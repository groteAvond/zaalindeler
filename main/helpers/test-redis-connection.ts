// scripts/test-redis-connection.js
const Redis = require('ioredis');

(async () => {
  const client = new Redis(process.env.REDIS_URL || {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS ? { rejectUnauthorized: false } : undefined
  });

  try {
    const pong = await client.ping();
    console.log('PING ->', pong);
    const guests = await client.get('guests');
    console.log('guests ->', guests);
  } catch (err) {
    console.error('Redis connection test failed:', err);
  } finally {
    client.quit();
  }
})();