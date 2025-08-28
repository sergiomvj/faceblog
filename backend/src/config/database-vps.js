const { Pool } = require('pg');
require('dotenv').config();

// VPS PostgreSQL Configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'faceblog_production',
  user: process.env.DB_USER || 'faceblog_user',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
  statement_timeout: 30000,
  query_timeout: 30000,
};

// Create connection pool
const pool = new Pool(dbConfig);

// Connection event handlers
pool.on('connect', (client) => {
  console.log('✅ New PostgreSQL client connected to VPS database');
});

pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle PostgreSQL client:', err);
  process.exit(-1);
});

// Test connection function
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('🔗 VPS Database connection successful!');
    console.log('📅 Server time:', result.rows[0].current_time);
    console.log('🗄️ PostgreSQL version:', result.rows[0].pg_version.split(' ')[0]);
    client.release();
    return true;
  } catch (err) {
    console.error('❌ VPS Database connection failed:', err.message);
    return false;
  }
}

// Query helper with tenant isolation
async function query(text, params = [], tenantId = null) {
  const start = Date.now();
  try {
    // Add tenant_id to queries that support it (except tenant table itself)
    let finalQuery = text;
    let finalParams = params;

    if (tenantId && !text.toLowerCase().includes('tenants') && text.toLowerCase().includes('select')) {
      // Auto-inject tenant_id filter for SELECT queries
      if (text.toLowerCase().includes('where')) {
        finalQuery = text.replace(/where/i, `WHERE tenant_id = $${params.length + 1} AND`);
      } else {
        finalQuery = text.replace(/order by|limit|group by|$/, ` WHERE tenant_id = $${params.length + 1} $&`);
      }
      finalParams = [...params, tenantId];
    }

    const res = await pool.query(finalQuery, finalParams);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      console.warn(`⚠️ Slow query detected (${duration}ms):`, finalQuery.substring(0, 100));
    }
    
    return res;
  } catch (err) {
    console.error('❌ Database query error:', err.message);
    console.error('📝 Query:', text);
    console.error('📋 Params:', params);
    throw err;
  }
}

// Transaction helper
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Health check function
async function healthCheck() {
  try {
    const result = await query('SELECT COUNT(*) as tenant_count FROM tenants WHERE status = $1', ['active']);
    return {
      status: 'healthy',
      database: 'connected',
      active_tenants: parseInt(result.rows[0].tenant_count),
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Gracefully shutting down database connections...');
  await pool.end();
  console.log('✅ Database connections closed');
  process.exit(0);
});

module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  healthCheck
};
