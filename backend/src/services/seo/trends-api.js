const axios = require('axios');

class TrendsAPIService {
  constructor() {
    this.baseUrl = 'https://trends.google.com/trends/api';
    this.cache = new Map();
    this.cacheTimeout = 3600000; // 1 hora
  }

  /**
   * Obter dados de tendências do Google Trends
   */
  async getTrendingData(keyword, niche = 'general', geo = 'BR') {
    try {
      const cacheKey = `trends_${keyword}_${niche}_${geo}`;
      
      // Verificar cache
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      // Simular dados do Google Trends (em produção, usar API real)
      const trendingData = await this.generateMockTrendingData(keyword, niche, geo);
      
      // Salvar no cache
      this.cache.set(cacheKey, {
        data: trendingData,
        timestamp: Date.now()
      });

      return trendingData;

    } catch (error) {
      console.error('Erro ao buscar dados de tendências:', error);
      return this.generateMockTrendingData(keyword, niche, geo);
    }
  }

  /**
   * Buscar palavras-chave relacionadas
   */
  async getRelatedQueries(keyword, geo = 'BR') {
    try {
      // Em produção, usar Google Trends API real
      const relatedQueries = this.generateRelatedQueries(keyword);
      const risingQueries = this.generateRisingQueries(keyword);

      return {
        relatedQueries,
        risingQueries
      };

    } catch (error) {
      console.error('Erro ao buscar queries relacionadas:', error);
      return {
        relatedQueries: [],
        risingQueries: []
      };
    }
  }

  /**
   * Analisar sazonalidade
   */
  async getSeasonalData(keyword, geo = 'BR') {
    try {
      // Simular análise sazonal
      const seasonalData = this.generateSeasonalAnalysis(keyword);
      return seasonalData;

    } catch (error) {
      console.error('Erro na análise sazonal:', error);
      return null;
    }
  }

  /**
   * Gerar dados mock de tendências
   */
  async generateMockTrendingData(keyword, niche, geo) {
    const trendingTerms = [
      {
        term: `${keyword} 2024`,
        growth: 'high',
        source: 'Google Trends',
        searchVolume: Math.floor(Math.random() * 5000) + 1000,
        competition: 'medium'
      },
      {
        term: `como ${keyword}`,
        growth: 'rising',
        source: 'Google Trends',
        searchVolume: Math.floor(Math.random() * 3000) + 800,
        competition: 'low'
      },
      {
        term: `${keyword} grátis`,
        growth: 'medium',
        source: 'Google Trends',
        searchVolume: Math.floor(Math.random() * 2000) + 600,
        competition: 'high'
      },
      {
        term: `melhor ${keyword}`,
        growth: 'stable',
        source: 'Google Trends',
        searchVolume: Math.floor(Math.random() * 4000) + 900,
        competition: 'medium'
      },
      {
        term: `${keyword} tutorial`,
        growth: 'rising',
        source: 'Google Trends',
        searchVolume: Math.floor(Math.random() * 2500) + 700,
        competition: 'low'
      }
    ];

    const popularQuestions = {
      what: [
        `O que é ${keyword}?`,
        `O que significa ${keyword}?`,
        `O que faz ${keyword}?`,
        `O que é ${keyword} e como funciona?`
      ],
      how: [
        `Como usar ${keyword}?`,
        `Como funciona ${keyword}?`,
        `Como implementar ${keyword}?`,
        `Como aprender ${keyword}?`
      ],
      why: [
        `Por que ${keyword} é importante?`,
        `Por que usar ${keyword}?`,
        `Por que ${keyword} funciona?`,
        `Por que investir em ${keyword}?`
      ],
      when: [
        `Quando usar ${keyword}?`,
        `Quando ${keyword} é necessário?`,
        `Quando aplicar ${keyword}?`,
        `Quando começar com ${keyword}?`
      ],
      where: [
        `Onde encontrar ${keyword}?`,
        `Onde usar ${keyword}?`,
        `Onde aplicar ${keyword}?`,
        `Onde aprender ${keyword}?`
      ]
    };

    const seasonalTrends = this.generateSeasonalAnalysis(keyword);

    const opportunities = [
      {
        keyword: `${keyword} iniciantes`,
        type: 'educational',
        potential: 'high',
        reason: 'Alta demanda por conteúdo educativo básico',
        difficulty: Math.floor(Math.random() * 30) + 20,
        cpc: Math.random() * 1.5 + 0.5
      },
      {
        keyword: `${keyword} avançado`,
        type: 'educational',
        potential: 'medium',
        reason: 'Nicho específico com menos competição',
        difficulty: Math.floor(Math.random() * 40) + 30,
        cpc: Math.random() * 2 + 1
      },
      {
        keyword: `${keyword} vs alternativas`,
        type: 'commercial',
        potential: 'high',
        reason: 'Intenção comercial clara',
        difficulty: Math.floor(Math.random() * 50) + 35,
        cpc: Math.random() * 3 + 1.5
      },
      {
        keyword: `${keyword} ${new Date().getFullYear()}`,
        type: 'trending',
        potential: 'medium',
        reason: 'Conteúdo atualizado tem boa performance',
        difficulty: Math.floor(Math.random() * 35) + 25,
        cpc: Math.random() * 2 + 0.8
      }
    ];

    return {
      mainTopic: keyword,
      niche,
      geo,
      timestamp: Date.now(),
      trendingTerms,
      popularQuestions,
      seasonalTrends,
      opportunities
    };
  }

