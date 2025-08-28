/**
 * Content Discovery Service
 * Orquestra a descoberta de conteúdo relacionado e análise SEO completa
 */
class ContentDiscoveryService {
  constructor(seoIntelligence, trendsAPI, externalLinks) {
    this.seoIntelligence = seoIntelligence;
    this.trendsAPI = trendsAPI;
    this.externalLinks = externalLinks;
  }

  /**
   * Análise SEO completa de um artigo
   * @param {Object} article - Dados do artigo
   * @returns {Object} Análise completa com sugestões
   */
  async performCompleteAnalysis(article) {
    try {
      const { title, content, category } = article;

      // 1. Identificar assunto principal
      const topicAnalysis = await this.seoIntelligence.identifyMainTopic(title, content, category);

      // 2. Buscar tendências relacionadas
      const trendsData = await this.trendsAPI.getTrendingTopics(
        topicAnalysis.mainTopic, 
        topicAnalysis.niche
      );

      // 3. Encontrar links externos de autoridade
      const externalLinksData = await this.externalLinks.findAuthorityLinks(
        topicAnalysis.mainTopic,
        topicAnalysis.niche,
        topicAnalysis.keywords
      );

      // 4. Gerar sugestões SEO
      const seoSuggestions = await this.seoIntelligence.generateSEOSuggestions(
        topicAnalysis,
        title,
        article.meta_description || ''
      );

      // 5. Compilar análise completa
      const completeAnalysis = {
        article: {
          id: article.id,
          title: article.title,
          analyzedAt: new Date().toISOString()
        },
        topicAnalysis: topicAnalysis,
        trends: {
          trendingTerms: trendsData.trendingTerms,
          popularQuestions: trendsData.popularQuestions,
          seasonalTrends: trendsData.seasonalTrends,
          opportunities: trendsData.opportunities
        },
        externalLinks: {
          authorityLinks: externalLinksData.authorityLinks,
          recommendations: externalLinksData.recommendations,
          viralContent: externalLinksData.popularContent
        },
        seoSuggestions: seoSuggestions,
        overallScore: this.calculateOverallSEOScore(topicAnalysis, seoSuggestions),
        actionItems: this.generateActionItems(topicAnalysis, trendsData, externalLinksData, seoSuggestions)
      };

      return completeAnalysis;

    } catch (error) {
      console.error('Erro na análise completa:', error);
      return this.getFallbackAnalysis(article);
    }
  }

  /**
   * Gera sugestões de melhoria baseadas em tendências
   * @param {string} mainTopic - Assunto principal
   * @param {string} niche - Nicho
   * @returns {Object} Sugestões de melhoria
   */
  async generateTrendBasedSuggestions(mainTopic, niche) {
    try {
      const trendsData = await this.trendsAPI.getTrendingTopics(mainTopic, niche);
      
      return {
        trendingKeywords: trendsData.trendingTerms.map(term => ({
          keyword: term.term,
          trend: term.growth,
          suggestion: `Considere incluir "${term.term}" no seu conteúdo - está em alta!`
        })),
        popularQuestions: Object.values(trendsData.popularQuestions).flat().map(question => ({
          question: question,
          suggestion: `Responda esta pergunta popular: "${question}"`
        })),
        seasonalOpportunities: this.generateSeasonalSuggestions(trendsData.seasonalTrends),
        contentGaps: trendsData.opportunities.map(opp => ({
          opportunity: opp.keyword,
          type: opp.type,
          potential: opp.potential,
          suggestion: opp.reason
        }))
      };
    } catch (error) {
      console.error('Erro ao gerar sugestões baseadas em tendências:', error);
      return { trendingKeywords: [], popularQuestions: [], seasonalOpportunities: [], contentGaps: [] };
    }
  }

  /**
   * Encontra conteúdo relacionado interno
   * @param {string} mainTopic - Assunto principal
   * @param {Array} keywords - Palavras-chave
   * @param {number} currentArticleId - ID do artigo atual
   * @returns {Array} Artigos relacionados
   */
  async findRelatedInternalContent(mainTopic, keywords, currentArticleId) {
    try {
      // Simulação de busca interna (em produção usar banco de dados real)
      const relatedArticles = [
        {
          id: 1,
          title: `Guia Avançado de ${mainTopic}`,
          slug: `guia-avancado-${mainTopic.toLowerCase().replace(/\s+/g, '-')}`,
          relevanceScore: 95,
          reason: 'Mesmo tópico principal'
        },
        {
          id: 2,
          title: `${mainTopic}: Melhores Práticas`,
          slug: `${mainTopic.toLowerCase().replace(/\s+/g, '-')}-melhores-praticas`,
          relevanceScore: 88,
          reason: 'Tópico relacionado'
        }
      ].filter(article => article.id !== currentArticleId);

      return relatedArticles;
    } catch (error) {
      console.error('Erro ao buscar conteúdo relacionado interno:', error);
      return [];
    }
  }

  /**
   * Calcula score SEO geral
   */
  calculateOverallSEOScore(topicAnalysis, seoSuggestions) {
    let score = 0;
    let maxScore = 0;

    // Score da análise de tópico (30%)
    maxScore += 30;
    score += (topicAnalysis.confidence / 100) * 30;

    // Score de legibilidade (20%)
    maxScore += 20;
    score += (topicAnalysis.readabilityScore / 100) * 20;

    // Score de palavras-chave (25%)
    maxScore += 25;
    const keywordScore = Math.min(topicAnalysis.keywords.length * 5, 25);
    score += keywordScore;

    // Score de sugestões implementadas (25%)
    maxScore += 25;
    const titleScore = seoSuggestions.title.length > 0 ? 15 : 0;
    const descScore = seoSuggestions.description.length > 0 ? 10 : 0;
    score += titleScore + descScore;

    return Math.round((score / maxScore) * 100);
  }

