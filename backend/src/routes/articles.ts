import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { knex } from '@/config/database';
import { authMiddleware, requireRole, requirePermission } from '@/middleware/auth';
import { requireTenant, getCurrentTenant } from '@/middleware/tenant';
import { ValidationError, NotFoundError, ForbiddenError } from '@/middleware/errorHandler';
import { Article, ApiResponse, PaginatedResponse } from '@/types';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all articles (with pagination and filters)
router.get('/', [
  requireTenant,
  query('page').isInt({ min: 1 }).optional(),
  query('limit').isInt({ min: 1, max: 100 }).optional(),
  query('status').isIn(['draft', 'published', 'scheduled', 'archived']).optional(),
  query('category_id').isUUID().optional(),
  query('author_id').isUUID().optional(),
  query('search').isString().optional(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const tenant = getCurrentTenant(req);
    if (!tenant) {
      throw new ValidationError('Tenant context required');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    let query = knex('articles as a')
      .leftJoin('users as u', 'a.author_id', 'u.id')
      .leftJoin('categories as c', 'a.category_id', 'c.id')
      .where('a.tenant_id', tenant.id)
      .select(
        'a.*',
        'u.name as author_name',
        'u.email as author_email',
        'c.name as category_name'
      );

    // Apply filters
    if (req.query.status) {
      query = query.where('a.status', req.query.status);
    }

    if (req.query.category_id) {
      query = query.where('a.category_id', req.query.category_id);
    }

    if (req.query.author_id) {
      query = query.where('a.author_id', req.query.author_id);
    }

    if (req.query.search) {
      const searchTerm = `%${req.query.search}%`;
      query = query.where(function() {
        this.where('a.title', 'ilike', searchTerm)
            .orWhere('a.content', 'ilike', searchTerm)
            .orWhere('a.excerpt', 'ilike', searchTerm);
      });
    }

    // Get total count
    const totalQuery = query.clone().count('* as count').first();
    const totalResult = await totalQuery;
    const totalCount = totalResult?.count || 0;
    const total = parseInt(totalCount as string);

    // Get paginated results
    const articles = await query
      .orderBy('a.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const response: ApiResponse<PaginatedResponse<Article>> = {
      success: true,
      data: {
        data: articles,
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
    logger.error('Get articles error:', error);
    throw error;
  }
});

// Get single article by ID or slug
router.get('/:identifier', [
  requireTenant,
], async (req: Request, res: Response) => {
  try {
    const tenant = getCurrentTenant(req);
    if (!tenant) {
      throw new ValidationError('Tenant context required');
    }

    const { identifier } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    let query = knex('articles as a')
      .leftJoin('users as u', 'a.author_id', 'u.id')
      .leftJoin('categories as c', 'a.category_id', 'c.id')
      .where('a.tenant_id', tenant.id)
      .select(
        'a.*',
        'u.name as author_name',
        'u.email as author_email',
        'c.name as category_name'
      );

    if (isUuid) {
      query = query.where('a.id', identifier);
    } else {
      query = query.where('a.slug', identifier);
    }

    const article = await query.first();

    if (!article) {
      throw new NotFoundError('Article not found');
    }

    // Increment view count for published articles
    if (article.status === 'published') {
      await knex('articles')
        .where('id', article.id)
        .increment('view_count', 1);
      
      article.view_count += 1;
    }

    // Get article tags
    const tags = await knex('article_tags as at')
      .join('tags as t', 'at.tag_id', 't.id')
      .where('at.article_id', article.id)
      .select('t.*');

    article.tags = tags;

    const response: ApiResponse<Article> = {
      success: true,
      data: article,
    };

    res.json(response);
  } catch (error) {
    logger.error('Get article error:', error);
    throw error;
  }
});

// Create new article
router.post('/', [
  requireTenant,
  authMiddleware,
  requirePermission('articles.create'),
  body('title').isLength({ min: 1, max: 255 }),
  body('content').isLength({ min: 1 }),
  body('excerpt').isLength({ max: 500 }).optional(),
  body('status').isIn(['draft', 'published', 'scheduled']).optional(),
  body('category_id').isUUID().optional(),
  body('tags').isArray().optional(),
  body('meta_title').isLength({ max: 60 }).optional(),
  body('meta_description').isLength({ max: 160 }).optional(),
  body('scheduled_at').isISO8601().optional(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const tenant = getCurrentTenant(req);
    const user = (req as any).user;

    if (!tenant || !user) {
      throw new ValidationError('Tenant and user context required');
    }

    const {
      title,
      content,
      excerpt,
      status = 'draft',
      category_id,
      tags = [],
      meta_title,
      meta_description,
      scheduled_at,
      featured_image,
    } = req.body;

    // Generate slug from title
    const slug = generateSlug(title);

    // Check if slug already exists
    const existingArticle = await knex('articles')
      .where('slug', slug)
      .where('tenant_id', tenant.id)
      .first();

    if (existingArticle) {
      throw new ValidationError('Article with this title already exists');
    }

    // Calculate reading time (rough estimate: 200 words per minute)
    const wordCount = content.split(/\s+/).length;
    const readingTimeMinutes = Math.ceil(wordCount / 200);

    const articleId = uuidv4();
    const now = new Date();

    const newArticle = {
      id: articleId,
      tenant_id: tenant.id,
      title,
      slug,
      content,
      excerpt: excerpt || content.substring(0, 200) + '...',
      featured_image,
      status,
      published_at: status === 'published' ? now : null,
      scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
      author_id: user.id,
      category_id: category_id || null,
      meta_title: meta_title || title,
      meta_description: meta_description || excerpt,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      reading_time_minutes: readingTimeMinutes,
      created_at: now,
      updated_at: now,
    };

    await knex('articles').insert(newArticle);

    // Handle tags
    if (tags.length > 0) {
      await handleArticleTags(articleId, tags, tenant.id);
    }

    const response: ApiResponse<Article> = {
      success: true,
      data: { ...newArticle, tags },
      message: 'Article created successfully',
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Create article error:', error);
    throw error;
  }
});

// Update article
router.put('/:id', [
  requireTenant,
  authMiddleware,
  requirePermission('articles.update'),
  body('title').isLength({ min: 1, max: 255 }).optional(),
  body('content').isLength({ min: 1 }).optional(),
  body('excerpt').isLength({ max: 500 }).optional(),
  body('status').isIn(['draft', 'published', 'scheduled', 'archived']).optional(),
  body('category_id').isUUID().optional(),
  body('tags').isArray().optional(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const tenant = getCurrentTenant(req);
    const user = (req as any).user;
    const { id } = req.params;

    if (!tenant || !user) {
      throw new ValidationError('Tenant and user context required');
    }

    // Check if article exists and user has permission
    const existingArticle = await knex('articles')
      .where('id', id)
      .where('tenant_id', tenant.id)
      .first();

    if (!existingArticle) {
      throw new NotFoundError('Article not found');
    }

    // Check if user can edit this article
    if (existingArticle.author_id !== user.id && !['admin', 'editor'].includes(user.role)) {
      throw new ForbiddenError('You can only edit your own articles');
    }

    const updateData: any = {
      updated_at: new Date(),
    };

    // Update fields if provided
    if (req.body.title) {
      updateData.title = req.body.title;
      updateData.slug = generateSlug(req.body.title);
    }
    if (req.body.content) {
      updateData.content = req.body.content;
      // Recalculate reading time
      const wordCount = req.body.content.split(/\s+/).length;
      updateData.reading_time_minutes = Math.ceil(wordCount / 200);
    }
    if (req.body.excerpt) updateData.excerpt = req.body.excerpt;
    if (req.body.status) {
      updateData.status = req.body.status;
      if (req.body.status === 'published' && !existingArticle.published_at) {
        updateData.published_at = new Date();
      }
    }
    if (req.body.category_id !== undefined) updateData.category_id = req.body.category_id;
    if (req.body.featured_image) updateData.featured_image = req.body.featured_image;
    if (req.body.meta_title) updateData.meta_title = req.body.meta_title;
    if (req.body.meta_description) updateData.meta_description = req.body.meta_description;

    await knex('articles')
      .where('id', id)
      .update(updateData);

    // Handle tags if provided
    if (req.body.tags) {
      await handleArticleTags(id, req.body.tags, tenant.id);
    }

    // Get updated article
    const updatedArticle = await knex('articles')
      .where('id', id)
      .first();

    const response: ApiResponse<Article> = {
      success: true,
      data: updatedArticle,
      message: 'Article updated successfully',
    };

    res.json(response);
  } catch (error) {
    logger.error('Update article error:', error);
    throw error;
  }
});

// Delete article
router.delete('/:id', [
  requireTenant,
  authMiddleware,
  requirePermission('articles.delete'),
], async (req: Request, res: Response) => {
  try {
    const tenant = getCurrentTenant(req);
    const user = (req as any).user;
    const { id } = req.params;

    if (!tenant || !user) {
      throw new ValidationError('Tenant and user context required');
    }

    // Check if article exists
    const article = await knex('articles')
      .where('id', id)
      .where('tenant_id', tenant.id)
      .first();

    if (!article) {
      throw new NotFoundError('Article not found');
    }

    // Check permissions
    if (article.author_id !== user.id && !['admin'].includes(user.role)) {
      throw new ForbiddenError('You can only delete your own articles');
    }

    // Delete article and related data
    await knex.transaction(async (trx) => {
      // Delete article tags
      await trx('article_tags').where('article_id', id).del();
      
      // Delete comments
      await trx('comments').where('article_id', id).del();
      
      // Delete the article
      await trx('articles').where('id', id).del();
    });

    const response: ApiResponse = {
      success: true,
      message: 'Article deleted successfully',
    };

    res.json(response);
  } catch (error) {
    logger.error('Delete article error:', error);
    throw error;
  }
});

// Helper functions
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function handleArticleTags(articleId: string, tagNames: string[], tenantId: string): Promise<void> {
  // Remove existing tags
  await knex('article_tags').where('article_id', articleId).del();

  if (tagNames.length === 0) return;

  // Get or create tags
  const tagIds: string[] = [];
  
  for (const tagName of tagNames) {
    let tag = await knex('tags')
      .where('name', tagName)
      .where('tenant_id', tenantId)
      .first();

    if (!tag) {
      // Create new tag
      const tagId = uuidv4();
      const slug = generateSlug(tagName);
      
      tag = {
        id: tagId,
        tenant_id: tenantId,
        name: tagName,
        slug,
        article_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      await knex('tags').insert(tag);
    }

    tagIds.push(tag.id);
  }

  // Create article-tag relationships
  const articleTags = tagIds.map(tagId => ({
    article_id: articleId,
    tag_id: tagId,
  }));

  await knex('article_tags').insert(articleTags);

  // Update tag article counts
  for (const tagId of tagIds) {
    const count = await knex('article_tags')
      .where('tag_id', tagId)
      .count('* as count')
      .first();

    await knex('tags')
      .where('id', tagId)
      .update({ article_count: parseInt(count?.count as string) || 0 });
  }
}

export default router;
