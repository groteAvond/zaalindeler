// scripts/test-redis.js
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
const Redis = require('ioredis');

(async () => {
  const redisUrl = process.env.REDIS_URL || null;
  const useTls = (process.env.REDIS_TLS || '').toLowerCase() === 'true';
  const client = redisUrl ? new Redis(redisUrl) : new Redis({
    host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT||'6379',10),
    username: process.env.REDIS_USERNAME, password: process.env.REDIS_PASSWORD, ...(useTls?{tls:{}}:{})
  });

  client.on('error', e => console.error('redis err', e));
  try {
    console.log('PING ->', await client.ping());
    await client.set('pws:test', 'ok');
    console.log('GET pws:test ->', await client.get('pws:test'));
    await client.del('pws:test');
  } catch (e) {
    console.error('test failed', e);
  } finally {
    await client.quit();
  }
})();