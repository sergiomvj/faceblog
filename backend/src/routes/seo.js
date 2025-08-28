const express = require('express');
const router = express.Router();

// Importar serviços SEO
const SEOIntelligenceService = require('../services/seo-intelligence');
const TrendsAPIService = require('../services/trends-api');
const ExternalLinksService = require('../services/external-links');
const ContentDiscoveryService = require('../services/content-discovery');

// Inicializar serviços
const seoIntelligence = new SEOIntelligenceService();
const trendsAPI = new TrendsAPIService();
const externalLinks = new ExternalLinksService();
const contentDiscovery = new ContentDiscoveryService(seoIntelligence, trendsAPI, externalLinks);

/**
 * POST /api/seo/analyze
 * Análise SEO completa de um artigo
 */
router.post('/analyze', async (req, res) => {
  try {
    const { title, content, category, meta_description } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Título e conteúdo são obrigatórios'
      });
    }

    const article = {
      title,
      content,
      category,
      meta_description
    };

    const analysis = await contentDiscovery.performCompleteAnalysis(article);

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('Erro na análise SEO:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/seo/topic-analysis
 * Identifica o assunto principal do artigo
 */
router.post('/topic-analysis', async (req, res) => {
  try {
    const { title, content, category } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Título e conteúdo são obrigatórios'
      });
    }

    const topicAnalysis = await seoIntelligence.identifyMainTopic(title, content, category);

    res.json({
      success: true,
      data: topicAnalysis
    });

  } catch (error) {
    console.error('Erro na análise de tópico:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/seo/trending/:topic
 * Busca tendências para um tópico específico
 */
router.get('/trending/:topic', async (req, res) => {
  try {
    const { topic } = req.params;
    const { niche = 'general', geo = 'BR' } = req.query;

    const trendsData = await trendsAPI.getTrendingTopics(topic, niche, geo);

    res.json({
      success: true,
      data: trendsData
    });

  } catch (error) {
    console.error('Erro ao buscar tendências:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/seo/external-links/:topic
 * Busca links externos de autoridade
 */
router.get('/external-links/:topic', async (req, res) => {
  try {
    const { topic } = req.params;
    const { niche = 'general' } = req.query;
    const keywords = req.query.keywords ? req.query.keywords.split(',') : [];

    const linksData = await externalLinks.findAuthorityLinks(topic, niche, keywords);

    res.json({
      success: true,
      data: linksData
    });

  } catch (error) {
    console.error('Erro ao buscar links externos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/seo/suggestions
 * Gera sugestões SEO baseadas na análise
 */
router.post('/suggestions', async (req, res) => {
  try {
    const { title, content, category, currentTitle, currentDescription } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Título e conteúdo são obrigatórios'
      });
    }

    // Análise do tópico
    const topicAnalysis = await seoIntelligence.identifyMainTopic(title, content, category);
    
    // Gerar sugestões
    const suggestions = await seoIntelligence.generateSEOSuggestions(
      topicAnalysis, 
      currentTitle || title, 
      currentDescription || ''
    );

    res.json({
      success: true,
      data: {
        topicAnalysis,
        suggestions
      }
    });

  } catch (error) {
    console.error('Erro ao gerar sugestões:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/seo/trend-suggestions
 * Gera sugestões baseadas em tendências
 */
router.post('/trend-suggestions', async (req, res) => {
  try {
    const { mainTopic, niche } = req.body;

    if (!mainTopic) {
      return res.status(400).json({
        success: false,
        error: 'Tópico principal é obrigatório'
      });
    }

    const trendSuggestions = await contentDiscovery.generateTrendBasedSuggestions(mainTopic, niche);

    res.json({
      success: true,
      data: trendSuggestions
    });

  } catch (error) {
    console.error('Erro ao gerar sugestões de tendências:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/seo/related-content/:topic
 * Busca conteúdo relacionado interno
 */
router.get('/related-content/:topic', async (req, res) => {
  try {
    const { topic } = req.params;
    const { keywords = '', currentArticleId } = req.query;
    
    const keywordArray = keywords ? keywords.split(',') : [];
    const articleId = currentArticleId ? parseInt(currentArticleId) : null;

    const relatedContent = await contentDiscovery.findRelatedInternalContent(
      topic, 
      keywordArray, 
      articleId
    );

    res.json({
      success: true,
      data: relatedContent
    });

  } catch (error) {
    console.error('Erro ao buscar conteúdo relacionado:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/seo/report
 * Gera relatório SEO completo
 */
router.post('/report', async (req, res) => {
  try {
    const { title, content, category, meta_description, id } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Título e conteúdo são obrigatórios'
      });
    }

    const article = {
      id: id || Date.now(),
      title,
      content,
      category,
      meta_description
    };

    const report = await contentDiscovery.generateSEOReport(article);

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Erro ao gerar relatório SEO:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/seo/validate-link
 * Valida qualidade de um link externo
 */
router.post('/validate-link', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL é obrigatória'
      });
    }

    const validation = await externalLinks.validateLinkQuality(url);

    res.json({
      success: true,
      data: validation
    });

  } catch (error) {
    console.error('Erro ao validar link:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/seo/popular-questions/:topic
 * Busca perguntas populares sobre um tópico
 */
router.get('/popular-questions/:topic', async (req, res) => {
  try {
    const { topic } = req.params;

    const trendsData = await trendsAPI.getTrendingTopics(topic, 'general');
    const popularQuestions = trendsData.popularQuestions;

    res.json({
      success: true,
      data: popularQuestions
    });

  } catch (error) {
    console.error('Erro ao buscar perguntas populares:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/seo/keyword-opportunities/:topic
 * Identifica oportunidades de palavras-chave
 */
router.get('/keyword-opportunities/:topic', async (req, res) => {
  try {
    const { topic } = req.params;
    const { niche = 'general' } = req.query;

    const trendsData = await trendsAPI.getTrendingTopics(topic, niche);
    const opportunities = trendsData.opportunities;

    res.json({
      success: true,
      data: opportunities
    });

  } catch (error) {
    console.error('Erro ao buscar oportunidades de keywords:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/seo/health
 * Health check do serviço SEO
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'SEO Service is running',
    timestamp: new Date().toISOString(),
    services: {
      seoIntelligence: 'active',
      trendsAPI: 'active',
      externalLinks: 'active',
      contentDiscovery: 'active'
    }
  });
});

module.exports = router;
