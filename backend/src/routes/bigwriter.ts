import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { knex } from '@/config/database';
import { authMiddleware, requirePermission } from '@/middleware/auth';
import { requireTenant, getCurrentTenant } from '@/middleware/tenant';
import { ValidationError, NotFoundError, ForbiddenError } from '@/middleware/errorHandler';
import { BigWriterRequest, BigWriterResponse, ApiResponse } from '@/types';
import { logger } from '@/utils/logger';
import { BigWriterService } from '@/services/bigwriter';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const bigWriterService = new BigWriterService();

// Generate content with BigWriter AI
router.post('/generate', [
  requireTenant,
  authMiddleware,
  requirePermission('articles.create'),
  body('topic').isLength({ min: 3, max: 200 }),
  body('keywords').isArray({ min: 1, max: 10 }),
  body('tone').isIn(['professional', 'casual', 'technical', 'friendly']),
  body('length').isIn(['short', 'medium', 'long']),
  body('language').isLength({ min: 2, max: 5 }).optional(),
  body('target_audience').isLength({ max: 100 }).optional(),
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

    // Check if tenant has BigWriter integration enabled
    if (!tenant.settings.integrations.bigwriter) {
      throw new ForbiddenError('BigWriter integration is not enabled for this tenant');
    }

    const {
      topic,
      keywords,
      tone,
      length,
      language = 'pt-BR',
      target_audience,
    } = req.body;

    const bigWriterRequest: BigWriterRequest = {
      tenant_id: tenant.id,
      topic,
      keywords,
      tone,
      length,
      language,
      target_audience,
    };

    // Create job record
    const jobId = uuidv4();
    const job: BigWriterResponse = {
      job_id: jobId,
      status: 'pending',
      created_at: new Date(),
    };

    // Store job in database
    await knex('bigwriter_jobs').insert({
      id: jobId,
      tenant_id: tenant.id,
      user_id: user.id,
      request_data: bigWriterRequest,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Start content generation (async)
    bigWriterService.generateContent(jobId, bigWriterRequest)
      .catch(error => {
        logger.error('BigWriter generation error:', error);
      });

    const response: ApiResponse<{ job_id: string; status: string }> = {
      success: true,
      data: {
        job_id: jobId,
        status: 'pending',
      },
      message: 'Content generation started. Use the job ID to check status.',
    };

    res.status(202).json(response);
  } catch (error) {
    logger.error('BigWriter generate error:', error);
    throw error;
  }
});

// Check generation status
router.get('/status/:jobId', [
  requireTenant,
  authMiddleware,
], async (req: Request, res: Response) => {
  try {
    const tenant = getCurrentTenant(req);
    const user = (req as any).user;
    const { jobId } = req.params;

    if (!tenant || !user) {
      throw new ValidationError('Tenant and user context required');
    }

    const job = await knex('bigwriter_jobs')
      .where('id', jobId)
      .where('tenant_id', tenant.id)
      .first();

    if (!job) {
      throw new NotFoundError('Job not found');
    }

    // Check if user has permission to view this job
    if (job.user_id !== user.id && !['admin', 'editor'].includes(user.role)) {
      throw new ForbiddenError('You can only view your own jobs');
    }

    const response: ApiResponse<BigWriterResponse> = {
      success: true,
      data: {
        job_id: job.id,
        status: job.status,
        title: job.title,
        content: job.content,
        excerpt: job.excerpt,
        meta_description: job.meta_description,
        suggested_tags: job.suggested_tags,
        error_message: job.error_message,
        created_at: job.created_at,
        completed_at: job.completed_at,
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('BigWriter status error:', error);
    throw error;
  }
});

// Import generated content as article
router.post('/import/:jobId', [
  requireTenant,
  authMiddleware,
  requirePermission('articles.create'),
  body('category_id').isUUID().optional(),
  body('additional_tags').isArray().optional(),
  body('custom_title').isLength({ min: 1, max: 255 }).optional(),
  body('custom_excerpt').isLength({ max: 500 }).optional(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const tenant = getCurrentTenant(req);
    const user = (req as any).user;
    const { jobId } = req.params;

    if (!tenant || !user) {
      throw new ValidationError('Tenant and user context required');
    }

    const job = await knex('bigwriter_jobs')
      .where('id', jobId)
      .where('tenant_id', tenant.id)
      .where('status', 'completed')
      .first();

    if (!job) {
      throw new NotFoundError('Completed job not found');
    }

    // Check permissions
    if (job.user_id !== user.id && !['admin', 'editor'].includes(user.role)) {
      throw new ForbiddenError('You can only import your own jobs');
    }

    const {
      category_id,
      additional_tags = [],
      custom_title,
      custom_excerpt,
    } = req.body;

    // Create article from generated content
    const articleId = uuidv4();
    const title = custom_title || job.title;
    const slug = generateSlug(title);
    const content = job.content;
    const excerpt = custom_excerpt || job.excerpt;
    const tags = [...(job.suggested_tags || []), ...additional_tags];

    // Calculate reading time
    const wordCount = content.split(/\s+/).length;
    const readingTimeMinutes = Math.ceil(wordCount / 200);

    const newArticle = {
      id: articleId,
      tenant_id: tenant.id,
      title,
      slug,
      content,
      excerpt,
      status: 'draft',
      author_id: user.id,
      category_id: category_id || null,
      meta_title: title,
      meta_description: job.meta_description || excerpt,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      reading_time_minutes: readingTimeMinutes,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await knex.transaction(async (trx) => {
      // Create article
      await trx('articles').insert(newArticle);

      // Handle tags
      if (tags.length > 0) {
        await handleArticleTags(articleId, tags, tenant.id, trx);
      }

      // Mark job as imported
      await trx('bigwriter_jobs')
        .where('id', jobId)
        .update({
          imported_article_id: articleId,
          updated_at: new Date(),
        });
    });

    const response: ApiResponse<{ article_id: string; title: string }> = {
      success: true,
      data: {
        article_id: articleId,
        title,
      },
      message: 'Content imported as article successfully',
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('BigWriter import error:', error);
    throw error;
  }
});

// Get user's BigWriter jobs
router.get('/jobs', [
  requireTenant,
  authMiddleware,
  query('page').isInt({ min: 1 }).optional(),
  query('limit').isInt({ min: 1, max: 50 }).optional(),
  query('status').isIn(['pending', 'processing', 'completed', 'failed']).optional(),
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

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    let query = knex('bigwriter_jobs')
      .where('tenant_id', tenant.id);

    // Non-admin users can only see their own jobs
    if (!['admin', 'editor'].includes(user.role)) {
      query = query.where('user_id', user.id);
    }

    // Apply status filter
    if (req.query.status) {
      query = query.where('status', req.query.status);
    }

    // Get total count
    const totalQuery = query.clone().count('* as count').first();
    const totalResult = await totalQuery;
    const totalCount = totalResult?.count || 0;
    const total = parseInt(totalCount as string);

    // Get paginated results
    const jobs = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        data: jobs,
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
    logger.error('BigWriter jobs error:', error);
    throw error;
  }
});

// Delete/cancel BigWriter job
router.delete('/jobs/:jobId', [
  requireTenant,
  authMiddleware,
], async (req: Request, res: Response) => {
  try {
    const tenant = getCurrentTenant(req);
    const user = (req as any).user;
    const { jobId } = req.params;

    if (!tenant || !user) {
      throw new ValidationError('Tenant and user context required');
    }

    const job = await knex('bigwriter_jobs')
      .where('id', jobId)
      .where('tenant_id', tenant.id)
      .first();

    if (!job) {
      throw new NotFoundError('Job not found');
    }

    // Check permissions
    if (job.user_id !== user.id && !['admin'].includes(user.role)) {
      throw new ForbiddenError('You can only delete your own jobs');
    }

    // Can't delete completed jobs that have been imported
    if (job.status === 'completed' && job.imported_article_id) {
      throw new ValidationError('Cannot delete imported jobs');
    }

    await knex('bigwriter_jobs')
      .where('id', jobId)
      .del();

    const response: ApiResponse = {
      success: true,
      message: 'Job deleted successfully',
    };

    res.json(response);
  } catch (error) {
    logger.error('BigWriter delete job error:', error);
    throw error;
  }
});

// Webhook endpoint for BigWriter callbacks
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature (implementation depends on BigWriter's webhook security)
    const signature = req.get('X-BigWriter-Signature');
    const payload = req.body;

    if (!bigWriterService.verifyWebhookSignature(signature, payload)) {
      throw new ValidationError('Invalid webhook signature');
    }

    const { job_id, status, result } = payload;

    // Update job status
    const updateData: any = {
      status,
      updated_at: new Date(),
    };

    if (status === 'completed' && result) {
      updateData.title = result.title;
      updateData.content = result.content;
      updateData.excerpt = result.excerpt;
      updateData.meta_description = result.meta_description;
      updateData.suggested_tags = result.suggested_tags;
      updateData.completed_at = new Date();
    } else if (status === 'failed') {
      updateData.error_message = result?.error || 'Generation failed';
    }

    await knex('bigwriter_jobs')
      .where('id', job_id)
      .update(updateData);

    logger.info(`BigWriter job ${job_id} updated to status: ${status}`);

    res.json({ success: true });
  } catch (error) {
    logger.error('BigWriter webhook error:', error);
    res.status(400).json({ success: false, message: 'Webhook processing failed' });
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

async function handleArticleTags(articleId: string, tagNames: string[], tenantId: string, trx: any): Promise<void> {
  if (tagNames.length === 0) return;

  const tagIds: string[] = [];
  
  for (const tagName of tagNames) {
    let tag = await trx('tags')
      .where('name', tagName)
      .where('tenant_id', tenantId)
      .first();

    if (!tag) {
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

      await trx('tags').insert(tag);
    }

    tagIds.push(tag.id);
  }

  // Create article-tag relationships
  const articleTags = tagIds.map(tagId => ({
    article_id: articleId,
    tag_id: tagId,
  }));

  await trx('article_tags').insert(articleTags);

  // Update tag article counts
  for (const tagId of tagIds) {
    const count = await trx('article_tags')
      .where('tag_id', tagId)
      .count('* as count')
      .first();

    await trx('tags')
      .where('id', tagId)
      .update({ article_count: parseInt(count?.count as string) || 0 });
  }
}

export default router;
