import redis from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.client.on('error', (error) => {
      console.error(
        'Error occurred while connecting to the Redis server:',
        error,
      );
    });

    // Promisify the Redis client methods
    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setexAsync = promisify(this.client.setex).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    return this.getAsync(key);
  }

  async set(key, value, ttl) {
    await this.setexAsync(key, ttl, value);
  }

  async del(key) {
    await this.delAsync(key);
  }

  close() {
    this.client.quit();
  }
}

const redisClient = new RedisClient();
export default redisClient;
