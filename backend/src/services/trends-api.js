const axios = require('axios');
const googleTrends = require('google-trends-api');

/**
 * Trends API Service
 * Integração com APIs de tendências e pesquisa de palavras-chave
 */
class TrendsAPIService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 horas
  }

  /**
   * Busca tendências relacionadas ao tema principal
   * @param {string} mainTopic - Assunto principal identificado
   * @param {string} niche - Nicho do conteúdo
   * @param {string} geo - Localização geográfica (default: BR)
   * @returns {Object} Dados de tendências
   */
  async getTrendingTopics(mainTopic, niche, geo = 'BR') {
    try {
      const cacheKey = `trends_${mainTopic}_${niche}_${geo}`;
      
      // Verificar cache
      if (this.isCached(cacheKey)) {
        return this.getFromCache(cacheKey);
      }

      // Buscar tendências no Google Trends
      const googleTrendsData = await this.getGoogleTrends(mainTopic, geo);
      
      // Buscar palavras-chave relacionadas
      const relatedKeywords = await this.getRelatedKeywords(mainTopic, niche);
      
      // Buscar perguntas populares
      const popularQuestions = await this.getPopularQuestions(mainTopic);
      
      // Buscar tendências sazonais
      const seasonalTrends = await this.getSeasonalTrends(mainTopic, geo);

      const result = {
        mainTopic,
        niche,
        geo,
        timestamp: Date.now(),
        googleTrends: googleTrendsData,
        relatedKeywords: relatedKeywords,
        popularQuestions: popularQuestions,
        seasonalTrends: seasonalTrends,
        trendingTerms: this.extractTrendingTerms(googleTrendsData, relatedKeywords),
        opportunities: this.identifyOpportunities(googleTrendsData, relatedKeywords)
      };

      // Salvar no cache
      this.saveToCache(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Erro ao buscar tendências:', error);
      return this.getFallbackTrends(mainTopic, niche);
    }
  }

  /**
   * Busca dados do Google Trends
   */
  async getGoogleTrends(keyword, geo = 'BR') {
    try {
      // Interesse ao longo do tempo
      const interestOverTime = await googleTrends.interestOverTime({
        keyword: keyword,
        startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 ano atrás
        geo: geo,
        granularTimeResolution: true
      });

      // Tópicos relacionados
      const relatedTopics = await googleTrends.relatedTopics({
        keyword: keyword,
        geo: geo
      });

      // Consultas relacionadas
      const relatedQueries = await googleTrends.relatedQueries({
        keyword: keyword,
        geo: geo
      });

      return {
        interestOverTime: JSON.parse(interestOverTime),
        relatedTopics: JSON.parse(relatedTopics),
        relatedQueries: JSON.parse(relatedQueries)
      };
    } catch (error) {
      console.error('Erro no Google Trends:', error);
      return this.getMockGoogleTrends(keyword);
    }
  }

  /**
   * Busca palavras-chave relacionadas
   */
  async getRelatedKeywords(mainTopic, niche) {
    try {
      // Simulação de API de keywords (em produção usar Keyword Planner, SEMrush, etc.)
      const keywordSuggestions = await this.generateKeywordSuggestions(mainTopic, niche);
      
      return {
        primary: keywordSuggestions.primary,
        secondary: keywordSuggestions.secondary,
        longTail: keywordSuggestions.longTail,
        trending: keywordSuggestions.trending
      };
    } catch (error) {
      console.error('Erro ao buscar palavras-chave relacionadas:', error);
      return this.getFallbackKeywords(mainTopic);
    }
  }

  /**
   * Busca perguntas populares sobre o tema
   */
  async getPopularQuestions(mainTopic) {
    try {
      // Simulação de Answer The Public API
      const questions = await this.generatePopularQuestions(mainTopic);
      
      return {
        what: questions.filter(q => q.startsWith('o que') || q.startsWith('what')),
        how: questions.filter(q => q.startsWith('como') || q.startsWith('how')),
        why: questions.filter(q => q.startsWith('por que') || q.startsWith('why')),
        when: questions.filter(q => q.startsWith('quando') || q.startsWith('when')),
        where: questions.filter(q => q.startsWith('onde') || q.startsWith('where'))
      };
    } catch (error) {
      console.error('Erro ao buscar perguntas populares:', error);
      return { what: [], how: [], why: [], when: [], where: [] };
    }
  }

  /**
   * Busca tendências sazonais
   */
  async getSeasonalTrends(keyword, geo = 'BR') {
    try {
      // Análise de sazonalidade baseada em dados históricos
      const seasonalData = await this.analyzeSeasonality(keyword, geo);
      
      return {
        peakMonths: seasonalData.peakMonths,
        lowMonths: seasonalData.lowMonths,
        currentTrend: seasonalData.currentTrend,
        prediction: seasonalData.prediction
      };
    } catch (error) {
      console.error('Erro ao analisar sazonalidade:', error);
      return { peakMonths: [], lowMonths: [], currentTrend: 'stable', prediction: 'stable' };
    }
  }

  /**
   * Gera sugestões de palavras-chave
   */
  async generateKeywordSuggestions(mainTopic, niche) {
    const nicheKeywords = {
      'technology': ['desenvolvimento', 'programação', 'software', 'código', 'tutorial', 'framework'],
      'business': ['negócios', 'empresa', 'marketing', 'vendas', 'estratégia', 'empreendedorismo'],
      'health': ['saúde', 'bem-estar', 'fitness', 'exercício', 'dieta', 'medicina'],
      'education': ['educação', 'aprendizado', 'curso', 'ensino', 'tutorial', 'conhecimento'],
      'lifestyle': ['estilo de vida', 'dicas', 'lifestyle', 'bem-estar', 'qualidade de vida'],
      'finance': ['finanças', 'investimento', 'dinheiro', 'economia', 'poupança', 'renda']
    };

    const baseKeywords = nicheKeywords[niche] || ['dicas', 'guia', 'tutorial', 'como fazer'];
    
    return {
      primary: [
        mainTopic,
        `${mainTopic} 2025`,
        `${mainTopic} tutorial`,
        `${mainTopic} guia`
      ],
      secondary: baseKeywords.map(keyword => `${mainTopic} ${keyword}`),
      longTail: [
        `como usar ${mainTopic}`,
        `${mainTopic} para iniciantes`,
        `melhores práticas ${mainTopic}`,
        `${mainTopic} passo a passo`,
        `tutorial completo ${mainTopic}`
      ],
      trending: [
        `${mainTopic} 2025`,
        `${mainTopic} atualizado`,
        `novo ${mainTopic}`,
        `${mainTopic} tendências`
      ]
    };
  }

  /**
   * Gera perguntas populares
   */
  async generatePopularQuestions(mainTopic) {
    return [
      `O que é ${mainTopic}?`,
      `Como funciona ${mainTopic}?`,
      `Como usar ${mainTopic}?`,
      `Por que usar ${mainTopic}?`,
      `Quando usar ${mainTopic}?`,
      `Onde aprender ${mainTopic}?`,
      `Qual a melhor forma de ${mainTopic}?`,
      `Como começar com ${mainTopic}?`,
      `Quais são os benefícios de ${mainTopic}?`,
      `Como implementar ${mainTopic}?`
    ];
  }

  /**
   * Analisa sazonalidade
   */
  async analyzeSeasonality(keyword, geo) {
    // Simulação de análise sazonal
    const currentMonth = new Date().getMonth() + 1;
    
    return {
      peakMonths: [3, 4, 9, 10], // Março, Abril, Setembro, Outubro
      lowMonths: [12, 1, 7], // Dezembro, Janeiro, Julho
      currentTrend: currentMonth >= 3 && currentMonth <= 5 ? 'rising' : 'stable',
      prediction: 'stable'
    };
  }

  /**
   * Extrai termos em tendência
   */
  extractTrendingTerms(googleTrendsData, relatedKeywords) {
    const trending = [];
    
    // Extrair de Google Trends
    if (googleTrendsData.relatedQueries && googleTrendsData.relatedQueries.default) {
      const risingQueries = googleTrendsData.relatedQueries.default.rankedList
        .find(list => list.rankedKeyword)?.rankedKeyword || [];
      
      trending.push(...risingQueries.slice(0, 5).map(item => ({
        term: item.query,
        growth: item.value,
        source: 'google_trends'
      })));
    }
    
    // Adicionar keywords trending
    trending.push(...relatedKeywords.trending.map(term => ({
      term,
      growth: 'high',
      source: 'keyword_research'
    })));
    
    return trending.slice(0, 10);
  }

  /**
   * Identifica oportunidades
   */
  identifyOpportunities(googleTrendsData, relatedKeywords) {
    const opportunities = [];
    
    // Oportunidades de long-tail
    relatedKeywords.longTail.forEach(keyword => {
      opportunities.push({
        type: 'long_tail',
        keyword: keyword,
        difficulty: 'low',
        potential: 'medium',
        reason: 'Baixa competição, boa para rankeamento'
      });
    });
    
    // Oportunidades de trending topics
    relatedKeywords.trending.forEach(keyword => {
      opportunities.push({
        type: 'trending',
        keyword: keyword,
        difficulty: 'medium',
        potential: 'high',
        reason: 'Termo em alta, potencial viral'
      });
    });
    
    return opportunities.slice(0, 8);
  }

  /**
   * Dados mock do Google Trends
   */
  getMockGoogleTrends(keyword) {
    return {
      interestOverTime: {
        default: {
          timelineData: Array.from({ length: 12 }, (_, i) => ({
            time: Date.now() - (11 - i) * 30 * 24 * 60 * 60 * 1000,
            formattedTime: `2024-${String(i + 1).padStart(2, '0')}`,
            value: [Math.floor(Math.random() * 100)]
          }))
        }
      },
      relatedTopics: {
        default: {
          rankedList: [{
            rankedKeyword: [
              { topic: { title: `${keyword} tutorial` }, value: 100 },
              { topic: { title: `${keyword} guia` }, value: 80 },
              { topic: { title: `${keyword} 2025` }, value: 60 }
            ]
          }]
        }
      },
      relatedQueries: {
        default: {
          rankedList: [{
            rankedKeyword: [
              { query: `${keyword} como usar`, value: 100 },
              { query: `${keyword} tutorial`, value: 80 },
              { query: `${keyword} dicas`, value: 60 }
            ]
          }]
        }
      }
    };
  }

  /**
   * Keywords de fallback
   */
  getFallbackKeywords(mainTopic) {
    return {
      primary: [mainTopic, `${mainTopic} 2025`],
      secondary: [`${mainTopic} tutorial`, `${mainTopic} guia`],
      longTail: [`como usar ${mainTopic}`, `${mainTopic} para iniciantes`],
      trending: [`${mainTopic} 2025`, `${mainTopic} atualizado`]
    };
  }

  /**
   * Tendências de fallback
   */
  getFallbackTrends(mainTopic, niche) {
    return {
      mainTopic,
      niche,
      geo: 'BR',
      timestamp: Date.now(),
      googleTrends: this.getMockGoogleTrends(mainTopic),
      relatedKeywords: this.getFallbackKeywords(mainTopic),
      popularQuestions: { what: [], how: [], why: [], when: [], where: [] },
      seasonalTrends: { peakMonths: [], lowMonths: [], currentTrend: 'stable', prediction: 'stable' },
      trendingTerms: [],
      opportunities: []
    };
  }

  /**
   * Verifica se está no cache
   */
  isCached(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    return (Date.now() - cached.timestamp) < this.cacheExpiry;
  }

  /**
   * Obtém do cache
   */
  getFromCache(key) {
    return this.cache.get(key).data;
  }

  /**
   * Salva no cache
   */
  saveToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Limpa cache expirado
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        this.cache.delete(key);
      }
    }
  }
}

module.exports = TrendsAPIService;
