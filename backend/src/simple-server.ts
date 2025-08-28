#!/usr/bin/env node

/**
 * Simple Express server for Blog-as-a-Service
 * This version uses direct imports to avoid path alias issues
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
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
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Blog-as-a-Service Backend',
    version: '1.0.0',
    database: 'Supabase Connected',
  });
});

// Test database connection
app.get('/api/test-db', async (req: Request, res: Response) => {
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
      data: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Auth endpoints (simplified)
app.post('/api/auth/login', async (req: Request, res: Response) => {
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
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Articles endpoints
app.get('/api/articles', async (req: Request, res: Response) => {
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
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/api/articles/:id', async (req: Request, res: Response) => {
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
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Categories endpoint
app.get('/api/categories', async (req: Request, res: Response) => {
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
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Tags endpoint
app.get('/api/tags', async (req: Request, res: Response) => {
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
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// BigWriter simulation endpoint
app.post('/api/bigwriter/generate', async (req: Request, res: Response) => {
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
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Error handling middleware
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
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

export default app;
