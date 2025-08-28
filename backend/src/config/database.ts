import { Knex } from 'knex';
import knex from 'knex';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'faceblog_baas',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: '../migrations',
    },
    seeds: {
      directory: '../seeds',
    },
  },
  
  production: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'faceblog_baas',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: 5,
      max: 20,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
    },
    acquireConnectionTimeout: 60000,
  },

  test: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME_TEST || 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
    },
    pool: {
      min: 1,
      max: 5,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
    },
  },
};

// Initialize knex instance
const environment = process.env.NODE_ENV || 'development';
const selectedConfig = config[environment];

if (!selectedConfig) {
  throw new Error(`No database configuration found for environment: ${environment}`);
}

const knexInstance = knex(selectedConfig);

export { knexInstance as knex };
export default config;
