const { Pool } = require('pg');

/**
 * Connection Pool Service
 * Gerencia pool de conexões para otimização de performance
 */
class ConnectionPoolService {
  constructor() {
    this.pool = null;
    this.isInitialized = false;
  }

  /**
   * Initialize connection pool
   */
  initialize(config = {}) {
    if (this.isInitialized) return this.pool;

    const poolConfig = {
      // Connection settings
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      
      // Pool settings
      min: config.min || 2,           // Minimum connections
      max: config.max || 20,          // Maximum connections
      idleTimeoutMillis: config.idleTimeout || 30000,  // 30 seconds
      connectionTimeoutMillis: config.connectionTimeout || 2000,  // 2 seconds
      
      // Advanced settings
      statement_timeout: config.statementTimeout || 30000,  // 30 seconds
      query_timeout: config.queryTimeout || 30000,         // 30 seconds
      application_name: 'FaceBlog_Backend',
      
      // SSL settings for production
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    };

    this.pool = new Pool(poolConfig);

    // Event handlers
    this.pool.on('connect', (client) => {
      console.log('🔗 New database connection established');
    });

    this.pool.on('error', (err, client) => {
      console.error('❌ Database pool error:', err);
    });

    this.pool.on('remove', (client) => {
      console.log('🗑️ Database connection removed from pool');
    });

    this.isInitialized = true;
    console.log('🏊 Connection pool initialized with config:', {
      min: poolConfig.min,
      max: poolConfig.max,
      idleTimeout: poolConfig.idleTimeoutMillis,
      connectionTimeout: poolConfig.connectionTimeoutMillis
    });

    return this.pool;
  }

  /**
   * Get pool instance
   */
  getPool() {
    if (!this.isInitialized) {
      throw new Error('Connection pool not initialized. Call initialize() first.');
    }
    return this.pool;
  }

  /**
   * Execute query with automatic connection management
   */
  async query(text, params = []) {
    if (!this.isInitialized) {
      throw new Error('Connection pool not initialized');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (duration > 1000) {
        console.log('🐌 Slow query detected:', {
          query: text.substring(0, 100),
          duration: `${duration}ms`,
          rows: result.rowCount
        });
      }
      
      return result;
    } catch (error) {
      console.error('❌ Query error:', {
        query: text.substring(0, 100),
        error: error.message,
        duration: `${Date.now() - start}ms`
      });
      throw error;
    }
  }

  /**
   * Execute transaction
   */
  async transaction(callback) {
    if (!this.isInitialized) {
      throw new Error('Connection pool not initialized');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    if (!this.isInitialized) {
      return { error: 'Pool not initialized' };
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      maxConnections: this.pool.options.max,
      minConnections: this.pool.options.min
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.isInitialized) {
      return { healthy: false, error: 'Pool not initialized' };
    }

    try {
      const start = Date.now();
      const result = await this.pool.query('SELECT NOW() as current_time');
      const duration = Date.now() - start;
      
      return {
        healthy: true,
        responseTime: duration,
        currentTime: result.rows[0].current_time,
        poolStats: this.getStats()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        poolStats: this.getStats()
      };
    }
  }

  /**
   * Close all connections
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('🔒 Connection pool closed');
      this.isInitialized = false;
    }
  }

  /**
   * Middleware for Express to provide database connection
   */
  middleware() {
    return (req, res, next) => {
      req.db = this;
      next();
    };
  }
}

// Singleton instance
const connectionPool = new ConnectionPoolService();

module.exports = connectionPool;
