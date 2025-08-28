#!/usr/bin/env node

/**
 * Enhanced Express server for Blog-as-a-Service
 * Com middleware melhorado de autenticação e rate limiting
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config();

// Import enhanced middleware
const { 
  authenticate, 
  requireWrite, 
  requireAdmin, 
  addRateLimitHeaders 
} = require('./middleware/enhanced-tenant-auth');

// Import routes
const tenantApiRoutes = require('./routes/tenant-api');
const apiKeysRoutes = require('./routes/api-keys');
const seoRoutes = require('./routes/seo');

const app = express();
const PORT = process.env.PORT || 5000;

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Compression middleware
app.use(compression());

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3001', 
    'http://localhost:3000',
    'https://faceblog.com',
    'https://*.faceblog.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// =====================================================
// PUBLIC ENDPOINTS (sem autenticação)
// =====================================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'FaceBlog Backend Enhanced',
    version: '2.0.0',
    database: 'Supabase Connected',
    features: [
      'Enhanced Authentication',
      'Rate Limiting',
      'Multi-Tenant Isolation',
      'SEO Intelligence',
      'Image Wizard'
    ]
  });
});

// Database connection test
app.get('/api/test-db', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .limit(1);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Database connection successful',
      data: data || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      details: error.message
    });
  }
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'FaceBlog API',
    version: '2.0.0',
    description: 'Enhanced Blog-as-a-Service API with multi-tenant support',
    authentication: {
      type: 'API Key',
      header: 'X-API-Key',
      format: 'fb_[tenant]_[hash64]'
    },
    rateLimit: {
      default: '1000 requests/hour',
      headers: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
    },
    endpoints: {
      public: ['/health', '/api/test-db', '/api/docs'],
      authenticated: ['/api/v1/*'],
      admin: ['/api/admin/*']
    }
  });
});

// =====================================================
// AUTHENTICATED ENDPOINTS
// =====================================================

// Apply authentication middleware to all /api/v1/* routes
app.use('/api/v1', authenticate, addRateLimitHeaders);

// Articles endpoints
app.get('/api/v1/articles', async (req, res) => {
  try {
    const { status, category_id, tag_id, limit = 50, offset = 0, search } = req.query;

    let query = supabase
      .from('articles')
      .select(`
        *,
        category:categories(id, name, color),
        tags:article_tags(tag:tags(id, name, color)),
        author:users(id, name, email)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtros
    if (status) query = query.eq('status', status);
    if (category_id) query = query.eq('category_id', category_id);
    if (search) query = query.ilike('title', `%${search}%`);

    const { data: articles, error } = await query;

    if (error) throw error;

    // Processar tags (converter array de objetos)
    const processedArticles = articles.map(article => ({
      ...article,
      tags: article.tags?.map(t => t.tag) || []
    }));

    res.json({
      success: true,
      data: processedArticles,
      meta: {
        total: processedArticles.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        tenant: req.tenant.name
      }
    });

  } catch (error) {
    console.error('Articles fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch articles',
      details: error.message
    });
  }
});

app.get('/api/v1/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: article, error } = await supabase
      .from('articles')
      .select(`
        *,
        category:categories(id, name, color),
        tags:article_tags(tag:tags(id, name, color)),
        author:users(id, name, email, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Article not found'
        });
      }
      throw error;
    }

    // Processar tags
    article.tags = article.tags?.map(t => t.tag) || [];

    res.json({
      success: true,
      data: article
    });

  } catch (error) {
    console.error('Article fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch article',
      details: error.message
    });
  }
});

app.post('/api/v1/articles', requireWrite, async (req, res) => {
  try {
    const { 
      title, 
      content, 
      excerpt, 
      category_id, 
      tags = [], 
      status = 'draft',
      featured_image_url,
      seo_data = {}
    } = req.body;

    // Validação
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required'
      });
    }

    // Criar artigo
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .insert({
        title,
        content,
        excerpt,
        category_id,
        status,
        featured_image_url,
        seo_data,
        tenant_id: req.tenant.id,
        author_id: req.apiKey.created_by || null
      })
      .select()
      .single();

    if (articleError) throw articleError;

    // Associar tags
    if (tags.length > 0) {
      const tagAssociations = tags.map(tagId => ({
        article_id: article.id,
        tag_id: tagId
      }));

      const { error: tagsError } = await supabase
        .from('article_tags')
        .insert(tagAssociations);

      if (tagsError) {
        console.error('Tags association error:', tagsError);
      }
    }

    res.status(201).json({
      success: true,
      data: article,
      message: 'Article created successfully'
    });

  } catch (error) {
    console.error('Article creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create article',
      details: error.message
    });
  }
});

// Categories endpoints
app.get('/api/v1/categories', async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw error;

    res.json({
      success: true,
      data: categories,
      meta: {
        total: categories.length,
        tenant: req.tenant.name
      }
    });

  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
      details: error.message
    });
  }
});

app.post('/api/v1/categories', requireWrite, async (req, res) => {
  try {
    const { name, description, color = '#6B7280' } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }

    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        name,
        description,
        color,
        tenant_id: req.tenant.id
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully'
    });

  } catch (error) {
    console.error('Category creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create category',
      details: error.message
    });
  }
});

// Tags endpoints
app.get('/api/v1/tags', async (req, res) => {
  try {
    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .order('name');

    if (error) throw error;

    res.json({
      success: true,
      data: tags,
      meta: {
        total: tags.length,
        tenant: req.tenant.name
      }
    });

  } catch (error) {
    console.error('Tags fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tags',
      details: error.message
    });
  }
});

// =====================================================
// ADMIN ENDPOINTS
// =====================================================

app.use('/api/admin', authenticate, requireAdmin, addRateLimitHeaders);

// API Keys management
app.get('/api/admin/api-keys', async (req, res) => {
  try {
    const { data: apiKeys, error } = await supabase
      .from('api_keys')
      .select(`
        id,
        name,
        key_prefix,
        permissions,
        rate_limit_per_hour,
        is_active,
        last_used_at,
        expires_at,
        created_at
      `)
      .eq('tenant_id', req.tenant.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: apiKeys,
      meta: {
        total: apiKeys.length,
        tenant: req.tenant.name
      }
    });

  } catch (error) {
    console.error('API Keys fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API keys',
      details: error.message
    });
  }
});

// Usage statistics
app.get('/api/admin/usage-stats', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const { data: stats, error } = await supabase
      .rpc('get_api_usage_stats', {
        p_tenant_id: req.tenant.id,
        p_days: parseInt(days)
      });

    if (error) throw error;

    res.json({
      success: true,
      data: stats,
      meta: {
        period_days: parseInt(days),
        tenant: req.tenant.name
      }
    });

  } catch (error) {
    console.error('Usage stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage statistics',
      details: error.message
    });
  }
});

// =====================================================
// SEO ROUTES
// =====================================================

app.use('/api/v1/seo', seoRoutes);

// =====================================================
// ERROR HANDLING
// =====================================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// =====================================================
// SERVER STARTUP
// =====================================================

const server = app.listen(PORT, () => {
  console.log('\n🚀 FaceBlog Enhanced Server Started!');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/api/docs`);
  console.log(`🔒 Authentication: Enhanced multi-tenant with rate limiting`);
  console.log(`⚡ Features: SEO Intelligence, Image Wizard, RLS isolation`);
  console.log('\n📋 Available endpoints:');
  console.log('  GET  /health - Health check');
  console.log('  GET  /api/test-db - Database test');
  console.log('  GET  /api/docs - API documentation');
  console.log('  GET  /api/v1/articles - List articles (authenticated)');
  console.log('  POST /api/v1/articles - Create article (write permission)');
  console.log('  GET  /api/admin/api-keys - Manage API keys (admin)');
  console.log('  GET  /api/admin/usage-stats - Usage statistics (admin)');
  console.log('\n🔑 Demo API Key:');
  console.log('  fb_demo_6db80687b8611835730430e87c63136a3bfbdef8f658250e5d078320c23809de');
  console.log('\n✨ Ready for production!\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;
