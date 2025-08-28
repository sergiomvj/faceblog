const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Environment Variables:');
console.log('SUPABASE_URL:', supabaseUrl);
console.log('SUPABASE_ANON_KEY:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NOT SET');

// Basic middleware
app.use(cors());
app.use(express.json());

// Try to load optional middleware
let seoRoutes, cacheService;
try {
  seoRoutes = require('./routes/seo');
  console.log('✅ SEO routes loaded');
} catch (error) {
  console.log('⚠️ SEO routes not available:', error.message);
}

try {
  cacheService = require('./services/cache-service');
  console.log('✅ Cache service loaded');
} catch (error) {
  console.log('⚠️ Cache service not available:', error.message);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// SEO routes (only if loaded)
if (seoRoutes) {
  app.use('/api/seo', seoRoutes);
}

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Database connection successful',
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      details: error.message
    });
  }
});

// Simple auth endpoint (POST for login, GET for info)
app.get('/api/auth/login', (req, res) => {
  res.json({
    message: 'Login endpoint - use POST method',
    method: 'POST',
    url: '/api/auth/login',
    body: {
      email: 'admin@demo.blogservice.com',
      password: 'admin123'
    }
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'admin@demo.blogservice.com' && password === 'admin123') {
    res.json({
      success: true,
      data: {
        user: {
          id: 'demo-user-id',
          email: 'admin@demo.blogservice.com',
          first_name: 'Admin',
          last_name: 'Demo',
          role: 'admin'
        },
        token: 'demo-jwt-token'
      },
      message: 'Login successful'
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

// Optimized articles endpoint with cache
app.get('/api/articles', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status, category_id } = req.query;
    
    // Build optimized query
    let query = supabase
      .from('articles')
      .select(`
        id, title, slug, excerpt, status, views, likes, 
        created_at, updated_at,
        categories(id, name, color),
        users(id, first_name, last_name)
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    
    // Add filters
    if (status) query = query.eq('status', status);
    if (category_id) query = query.eq('category_id', category_id);
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: data?.length === parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch articles',
      details: error.message
    });
  }
});

// Articles POST endpoint
app.post('/api/articles', async (req, res) => {
  try {
    const { title, content, excerpt, status, category_id, author_name, author_email } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required'
      });
    }

    const { data, error } = await supabase
      .from('articles')
      .insert([{
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        content,
        excerpt: excerpt || content.substring(0, 200) + '...',
        status: status || 'draft',
        category_id: category_id || null,
        author_id: null, // Will be set when user authentication is implemented
        reading_time_minutes: Math.ceil(content.length / 1000),
        view_count: 0,
        like_count: 0,
        tenant_id: '00000000-0000-0000-0000-000000000001'
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data,
      message: 'Article created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create article',
      details: error.message
    });
  }
});

// Categories endpoints
app.get('/api/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
      details: error.message
    });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name, description, parent_id, sort_order } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const { data, error } = await supabase
      .from('categories')
      .insert([{
        name,
        slug,
        description: description || null,
        parent_id: parent_id || null,
        sort_order: sort_order || 0,
        is_active: true,
        tenant_id: '00000000-0000-0000-0000-000000000001'
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data,
      message: 'Category created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create category',
      details: error.message
    });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, parent_id, sort_order, is_active } = req.body;
    
    const updateData = {};
    if (name) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (description !== undefined) updateData.description = description;
    if (parent_id !== undefined) updateData.parent_id = parent_id;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    const { data, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data,
      message: 'Category updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update category',
      details: error.message
    });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete category',
      details: error.message
    });
  }
});

app.get('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category',
      details: error.message
    });
  }
});

// Tags endpoints
app.get('/api/tags', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tags',
      details: error.message
    });
  }
});

app.post('/api/tags', async (req, res) => {
  try {
    const { name, color, description } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Tag name is required'
      });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const { data, error } = await supabase
      .from('tags')
      .insert([{
        name,
        slug,
        color: color || '#007bff',
        description: description || null,
        tenant_id: '00000000-0000-0000-0000-000000000001'
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data,
      message: 'Tag created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create tag',
      details: error.message
    });
  }
});

// Comments endpoints
app.get('/api/comments', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments',
      details: error.message
    });
  }
});

app.post('/api/comments', async (req, res) => {
  try {
    const { article_id, content, author_name, author_email } = req.body;
    
    if (!article_id || !content) {
      return res.status(400).json({
        success: false,
        error: 'Article ID and content are required'
      });
    }

    const { data, error } = await supabase
      .from('comments')
      .insert([{
        article_id,
        content,
        author_name: author_name || 'Anonymous',
        author_email: author_email || null,
        status: 'approved',
        tenant_id: '00000000-0000-0000-0000-000000000001'
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data,
      message: 'Comment created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create comment',
      details: error.message
    });
  }
});

// Tenants endpoints
app.get('/api/tenants', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenants',
      details: error.message
    });
  }
});

app.post('/api/tenants', async (req, res) => {
  try {
    const { name, subdomain, plan, settings } = req.body;
    
    if (!name || !subdomain) {
      return res.status(400).json({
        success: false,
        error: 'Name and subdomain are required'
      });
    }

    const slug = subdomain.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const { data, error } = await supabase
      .from('tenants')
      .insert([{
        name,
        slug,
        subdomain,
        plan: plan || 'basic',
        status: 'active',
        settings: settings || {}
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data,
      message: 'Tenant created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create tenant',
      details: error.message
    });
  }
});

// Quizzes endpoints
app.get('/api/quizzes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quizzes',
      details: error.message
    });
  }
});

app.post('/api/quizzes', async (req, res) => {
  try {
    const { title, description, questions, points } = req.body;
    
    if (!title || !questions) {
      return res.status(400).json({
        success: false,
        error: 'Title and questions are required'
      });
    }

    const { data, error } = await supabase
      .from('quizzes')
      .insert([{
        title,
        description: description || null,
        questions: questions,
        points: points || 10,
        status: 'active',
        tenant_id: '00000000-0000-0000-0000-000000000001'
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data,
      message: 'Quiz created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create quiz',
      details: error.message
    });
  }
});

// Ranking/Leaderboard endpoints
app.get('/api/leaderboards', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_points')
      .select('*, users(first_name, last_name)')
      .order('total_points', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard',
      details: error.message
    });
  }
});

app.get('/api/user/:userId/points', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data, error } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data || { total_points: 0, level: 1 }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user points',
      details: error.message
    });
  }
});

// Rewards/Premiation endpoints
app.get('/api/rewards', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .order('points_required');
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rewards',
      details: error.message
    });
  }
});

app.post('/api/rewards', async (req, res) => {
  try {
    const { title, description, points_required, reward_type, reward_data } = req.body;
    
    if (!title || !points_required) {
      return res.status(400).json({
        success: false,
        error: 'Title and points required are mandatory'
      });
    }

    const { data, error } = await supabase
      .from('rewards')
      .insert([{
        title,
        description: description || null,
        points_required,
        reward_type: reward_type || 'badge',
        reward_data: reward_data || {},
        is_active: true,
        tenant_id: '00000000-0000-0000-0000-000000000001'
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data,
      message: 'Reward created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create reward',
      details: error.message
    });
  }
});

// Social Integrations endpoints
app.get('/api/social-integrations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('social_integrations')
      .select('*')
      .order('platform');
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch social integrations',
      details: error.message
    });
  }
});

app.post('/api/social-integrations', async (req, res) => {
  try {
    const { platform, access_token, settings } = req.body;
    
    if (!platform || !access_token) {
      return res.status(400).json({
        success: false,
        error: 'Platform and access token are required'
      });
    }

    const { data, error } = await supabase
      .from('social_integrations')
      .insert([{
        platform,
        access_token,
        settings: settings || {},
        status: 'active',
        tenant_id: '00000000-0000-0000-0000-000000000001'
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data,
      message: 'Social integration created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create social integration',
      details: error.message
    });
  }
});

app.put('/api/social-integrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { access_token, settings, status } = req.body;
    
    const updateData = {};
    if (access_token) updateData.access_token = access_token;
    if (settings) updateData.settings = settings;
    if (status) updateData.status = status;
    
    const { data, error } = await supabase
      .from('social_integrations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data,
      message: 'Social integration updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update social integration',
      details: error.message
    });
  }
});

// Users endpoints
app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, status, created_at')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      details: error.message
    });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { email, password_hash, first_name, last_name, role } = req.body;
    
    if (!email || !password_hash || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password_hash, first name and last name are required'
      });
    }

    const { data, error } = await supabase
      .from('users')
      .insert([{
        email,
        password_hash,
        first_name,
        last_name,
        role: role || 'user',
        status: 'active',
        tenant_id: '00000000-0000-0000-0000-000000000001'
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data,
      message: 'User created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      details: error.message
    });
  }
});

// Deployment endpoints (for frontend compatibility)
app.get('/api/v1/deployment/all', async (req, res) => {
  try {
    // Mock deployment data for now
    res.json({
      success: true,
      data: [
        {
          id: 'demo-deployment-1',
          name: 'Demo Blog Deployment',
          status: 'active',
          url: 'https://demo.faceblog.top',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deployments',
      details: error.message
    });
  }
});

app.get('/api/v1/deployment/analytics', async (req, res) => {
  try {
    // Mock analytics data for now
    res.json({
      success: true,
      data: {
        total_deployments: 1,
        active_deployments: 1,
        total_visits: 1250,
        total_articles: 5,
        total_users: 3
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      details: error.message
    });
  }
});

// Initialize cache warm-up (only if available)
if (cacheService) {
  cacheService.warmUp(supabase);
  cacheService.scheduleCleanup();
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FaceBlog Backend running on port ${PORT}`);
  console.log(`📖 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔍 Test DB: http://localhost:${PORT}/api/test-db`);
  console.log(`🧠 SEO Intelligence: http://localhost:${PORT}/api/seo/health`);
  console.log(`⚡ Cache Service: Active`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