  /**
   * Gerar queries relacionadas
   */
  generateRelatedQueries(keyword) {
    const variations = [
      `${keyword} tutorial`,
      `como usar ${keyword}`,
      `${keyword} para iniciantes`,
      `melhor ${keyword}`,
      `${keyword} grátis`,
      `${keyword} online`,
      `curso de ${keyword}`,
      `${keyword} passo a passo`,
      `dicas de ${keyword}`,
      `${keyword} profissional`
    ];

    return variations.map(query => ({
      query,
      value: Math.floor(Math.random() * 100) + 1
    }));
  }

  /**
   * Gerar queries em alta
   */
  generateRisingQueries(keyword) {
    const risingTerms = [
      `${keyword} 2024`,
      `${keyword} IA`,
      `${keyword} automação`,
      `${keyword} tendências`,
      `futuro do ${keyword}`,
      `${keyword} inovação`,
      `${keyword} digital`,
      `${keyword} sustentável`
    ];

    return risingTerms.map(query => ({
      query,
      value: Math.floor(Math.random() * 50) + 25
    }));
  }

  /**
   * Gerar análise sazonal
   */
  generateSeasonalAnalysis(keyword) {
    // Simular padrões sazonais baseados no tipo de keyword
    const keywordLower = keyword.toLowerCase();
    
    let peakMonths = [];
    let lowMonths = [];
    let currentTrend = 'stable';
    let prediction = '';

    // Padrões para diferentes tipos de conteúdo
    if (/curso|educação|aprender|tutorial/.test(keywordLower)) {
      peakMonths = [1, 2, 8, 9]; // Início do ano e volta às aulas
      lowMonths = [6, 7, 12]; // Férias
      currentTrend = 'rising';
      prediction = 'Pico esperado no início do ano e volta às aulas';
    } else if (/negócio|marketing|vendas|empresa/.test(keywordLower)) {
      peakMonths = [1, 9, 10, 11]; // Início do ano e final
      lowMonths = [6, 7, 12]; // Meio do ano e dezembro
      currentTrend = 'stable';
      prediction = 'Estável com picos no início e final do ano';
    } else if (/saúde|fitness|dieta/.test(keywordLower)) {
      peakMonths = [1, 2, 3, 9]; // Janeiro e setembro
      lowMonths = [6, 7, 12]; // Meio do ano
      currentTrend = 'rising';
      prediction = 'Picos em janeiro (resoluções) e setembro (volta da rotina)';
    } else {
      // Padrão geral
      peakMonths = [1, 3, 9, 10];
      lowMonths = [6, 7, 8];
      currentTrend = 'stable';
      prediction = 'Padrão estável com leves variações sazonais';
    }

    return {
      peakMonths,
      lowMonths,
      currentTrend,
      prediction
    };
  }

  /**
   * Buscar dados de interesse ao longo do tempo
   */
  async getInterestOverTime(keyword, timeframe = '12m', geo = 'BR') {
    try {
      // Simular dados de interesse ao longo do tempo
      const months = 12;
      const data = [];
      
      for (let i = 0; i < months; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - (months - i - 1));
        
        // Simular variação de interesse com base na sazonalidade
        const baseValue = 50;
        const seasonalVariation = Math.sin((i / months) * 2 * Math.PI) * 20;
        const randomVariation = (Math.random() - 0.5) * 20;
        const value = Math.max(0, Math.min(100, baseValue + seasonalVariation + randomVariation));
        
        data.push({
          time: date.toISOString().split('T')[0],
          value: Math.round(value)
        });
      }

      return data;

    } catch (error) {
      console.error('Erro ao buscar interesse ao longo do tempo:', error);
      return [];
    }
  }

  /**
   * Comparar múltiplas palavras-chave
   */
  async compareKeywords(keywords, geo = 'BR') {
    try {
      const comparisons = {};
      
      for (const keyword of keywords) {
        comparisons[keyword] = {
          averageInterest: Math.floor(Math.random() * 100) + 1,
          trend: ['rising', 'stable', 'declining'][Math.floor(Math.random() * 3)],
          peakMonth: Math.floor(Math.random() * 12) + 1,
          relatedQueries: this.generateRelatedQueries(keyword).slice(0, 5)
        };
      }

      return comparisons;

    } catch (error) {
      console.error('Erro na comparação de palavras-chave:', error);
      return {};
    }
  }

  /**
   * Limpar cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Obter estatísticas do cache
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

module.exports = new TrendsAPIService();
