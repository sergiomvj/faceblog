#!/usr/bin/env node

import { knex } from '@/config/database';
import { logger } from '@/utils/logger';
import fs from 'fs';
import path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    // Check if migrations directory exists
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    }

    // Get all SQL migration files
    const migrationFiles = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      logger.info('No migration files found.');
      return;
    }

    logger.info(`Found ${migrationFiles.length} migration files`);

    // Create migrations tracking table if it doesn't exist
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS public.migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Get already executed migrations
    const executedMigrations = await knex('public.migrations')
      .select('filename')
      .then(rows => rows.map(row => row.filename));

    // Execute pending migrations
    for (const filename of migrationFiles) {
      if (executedMigrations.includes(filename)) {
        logger.info(`Skipping already executed migration: ${filename}`);
        continue;
      }

      logger.info(`Executing migration: ${filename}`);
      
      const migrationPath = path.join(MIGRATIONS_DIR, filename);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      try {
        // Execute migration in a transaction
        await knex.transaction(async (trx) => {
          await trx.raw(migrationSQL);
          await trx('public.migrations').insert({ filename });
        });

        logger.info(`Successfully executed migration: ${filename}`);
      } catch (error) {
        logger.error(`Failed to execute migration ${filename}:`, error);
        throw error;
      }
    }

    logger.info('All migrations completed successfully!');

    // Verify demo tenant setup
    const demoTenant = await knex('public.tenants')
      .where('slug', 'demo')
      .first();

    if (demoTenant) {
      logger.info('Demo tenant found:', {
        id: demoTenant.id,
        name: demoTenant.name,
        slug: demoTenant.slug,
        subdomain: demoTenant.subdomain,
      });

      // Check if demo schema exists
      const schemaExists = await knex.raw(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = 'tenant_demo'
      `);

      if (schemaExists.rows.length > 0) {
        logger.info('Demo tenant schema exists');

        // Check user count in demo tenant
        const userCount = await knex.raw(`
          SELECT COUNT(*) as count 
          FROM tenant_demo.users
        `);

        logger.info(`Demo tenant has ${userCount.rows[0].count} users`);

        // Check article count in demo tenant
        const articleCount = await knex.raw(`
          SELECT COUNT(*) as count 
          FROM tenant_demo.articles
        `);

        logger.info(`Demo tenant has ${articleCount.rows[0].count} articles`);
      } else {
        logger.warn('Demo tenant schema not found');
      }
    } else {
      logger.warn('Demo tenant not found');
    }

  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await knex.destroy();
  }
}

async function rollbackMigration(filename?: string) {
  try {
    logger.info('Starting migration rollback...');

    if (filename) {
      // Rollback specific migration
      logger.info(`Rolling back migration: ${filename}`);
      
      await knex.transaction(async (trx) => {
        await trx('public.migrations')
          .where('filename', filename)
          .del();
      });

      logger.info(`Rollback completed for: ${filename}`);
    } else {
      // Rollback last migration
      const lastMigration = await knex('public.migrations')
        .orderBy('executed_at', 'desc')
        .first();

      if (!lastMigration) {
        logger.info('No migrations to rollback');
        return;
      }

      logger.info(`Rolling back last migration: ${lastMigration.filename}`);
      
      await knex.transaction(async (trx) => {
        await trx('public.migrations')
          .where('filename', lastMigration.filename)
          .del();
      });

      logger.info(`Rollback completed for: ${lastMigration.filename}`);
    }

  } catch (error) {
    logger.error('Rollback failed:', error);
    process.exit(1);
  } finally {
    await knex.destroy();
  }
}

async function resetDatabase() {
  try {
    logger.info('Resetting database...');

    // Drop all tenant schemas
    const schemas = await knex.raw(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name LIKE 'tenant_%'
    `);

    for (const schema of schemas.rows) {
      logger.info(`Dropping schema: ${schema.schema_name}`);
      await knex.raw(`DROP SCHEMA IF EXISTS ${schema.schema_name} CASCADE`);
    }

    // Drop main tables
    await knex.raw('DROP TABLE IF EXISTS public.api_keys CASCADE');
    await knex.raw('DROP TABLE IF EXISTS public.tenants CASCADE');
    await knex.raw('DROP TABLE IF EXISTS public.migrations CASCADE');

    // Drop functions
    await knex.raw('DROP FUNCTION IF EXISTS create_tenant_schema CASCADE');
    await knex.raw('DROP FUNCTION IF EXISTS update_updated_at_column CASCADE');

    logger.info('Database reset completed');

  } catch (error) {
    logger.error('Database reset failed:', error);
    process.exit(1);
  } finally {
    await knex.destroy();
  }
}

async function showStatus() {
  try {
    logger.info('Database migration status:');

    // Show executed migrations
    const migrations = await knex('public.migrations')
      .orderBy('executed_at', 'asc');

    if (migrations.length === 0) {
      logger.info('No migrations executed yet');
    } else {
      logger.info('Executed migrations:');
      migrations.forEach(migration => {
        logger.info(`  ✓ ${migration.filename} (${migration.executed_at})`);
      });
    }

    // Show tenant count
    const tenantCount = await knex('public.tenants').count('* as count').first();
    logger.info(`Total tenants: ${tenantCount?.count || 0}`);

    // Show tenants
    const tenants = await knex('public.tenants').select('*');
    if (tenants.length > 0) {
      logger.info('Tenants:');
      tenants.forEach(tenant => {
        logger.info(`  - ${tenant.name} (${tenant.slug}) - ${tenant.status}`);
      });
    }

  } catch (error) {
    logger.error('Failed to show status:', error);
    process.exit(1);
  } finally {
    await knex.destroy();
  }
}

// CLI interface
const command = process.argv[2];
const argument = process.argv[3];

switch (command) {
  case 'up':
    runMigrations();
    break;
  case 'down':
    rollbackMigration(argument);
    break;
  case 'reset':
    resetDatabase();
    break;
  case 'status':
    showStatus();
    break;
  default:
    console.log(`
Usage: npm run migrate <command>

Commands:
  up              Run all pending migrations
  down [filename] Rollback migration (latest if no filename specified)
  reset           Reset entire database (WARNING: destructive)
  status          Show migration status

Examples:
  npm run migrate up
  npm run migrate down
  npm run migrate down 001_initial_schema.sql
  npm run migrate reset
  npm run migrate status
    `);
    process.exit(1);
}
