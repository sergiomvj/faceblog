const express = require('express');
const { supabase } = require('../config/database');
const { tenantAuth, requireWrite, requireAdmin } = require('../middleware/tenant-auth');

const router = express.Router();

// Aplicar middleware de autenticação por tenant em todas as rotas
router.use(tenantAuth);

// =====================================================
// ARTICLES API - Multi-tenant (FIXED)
// =====================================================

// GET /api/v1/articles - Listar artigos do tenant
router.get('/articles', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category_id, search } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('articles')
      .select(`
        *,
        author:users(id, name, email, avatar_url),
        category:categories(id, name, slug, color),
        article_tags(
          tag:tags(id, name, slug, color)
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtros
    if (status) {
      query = query.eq('status', status);
    }
    if (category_id) {
      query = query.eq('category_id', category_id);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data: articles, error, count } = await query;

    if (error) {
      console.error('Articles query error:', error);
      throw error;
    }

    res.json({
      success: true,
      data: {
        articles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch articles',
      details: error.message
    });
  }
});

// GET /api/v1/articles/:id - Obter artigo específico
router.get('/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: article, error } = await supabase
      .from('articles')
      .select(`
        *,
        author:users(id, name, email, avatar_url),
        category:categories(id, name, slug, color),
        article_tags(
          tag:tags(id, name, slug, color)
        )
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

    res.json({
      success: true,
      data: article
    });

  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch article',
      details: error.message
    });
  }
});

// POST /api/v1/articles - Criar novo artigo
router.post('/articles', requireWrite, async (req, res) => {
  try {
    const {
      title,
      slug,
      content,
      excerpt,
      status = 'draft',
      category_id,
      featured_image_url,
      meta_title,
      meta_description,
      tags = []
    } = req.body;

    // Validação básica
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
        tenant_id: req.tenant.id,
        title,
        slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        content,
        excerpt,
        status,
        author_id: req.user?.id || req.tenant.id, // Fallback para tenant ID
        category_id,
        featured_image_url,
        meta_title: meta_title || title,
        meta_description: meta_description || excerpt,
        reading_time_minutes: Math.ceil(content.split(' ').length / 200)
      })
      .select()
      .single();

    if (articleError) {
      throw articleError;
    }

    // Associar tags se fornecidas
    if (tags.length > 0) {
      const tagAssociations = tags.map(tagId => ({
        article_id: article.id,
        tag_id: tagId
      }));

      const { error: tagsError } = await supabase
        .from('article_tags')
        .insert(tagAssociations);

      if (tagsError) {
        console.error('Error associating tags:', tagsError);
        // Não falhar a criação do artigo por causa das tags
      }
    }

    res.status(201).json({
      success: true,
      data: article
    });

  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create article',
      details: error.message
    });
  }
});

// PUT /api/v1/articles/:id - Atualizar artigo
router.put('/articles/:id', requireWrite, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      slug,
      content,
      excerpt,
      status,
      category_id,
      featured_image_url,
      meta_title,
      meta_description,
      tags = []
    } = req.body;

    // Atualizar artigo
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .update({
        title,
        slug,
        content,
        excerpt,
        status,
        category_id,
        featured_image_url,
        meta_title,
        meta_description,
        reading_time_minutes: content ? Math.ceil(content.split(' ').length / 200) : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (articleError) {
      if (articleError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Article not found'
        });
      }
      throw articleError;
    }

    // Atualizar tags
    if (tags.length >= 0) {
      // Remover tags existentes
      await supabase
        .from('article_tags')
        .delete()
        .eq('article_id', id);

      // Adicionar novas tags
      if (tags.length > 0) {
        const tagAssociations = tags.map(tagId => ({
          article_id: id,
          tag_id: tagId
        }));

        const { error: tagsError } = await supabase
          .from('article_tags')
          .insert(tagAssociations);

        if (tagsError) {
          console.error('Error updating tags:', tagsError);
        }
      }
    }

    res.json({
      success: true,
      data: article
    });

  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update article',
      details: error.message
    });
  }
});

// DELETE /api/v1/articles/:id - Deletar artigo
router.delete('/articles/:id', requireWrite, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Article deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete article',
      details: error.message
    });
  }
});

// =====================================================
// CATEGORIES API - Multi-tenant (FIXED)
// =====================================================

// GET /api/v1/categories - Listar categorias
router.get('/categories', async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
      details: error.message
    });
  }
});

// POST /api/v1/categories - Criar categoria
router.post('/categories', requireWrite, async (req, res) => {
  try {
    const { name, slug, description, parent_id, color = '#6B7280' } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }

    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        tenant_id: req.tenant.id,
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description,
        parent_id,
        color
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      data: category
    });

  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create category',
      details: error.message
    });
  }
});

// =====================================================
// TAGS API - Multi-tenant (FIXED)
// =====================================================

// GET /api/v1/tags - Listar tags
router.get('/tags', async (req, res) => {
  try {
    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: tags
    });

  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tags',
      details: error.message
    });
  }
});

// POST /api/v1/tags - Criar tag
router.post('/tags', requireWrite, async (req, res) => {
  try {
    const { name, slug, description, color = '#6B7280' } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Tag name is required'
      });
    }

    const { data: tag, error } = await supabase
      .from('tags')
      .insert({
        tenant_id: req.tenant.id,
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description,
        color
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      data: tag
    });

  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tag',
      details: error.message
    });
  }
});

// =====================================================
// COMMENTS API - Multi-tenant (FIXED)
// =====================================================

// GET /api/v1/comments - Listar comentários
router.get('/comments', async (req, res) => {
  try {
    const { article_id, status = 'approved' } = req.query;

    let query = supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: true });

    if (article_id) {
      query = query.eq('article_id', article_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: comments, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: comments
    });

  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments',
      details: error.message
    });
  }
});

// POST /api/v1/comments - Criar comentário
router.post('/comments', async (req, res) => {
  try {
    const {
      article_id,
      parent_id,
      author_name,
      author_email,
      author_url,
      content
    } = req.body;

    if (!article_id || !author_name || !author_email || !content) {
      return res.status(400).json({
        success: false,
        error: 'Article ID, author name, email, and content are required'
      });
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        tenant_id: req.tenant.id,
        article_id,
        parent_id,
        author_name,
        author_email,
        author_url,
        content,
        status: 'pending', // Comentários precisam de moderação
        ip_address: req.ip
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      data: comment
    });

  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create comment',
      details: error.message
    });
  }
});

// =====================================================
// TENANT INFO API
// =====================================================

// GET /api/v1/tenant - Informações do tenant
router.get('/tenant', async (req, res) => {
  try {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', req.tenant.id)
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: tenant
    });

  } catch (error) {
    console.error('Error fetching tenant info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenant information',
      details: error.message
    });
  }
});

module.exports = router;