  /**
   * Gera itens de ação para o autor
   */
  generateActionItems(topicAnalysis, trendsData, externalLinksData, seoSuggestions) {
    const actionItems = [];

    // Ações baseadas na análise de tópico
    if (topicAnalysis.confidence < 70) {
      actionItems.push({
        type: 'content',
        priority: 'high',
        action: 'Torne o foco do artigo mais claro',
        description: 'O assunto principal não está bem definido. Considere revisar o título e introdução.'
      });
    }

    // Ações baseadas em tendências
    if (trendsData.trendingTerms.length > 0) {
      actionItems.push({
        type: 'trends',
        priority: 'medium',
        action: 'Incorporar termos em tendência',
        description: `Considere incluir: ${trendsData.trendingTerms.slice(0, 3).map(t => t.term).join(', ')}`
      });
    }

    // Ações baseadas em links externos
    if (externalLinksData.recommendations.length > 0) {
      actionItems.push({
        type: 'links',
        priority: 'medium',
        action: 'Adicionar links de autoridade',
        description: `${externalLinksData.recommendations.length} links de alta qualidade encontrados`
      });
    }

    // Ações baseadas em sugestões SEO
    if (seoSuggestions.title.length > 0) {
      actionItems.push({
        type: 'seo',
        priority: 'high',
        action: 'Otimizar título',
        description: 'Sugestões de títulos mais otimizados disponíveis'
      });
    }

    if (seoSuggestions.improvements.length > 0) {
      seoSuggestions.improvements.forEach(improvement => {
        actionItems.push({
          type: 'improvement',
          priority: 'medium',
          action: 'Melhorar conteúdo',
          description: improvement
        });
      });
    }

    return actionItems.slice(0, 8); // Limitar a 8 ações
  }

  /**
   * Gera sugestões sazonais
   */
  generateSeasonalSuggestions(seasonalTrends) {
    const suggestions = [];
    const currentMonth = new Date().getMonth() + 1;

    if (seasonalTrends.peakMonths.includes(currentMonth)) {
      suggestions.push({
        type: 'peak_season',
        message: 'Este é um período de pico para seu tópico! Aproveite para publicar mais conteúdo.',
        action: 'Considere criar uma série de artigos relacionados'
      });
    }

    if (seasonalTrends.currentTrend === 'rising') {
      suggestions.push({
        type: 'rising_trend',
        message: 'Seu tópico está em tendência crescente!',
        action: 'Momento ideal para publicar e promover este conteúdo'
      });
    }

    return suggestions;
  }

  /**
   * Análise de fallback em caso de erro
   */
  getFallbackAnalysis(article) {
    return {
      article: {
        id: article.id,
        title: article.title,
        analyzedAt: new Date().toISOString()
      },
      topicAnalysis: {
        mainTopic: 'general',
        themes: [],
        niche: 'general',
        confidence: 50
      },
      trends: {
        trendingTerms: [],
        popularQuestions: {},
        seasonalTrends: {},
        opportunities: []
      },
      externalLinks: {
        authorityLinks: [],
        recommendations: [],
        viralContent: []
      },
      seoSuggestions: {
        title: [],
        description: [],
        keywords: [],
        improvements: []
      },
      overallScore: 50,
      actionItems: [{
        type: 'error',
        priority: 'low',
        action: 'Análise limitada',
        description: 'Não foi possível realizar análise completa. Tente novamente mais tarde.'
      }]
    };
  }

  /**
   * Gera relatório de SEO para o artigo
   */
  async generateSEOReport(article) {
    const analysis = await this.performCompleteAnalysis(article);
    
    return {
      summary: {
        overallScore: analysis.overallScore,
        mainTopic: analysis.topicAnalysis.mainTopic,
        confidence: analysis.topicAnalysis.confidence,
        actionItemsCount: analysis.actionItems.length
      },
      strengths: this.identifyStrengths(analysis),
      weaknesses: this.identifyWeaknesses(analysis),
      recommendations: analysis.actionItems,
      trendingOpportunities: analysis.trends.opportunities,
      authorityLinksFound: analysis.externalLinks.authorityLinks.length
    };
  }

  /**
   * Identifica pontos fortes do artigo
   */
  identifyStrengths(analysis) {
    const strengths = [];

    if (analysis.topicAnalysis.confidence > 80) {
      strengths.push('Foco claro no tópico principal');
    }

    if (analysis.topicAnalysis.readabilityScore > 80) {
      strengths.push('Boa legibilidade do conteúdo');
    }

    if (analysis.topicAnalysis.keywords.length > 10) {
      strengths.push('Rico em palavras-chave relevantes');
    }

    if (analysis.externalLinks.authorityLinks.length > 3) {
      strengths.push('Boas oportunidades de links externos');
    }

    return strengths;
  }

  /**
   * Identifica pontos fracos do artigo
   */
  identifyWeaknesses(analysis) {
    const weaknesses = [];

    if (analysis.topicAnalysis.confidence < 60) {
      weaknesses.push('Foco do tópico não está claro');
    }

    if (analysis.topicAnalysis.readabilityScore < 70) {
      weaknesses.push('Legibilidade pode ser melhorada');
    }

    if (analysis.topicAnalysis.wordCount < 300) {
      weaknesses.push('Conteúdo muito curto');
    }

    if (analysis.trends.trendingTerms.length === 0) {
      weaknesses.push('Não incorpora termos em tendência');
    }

    return weaknesses;
  }
}

module.exports = ContentDiscoveryService;
