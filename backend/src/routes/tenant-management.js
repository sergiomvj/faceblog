// =====================================================
// TENANT MANAGEMENT API - Automated Client Setup
// =====================================================

const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const router = express.Router();

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'faceblog_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'faceblog_db',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Generate API key
function generateApiKey() {
  return `fb_${uuidv4().replace(/-/g, '')}`;
}

// Generate secure password
function generatePassword(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Validate slug format
function validateSlug(slug) {
  const slugRegex = /^[a-z0-9-]+$/;
  return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 50;
}

// =====================================================
// POST /api/admin/tenants - Create new tenant
// =====================================================
router.post('/tenants', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      name,
      slug,
      subdomain,
      custom_domain,
      plan = 'pro',
      admin_email,
      admin_name,
      admin_password,
      company_info = {},
      features = {}
    } = req.body;

    // Validation
    if (!name || !slug || !admin_email || !admin_name) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'slug', 'admin_email', 'admin_name']
      });
    }

    if (!validateSlug(slug)) {
      return res.status(400).json({
        error: 'Invalid slug format',
        message: 'Slug must contain only lowercase letters, numbers, and hyphens (3-50 chars)'
      });
    }

    // Check if slug/subdomain already exists
    const existingTenant = await client.query(
      'SELECT id FROM tenants WHERE slug = $1 OR subdomain = $2',
      [slug, subdomain || slug]
    );

    if (existingTenant.rows.length > 0) {
      return res.status(409).json({
        error: 'Tenant already exists',
        message: 'Slug or subdomain already in use'
      });
    }

    // Generate credentials
    const apiKey = generateApiKey();
    const password = admin_password || generatePassword();
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create tenant
    const tenantResult = await client.query(`
      INSERT INTO tenants (
        name, slug, subdomain, custom_domain, api_key, status, plan,
        settings, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `, [
      name,
      slug,
      subdomain || slug,
      custom_domain || null,
      apiKey,
      'active',
      plan,
      JSON.stringify({
        company_info,
        features: {
          seo_tools: true,
          analytics: true,
          custom_domain: !!custom_domain,
          social_integration: true,
          newsletter: true,
          comments: true,
          ...features
        }
      })
    ]);

    const tenant = tenantResult.rows[0];

    // Create admin user
    const userResult = await client.query(`
      INSERT INTO users (
        tenant_id, email, name, password_hash, role, status, 
        email_verified, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, email, name, role, status
    `, [
      tenant.id,
      admin_email,
      admin_name,
      hashedPassword,
      'admin',
      'active',
      true
    ]);

    const adminUser = userResult.rows[0];

    // Create default categories
    const defaultCategories = [
      { name: 'Technology', slug: 'technology', description: 'Tech articles and tutorials' },
      { name: 'Business', slug: 'business', description: 'Business insights and strategies' },
      { name: 'Lifestyle', slug: 'lifestyle', description: 'Lifestyle and personal content' }
    ];

    for (const category of defaultCategories) {
      await client.query(`
        INSERT INTO categories (tenant_id, name, slug, description, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
      `, [tenant.id, category.name, category.slug, category.description]);
    }

    // Create default tags
    const defaultTags = [
      { name: 'Tutorial', color: '#3B82F6' },
      { name: 'News', color: '#EF4444' },
      { name: 'Guide', color: '#10B981' },
      { name: 'Tips', color: '#F59E0B' }
    ];

    for (const tag of defaultTags) {
      await client.query(`
        INSERT INTO tags (tenant_id, name, color, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
      `, [tenant.id, tag.name, tag.color]);
    }

    await client.query('COMMIT');

    // Response with credentials
    res.status(201).json({
      message: 'Tenant created successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        subdomain: tenant.subdomain,
        custom_domain: tenant.custom_domain,
        status: tenant.status,
        plan: tenant.plan,
        api_key: tenant.api_key,
        urls: {
          blog: custom_domain ? `https://${custom_domain}` : `https://${subdomain || slug}.faceblog.top`,
          admin: `https://admin.faceblog.top?tenant=${slug}`,
          api: `https://api.faceblog.top/api?tenant=${slug}`
        }
      },
      admin_user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        temporary_password: admin_password ? null : password
      },
      setup_instructions: {
        dns: custom_domain ? [
          `Configure DNS: ${custom_domain} CNAME ${subdomain || slug}.faceblog.top`,
          'Or: A record pointing to 65.181.118.38'
        ] : [
          `Blog URL: https://${subdomain || slug}.faceblog.top`,
          'DNS automatically configured'
        ],
        admin_access: [
          `Login URL: https://admin.faceblog.top`,
          `Email: ${admin_email}`,
          `Password: ${admin_password ? '[provided]' : password}`,
          `API Key: ${apiKey}`
        ]
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating tenant:', error);
    res.status(500).json({
      error: 'Failed to create tenant',
      message: error.message
    });
  } finally {
    client.release();
  }
});

