import express from 'express';
import cors from 'cors';
import { supabase } from './config/database';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

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
      details: (error as Error).message
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

// Simple articles endpoint
app.get('/api/articles', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .limit(10);
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data || [],
      pagination: {
        page: 1,
        limit: 10,
        total: data?.length || 0,
        pages: 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch articles',
      details: (error as Error).message
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
      details: (error as Error).message
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
        tenant_id: 'demo-tenant-id'
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
      details: (error as Error).message
    });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, parent_id, sort_order, is_active } = req.body;
    
    const updateData: Record<string, any> = {};
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
      details: (error as Error).message
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
      details: (error as Error).message
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
      details: (error as Error).message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FaceBlog Backend running on port ${PORT}`);
  console.log(`📖 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔍 Test DB: http://localhost:${PORT}/api/test-db`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
