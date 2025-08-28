#!/usr/bin/env node

/**
 * Simple Express server for Blog-as-a-Service
 * JavaScript version to avoid TypeScript compilation issues
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config();

// Import routes
const tenantApiRoutes = require('./routes/tenant-api');
const apiKeysRoutes = require('./routes/api-keys');
const tenantOnboardingRoutes = require('./routes/tenant-onboarding');
const seoRoutes = require('./routes/seo');

const app = express();
const PORT = process.env.PORT || 5000;

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Blog-as-a-Service Backend',
    version: '1.0.0',
    database: 'Supabase Connected',
  });
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .limit(1);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Database connection successful',
      data: data
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      details: error.message
    });
  }
});

// Multi-tenant API routes (protected by API key)
app.use('/api/v1', tenantApiRoutes);
app.use('/api/v1/api-keys', apiKeysRoutes);

// Tenant onboarding routes (public)
app.use('/api/onboarding', tenantOnboardingRoutes);

// Auth endpoints (simplified)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // For demo purposes, check if it's the demo admin
    if (email === 'admin@demo.blogservice.com' && password === 'admin123') {
      const { data: user, error } = await supabase
        .from('users')
        .select('*, tenants!inner(*)')
        .eq('email', email)
        .single();

      if (error || !user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Generate a simple token (in production, use proper JWT)
      const token = Buffer.from(JSON.stringify({
        userId: user.id,
        tenantId: user.tenant_id,
        role: user.role,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
      })).toString('base64');

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            tenantId: user.tenant_id,
          },
          token,
        },
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message || 'Unknown error',
    });
  }
});

// Articles endpoints
app.get('/api/articles', async (req, res) => {
  try {
    const { data: articles, error } = await supabase
      .from('articles')
      .select(`
        *,
        users!articles_author_id_fkey(first_name, last_name),
        categories(name, slug),
        article_tags(tags(name, slug, color))
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        data: articles,
        pagination: {
          page: 1,
          limit: 20,
          total: articles?.length || 0,
          pages: 1,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch articles',
      error: error.message || 'Unknown error',
    });
  }
});

app.get('/api/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: article, error } = await supabase
      .from('articles')
      .select(`
        *,
        users!articles_author_id_fkey(first_name, last_name, bio),
        categories(name, slug),
        article_tags(tags(name, slug, color))
      `)
      .eq('id', id)
      .single();

    if (error || !article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
      });
    }

    // Increment view count
    await supabase
      .from('articles')
      .update({ view_count: article.view_count + 1 })
      .eq('id', id);

    res.json({
      success: true,
      data: article,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch article',
      error: error.message || 'Unknown error',
    });
  }
});

// POST /api/articles - Create new article
app.post('/api/articles', async (req, res) => {
  try {
    const { title, content, excerpt, category_id, tags, status = 'draft' } = req.body;
    
    // Basic validation
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required',
      });
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug already exists
    const { data: existingArticle } = await supabase
      .from('articles')
      .select('id')
      .eq('slug', slug)
      .single();

    const finalSlug = existingArticle ? `${slug}-${Date.now()}` : slug;

    // Create article
    const { data: article, error } = await supabase
      .from('articles')
      .insert({
        title,
        slug: finalSlug,
        content,
        excerpt: excerpt || content.substring(0, 200) + '...',
        category_id,
        author_id: 1, // TODO: Get from auth token
        tenant_id: 1, // TODO: Get from tenant context
        status,
        reading_time: Math.ceil(content.split(' ').length / 200), // ~200 words per minute
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Handle tags if provided
    if (tags && tags.length > 0) {
      const tagInserts = tags.map(tagId => ({
        article_id: article.id,
        tag_id: tagId,
      }));

      await supabase
        .from('article_tags')
        .insert(tagInserts);
    }

    res.status(201).json({
      success: true,
      data: article,
      message: 'Article created successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create article',
      error: error.message || 'Unknown error',
    });
  }
});

// PUT /api/articles/:id - Update article
app.put('/api/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, excerpt, category_id, tags, status } = req.body;

    // Check if article exists
    const { data: existingArticle, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingArticle) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
      });
    }

    // Prepare update data
    const updateData = {};
    if (title) {
      updateData.title = title;
      // Update slug if title changed
      if (title !== existingArticle.title) {
        updateData.slug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
    }
    if (content) {
      updateData.content = content;
      updateData.reading_time = Math.ceil(content.split(' ').length / 200);
    }
    if (excerpt) updateData.excerpt = excerpt;
    if (category_id) updateData.category_id = category_id;
    if (status) updateData.status = status;
    
    updateData.updated_at = new Date().toISOString();

    // Update article
    const { data: article, error } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Handle tags update if provided
    if (tags !== undefined) {
      // Delete existing tags
      await supabase
        .from('article_tags')
        .delete()
        .eq('article_id', id);

      // Insert new tags
      if (tags.length > 0) {
        const tagInserts = tags.map(tagId => ({
          article_id: id,
          tag_id: tagId,
        }));

        await supabase
          .from('article_tags')
          .insert(tagInserts);
      }
    }

    res.json({
      success: true,
      data: article,
      message: 'Article updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update article',
      error: error.message || 'Unknown error',
    });
  }
});

// DELETE /api/articles/:id - Delete article (soft delete)
app.delete('/api/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if article exists
    const { data: existingArticle, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingArticle) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
      });
    }

    // Soft delete (update status to deleted)
    const { error } = await supabase
      .from('articles')
      .update({ 
        status: 'deleted',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Article deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete article',
      error: error.message || 'Unknown error',
    });
  }
});

// PATCH /api/articles/:id/status - Change article status
app.patch('/api/articles/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['draft', 'published', 'archived', 'deleted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', '),
      });
    }

    // Check if article exists
    const { data: existingArticle, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingArticle) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
      });
    }

    // Update status
    const updateData = { 
      status,
      updated_at: new Date().toISOString()
    };

    // Set published_at if publishing for the first time
    if (status === 'published' && !existingArticle.published_at) {
      updateData.published_at = new Date().toISOString();
    }

    const { data: article, error } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: article,
      message: `Article status changed to ${status}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update article status',
      error: error.message || 'Unknown error',
    });
  }
});

// Categories endpoint
app.get('/api/categories', async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message || 'Unknown error',
    });
  }
});

// POST /api/categories - Create new category
app.post('/api/categories', async (req, res) => {
  try {
    const { name, description, parent_id, sort_order = 0 } = req.body;
    
    // Basic validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
      });
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug already exists
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .single();

    const finalSlug = existingCategory ? `${slug}-${Date.now()}` : slug;

    // Create category
    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        name: name.trim(),
        slug: finalSlug,
        description: description?.trim() || null,
        parent_id: parent_id || null,
        tenant_id: 1, // TODO: Get from tenant context
        sort_order,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message || 'Unknown error',
    });
  }
});

// PUT /api/categories/:id - Update category
app.put('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, parent_id, sort_order, is_active } = req.body;

    // Check if category exists
    const { data: existingCategory, error: fetchError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Prepare update data
    const updateData = {};
    if (name && name.trim()) {
      updateData.name = name.trim();
      // Update slug if name changed
      if (name.trim() !== existingCategory.name) {
        updateData.slug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
    }
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (parent_id !== undefined) updateData.parent_id = parent_id || null;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    updateData.updated_at = new Date().toISOString();

    // Update category
    const { data: category, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: category,
      message: 'Category updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message || 'Unknown error',
    });
  }
});

// DELETE /api/categories/:id - Delete category
app.delete('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const { data: existingCategory, error: fetchError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Check if category has articles
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('id')
      .eq('category_id', id)
      .limit(1);

    if (articlesError) {
      throw articlesError;
    }

    if (articles && articles.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category that has articles. Move articles to another category first.',
      });
    }

    // Delete category (hard delete since it's safe)
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message || 'Unknown error',
    });
  }
});

// Tags endpoint
app.get('/api/tags', async (req, res) => {
  try {
    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .order('article_count', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: tags,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tags',
      error: error.message || 'Unknown error',
    });
  }
});

// POST /api/tags - Create new tag
app.post('/api/tags', async (req, res) => {
  try {
    const { name, description, color = '#3B82F6' } = req.body;
    
    // Basic validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tag name is required',
      });
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug already exists
    const { data: existingTag } = await supabase
      .from('tags')
      .select('id')
      .eq('slug', slug)
      .single();

    const finalSlug = existingTag ? `${slug}-${Date.now()}` : slug;

    // Create tag
    const { data: tag, error } = await supabase
      .from('tags')
      .insert({
        name: name.trim(),
        slug: finalSlug,
        description: description?.trim() || null,
        color: color,
        tenant_id: 1, // TODO: Get from tenant context
        article_count: 0,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      data: tag,
      message: 'Tag created successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create tag',
      error: error.message || 'Unknown error',
    });
  }
});

// PUT /api/tags/:id - Update tag
app.put('/api/tags/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color } = req.body;

    // Check if tag exists
    const { data: existingTag, error: fetchError } = await supabase
      .from('tags')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingTag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found',
      });
    }

    // Prepare update data
    const updateData = {};
    if (name && name.trim()) {
      updateData.name = name.trim();
      // Update slug if name changed
      if (name.trim() !== existingTag.name) {
        updateData.slug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
    }
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (color) updateData.color = color;
    
    updateData.updated_at = new Date().toISOString();

    // Update tag
    const { data: tag, error } = await supabase
      .from('tags')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: tag,
      message: 'Tag updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update tag',
      error: error.message || 'Unknown error',
    });
  }
});

// DELETE /api/tags/:id - Delete tag
app.delete('/api/tags/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if tag exists
    const { data: existingTag, error: fetchError } = await supabase
      .from('tags')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingTag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found',
      });
    }

    // Check if tag has articles
    const { data: articleTags, error: articleTagsError } = await supabase
      .from('article_tags')
      .select('id')
      .eq('tag_id', id)
      .limit(1);

    if (articleTagsError) {
      throw articleTagsError;
    }

    if (articleTags && articleTags.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete tag that is used by articles. Remove tag from articles first.',
      });
    }

    // Delete tag (hard delete since it's safe)
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Tag deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete tag',
      error: error.message || 'Unknown error',
    });
  }
});

// ==========================================
// USERS ROUTES
// ==========================================

// GET /api/users - List all users
app.get('/api/users', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        avatar_url,
        bio,
        status,
        tenant_id,
        created_at,
        updated_at
      `)
      .eq('tenant_id', 'demo-tenant-id')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: users || [],
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message || 'Unknown error',
    });
  }
});

// GET /api/users/:id - Get specific user
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        avatar_url,
        bio,
        status,
        tenant_id,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .eq('tenant_id', 'demo-tenant-id')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message || 'Unknown error',
    });
  }
});

// POST /api/users - Create new user
app.post('/api/users', async (req, res) => {
  try {
    const { email, name, role = 'author', avatar_url, bio, password } = req.body;

    // Validation
    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email and name are required',
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Validate role
    const validRoles = ['admin', 'editor', 'author', 'subscriber'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be one of: admin, editor, author, subscriber',
      });
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('tenant_id', 'demo-tenant-id')
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists',
      });
    }

    // Hash password (simplified for demo)
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          name,
          role,
          avatar_url,
          bio,
          password_hash: hashedPassword,
          status: 'active',
          tenant_id: 'demo-tenant-id',
        },
      ])
      .select(`
        id,
        email,
        name,
        role,
        avatar_url,
        bio,
        status,
        tenant_id,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'User created successfully',
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message || 'Unknown error',
    });
  }
});

// PUT /api/users/:id - Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, role, avatar_url, bio, status } = req.body;

    // Validation
    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email and name are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Validate role
    if (role) {
      const validRoles = ['admin', 'editor', 'author', 'subscriber'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be one of: admin, editor, author, subscriber',
        });
      }
    }

    // Validate status
    if (status) {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: active, inactive, suspended',
        });
      }
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', 'demo-tenant-id')
      .single();

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if email is taken by another user
    if (email) {
      const { data: emailUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .eq('tenant_id', 'demo-tenant-id')
        .neq('id', id)
        .single();

      if (emailUser) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists',
        });
      }
    }

    // Update user
    const updateData = {
      email,
      name,
      updated_at: new Date().toISOString(),
    };

    if (role) updateData.role = role;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (bio !== undefined) updateData.bio = bio;
    if (status) updateData.status = status;

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', 'demo-tenant-id')
      .select(`
        id,
        email,
        name,
        role,
        avatar_url,
        bio,
        status,
        tenant_id,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message || 'Unknown error',
    });
  }
});

// DELETE /api/users/:id - Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', id)
      .eq('tenant_id', 'demo-tenant-id')
      .single();

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent deletion of admin users (safety check)
    if (existingUser.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin users',
      });
    }

    // Check if user has articles (optional: prevent deletion if has content)
    const { data: userArticles } = await supabase
      .from('articles')
      .select('id')
      .eq('author_id', id)
      .eq('tenant_id', 'demo-tenant-id')
      .limit(1);

    if (userArticles && userArticles.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete user with existing articles. Please reassign or delete articles first.',
      });
    }

    // Delete user
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('tenant_id', 'demo-tenant-id');

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message || 'Unknown error',
    });
  }
});

// PATCH /api/users/:id/status - Update user status
app.patch('/api/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: active, inactive, suspended',
      });
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', id)
      .eq('tenant_id', 'demo-tenant-id')
      .single();

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent suspending admin users
    if (existingUser.role === 'admin' && status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Cannot suspend admin users',
      });
    }

    // Update status
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', 'demo-tenant-id')
      .select(`
        id,
        email,
        name,
        role,
        avatar_url,
        bio,
        status,
        tenant_id,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: updatedUser,
      message: 'User status updated successfully',
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message || 'Unknown error',
    });
  }
});

// ==========================================
// TENANTS ROUTES
// ==========================================

// GET /api/tenants - List all tenants (admin only)
app.get('/api/tenants', async (req, res) => {
  try {
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        slug,
        subdomain,
        domain,
        description,
        logo_url,
        plan,
        status,
        settings,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: tenants || [],
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenants',
      error: error.message || 'Unknown error',
    });
  }
});

// GET /api/tenants/:id - Get specific tenant
app.get('/api/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        slug,
        subdomain,
        domain,
        description,
        logo_url,
        plan,
        status,
        settings,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found',
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenant',
      error: error.message || 'Unknown error',
    });
  }
});

// POST /api/tenants - Create new tenant
app.post('/api/tenants', async (req, res) => {
  try {
    const { 
      name, 
      slug, 
      subdomain, 
      domain, 
      description, 
      logo_url, 
      plan = 'free',
      settings = {}
    } = req.body;

    // Validation
    if (!name || !slug || !subdomain) {
      return res.status(400).json({
        success: false,
        message: 'Name, slug, and subdomain are required',
      });
    }

    // Validate slug format (alphanumeric and hyphens only)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return res.status(400).json({
        success: false,
        message: 'Slug must contain only lowercase letters, numbers, and hyphens',
      });
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomain)) {
      return res.status(400).json({
        success: false,
        message: 'Subdomain must contain only lowercase letters, numbers, and hyphens',
      });
    }

    // Validate plan
    const validPlans = ['free', 'starter', 'pro', 'enterprise'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan. Must be one of: free, starter, pro, enterprise',
      });
    }

    // Check if slug already exists
    const { data: existingSlug } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingSlug) {
      return res.status(409).json({
        success: false,
        message: 'Slug already exists',
      });
    }

    // Check if subdomain already exists
    const { data: existingSubdomain } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    if (existingSubdomain) {
      return res.status(409).json({
        success: false,
        message: 'Subdomain already exists',
      });
    }

    // Check if domain already exists (if provided)
    if (domain) {
      const { data: existingDomain } = await supabase
        .from('tenants')
        .select('id')
        .eq('domain', domain)
        .single();

      if (existingDomain) {
        return res.status(409).json({
          success: false,
          message: 'Domain already exists',
        });
      }
    }

    // Create tenant
    const { data: newTenant, error } = await supabase
      .from('tenants')
      .insert([
        {
          name,
          slug,
          subdomain,
          domain,
          description,
          logo_url,
          plan,
          status: 'active',
          settings: JSON.stringify(settings),
        },
      ])
      .select(`
        id,
        name,
        slug,
        subdomain,
        domain,
        description,
        logo_url,
        plan,
        status,
        settings,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      data: newTenant,
      message: 'Tenant created successfully',
    });
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create tenant',
      error: error.message || 'Unknown error',
    });
  }
});

// PUT /api/tenants/:id - Update tenant
app.put('/api/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      slug, 
      subdomain, 
      domain, 
      description, 
      logo_url, 
      plan, 
      status,
      settings
    } = req.body;

    // Validation
    if (!name || !slug || !subdomain) {
      return res.status(400).json({
        success: false,
        message: 'Name, slug, and subdomain are required',
      });
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return res.status(400).json({
        success: false,
        message: 'Slug must contain only lowercase letters, numbers, and hyphens',
      });
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomain)) {
      return res.status(400).json({
        success: false,
        message: 'Subdomain must contain only lowercase letters, numbers, and hyphens',
      });
    }

    // Validate plan
    if (plan) {
      const validPlans = ['free', 'starter', 'pro', 'enterprise'];
      if (!validPlans.includes(plan)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid plan. Must be one of: free, starter, pro, enterprise',
        });
      }
    }

    // Validate status
    if (status) {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: active, inactive, suspended',
        });
      }
    }

    // Check if tenant exists
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingTenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
      });
    }

    // Check if slug is taken by another tenant
    const { data: slugTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .neq('id', id)
      .single();

    if (slugTenant) {
      return res.status(409).json({
        success: false,
        message: 'Slug already exists',
      });
    }

    // Check if subdomain is taken by another tenant
    const { data: subdomainTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', subdomain)
      .neq('id', id)
      .single();

    if (subdomainTenant) {
      return res.status(409).json({
        success: false,
        message: 'Subdomain already exists',
      });
    }

    // Check if domain is taken by another tenant (if provided)
    if (domain) {
      const { data: domainTenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('domain', domain)
        .neq('id', id)
        .single();

      if (domainTenant) {
        return res.status(409).json({
          success: false,
          message: 'Domain already exists',
        });
      }
    }

    // Update tenant
    const updateData = {
      name,
      slug,
      subdomain,
      domain,
      description,
      logo_url,
      updated_at: new Date().toISOString(),
    };

    if (plan) updateData.plan = plan;
    if (status) updateData.status = status;
    if (settings) updateData.settings = JSON.stringify(settings);

    const { data: updatedTenant, error } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        name,
        slug,
        subdomain,
        domain,
        description,
        logo_url,
        plan,
        status,
        settings,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: updatedTenant,
      message: 'Tenant updated successfully',
    });
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tenant',
      error: error.message || 'Unknown error',
    });
  }
});

// DELETE /api/tenants/:id - Delete tenant
app.delete('/api/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if tenant exists
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('id', id)
      .single();

    if (!existingTenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
      });
    }

    // Check if tenant has users (prevent deletion if has users)
    const { data: tenantUsers } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', id)
      .limit(1);

    if (tenantUsers && tenantUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete tenant with existing users. Please remove all users first.',
      });
    }

    // Check if tenant has articles (prevent deletion if has content)
    const { data: tenantArticles } = await supabase
      .from('articles')
      .select('id')
      .eq('tenant_id', id)
      .limit(1);

    if (tenantArticles && tenantArticles.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete tenant with existing content. Please remove all articles first.',
      });
    }

    // Delete tenant
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Tenant deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete tenant',
      error: error.message || 'Unknown error',
    });
  }
});

// PATCH /api/tenants/:id/status - Update tenant status
app.patch('/api/tenants/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: active, inactive, suspended',
      });
    }

    // Check if tenant exists
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingTenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
      });
    }

    // Update status
    const { data: updatedTenant, error } = await supabase
      .from('tenants')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        id,
        name,
        slug,
        subdomain,
        domain,
        description,
        logo_url,
        plan,
        status,
        settings,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: updatedTenant,
      message: 'Tenant status updated successfully',
    });
  } catch (error) {
    console.error('Error updating tenant status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tenant status',
      error: error.message || 'Unknown error',
    });
  }
});

// ==========================================
// COMMENTS ROUTES
// ==========================================

// Get all comments (with filters)
app.get('/api/comments', async (req, res) => {
  try {
    const { article_id, status, author_email, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('comments')
      .select(`
        id,
        content,
        author_name,
        author_email,
        status,
        article_id,
        parent_id,
        tenant_id,
        created_at,
        updated_at,
        articles!inner(title, slug)
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Apply filters
    if (article_id) {
      query = query.eq('article_id', article_id);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (author_email) {
      query = query.ilike('author_email', `%${author_email}%`);
    }

    const { data: comments, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: comments || [],
      message: 'Comments retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
      error: error.message || 'Unknown error',
    });
  }
});

// Get comment by ID
app.get('/api/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: comment, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        author_name,
        author_email,
        status,
        article_id,
        parent_id,
        tenant_id,
        created_at,
        updated_at,
        articles!inner(title, slug)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Comment not found',
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: comment,
      message: 'Comment retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comment',
      error: error.message || 'Unknown error',
    });
  }
});

// Create new comment
app.post('/api/comments', async (req, res) => {
  try {
    const { content, author_name, author_email, article_id, parent_id } = req.body;

    // Validation
    if (!content || !author_name || !author_email || !article_id) {
      return res.status(400).json({
        success: false,
        message: 'Content, author name, author email, and article ID are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(author_email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Validate content length
    if (content.length < 5 || content.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Content must be between 5 and 2000 characters',
      });
    }

    // Check if article exists
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id, tenant_id')
      .eq('id', article_id)
      .single();

    if (articleError || !article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
      });
    }

    // If parent_id is provided, check if parent comment exists
    if (parent_id) {
      const { data: parentComment, error: parentError } = await supabase
        .from('comments')
        .select('id')
        .eq('id', parent_id)
        .eq('article_id', article_id)
        .single();

      if (parentError || !parentComment) {
        return res.status(404).json({
          success: false,
          message: 'Parent comment not found',
        });
      }
    }

    const { data: newComment, error } = await supabase
      .from('comments')
      .insert([
        {
          content: content.trim(),
          author_name: author_name.trim(),
          author_email: author_email.trim().toLowerCase(),
          article_id,
          parent_id: parent_id || null,
          tenant_id: article.tenant_id,
          status: 'pending', // Default status for new comments
        },
      ])
      .select(`
        id,
        content,
        author_name,
        author_email,
        status,
        article_id,
        parent_id,
        tenant_id,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      data: newComment,
      message: 'Comment created successfully',
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create comment',
      error: error.message || 'Unknown error',
    });
  }
});

// Update comment
app.put('/api/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, author_name, author_email } = req.body;

    // Validation
    if (!content || !author_name || !author_email) {
      return res.status(400).json({
        success: false,
        message: 'Content, author name, and author email are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(author_email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Validate content length
    if (content.length < 5 || content.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Content must be between 5 and 2000 characters',
      });
    }

    const { data: updatedComment, error } = await supabase
      .from('comments')
      .update({
        content: content.trim(),
        author_name: author_name.trim(),
        author_email: author_email.trim().toLowerCase(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        id,
        content,
        author_name,
        author_email,
        status,
        article_id,
        parent_id,
        tenant_id,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Comment not found',
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: updatedComment,
      message: 'Comment updated successfully',
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update comment',
      error: error.message || 'Unknown error',
    });
  }
});

// Delete comment
app.delete('/api/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if comment has replies
    const { data: replies, error: repliesError } = await supabase
      .from('comments')
      .select('id')
      .eq('parent_id', id);

    if (repliesError) {
      throw repliesError;
    }

    if (replies && replies.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete comment with replies. Delete replies first.',
      });
    }

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment',
      error: error.message || 'Unknown error',
    });
  }
});

// Update comment status (approve, reject, spam)
app.patch('/api/comments/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected', 'spam'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required (pending, approved, rejected, spam)',
      });
    }

    const { data: updatedComment, error } = await supabase
      .from('comments')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        id,
        content,
        author_name,
        author_email,
        status,
        article_id,
        parent_id,
        tenant_id,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Comment not found',
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: updatedComment,
      message: 'Comment status updated successfully',
    });
  } catch (error) {
    console.error('Error updating comment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update comment status',
      error: error.message || 'Unknown error',
    });
  }
});

// Get comments by article ID (public endpoint for frontend display)
app.get('/api/articles/:articleId/comments', async (req, res) => {
  try {
    const { articleId } = req.params;
    const { status = 'approved' } = req.query;

    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        author_name,
        status,
        parent_id,
        created_at
      `)
      .eq('article_id', articleId)
      .eq('status', status)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    // Organize comments in a tree structure
    const commentMap = new Map();
    const rootComments = [];

    // First pass: create all comment objects
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: organize into tree structure
    comments.forEach(comment => {
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(commentMap.get(comment.id));
        }
      } else {
        rootComments.push(commentMap.get(comment.id));
      }
    });

    res.json({
      success: true,
      data: rootComments,
      message: 'Comments retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching article comments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch article comments',
      error: error.message || 'Unknown error',
    });
  }
});

// ==========================================
// GAMIFICATION ROUTES - QUIZ SYSTEM
// ==========================================

// Get all quizzes (with filters)
app.get('/api/quizzes', async (req, res) => {
  try {
    const { article_id, status, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('quizzes')
      .select(`
        id,
        title,
        description,
        article_id,
        status,
        difficulty,
        time_limit,
        points_reward,
        tenant_id,
        created_at,
        updated_at,
        articles!inner(title, slug)
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Apply filters
    if (article_id) {
      query = query.eq('article_id', article_id);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: quizzes, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: quizzes || [],
      message: 'Quizzes retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quizzes',
      error: error.message || 'Unknown error',
    });
  }
});

// Get quiz by ID with questions
app.get('/api/quizzes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select(`
        id,
        title,
        description,
        article_id,
        status,
        difficulty,
        time_limit,
        points_reward,
        tenant_id,
        created_at,
        updated_at,
        articles!inner(title, slug),
        quiz_questions!inner(
          id,
          question_text,
          question_type,
          options,
          correct_answer,
          points,
          order_index
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found',
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: quiz,
      message: 'Quiz retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz',
      error: error.message || 'Unknown error',
    });
  }
});

// Create new quiz
app.post('/api/quizzes', async (req, res) => {
  try {
    const { title, description, article_id, difficulty, time_limit, points_reward, questions } = req.body;

    // Validation
    if (!title || !article_id) {
      return res.status(400).json({
        success: false,
        message: 'Title and article ID are required',
      });
    }

    // Validate difficulty
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (difficulty && !validDifficulties.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid difficulty level',
      });
    }

    // Check if article exists
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id, tenant_id')
      .eq('id', article_id)
      .single();

    if (articleError || !article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
      });
    }

    // Create quiz
    const { data: newQuiz, error } = await supabase
      .from('quizzes')
      .insert([
        {
          title: title.trim(),
          description: description?.trim() || null,
          article_id,
          difficulty: difficulty || 'medium',
          time_limit: time_limit || 300, // 5 minutes default
          points_reward: points_reward || 10,
          tenant_id: article.tenant_id,
          status: 'draft',
        },
      ])
      .select(`
        id,
        title,
        description,
        article_id,
        status,
        difficulty,
        time_limit,
        points_reward,
        tenant_id,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      throw error;
    }

    // If questions are provided, create them
    if (questions && Array.isArray(questions) && questions.length > 0) {
      const questionsData = questions.map((q, index) => ({
        quiz_id: newQuiz.id,
        question_text: q.question_text,
        question_type: q.question_type || 'multiple_choice',
        options: q.options || [],
        correct_answer: q.correct_answer,
        points: q.points || 1,
        order_index: index + 1,
      }));

      const { error: questionsError } = await supabase
        .from('quiz_questions')
        .insert(questionsData);

      if (questionsError) {
        console.error('Error creating questions:', questionsError);
        // Don't fail the quiz creation, just log the error
      }
    }

    res.status(201).json({
      success: true,
      data: newQuiz,
      message: 'Quiz created successfully',
    });
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create quiz',
      error: error.message || 'Unknown error',
    });
  }
});

// Update quiz
app.put('/api/quizzes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, difficulty, time_limit, points_reward } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required',
      });
    }

    // Validate difficulty
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (difficulty && !validDifficulties.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid difficulty level',
      });
    }

    const { data: updatedQuiz, error } = await supabase
      .from('quizzes')
      .update({
        title: title.trim(),
        description: description?.trim() || null,
        difficulty: difficulty || 'medium',
        time_limit: time_limit || 300,
        points_reward: points_reward || 10,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        id,
        title,
        description,
        article_id,
        status,
        difficulty,
        time_limit,
        points_reward,
        tenant_id,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found',
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: updatedQuiz,
      message: 'Quiz updated successfully',
    });
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update quiz',
      error: error.message || 'Unknown error',
    });
  }
});

// Delete quiz
app.delete('/api/quizzes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if quiz has attempts
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('id')
      .eq('quiz_id', id);

    if (attemptsError) {
      throw attemptsError;
    }

    if (attempts && attempts.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete quiz with existing attempts. Archive it instead.',
      });
    }

    // Delete questions first
    const { error: questionsError } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('quiz_id', id);

    if (questionsError) {
      throw questionsError;
    }

    // Delete quiz
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Quiz deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete quiz',
      error: error.message || 'Unknown error',
    });
  }
});

// Update quiz status
app.patch('/api/quizzes/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['draft', 'published', 'archived'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required (draft, published, archived)',
      });
    }

    const { data: updatedQuiz, error } = await supabase
      .from('quizzes')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        id,
        title,
        description,
        article_id,
        status,
        difficulty,
        time_limit,
        points_reward,
        tenant_id,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found',
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: updatedQuiz,
      message: 'Quiz status updated successfully',
    });
  } catch (error) {
    console.error('Error updating quiz status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update quiz status',
      error: error.message || 'Unknown error',
    });
  }
});

// ==========================================
// GAMIFICATION ROUTES - RANKING SYSTEM
// ==========================================

// Get leaderboards
app.get('/api/leaderboards', async (req, res) => {
  try {
    const { type = 'points', period = 'all_time', limit = 50 } = req.query;

    let query = supabase
      .from('user_points')
      .select(`
        user_id,
        total_points,
        reading_points,
        quiz_points,
        comment_points,
        created_at,
        users!inner(name, email, avatar_url)
      `)
      .order('total_points', { ascending: false })
      .limit(parseInt(limit));

    // Apply period filter
    if (period !== 'all_time') {
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        query = query.gte('updated_at', startDate.toISOString());
      }
    }

    const { data: leaderboard, error } = await query;

    if (error) {
      throw error;
    }

    // Add ranking positions
    const rankedLeaderboard = (leaderboard || []).map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    res.json({
      success: true,
      data: rankedLeaderboard,
      message: 'Leaderboard retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard',
      error: error.message || 'Unknown error',
    });
  }
});

// Get user points
app.get('/api/users/:userId/points', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: userPoints, error } = await supabase
      .from('user_points')
      .select(`
        user_id,
        total_points,
        reading_points,
        quiz_points,
        comment_points,
        level,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Create initial points record if doesn't exist
        const { data: newUserPoints, error: createError } = await supabase
          .from('user_points')
          .insert([
            {
              user_id: userId,
              total_points: 0,
              reading_points: 0,
              quiz_points: 0,
              comment_points: 0,
              level: 1,
            },
          ])
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        return res.json({
          success: true,
          data: newUserPoints,
          message: 'User points initialized',
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: userPoints,
      message: 'User points retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching user points:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user points',
      error: error.message || 'Unknown error',
    });
  }
});

// Award points to user
app.post('/api/users/:userId/points', async (req, res) => {
  try {
    const { userId } = req.params;
    const { points, type, reason, reference_id } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid points amount is required',
      });
    }

    const validTypes = ['reading', 'quiz', 'comment', 'bonus'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Valid point type is required (reading, quiz, comment, bonus)',
      });
    }

    // Get current user points or create if doesn't exist
    let { data: userPoints, error: fetchError } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      // Create initial record
      const { data: newUserPoints, error: createError } = await supabase
        .from('user_points')
        .insert([
          {
            user_id: userId,
            total_points: 0,
            reading_points: 0,
            quiz_points: 0,
            comment_points: 0,
            level: 1,
          },
        ])
        .select()
        .single();

      if (createError) {
        throw createError;
      }
      userPoints = newUserPoints;
    } else if (fetchError) {
      throw fetchError;
    }

    // Update points
    const updatedPoints = {
      total_points: userPoints.total_points + points,
      [`${type}_points`]: userPoints[`${type}_points`] + points,
      updated_at: new Date().toISOString(),
    };

    // Calculate level (every 100 points = 1 level)
    updatedPoints.level = Math.floor(updatedPoints.total_points / 100) + 1;

    const { data: updated, error: updateError } = await supabase
      .from('user_points')
      .update(updatedPoints)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Log the point transaction
    const { error: logError } = await supabase
      .from('point_transactions')
      .insert([
        {
          user_id: userId,
          points,
          type,
          reason: reason || `${type} activity`,
          reference_id,
        },
      ]);

    if (logError) {
      console.error('Error logging point transaction:', logError);
      // Don't fail the request, just log the error
    }

    res.json({
      success: true,
      data: updated,
      message: 'Points awarded successfully',
    });
  } catch (error) {
    console.error('Error awarding points:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to award points',
      error: error.message || 'Unknown error',
    });
  }
});

// ==========================================
// GAMIFICATION ROUTES - REWARDS SYSTEM
// ==========================================

// Get all rewards
app.get('/api/rewards', async (req, res) => {
  try {
    const { status, type, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('rewards')
      .select(`
        id,
        title,
        description,
        type,
        cost_points,
        max_claims,
        current_claims,
        status,
        reward_data,
        tenant_id,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (type) {
      query = query.eq('type', type);
    }

    const { data: rewards, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: rewards || [],
      message: 'Rewards retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching rewards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rewards',
      error: error.message || 'Unknown error',
    });
  }
});

// Create new reward
app.post('/api/rewards', async (req, res) => {
  try {
    const { title, description, type, cost_points, max_claims, reward_data } = req.body;

    // Validation
    if (!title || !type || !cost_points) {
      return res.status(400).json({
        success: false,
        message: 'Title, type, and cost points are required',
      });
    }

    const validTypes = ['badge', 'discount', 'content', 'physical', 'digital'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reward type',
      });
    }

    if (cost_points <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Cost points must be greater than 0',
      });
    }

    const { data: newReward, error } = await supabase
      .from('rewards')
      .insert([
        {
          title: title.trim(),
          description: description?.trim() || null,
          type,
          cost_points,
          max_claims: max_claims || null,
          current_claims: 0,
          status: 'active',
          reward_data: reward_data || {},
          tenant_id: 'demo', // TODO: Get from auth context
        },
      ])
      .select(`
        id,
        title,
        description,
        type,
        cost_points,
        max_claims,
        current_claims,
        status,
        reward_data,
        tenant_id,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      data: newReward,
      message: 'Reward created successfully',
    });
  } catch (error) {
    console.error('Error creating reward:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create reward',
      error: error.message || 'Unknown error',
    });
  }
});

// Claim reward
app.post('/api/rewards/:id/claim', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    // Get reward details
    const { data: reward, error: rewardError } = await supabase
      .from('rewards')
      .select('*')
      .eq('id', id)
      .single();

    if (rewardError || !reward) {
      return res.status(404).json({
        success: false,
        message: 'Reward not found',
      });
    }

    if (reward.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Reward is not active',
      });
    }

    // Check if max claims reached
    if (reward.max_claims && reward.current_claims >= reward.max_claims) {
      return res.status(400).json({
        success: false,
        message: 'Reward is no longer available',
      });
    }

    // Check if user already claimed this reward
    const { data: existingClaim, error: claimCheckError } = await supabase
      .from('user_rewards')
      .select('id')
      .eq('user_id', user_id)
      .eq('reward_id', id)
      .single();

    if (claimCheckError && claimCheckError.code !== 'PGRST116') {
      throw claimCheckError;
    }

    if (existingClaim) {
      return res.status(400).json({
        success: false,
        message: 'Reward already claimed by this user',
      });
    }

    // Check user points
    const { data: userPoints, error: pointsError } = await supabase
      .from('user_points')
      .select('total_points')
      .eq('user_id', user_id)
      .single();

    if (pointsError || !userPoints) {
      return res.status(400).json({
        success: false,
        message: 'User points not found',
      });
    }

    if (userPoints.total_points < reward.cost_points) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient points to claim this reward',
      });
    }

    // Deduct points from user
    const { error: deductError } = await supabase
      .from('user_points')
      .update({
        total_points: userPoints.total_points - reward.cost_points,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user_id);

    if (deductError) {
      throw deductError;
    }

    // Create user reward claim
    const { data: userReward, error: claimError } = await supabase
      .from('user_rewards')
      .insert([
        {
          user_id,
          reward_id: id,
          points_spent: reward.cost_points,
          status: 'claimed',
        },
      ])
      .select()
      .single();

    if (claimError) {
      throw claimError;
    }

    // Update reward claim count
    const { error: updateRewardError } = await supabase
      .from('rewards')
      .update({
        current_claims: reward.current_claims + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateRewardError) {
      console.error('Error updating reward claims:', updateRewardError);
      // Don't fail the request, just log the error
    }

    res.json({
      success: true,
      data: userReward,
      message: 'Reward claimed successfully',
    });
  } catch (error) {
    console.error('Error claiming reward:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to claim reward',
      error: error.message || 'Unknown error',
    });
  }
});

// Get user rewards
app.get('/api/users/:userId/rewards', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: userRewards, error } = await supabase
      .from('user_rewards')
      .select(`
        id,
        points_spent,
        status,
        claimed_at,
        rewards!inner(
          id,
          title,
          description,
          type,
          reward_data
        )
      `)
      .eq('user_id', userId)
      .order('claimed_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: userRewards || [],
      message: 'User rewards retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching user rewards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user rewards',
      error: error.message || 'Unknown error',
    });
  }
});

// ==========================================
// SOCIAL INTEGRATIONS ROUTES
// ==========================================

// Get all social integrations
app.get('/api/social-integrations', async (req, res) => {
  try {
    const { platform, status, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('social_integrations')
      .select(`
        id,
        platform,
        platform_user_id,
        platform_username,
        access_token,
        refresh_token,
        token_expires_at,
        status,
        settings,
        last_sync_at,
        tenant_id,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Apply filters
    if (platform) {
      query = query.eq('platform', platform);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: integrations, error } = await query;

    if (error) {
      throw error;
    }

    // Remove sensitive data from response
    const sanitizedIntegrations = (integrations || []).map(integration => ({
      ...integration,
      access_token: integration.access_token ? '***' : null,
      refresh_token: integration.refresh_token ? '***' : null,
    }));

    res.json({
      success: true,
      data: sanitizedIntegrations,
      message: 'Social integrations retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching social integrations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch social integrations',
      error: error.message || 'Unknown error',
    });
  }
});

// Get social integration by ID
app.get('/api/social-integrations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: integration, error } = await supabase
      .from('social_integrations')
      .select(`
        id,
        platform,
        platform_user_id,
        platform_username,
        status,
        settings,
        last_sync_at,
        tenant_id,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Social integration not found',
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: integration,
      message: 'Social integration retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching social integration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch social integration',
      error: error.message || 'Unknown error',
    });
  }
});

// Create social integration
app.post('/api/social-integrations', async (req, res) => {
  try {
    const { 
      platform, 
      platform_user_id, 
      platform_username, 
      access_token, 
      refresh_token, 
      token_expires_at, 
      settings 
    } = req.body;

    // Validation
    if (!platform || !platform_user_id) {
      return res.status(400).json({
        success: false,
        message: 'Platform and platform user ID are required',
      });
    }

    const validPlatforms = ['facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'tiktok'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform. Supported platforms: ' + validPlatforms.join(', '),
      });
    }

    // Check if integration already exists for this platform and tenant
    const { data: existingIntegration, error: checkError } = await supabase
      .from('social_integrations')
      .select('id')
      .eq('platform', platform)
      .eq('tenant_id', 'demo') // TODO: Get from auth context
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingIntegration) {
      return res.status(400).json({
        success: false,
        message: `Integration with ${platform} already exists for this tenant`,
      });
    }

    const { data: newIntegration, error } = await supabase
      .from('social_integrations')
      .insert([
        {
          platform,
          platform_user_id,
          platform_username: platform_username || null,
          access_token: access_token || null,
          refresh_token: refresh_token || null,
          token_expires_at: token_expires_at || null,
          status: 'active',
          settings: settings || {},
          tenant_id: 'demo', // TODO: Get from auth context
        },
      ])
      .select(`
        id,
        platform,
        platform_user_id,
        platform_username,
        status,
        settings,
        last_sync_at,
        tenant_id,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      data: newIntegration,
      message: 'Social integration created successfully',
    });
  } catch (error) {
    console.error('Error creating social integration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create social integration',
      error: error.message || 'Unknown error',
    });
  }
});

// Update social integration
app.put('/api/social-integrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      platform_username, 
      access_token, 
      refresh_token, 
      token_expires_at, 
      settings 
    } = req.body;

    // Check if integration exists
    const { data: existingIntegration, error: checkError } = await supabase
      .from('social_integrations')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Social integration not found',
        });
      }
      throw checkError;
    }

    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (platform_username !== undefined) updateData.platform_username = platform_username;
    if (access_token !== undefined) updateData.access_token = access_token;
    if (refresh_token !== undefined) updateData.refresh_token = refresh_token;
    if (token_expires_at !== undefined) updateData.token_expires_at = token_expires_at;
    if (settings !== undefined) updateData.settings = settings;

    const { data: updatedIntegration, error } = await supabase
      .from('social_integrations')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        platform,
        platform_user_id,
        platform_username,
        status,
        settings,
        last_sync_at,
        tenant_id,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: updatedIntegration,
      message: 'Social integration updated successfully',
    });
  } catch (error) {
    console.error('Error updating social integration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update social integration',
      error: error.message || 'Unknown error',
    });
  }
});

// Delete social integration
app.delete('/api/social-integrations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if integration exists
    const { data: existingIntegration, error: checkError } = await supabase
      .from('social_integrations')
      .select('id, platform')
      .eq('id', id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Social integration not found',
        });
      }
      throw checkError;
    }

    const { error } = await supabase
      .from('social_integrations')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Social integration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting social integration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete social integration',
      error: error.message || 'Unknown error',
    });
  }
});

// Update social integration status
app.patch('/api/social-integrations/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'inactive', 'error'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required (active, inactive, error)',
      });
    }

    // Check if integration exists
    const { data: existingIntegration, error: checkError } = await supabase
      .from('social_integrations')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Social integration not found',
        });
      }
      throw checkError;
    }

    const { data: updatedIntegration, error } = await supabase
      .from('social_integrations')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        id,
        platform,
        platform_user_id,
        platform_username,
        status,
        settings,
        last_sync_at,
        tenant_id,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: updatedIntegration,
      message: 'Social integration status updated successfully',
    });
  } catch (error) {
    console.error('Error updating social integration status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update social integration status',
      error: error.message || 'Unknown error',
    });
  }
});

// Sync social integration (simulate sync with platform)
app.post('/api/social-integrations/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if integration exists and is active
    const { data: integration, error: checkError } = await supabase
      .from('social_integrations')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Social integration not found',
        });
      }
      throw checkError;
    }

    if (integration.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot sync inactive integration',
      });
    }

    // Simulate sync process
    const syncResult = {
      posts_synced: Math.floor(Math.random() * 10) + 1,
      followers_count: Math.floor(Math.random() * 10000) + 100,
      engagement_rate: (Math.random() * 10 + 1).toFixed(2) + '%',
    };

    // Update last sync time
    const { data: updatedIntegration, error } = await supabase
      .from('social_integrations')
      .update({
        last_sync_at: new Date().toISOString(),
        settings: {
          ...integration.settings,
          last_sync_result: syncResult,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        id,
        platform,
        platform_user_id,
        platform_username,
        status,
        settings,
        last_sync_at,
        tenant_id,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        integration: updatedIntegration,
        sync_result: syncResult,
      },
      message: 'Social integration synced successfully',
    });
  } catch (error) {
    console.error('Error syncing social integration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync social integration',
      error: error.message || 'Unknown error',
    });
  }
});

// BigWriter simulation endpoint
app.post('/api/bigwriter/generate', async (req, res) => {
  try {
    const { topic, keywords, tone, length } = req.body;

    if (!topic || !keywords) {
      return res.status(400).json({
        success: false,
        message: 'Topic and keywords are required',
      });
    }

    // Simulate job creation
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // For demo, return immediate success
    res.status(202).json({
      success: true,
      data: {
        job_id: jobId,
        status: 'completed',
        title: `${topic}: Um Guia Completo`,
        content: `# ${topic}

Este é um artigo gerado automaticamente sobre ${topic} usando as palavras-chave: ${keywords.join(', ')}.

## Introdução

${topic} é um assunto importante nos dias atuais. Com o avanço da tecnologia e as mudanças no mercado, é fundamental compreender os aspectos relacionados a este tema.

## Desenvolvimento

### Principais Conceitos

Quando falamos sobre ${topic}, precisamos considerar diversos fatores importantes relacionados às palavras-chave mencionadas.

### Aplicações Práticas

Na prática, ${topic} pode ser aplicado de diversas formas:

1. **Planejamento**: Definindo objetivos claros
2. **Implementação**: Colocando as estratégias em ação
3. **Monitoramento**: Acompanhando os resultados
4. **Otimização**: Melhorando continuamente

## Conclusão

Em resumo, ${topic} representa uma oportunidade significativa para quem busca conhecimento e crescimento na área.`,
        excerpt: `Descubra tudo sobre ${topic}. Guia completo com informações práticas e atualizadas.`,
        meta_description: `Guia completo sobre ${topic}. Aprenda conceitos, aplicações e melhores práticas.`,
        suggested_tags: [...keywords, 'guia', 'tutorial'],
      },
      message: 'Content generated successfully (demo mode)',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Content generation failed',
      error: error.message || 'Unknown error',
    });
  }
});

// SEO Routes
app.use('/api/seo', seoRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Blog-as-a-Service Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🗄️ Database: Supabase (${supabaseUrl})`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('📋 Available endpoints:');
  console.log('   GET  /health - Health check');
  console.log('   GET  /api/test-db - Test database connection');
  console.log('   POST /api/auth/login - User login');
  console.log('   GET  /api/articles - List articles');
  console.log('   GET  /api/articles/:id - Get article');
  console.log('   GET  /api/categories - List categories');
  console.log('   GET  /api/tags - List tags');
  console.log('   POST /api/bigwriter/generate - Generate content');
  console.log('');
  console.log('🔑 Demo credentials:');
  console.log('   Email: admin@demo.blogservice.com');
  console.log('   Password: admin123');
});

module.exports = app;
