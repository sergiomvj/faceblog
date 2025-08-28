// Redis Configuration for Blog-as-a-Service
// Simplified version to avoid TypeScript compatibility issues

interface RedisClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  on(event: string, callback: Function): void;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  setEx(key: string, seconds: number, value: string): Promise<void>;
  del(key: string | string[]): Promise<number>;
  exists(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
}

class RedisConfig {
  private client: any = null;
  private isConnected = false;

  async connect(): Promise<any> {
    if (this.client && this.isConnected) {
      return this.client;
    }

    try {
      // Dynamic import to avoid TypeScript issues
      const { createClient } = await import('redis');
      
      const redisUrl = process.env.REDIS_URL;
      
      if (redisUrl) {
        this.client = createClient({ url: redisUrl });
      } else {
        this.client = createClient({
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379') || 6379,
          },
          ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
          database: parseInt(process.env.REDIS_DB || '0') || 0,
        });
      }

      this.client.on('error', (err: any) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('Redis Client Ready');
      });

      this.client.on('end', () => {
        console.log('Redis Client Disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
      this.client = null;
    }
  }

  getClient(): any {
    return this.client;
  }

  isClientConnected(): boolean {
    return this.isConnected;
  }

  // Cache helper methods
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis client not connected, skipping cache set');
      return;
    }

    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.client.setEx(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis client not connected, skipping cache get');
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis client not connected, skipping cache delete');
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  async flushTenantCache(tenantId: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      return;
    }

    try {
      const pattern = `tenant:${tenantId}:*`;
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error('Redis flush tenant cache error:', error);
    }
  }
}

export const redisConfig = new RedisConfig();
export default redisConfig;
