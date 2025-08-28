const axios = require('axios');

class CompetitorAnalysisService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 7200000; // 2 horas
  }

  /**
   * Analisar concorrentes para uma palavra-chave
   */
  async analyzeCompetitors(keyword, options = {}) {
    try {
      const {
        limit = 10,
        includeMetrics = true,
        analyzeSocialMedia = true,
        analyzeBacklinks = true,
        geo = 'BR'
      } = options;

      const cacheKey = `competitors_${keyword}_${geo}_${limit}`;
      
      // Verificar cache
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      // Buscar concorrentes principais
      const topCompetitors = await this.findTopCompetitors(keyword, limit, geo);
      
      // Analisar cada concorrente
      const competitorAnalysis = await Promise.all(
        topCompetitors.map(async (competitor) => {
          const analysis = await this.analyzeCompetitor(competitor, {
            includeMetrics,
            analyzeSocialMedia,
            analyzeBacklinks
          });
          return analysis;
        })
      );

      // Análise comparativa
      const competitiveGaps = this.identifyCompetitiveGaps(competitorAnalysis);
      const opportunities = this.identifyOpportunities(competitorAnalysis, keyword);
      const benchmarks = this.calculateBenchmarks(competitorAnalysis);

      const result = {
        keyword,
        totalCompetitors: competitorAnalysis.length,
        competitors: competitorAnalysis,
        competitiveGaps,
        opportunities,
        benchmarks,
        recommendations: this.generateCompetitorRecommendations(competitorAnalysis, competitiveGaps, opportunities),
        lastUpdated: new Date().toISOString()
      };

      // Salvar no cache
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('Erro na análise de concorrentes:', error);
      return this.generateMockCompetitorAnalysis(keyword, options);
    }
  }

  /**
   * Encontrar principais concorrentes
   */
  async findTopCompetitors(keyword, limit, geo) {
    try {
      // Em produção, integrar com SEMrush, Ahrefs ou similar
      return this.generateMockCompetitors(keyword, limit);
    } catch (error) {
      console.error('Erro ao buscar concorrentes:', error);
      return this.generateMockCompetitors(keyword, limit);
    }
  }

  /**
   * Analisar um concorrente específico
   */
  async analyzeCompetitor(competitor, options = {}) {
    try {
      const {
        includeMetrics = true,
        analyzeSocialMedia = true,
        analyzeBacklinks = true
      } = options;

      const analysis = {
        ...competitor,
        seoMetrics: includeMetrics ? await this.getSEOMetrics(competitor.domain) : null,
        contentAnalysis: await this.analyzeCompetitorContent(competitor.domain),
        socialMedia: analyzeSocialMedia ? await this.analyzeSocialMediaPresence(competitor.domain) : null,
        backlinks: analyzeBacklinks ? await this.analyzeBacklinks(competitor.domain) : null,
        technicalSEO: await this.analyzeTechnicalSEO(competitor.domain),
        contentGaps: await this.identifyContentGaps(competitor.domain),
        strengths: [],
        weaknesses: [],
        threats: [],
        opportunities: []
      };

      // Análise SWOT
      analysis.swotAnalysis = this.performSWOTAnalysis(analysis);

      return analysis;

    } catch (error) {
      console.error('Erro ao analisar concorrente:', error);
      return this.generateMockCompetitorData(competitor);
    }
  }

  /**
   * Obter métricas SEO de um domínio
   */
  async getSEOMetrics(domain) {
    try {
      // Em produção, integrar com APIs como Ahrefs, SEMrush, Moz
      return this.generateMockSEOMetrics(domain);
    } catch (error) {
      console.error('Erro ao obter métricas SEO:', error);
      return this.generateMockSEOMetrics(domain);
    }
  }

  /**
   * Analisar conteúdo do concorrente
   */
  async analyzeCompetitorContent(domain) {
    try {
      return {
        totalPages: Math.floor(Math.random() * 1000) + 100,
        blogPosts: Math.floor(Math.random() * 500) + 50,
        averageWordCount: Math.floor(Math.random() * 1000) + 800,
        updateFrequency: this.getRandomUpdateFrequency(),
        contentTypes: this.getRandomContentTypes(),
        topPerformingContent: this.generateTopPerformingContent(domain),
        contentGaps: this.identifyContentGaps(domain),
        contentQuality: {
          score: Math.floor(Math.random() * 30) + 70,
          readability: Math.floor(Math.random() * 20) + 80,
          uniqueness: Math.floor(Math.random() * 25) + 75,
          engagement: Math.floor(Math.random() * 40) + 60
        }
      };
    } catch (error) {
      console.error('Erro ao analisar conteúdo:', error);
      return null;
    }
  }

  /**
   * Analisar presença em redes sociais
   */
  async analyzeSocialMediaPresence(domain) {
    try {
      const platforms = ['facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'tiktok'];
      const socialData = {};

      platforms.forEach(platform => {
        socialData[platform] = {
          followers: Math.floor(Math.random() * 100000) + 1000,
          engagement: (Math.random() * 5 + 1).toFixed(2),
          postsPerWeek: Math.floor(Math.random() * 10) + 1,
          averageLikes: Math.floor(Math.random() * 1000) + 50,
          averageShares: Math.floor(Math.random() * 200) + 10,
          growthRate: (Math.random() * 20 - 5).toFixed(1)
        };
      });

      return {
        platforms: socialData,
        totalFollowers: Object.values(socialData).reduce((sum, platform) => sum + platform.followers, 0),
        averageEngagement: (Object.values(socialData).reduce((sum, platform) => sum + parseFloat(platform.engagement), 0) / platforms.length).toFixed(2),
        mostActiveplatform: platforms[Math.floor(Math.random() * platforms.length)],
        socialScore: Math.floor(Math.random() * 30) + 70
      };
    } catch (error) {
      console.error('Erro ao analisar redes sociais:', error);
      return null;
    }
  }

  /**
   * Analisar backlinks
   */
  async analyzeBacklinks(domain) {
    try {
      return {
        totalBacklinks: Math.floor(Math.random() * 50000) + 1000,
        referringDomains: Math.floor(Math.random() * 5000) + 100,
        domainAuthority: Math.floor(Math.random() * 40) + 60,
        averageAuthorityScore: Math.floor(Math.random() * 30) + 70,
        topBacklinks: this.generateTopBacklinks(domain),
        backlinkGrowth: (Math.random() * 30 - 10).toFixed(1),
        spamScore: Math.floor(Math.random() * 15),
        linkTypes: {
          dofollow: Math.floor(Math.random() * 30) + 70,
          nofollow: Math.floor(Math.random() * 30) + 0,
        },
        anchorTextDistribution: this.generateAnchorTextDistribution()
      };
    } catch (error) {
      console.error('Erro ao analisar backlinks:', error);
      return null;
    }
  }

  /**
   * Analisar SEO técnico
   */
  async analyzeTechnicalSEO(domain) {
    try {
      return {
        pageSpeed: {
          mobile: Math.floor(Math.random() * 40) + 60,
          desktop: Math.floor(Math.random() * 30) + 70
        },
        coreWebVitals: {
          lcp: (Math.random() * 2 + 1).toFixed(1),
          fid: Math.floor(Math.random() * 100) + 50,
          cls: (Math.random() * 0.2).toFixed(3)
        },
        mobileOptimization: Math.floor(Math.random() * 20) + 80,
        httpsStatus: Math.random() > 0.1,
        structuredData: Math.random() > 0.3,
        xmlSitemap: Math.random() > 0.2,
        robotsTxt: Math.random() > 0.15,
        canonicalization: Math.floor(Math.random() * 30) + 70,
        internalLinking: Math.floor(Math.random() * 40) + 60,
        technicalScore: Math.floor(Math.random() * 25) + 75
      };
    } catch (error) {
      console.error('Erro ao analisar SEO técnico:', error);
      return null;
    }
  }

  /**
   * Identificar gaps de conteúdo
   */
  async identifyContentGaps(domain) {
    const gapTypes = [
      'Conteúdo educativo básico',
      'Tutoriais avançados',
      'Estudos de caso',
      'Comparações de produtos',
      'Reviews detalhados',
      'Conteúdo sazonal',
      'FAQ abrangente',
      'Glossário de termos',
      'Infográficos',
      'Vídeos explicativos'
    ];

    const gaps = [];
    const numGaps = Math.floor(Math.random() * 5) + 2;

    for (let i = 0; i < numGaps; i++) {
      const randomGap = gapTypes[Math.floor(Math.random() * gapTypes.length)];
      if (!gaps.includes(randomGap)) {
        gaps.push(randomGap);
      }
    }

    return gaps.map(gap => ({
      type: gap,
      priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
      estimatedTraffic: Math.floor(Math.random() * 5000) + 500,
      difficulty: Math.floor(Math.random() * 40) + 30
    }));
  }

  // Métodos auxiliares para gerar dados mock
  generateMockCompetitors(keyword, limit) {
    const domains = [
      'competitor1.com', 'competitor2.com', 'competitor3.com', 
      'competitor4.com', 'competitor5.com', 'competitor6.com',
      'competitor7.com', 'competitor8.com', 'competitor9.com', 'competitor10.com'
    ];

    return domains.slice(0, limit).map((domain, index) => ({
      domain,
      title: `${keyword} - Competitor ${index + 1}`,
      url: `https://${domain}`,
      ranking: index + 1,
      estimatedTraffic: Math.floor(Math.random() * 100000) + 10000,
      keywordCount: Math.floor(Math.random() * 5000) + 500,
      competitionLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
    }));
  }

  generateMockSEOMetrics(domain) {
    return {
      domainAuthority: Math.floor(Math.random() * 40) + 60,
      pageAuthority: Math.floor(Math.random() * 30) + 70,
      organicTraffic: Math.floor(Math.random() * 200000) + 10000,
      organicKeywords: Math.floor(Math.random() * 10000) + 1000,
      paidTraffic: Math.floor(Math.random() * 50000) + 1000,
      paidKeywords: Math.floor(Math.random() * 2000) + 100,
      backlinks: Math.floor(Math.random() * 50000) + 1000,
      referringDomains: Math.floor(Math.random() * 5000) + 100
    };
  }

  generateMockCompetitorAnalysis(keyword, options) {
    const mockCompetitors = this.generateMockCompetitors(keyword, options.limit || 5);
    const competitorAnalysis = mockCompetitors.map(comp => ({
      ...comp,
      seoMetrics: this.generateMockSEOMetrics(comp.domain),
      contentAnalysis: {
        totalPages: Math.floor(Math.random() * 1000) + 100,
        contentQuality: { score: Math.floor(Math.random() * 30) + 70 }
      },
      socialMedia: { socialScore: Math.floor(Math.random() * 30) + 70 },
      technicalSEO: { technicalScore: Math.floor(Math.random() * 25) + 75 }
    }));

    return {
      keyword,
      totalCompetitors: competitorAnalysis.length,
      competitors: competitorAnalysis,
      competitiveGaps: {
        content: [{ type: 'videos', opportunity: 'Criar conteúdo em vídeo', priority: 'medium' }],
        technical: [],
        social: [],
        backlinks: []
      },
      opportunities: [
        {
          type: 'content-quality',
          title: 'Oportunidade de conteúdo superior',
          description: 'Concorrentes têm qualidade média',
          potential: 'high',
          effort: 'medium'
        }
      ],
      benchmarks: {
        domainAuthority: { min: 60, max: 90, average: 75, median: 76 }
      },
      recommendations: [
        {
          category: 'content',
          priority: 'high',
          title: 'Melhorar qualidade do conteúdo',
          description: 'Superar concorrentes com conteúdo superior',
          actions: ['Criar conteúdo mais detalhado', 'Adicionar elementos visuais'],
          estimatedImpact: 'high',
          estimatedEffort: 'medium'
        }
      ],
      lastUpdated: new Date().toISOString()
    };
  }

  // Métodos auxiliares simplificados
  getRandomUpdateFrequency() {
    const frequencies = ['daily', 'weekly', 'bi-weekly', 'monthly', 'rarely'];
    return frequencies[Math.floor(Math.random() * frequencies.length)];
  }

  getRandomContentTypes() {
    const types = ['blog', 'videos', 'infographics', 'case-studies', 'tutorials', 'reviews'];
    const numTypes = Math.floor(Math.random() * 4) + 2;
    const selectedTypes = [];
    
    for (let i = 0; i < numTypes; i++) {
      const randomType = types[Math.floor(Math.random() * types.length)];
      if (!selectedTypes.includes(randomType)) {
        selectedTypes.push(randomType);
      }
    }
    
    return selectedTypes;
  }

  generateTopPerformingContent(domain) {
    return [
      {
        title: 'Top Performing Article 1',
        url: `https://${domain}/article-1`,
        traffic: Math.floor(Math.random() * 10000) + 1000,
        shares: Math.floor(Math.random() * 1000) + 100,
        backlinks: Math.floor(Math.random() * 100) + 10
      }
    ];
  }

  generateTopBacklinks(domain) {
    return [
      {
        source: 'authority-site1.com',
        authority: Math.floor(Math.random() * 20) + 80,
        anchorText: 'relevant keyword',
        type: 'dofollow'
      }
    ];
  }

  generateAnchorTextDistribution() {
    return {
      branded: Math.floor(Math.random() * 30) + 40,
      exact: Math.floor(Math.random() * 15) + 5,
      partial: Math.floor(Math.random() * 20) + 15,
      generic: Math.floor(Math.random() * 15) + 10,
      naked: Math.floor(Math.random() * 10) + 5
    };
  }

  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

module.exports = new CompetitorAnalysisService();
