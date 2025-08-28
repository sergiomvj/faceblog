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

    // Incrementar view count
    await supabase
      .schema(schema)
      .from('articles')
      .update({ view_count: (article.view_count || 0) + 1 })
      .eq('id', id);

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
      featured_image_url,
      author_id,
      category_id,
      status = 'draft',
      published_at,
      scheduled_at,
      meta_title,
      meta_description,
      meta_keywords,
      is_featured = false,
      tags = []
    } = req.body;

    const schema = req.tenant.schema;

    // Validações básicas
    if (!title || !content || !author_id) {
      return res.status(400).json({
        success: false,
        error: 'Title, content, and author_id are required'
      });
    }

    // Gerar slug se não fornecido
    const articleSlug = slug || title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Calcular tempo de leitura (aproximadamente 200 palavras por minuto)
    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);

    // Criar artigo
    const { data: article, error } = await supabase
      .schema(schema)
      .from('articles')
      .insert({
        title,
        slug: articleSlug,
        content,
        excerpt,
        featured_image_url,
        author_id,
        category_id,
        status,
        published_at: status === 'published' ? (published_at || new Date().toISOString()) : null,
        scheduled_at,
        meta_title: meta_title || title,
        meta_description: meta_description || excerpt,
        meta_keywords,
        reading_time: readingTime,
        is_featured
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Associar tags se fornecidas
    if (tags.length > 0) {
      const tagAssociations = tags.map(tagId => ({
        article_id: article.id,
        tag_id: tagId
      }));

      await supabase
        .schema(schema)
        .from('article_tags')
        .insert(tagAssociations);
    }

    res.status(201).json({
      success: true,
      data: article
    });

  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create article'
    });
  }
});

// PUT /api/v1/articles/:id - Atualizar artigo
router.put('/articles/:id', requireWrite, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const schema = req.tenant.schema;

    // Remover campos que não devem ser atualizados diretamente
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.view_count;
    delete updateData.like_count;
    delete updateData.comment_count;

    // Atualizar timestamp
    updateData.updated_at = new Date().toISOString();

    // Se mudando para published, definir published_at
    if (updateData.status === 'published' && !updateData.published_at) {
      updateData.published_at = new Date().toISOString();
    }

    const { data: article, error } = await supabase
      .schema(schema)
      .from('articles')
      .update(updateData)
      .eq('id', id)
      .select()
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
    console.error('Error updating article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update article'
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
// CATEGORIES API - Multi-tenant
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
      error: 'Failed to fetch categories'
    });
  }
});

// POST /api/v1/categories - Criar categoria
router.post('/categories', requireWrite, async (req, res) => {
  try {
    const { name, slug, description, color, parent_id, sort_order } = req.body;
    const schema = req.tenant.schema;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    const categorySlug = slug || name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const { data: category, error } = await supabase
      .schema(schema)
      .from('categories')
      .insert({
        name,
        slug: categorySlug,
        description,
        color: color || '#3B82F6',
        parent_id,
        sort_order: sort_order || 0
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
      error: 'Failed to create category'
    });
  }
});

// =====================================================
// TAGS API - Multi-tenant
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
      error: 'Failed to fetch tags'
    });
  }
});

// POST /api/v1/tags - Criar tag
router.post('/tags', requireWrite, async (req, res) => {
  try {
    const { name, slug, color, description } = req.body;
    const schema = req.tenant.schema;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    const tagSlug = slug || name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const { data: tag, error } = await supabase
      .schema(schema)
      .from('tags')
      .insert({
        name,
        slug: tagSlug,
        color: color || '#6B7280',
        description
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
      error: 'Failed to create tag'
    });
  }
});

// =====================================================
// COMMENTS API - Multi-tenant
// =====================================================

// GET /api/v1/articles/:articleId/comments - Listar comentários de um artigo
router.get('/articles/:articleId/comments', async (req, res) => {
  try {
    const { articleId } = req.params;
    const { status = 'approved' } = req.query;
    const schema = req.tenant.schema;

    const { data: comments, error } = await supabase
      .schema(schema)
      .from('comments')
      .select('*')
      .eq('article_id', articleId)
      .eq('status', status)
      .order('created_at', { ascending: true });

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
      error: 'Failed to fetch comments'
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
    const schema = req.tenant.schema;

    if (!article_id || !author_name || !author_email || !content) {
      return res.status(400).json({
        success: false,
        error: 'Article ID, author name, email, and content are required'
      });
    }

    const { data: comment, error } = await supabase
      .schema(schema)
      .from('comments')
      .insert({
        article_id,
        parent_id,
        author_name,
        author_email,
        author_url,
        content,
        status: 'pending', // Comentários começam como pendentes
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
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
      error: 'Failed to create comment'
    });
  }
});

// =====================================================
// TENANT INFO API
// =====================================================

// GET /api/v1/tenant - Informações do tenant atual
router.get('/tenant', async (req, res) => {
  try {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, slug, subdomain, domain, plan, settings')
      .eq('id', req.tenant.id)
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        ...tenant,
        permissions: req.tenant.permissions
      }
    });

  } catch (error) {
    console.error('Error fetching tenant info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenant information'
    });
  }
});

module.exports = router;
