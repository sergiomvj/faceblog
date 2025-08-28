const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import our native modules
const { testConnection, healthCheck } = require('./config/database-vps');
const authRoutes = require('./routes/auth-routes');
const { extractTenant } = require('./middleware/auth-middleware');

// Import security middleware
const { 
  securityHeaders, 
  inputSanitization, 
  attackDetection,
  securityLogger 
} = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 5000;

// =====================================================
// SECURITY MIDDLEWARE
// =====================================================

// Basic security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
}));

// Advanced security headers
app.use(securityHeaders);

// Compression
app.use(compression());

// Logging
app.use(morgan('combined'));
app.use(securityLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:3001'];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization and attack detection
app.use(inputSanitization);
app.use(attackDetection);

// =====================================================
// HEALTH CHECK ENDPOINTS
// =====================================================

// Simple health check for Docker/Traefik
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Detailed health check
app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await healthCheck();
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: dbHealth,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// =====================================================
// AUTHENTICATION ROUTES
// =====================================================

app.use('/api/auth', authRoutes);

// =====================================================
// API ROUTES (Protected by tenant extraction)
// =====================================================

// Tenants management
app.get('/api/tenants', extractTenant, async (req, res) => {
  try {
    const { query } = require('./config/database-vps');
    const result = await query('SELECT id, name, slug, status, plan, created_at FROM tenants ORDER BY created_at DESC');
    
    res.json({
      success: true,
      data: { tenants: result.rows }
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tenants'
    });
  }
});

// Users management
app.get('/api/users', extractTenant, async (req, res) => {
  try {
    const { query } = require('./config/database-vps');
    const result = await query(`
      SELECT id, email, first_name, last_name, role, is_active, email_verified, created_at
      FROM users 
      WHERE tenant_id = $1 
      ORDER BY created_at DESC
    `, [req.tenant.id]);
    
    res.json({
      success: true,
      data: { users: result.rows }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users'
    });
  }
});

// Categories
app.get('/api/categories', extractTenant, async (req, res) => {
  try {
    const { query } = require('./config/database-vps');
    const result = await query(`
      SELECT id, name, slug, description, color, article_count, sort_order, is_active, created_at
      FROM categories 
      WHERE tenant_id = $1 AND is_active = true
      ORDER BY sort_order ASC, name ASC
    `, [req.tenant.id]);
    
    res.json({
      success: true,
      data: { categories: result.rows }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get categories'
    });
  }
});

// Tags
app.get('/api/tags', extractTenant, async (req, res) => {
  try {
    const { query } = require('./config/database-vps');
    const result = await query(`
      SELECT id, name, slug, description, color, article_count, created_at
      FROM tags 
      WHERE tenant_id = $1
      ORDER BY article_count DESC, name ASC
    `, [req.tenant.id]);
    
    res.json({
      success: true,
      data: { tags: result.rows }
    });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tags'
    });
  }
});

// Articles
app.get('/api/articles', extractTenant, async (req, res) => {
  try {
    const { query } = require('./config/database-vps');
    const { page = 1, limit = 10, status = 'published', category, tag } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE a.tenant_id = $1';
    let params = [req.tenant.id];
    let paramCount = 1;
    
    if (status && status !== 'all') {
      paramCount++;
      whereClause += ` AND a.status = $${paramCount}`;
      params.push(status);
    }
    
    if (category) {
      paramCount++;
      whereClause += ` AND c.slug = $${paramCount}`;
      params.push(category);
    }
    
    const result = await query(`
      SELECT 
        a.id, a.title, a.slug, a.excerpt, a.status, a.featured_image_url,
        a.view_count, a.like_count, a.comment_count, a.reading_time_minutes,
        a.is_featured, a.published_at, a.created_at,
        u.first_name || ' ' || u.last_name as author_name,
        c.name as category_name, c.slug as category_slug
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      ${whereClause}
      ORDER BY a.published_at DESC, a.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset]);
    
    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      ${whereClause}
    `, params);
    
    res.json({
      success: true,
      data: {
        articles: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(countResult.rows[0].total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get articles'
    });
  }
});

// Comments
app.get('/api/comments', extractTenant, async (req, res) => {
  try {
    const { query } = require('./config/database-vps');
    const { article_id, status = 'approved' } = req.query;
    
    let whereClause = 'WHERE c.tenant_id = $1';
    let params = [req.tenant.id];
    let paramCount = 1;
    
    if (article_id) {
      paramCount++;
      whereClause += ` AND c.article_id = $${paramCount}`;
      params.push(article_id);
    }
    
    if (status && status !== 'all') {
      paramCount++;
      whereClause += ` AND c.status = $${paramCount}`;
      params.push(status);
    }
    
    const result = await query(`
      SELECT 
        c.id, c.article_id, c.parent_id, c.author_name, c.author_email,
        c.content, c.status, c.created_at,
        a.title as article_title, a.slug as article_slug
      FROM comments c
      LEFT JOIN articles a ON c.article_id = a.id
      ${whereClause}
      ORDER BY c.created_at DESC
    `, params);
    
    res.json({
      success: true,
      data: { comments: result.rows }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get comments'
    });
  }
});

// =====================================================
// ERROR HANDLING
// =====================================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON in request body',
      code: 'INVALID_JSON'
    });
  }
  
  if (error.message && error.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      error: 'CORS policy violation',
      code: 'CORS_ERROR'
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
});

// =====================================================
// SERVER STARTUP
// =====================================================

async function startServer() {
  try {
    // Test database connection
    console.log('🔗 Testing database connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Database connection failed. Exiting...');
      process.exit(1);
    }
    
    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 FaceBlog Native Server Started!');
      console.log(`📡 Server running on http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️ Database: Native PostgreSQL`);
      console.log(`🔐 Authentication: Custom JWT`);
      console.log(`🏢 Multi-tenant: Enabled`);
      console.log('');
      console.log('📋 Available endpoints:');
      console.log('  GET  /api/health          - Health check');
      console.log('  POST /api/auth/register   - User registration');
      console.log('  POST /api/auth/login      - User login');
      console.log('  POST /api/auth/refresh    - Refresh token');
      console.log('  GET  /api/auth/profile    - User profile');
      console.log('  GET  /api/tenants         - List tenants');
      console.log('  GET  /api/users           - List users');
      console.log('  GET  /api/categories      - List categories');
      console.log('  GET  /api/tags            - List tags');
      console.log('  GET  /api/articles        - List articles');
      console.log('  GET  /api/comments        - List comments');
      console.log('');
      console.log('✅ Server ready for connections!');
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🔄 SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', () => {
      console.log('🔄 SIGINT received, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;