// =====================================================
// GET /api/admin/tenants - List all tenants
// =====================================================
router.get('/tenants', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, plan, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT t.*, 
             COUNT(u.id) as user_count,
             COUNT(a.id) as article_count
      FROM tenants t
      LEFT JOIN users u ON t.id = u.tenant_id
      LEFT JOIN articles a ON t.id = a.tenant_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
    }

    if (plan) {
      paramCount++;
      query += ` AND t.plan = $${paramCount}`;
      params.push(plan);
    }

    if (search) {
      paramCount++;
      query += ` AND (t.name ILIKE $${paramCount} OR t.slug ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` GROUP BY t.id ORDER BY t.created_at DESC`;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM tenants WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }

    if (plan) {
      countParamCount++;
      countQuery += ` AND plan = $${countParamCount}`;
      countParams.push(plan);
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND (name ILIKE $${countParamCount} OR slug ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      tenants: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error listing tenants:', error);
    res.status(500).json({
      error: 'Failed to list tenants',
      message: error.message
    });
  }
});

// =====================================================
// PUT /api/admin/tenants/:id - Update tenant
// =====================================================
router.put('/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const allowedFields = [
      'name', 'custom_domain', 'status', 'plan', 'settings'
    ];
    
    const setClause = [];
    const values = [];
    let paramCount = 0;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        paramCount++;
        setClause.push(`${key} = $${paramCount}`);
        values.push(key === 'settings' ? JSON.stringify(value) : value);
      }
    }

    if (setClause.length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update',
        allowed_fields: allowedFields
      });
    }

    paramCount++;
    values.push(id);

    const query = `
      UPDATE tenants 
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Tenant not found'
      });
    }

    res.json({
      message: 'Tenant updated successfully',
      tenant: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({
      error: 'Failed to update tenant',
      message: error.message
    });
  }
});

// =====================================================
// DELETE /api/admin/tenants/:id - Delete tenant
// =====================================================
router.delete('/tenants/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { confirm } = req.query;

    if (confirm !== 'yes') {
      return res.status(400).json({
        error: 'Confirmation required',
        message: 'Add ?confirm=yes to delete tenant and all associated data'
      });
    }

    // Check if tenant exists
    const tenantResult = await client.query(
      'SELECT name FROM tenants WHERE id = $1',
      [id]
    );

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Tenant not found'
      });
    }

    const tenantName = tenantResult.rows[0].name;

    // Delete all associated data (cascade should handle this, but being explicit)
    await client.query('DELETE FROM article_tags WHERE article_id IN (SELECT id FROM articles WHERE tenant_id = $1)', [id]);
    await client.query('DELETE FROM comments WHERE article_id IN (SELECT id FROM articles WHERE tenant_id = $1)', [id]);
    await client.query('DELETE FROM articles WHERE tenant_id = $1', [id]);
    await client.query('DELETE FROM tags WHERE tenant_id = $1', [id]);
    await client.query('DELETE FROM categories WHERE tenant_id = $1', [id]);
    await client.query('DELETE FROM users WHERE tenant_id = $1', [id]);
    await client.query('DELETE FROM tenants WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({
      message: 'Tenant deleted successfully',
      deleted_tenant: tenantName
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting tenant:', error);
    res.status(500).json({
      error: 'Failed to delete tenant',
      message: error.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;
