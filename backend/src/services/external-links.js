const axios = require('axios');
const cheerio = require('cheerio');

/**
 * External Links Service
 * Busca e valida links externos de alta autoridade
 */
class ExternalLinksService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 12 * 60 * 60 * 1000; // 12 horas
    
    // Domains de alta autoridade por categoria
    this.authorityDomains = {
      technology: [
        'developer.mozilla.org', 'stackoverflow.com', 'github.com', 'medium.com',
        'dev.to', 'freecodecamp.org', 'w3schools.com', 'css-tricks.com'
      ],
      business: [
        'harvard.edu', 'mit.edu', 'forbes.com', 'entrepreneur.com',
        'inc.com', 'fastcompany.com', 'businessinsider.com'
      ],
      health: [
        'who.int', 'cdc.gov', 'mayoclinic.org', 'webmd.com',
        'healthline.com', 'medicalnewstoday.com'
      ],
      education: [
        'coursera.org', 'edx.org', 'khanacademy.org', 'udemy.com',
        'mit.edu', 'stanford.edu', 'harvard.edu'
      ],
      general: [
        'wikipedia.org', 'britannica.com', 'nationalgeographic.com',
        'bbc.com', 'reuters.com', 'ap.org'
      ]
    };
  }

  /**
   * Busca links externos relevantes e de alta autoridade
   * @param {string} mainTopic - Assunto principal
   * @param {string} niche - Nicho do conteúdo
   * @param {Array} keywords - Palavras-chave relacionadas
   * @returns {Object} Links externos sugeridos
   */
  async findAuthorityLinks(mainTopic, niche, keywords = []) {
    try {
      const cacheKey = `links_${mainTopic}_${niche}`;
      
      if (this.isCached(cacheKey)) {
        return this.getFromCache(cacheKey);
      }

      // Buscar em diferentes fontes
      const [
        googleSearchResults,
        redditDiscussions,
        authorityContent,
        academicSources,
        viralContent
      ] = await Promise.all([
        this.searchGoogleForAuthority(mainTopic, niche),
        this.searchRedditDiscussions(mainTopic),
        this.findAuthorityContent(mainTopic, niche),
        this.findAcademicSources(mainTopic),
        this.findViralContent(mainTopic, keywords)
      ]);

      const result = {
        mainTopic,
        niche,
        timestamp: Date.now(),
        authorityLinks: authorityContent,
        officialSources: googleSearchResults.official,
        popularContent: viralContent,
        discussions: redditDiscussions,
        academicSources: academicSources,
        recommendations: this.generateLinkRecommendations(
          authorityContent, 
          googleSearchResults, 
          viralContent
        )
      };

      this.saveToCache(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Erro ao buscar links externos:', error);
      return this.getFallbackLinks(mainTopic, niche);
    }
  }

  /**
   * Busca no Google por conteúdo de autoridade
   */
  async searchGoogleForAuthority(mainTopic, niche) {
    try {
      // Simulação de Google Search API (em produção usar API real)
      const queries = [
        `${mainTopic} site:wikipedia.org`,
        `${mainTopic} site:stackoverflow.com`,
        `${mainTopic} tutorial site:medium.com`,
        `${mainTopic} guide official documentation`
      ];

      const results = {
        official: [],
        tutorials: [],
        discussions: []
      };

      // Simular resultados baseados no nicho
      const mockResults = this.generateMockGoogleResults(mainTopic, niche);
      
      return {
        official: mockResults.official,
        tutorials: mockResults.tutorials,
        discussions: mockResults.discussions
      };

    } catch (error) {
      console.error('Erro na busca Google:', error);
      return { official: [], tutorials: [], discussions: [] };
    }
  }

  /**
   * Busca discussões no Reddit
   */
  async searchRedditDiscussions(mainTopic) {
    try {
      // Simulação de Reddit API
      const subreddits = this.getRelevantSubreddits(mainTopic);
      const discussions = [];

      subreddits.forEach(subreddit => {
        discussions.push({
          title: `Discussion about ${mainTopic}`,
          url: `https://reddit.com/r/${subreddit}/posts/example`,
          subreddit: subreddit,
          upvotes: Math.floor(Math.random() * 1000) + 100,
          comments: Math.floor(Math.random() * 200) + 50,
          relevanceScore: Math.floor(Math.random() * 40) + 60
        });
      });

      return discussions.slice(0, 5);

    } catch (error) {
      console.error('Erro na busca Reddit:', error);
      return [];
    }
  }

  /**
   * Encontra conteúdo de autoridade específico do nicho
   */
  async findAuthorityContent(mainTopic, niche) {
    try {
      const domains = this.authorityDomains[niche] || this.authorityDomains.general;
      const authorityLinks = [];

      for (const domain of domains.slice(0, 5)) {
        const link = await this.generateAuthorityLink(mainTopic, domain, niche);
        if (link) {
          authorityLinks.push(link);
        }
      }

      return authorityLinks;

    } catch (error) {
      console.error('Erro ao buscar conteúdo de autoridade:', error);
      return [];
    }
  }

  /**
   * Busca fontes acadêmicas
   */
  async findAcademicSources(mainTopic) {
    try {
      // Simulação de busca acadêmica
      const academicSources = [
        {
          title: `Academic Research on ${mainTopic}`,
          url: `https://scholar.google.com/scholar?q=${encodeURIComponent(mainTopic)}`,
          source: 'Google Scholar',
          type: 'academic',
          authorityScore: 95,
          relevanceScore: 85
        },
        {
          title: `${mainTopic} - Educational Resource`,
          url: `https://mit.edu/research/${mainTopic.toLowerCase()}`,
          source: 'MIT',
          type: 'educational',
          authorityScore: 98,
          relevanceScore: 80
        }
      ];

      return academicSources;

    } catch (error) {
      console.error('Erro ao buscar fontes acadêmicas:', error);
      return [];
    }
  }

  /**
   * Busca conteúdo viral relacionado
   */
  async findViralContent(mainTopic, keywords) {
    try {
      // Simulação de BuzzSumo API
      const viralContent = [];
      
      const platforms = ['medium.com', 'dev.to', 'hackernoon.com', 'freecodecamp.org'];
      
      platforms.forEach(platform => {
        viralContent.push({
          title: `Viral: Everything about ${mainTopic}`,
          url: `https://${platform}/article/${mainTopic.toLowerCase().replace(/\s+/g, '-')}`,
          platform: platform,
          shares: Math.floor(Math.random() * 5000) + 1000,
          views: Math.floor(Math.random() * 50000) + 10000,
          engagementScore: Math.floor(Math.random() * 30) + 70,
          publishDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
          authorityScore: this.calculateDomainAuthority(platform)
        });
      });

      return viralContent.sort((a, b) => b.shares - a.shares).slice(0, 6);

    } catch (error) {
      console.error('Erro ao buscar conteúdo viral:', error);
      return [];
    }
  }

  /**
   * Gera link de autoridade para um domínio específico
   */
  async generateAuthorityLink(mainTopic, domain, niche) {
    try {
      const linkTemplates = {
        'wikipedia.org': `https://en.wikipedia.org/wiki/${mainTopic.replace(/\s+/g, '_')}`,
        'stackoverflow.com': `https://stackoverflow.com/questions/tagged/${mainTopic.toLowerCase().replace(/\s+/g, '-')}`,
        'github.com': `https://github.com/topics/${mainTopic.toLowerCase().replace(/\s+/g, '-')}`,
        'medium.com': `https://medium.com/tag/${mainTopic.toLowerCase().replace(/\s+/g, '-')}`,
        'developer.mozilla.org': `https://developer.mozilla.org/en-US/docs/Web/${mainTopic.replace(/\s+/g, '_')}`
      };

      const url = linkTemplates[domain] || `https://${domain}/search?q=${encodeURIComponent(mainTopic)}`;
      
      return {
        title: `${mainTopic} - ${domain}`,
        url: url,
        domain: domain,
        authorityScore: this.calculateDomainAuthority(domain),
        relevanceScore: Math.floor(Math.random() * 20) + 80,
        type: this.categorizeLinkType(domain),
        description: `Authoritative content about ${mainTopic} from ${domain}`,
        lastChecked: Date.now()
      };

    } catch (error) {
      console.error('Erro ao gerar link de autoridade:', error);
      return null;
    }
  }

  /**
   * Calcula autoridade do domínio
   */
  calculateDomainAuthority(domain) {
    const authorityScores = {
      'wikipedia.org': 100,
      'stackoverflow.com': 95,
      'github.com': 90,
      'medium.com': 85,
      'developer.mozilla.org': 95,
      'w3schools.com': 80,
      'freecodecamp.org': 85,
      'harvard.edu': 98,
      'mit.edu': 98,
      'stanford.edu': 97
    };

    return authorityScores[domain] || Math.floor(Math.random() * 30) + 50;
  }

  /**
   * Categoriza tipo de link
   */
  categorizeLinkType(domain) {
    if (domain.includes('wikipedia') || domain.includes('.edu')) return 'reference';
    if (domain.includes('stackoverflow') || domain.includes('github')) return 'technical';
    if (domain.includes('medium') || domain.includes('dev.to')) return 'tutorial';
    if (domain.includes('reddit')) return 'discussion';
    return 'general';
  }

  /**
   * Obtém subreddits relevantes
   */
  getRelevantSubreddits(mainTopic) {
    const topicSubreddits = {
      'react': ['reactjs', 'javascript', 'webdev', 'programming'],
      'javascript': ['javascript', 'webdev', 'programming', 'learnjavascript'],
      'python': ['python', 'learnpython', 'programming', 'MachineLearning'],
      'business': ['entrepreneur', 'business', 'startups', 'marketing'],
      'health': ['health', 'fitness', 'nutrition', 'wellness']
    };

    const topic = mainTopic.toLowerCase();
    for (const [key, subreddits] of Object.entries(topicSubreddits)) {
      if (topic.includes(key)) {
        return subreddits;
      }
    }

    return ['general', 'todayilearned', 'explainlikeimfive'];
  }

  /**
   * Gera resultados mock do Google
   */
  generateMockGoogleResults(mainTopic, niche) {
    return {
      official: [
        {
          title: `Official ${mainTopic} Documentation`,
          url: `https://docs.${mainTopic.toLowerCase().replace(/\s+/g, '')}.org`,
          snippet: `Official documentation and guides for ${mainTopic}`,
          authorityScore: 95,
          relevanceScore: 100
        }
      ],
      tutorials: [
        {
          title: `Complete ${mainTopic} Tutorial`,
          url: `https://medium.com/${mainTopic.toLowerCase().replace(/\s+/g, '-')}-tutorial`,
          snippet: `Learn ${mainTopic} step by step with practical examples`,
          authorityScore: 80,
          relevanceScore: 90
        }
      ],
      discussions: [
        {
          title: `${mainTopic} Discussion on Stack Overflow`,
          url: `https://stackoverflow.com/questions/tagged/${mainTopic.toLowerCase().replace(/\s+/g, '-')}`,
          snippet: `Community discussions and solutions about ${mainTopic}`,
          authorityScore: 90,
          relevanceScore: 85
        }
      ]
    };
  }

  /**
   * Gera recomendações de links
   */
  generateLinkRecommendations(authorityLinks, googleResults, viralContent) {
    const recommendations = [];

    // Top 3 links de autoridade
    authorityLinks.slice(0, 3).forEach(link => {
      recommendations.push({
        ...link,
        reason: 'High domain authority and relevance',
        priority: 'high',
        placement: 'early_in_article'
      });
    });

    // Conteúdo viral popular
    viralContent.slice(0, 2).forEach(content => {
      recommendations.push({
        ...content,
        reason: 'Popular content with high engagement',
        priority: 'medium',
        placement: 'supporting_content'
      });
    });

    // Fontes oficiais
    googleResults.official.forEach(result => {
      recommendations.push({
        ...result,
        reason: 'Official source and documentation',
        priority: 'high',
        placement: 'reference_section'
      });
    });

    return recommendations.slice(0, 8);
  }

  /**
   * Links de fallback
   */
  getFallbackLinks(mainTopic, niche) {
    return {
      mainTopic,
      niche,
      timestamp: Date.now(),
      authorityLinks: [
        {
          title: `${mainTopic} - Wikipedia`,
          url: `https://en.wikipedia.org/wiki/${mainTopic.replace(/\s+/g, '_')}`,
          domain: 'wikipedia.org',
          authorityScore: 100,
          relevanceScore: 90,
          type: 'reference'
        }
      ],
      officialSources: [],
      popularContent: [],
      discussions: [],
      academicSources: [],
      recommendations: []
    };
  }

  /**
   * Valida qualidade de um link
   */
  async validateLinkQuality(url) {
    try {
      const response = await axios.head(url, { timeout: 5000 });
      
      return {
        isValid: response.status === 200,
        statusCode: response.status,
        isHttps: url.startsWith('https://'),
        responseTime: Date.now() - response.config.metadata?.startTime || 0,
        contentType: response.headers['content-type']
      };
    } catch (error) {
      return {
        isValid: false,
        statusCode: error.response?.status || 0,
        isHttps: url.startsWith('https://'),
        responseTime: 0,
        error: error.message
      };
    }
  }

  /**
   * Cache methods
   */
  isCached(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return (Date.now() - cached.timestamp) < this.cacheExpiry;
  }

  getFromCache(key) {
    return this.cache.get(key).data;
  }

  saveToCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}

module.exports = ExternalLinksService;
