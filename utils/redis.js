import redis from "redis";

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.client.on("error", () => {
      console.log("Error occured while connecting to the redis server");
    });
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    return await this.client.get(key);
  }

  async set(key, value, ttl) {
    await this.client.setex(key, ttl, value);
  }

  async del(key) {
    await this.client.del(key);
  }
}

const redisClient = RedisClient();
export default redisClient;
