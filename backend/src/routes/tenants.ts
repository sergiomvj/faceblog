import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { knex } from '@/config/database';
import { authMiddleware, requireRole } from '@/middleware/auth';
import { ValidationError, NotFoundError, ConflictError } from '@/middleware/errorHandler';
import { Tenant, TenantSettings, ApiResponse, PaginatedResponse } from '@/types';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all tenants (system admin only)
router.get('/', [
  authMiddleware,
  requireRole(['super_admin']),
  query('page').isInt({ min: 1 }).optional(),
  query('limit').isInt({ min: 1, max: 100 }).optional(),
  query('status').isIn(['active', 'suspended', 'trial', 'expired']).optional(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    let query = knex('tenants').where('status', '!=', 'deleted');

    // Apply filters
    if (req.query.status) {
      query = query.where('status', req.query.status);
    }

    // Get total count
    const totalQuery = query.clone().count('* as count').first();
    const totalResult = await totalQuery;
    const totalCount = totalResult?.count || 0;
    const total = parseInt(totalCount as string);

    // Get paginated results
    const tenants = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const response: ApiResponse<PaginatedResponse<Tenant>> = {
      success: true,
      data: {
        data: tenants,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          has_next: page < Math.ceil(total / limit),
          has_prev: page > 1,
        },
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Get tenants error:', error);
    throw error;
  }
});

// Create new tenant
router.post('/', [
  body('name').isLength({ min: 2, max: 100 }),
  body('subdomain').isLength({ min: 2, max: 50 }).matches(/^[a-z0-9-]+$/),
  body('plan').isIn(['free', 'pro', 'enterprise']).optional(),
  body('admin_email').isEmail(),
  body('admin_password').isLength({ min: 8 }),
  body('admin_name').isLength({ min: 2 }),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const {
      name,
      subdomain,
      plan = 'free',
      admin_email,
      admin_password,
      admin_name,
    } = req.body;

    // Check if subdomain is available
    const existingTenant = await knex('tenants')
      .where('subdomain', subdomain)
      .where('status', '!=', 'deleted')
      .first();

    if (existingTenant) {
      throw new ConflictError('Subdomain already exists');
    }

    // Create tenant in transaction
    const result = await knex.transaction(async (trx) => {
      const tenantId = uuidv4();
      const schemaName = `tenant_${subdomain}`;

      // Default tenant settings
      const defaultSettings: TenantSettings = {
        theme: 'modern',
        integrations: {
          bigwriter: false,
          social_media: false,
          newsletter: false,
          analytics: false,
        },
        features: {
          comments: true,
          social_sharing: true,
          newsletter_signup: false,
          search: true,
        },
        limits: {
          max_articles: plan === 'free' ? 100 : plan === 'pro' ? 10000 : -1,
          max_users: plan === 'free' ? 3 : plan === 'pro' ? 10 : -1,
          max_storage_mb: plan === 'free' ? 1000 : plan === 'pro' ? 10000 : -1,
        },
      };

      // Create tenant record
      const newTenant: Tenant = {
        id: tenantId,
        name,
        subdomain,
        schema_name: schemaName,
        status: 'active',
        plan,
        settings: defaultSettings,
        created_at: new Date(),
        updated_at: new Date(),
      };

      await trx('tenants').insert(newTenant);

      // Create tenant schema
      await createTenantSchema(schemaName, trx);

      // Create admin user for tenant
      const adminUser = {
        id: uuidv4(),
        tenant_id: tenantId,
        email: admin_email,
        password_hash: await require('@/middleware/auth').hashPassword(admin_password),
        name: admin_name,
        role: 'admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Switch to tenant schema and create admin user
      await trx.raw(`SET search_path TO "${schemaName}", public`);
      await trx('users').insert(adminUser);

      // Reset search path
      await trx.raw('SET search_path TO public');

      return { tenant: newTenant, admin: adminUser };
    });

    const response: ApiResponse<{
      tenant: Tenant;
      admin: { id: string; email: string; name: string; role: string };
    }> = {
      success: true,
      data: {
        tenant: result.tenant,
        admin: {
          id: result.admin.id,
          email: result.admin.email,
          name: result.admin.name,
          role: result.admin.role,
        },
      },
      message: 'Tenant created successfully',
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Create tenant error:', error);
    throw error;
  }
});

// Get tenant by ID
router.get('/:id', [
  authMiddleware,
  requireRole(['super_admin', 'admin']),
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    let query = knex('tenants').where('id', id);

    // Non-super admins can only view their own tenant
    if (user.role !== 'super_admin') {
      query = query.where('id', user.tenant_id);
    }

    const tenant = await query.first();

    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    // Get tenant statistics
    const stats = await getTenantStatistics(id);

    const response: ApiResponse<Tenant & { stats: any }> = {
      success: true,
      data: { ...tenant, stats },
    };

    res.json(response);
  } catch (error) {
    logger.error('Get tenant error:', error);
    throw error;
  }
});

// Update tenant
router.put('/:id', [
  authMiddleware,
  requireRole(['super_admin', 'admin']),
  body('name').isLength({ min: 2, max: 100 }).optional(),
  body('status').isIn(['active', 'suspended', 'trial', 'expired']).optional(),
  body('plan').isIn(['free', 'pro', 'enterprise']).optional(),
  body('settings').isObject().optional(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { id } = req.params;
    const user = (req as any).user;

    // Check if tenant exists and user has permission
    let query = knex('tenants').where('id', id);

    if (user.role !== 'super_admin') {
      query = query.where('id', user.tenant_id);
    }

    const existingTenant = await query.first();

    if (!existingTenant) {
      throw new NotFoundError('Tenant not found');
    }

    const updateData: any = {
      updated_at: new Date(),
    };

    // Update allowed fields
    if (req.body.name) updateData.name = req.body.name;
    
    // Only super admins can change status and plan
    if (user.role === 'super_admin') {
      if (req.body.status) updateData.status = req.body.status;
      if (req.body.plan) updateData.plan = req.body.plan;
    }

    if (req.body.settings) {
      // Merge with existing settings
      updateData.settings = {
        ...existingTenant.settings,
        ...req.body.settings,
      };
    }

    await knex('tenants')
      .where('id', id)
      .update(updateData);

    // Get updated tenant
    const updatedTenant = await knex('tenants')
      .where('id', id)
      .first();

    const response: ApiResponse<Tenant> = {
      success: true,
      data: updatedTenant,
      message: 'Tenant updated successfully',
    };

    res.json(response);
  } catch (error) {
    logger.error('Update tenant error:', error);
    throw error;
  }
});

// Delete tenant (soft delete)
router.delete('/:id', [
  authMiddleware,
  requireRole(['super_admin']),
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const tenant = await knex('tenants')
      .where('id', id)
      .where('status', '!=', 'deleted')
      .first();

    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    // Soft delete tenant
    await knex('tenants')
      .where('id', id)
      .update({
        status: 'deleted',
        updated_at: new Date(),
      });

    const response: ApiResponse = {
      success: true,
      message: 'Tenant deleted successfully',
    };

    res.json(response);
  } catch (error) {
    logger.error('Delete tenant error:', error);
    throw error;
  }
});

// Get tenant analytics
router.get('/:id/analytics', [
  authMiddleware,
  requireRole(['super_admin', 'admin']),
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Check permissions
    if (user.role !== 'super_admin' && user.tenant_id !== id) {
      throw new NotFoundError('Tenant not found');
    }

    const tenant = await knex('tenants').where('id', id).first();
    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    // Switch to tenant schema for analytics
    await knex.raw(`SET search_path TO "${tenant.schema_name}", public`);

    const analytics = await getTenantAnalytics(id);

    // Reset search path
    await knex.raw('SET search_path TO public');

    const response: ApiResponse<any> = {
      success: true,
      data: analytics,
    };

    res.json(response);
  } catch (error) {
    logger.error('Get tenant analytics error:', error);
    throw error;
  }
});

// Helper functions
async function createTenantSchema(schemaName: string, trx: any): Promise<void> {
  try {
    // Create schema
    await trx.raw(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    // Set search path to new schema
    await trx.raw(`SET search_path TO "${schemaName}", public`);

    // Create tables in tenant schema
    await createTenantTables(trx);

    logger.info(`Created tenant schema: ${schemaName}`);
  } catch (error) {
    logger.error(`Failed to create tenant schema ${schemaName}:`, error);
    throw error;
  }
}

async function createTenantTables(trx: any): Promise<void> {
  // Users table
  await trx.schema.createTable('users', (table: any) => {
    table.uuid('id').primary();
    table.uuid('tenant_id').notNullable();
    table.string('email').notNullable();
    table.string('password_hash').notNullable();
    table.string('name').notNullable();
    table.string('avatar_url');
    table.enum('role', ['admin', 'editor', 'author', 'reviewer']).defaultTo('author');
    table.enum('status', ['active', 'inactive', 'pending']).defaultTo('active');
    table.timestamp('last_login_at');
    table.timestamps(true, true);
    table.unique(['email', 'tenant_id']);
  });

  // Articles table
  await trx.schema.createTable('articles', (table: any) => {
    table.uuid('id').primary();
    table.uuid('tenant_id').notNullable();
    table.string('title').notNullable();
    table.string('slug').notNullable();
    table.text('content').notNullable();
    table.text('excerpt');
    table.string('featured_image');
    table.enum('status', ['draft', 'published', 'scheduled', 'archived']).defaultTo('draft');
    table.timestamp('published_at');
    table.timestamp('scheduled_at');
    table.uuid('author_id').notNullable();
    table.uuid('category_id');
    table.string('meta_title');
    table.text('meta_description');
    table.string('meta_keywords');
    table.integer('view_count').defaultTo(0);
    table.integer('like_count').defaultTo(0);
    table.integer('comment_count').defaultTo(0);
    table.integer('reading_time_minutes').defaultTo(0);
    table.timestamps(true, true);
    table.unique(['slug', 'tenant_id']);
    table.foreign('author_id').references('users.id');
  });

  // Categories table
  await trx.schema.createTable('categories', (table: any) => {
    table.uuid('id').primary();
    table.uuid('tenant_id').notNullable();
    table.string('name').notNullable();
    table.string('slug').notNullable();
    table.text('description');
    table.uuid('parent_id');
    table.integer('sort_order').defaultTo(0);
    table.integer('article_count').defaultTo(0);
    table.timestamps(true, true);
    table.unique(['slug', 'tenant_id']);
    table.foreign('parent_id').references('categories.id');
  });

  // Tags table
  await trx.schema.createTable('tags', (table: any) => {
    table.uuid('id').primary();
    table.uuid('tenant_id').notNullable();
    table.string('name').notNullable();
    table.string('slug').notNullable();
    table.string('color');
    table.integer('article_count').defaultTo(0);
    table.timestamps(true, true);
    table.unique(['slug', 'tenant_id']);
  });

  // Article-Tags junction table
  await trx.schema.createTable('article_tags', (table: any) => {
    table.uuid('article_id').notNullable();
    table.uuid('tag_id').notNullable();
    table.primary(['article_id', 'tag_id']);
    table.foreign('article_id').references('articles.id').onDelete('CASCADE');
    table.foreign('tag_id').references('tags.id').onDelete('CASCADE');
  });

  // Comments table
  await trx.schema.createTable('comments', (table: any) => {
    table.uuid('id').primary();
    table.uuid('tenant_id').notNullable();
    table.uuid('article_id').notNullable();
    table.uuid('parent_id');
    table.string('author_name').notNullable();
    table.string('author_email').notNullable();
    table.string('author_url');
    table.text('content').notNullable();
    table.enum('status', ['pending', 'approved', 'rejected', 'spam']).defaultTo('pending');
    table.string('ip_address');
    table.text('user_agent');
    table.timestamps(true, true);
    table.foreign('article_id').references('articles.id').onDelete('CASCADE');
    table.foreign('parent_id').references('comments.id').onDelete('CASCADE');
  });

  // Media table
  await trx.schema.createTable('media', (table: any) => {
    table.uuid('id').primary();
    table.uuid('tenant_id').notNullable();
    table.string('filename').notNullable();
    table.string('original_name').notNullable();
    table.string('mime_type').notNullable();
    table.integer('size_bytes').notNullable();
    table.string('url').notNullable();
    table.string('alt_text');
    table.text('caption');
    table.uuid('uploaded_by').notNullable();
    table.timestamp('created_at').defaultTo(trx.fn.now());
    table.foreign('uploaded_by').references('users.id');
  });
}

async function getTenantStatistics(tenantId: string): Promise<any> {
  const tenant = await knex('tenants').where('id', tenantId).first();
  if (!tenant) return {};

  // Switch to tenant schema
  await knex.raw(`SET search_path TO "${tenant.schema_name}", public`);

  const [
    articleCount,
    userCount,
    categoryCount,
    tagCount,
    commentCount,
  ] = await Promise.all([
    knex('articles').count('* as count').first(),
    knex('users').count('* as count').first(),
    knex('categories').count('* as count').first(),
    knex('tags').count('* as count').first(),
    knex('comments').count('* as count').first(),
  ]);

  // Reset search path
  await knex.raw('SET search_path TO public');

  return {
    articles: parseInt(articleCount?.count as string) || 0,
    users: parseInt(userCount?.count as string) || 0,
    categories: parseInt(categoryCount?.count as string) || 0,
    tags: parseInt(tagCount?.count as string) || 0,
    comments: parseInt(commentCount?.count as string) || 0,
  };
}

async function getTenantAnalytics(tenantId: string): Promise<any> {
  // This would contain more detailed analytics
  // For now, return basic stats
  return await getTenantStatistics(tenantId);
}

export default router;
