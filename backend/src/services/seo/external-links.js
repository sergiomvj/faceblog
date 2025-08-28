const axios = require('axios');

class ExternalLinksService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 7200000; // 2 horas
    
    // Base de dados de domínios de alta autoridade por categoria
    this.authorityDomains = {
      technology: [
        { domain: 'techcrunch.com', authority: 92 },
        { domain: 'wired.com', authority: 89 },
        { domain: 'arstechnica.com', authority: 85 },
        { domain: 'theverge.com', authority: 88 },
        { domain: 'engadget.com', authority: 82 }
      ],
      business: [
        { domain: 'forbes.com', authority: 94 },
        { domain: 'harvard.edu', authority: 96 },
        { domain: 'mckinsey.com', authority: 91 },
        { domain: 'bloomberg.com', authority: 93 },
        { domain: 'wsj.com', authority: 95 }
      ],
      health: [
        { domain: 'who.int', authority: 98 },
        { domain: 'nih.gov', authority: 97 },
        { domain: 'mayoclinic.org', authority: 89 },
        { domain: 'webmd.com', authority: 85 },
        { domain: 'healthline.com', authority: 82 }
      ],
      education: [
        { domain: 'mit.edu', authority: 98 },
        { domain: 'stanford.edu', authority: 97 },
        { domain: 'coursera.org', authority: 88 },
        { domain: 'khanacademy.org', authority: 85 },
        { domain: 'edx.org', authority: 87 }
      ],
      marketing: [
        { domain: 'hubspot.com', authority: 91 },
        { domain: 'moz.com', authority: 89 },
        { domain: 'searchengineland.com', authority: 87 },
        { domain: 'contentmarketinginstitute.com', authority: 84 },
        { domain: 'socialmediaexaminer.com', authority: 82 }
      ],
      general: [
        { domain: 'wikipedia.org', authority: 100 },
        { domain: 'google.com', authority: 100 },
        { domain: 'youtube.com', authority: 99 },
        { domain: 'medium.com', authority: 88 },
        { domain: 'reddit.com', authority: 91 }
      ]
    };
  }

  /**
   * Encontrar links de autoridade para uma palavra-chave
   */
  async findAuthorityLinks(keyword, niche = 'general', limit = 15) {
    try {
      const cacheKey = `external_links_${keyword}_${niche}`;
      
      // Verificar cache
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      // Buscar links de autoridade
      const authorityLinks = await this.searchAuthorityLinks(keyword, niche, limit);
      
      // Salvar no cache
      this.cache.set(cacheKey, {
        data: authorityLinks,
        timestamp: Date.now()
      });

      return authorityLinks;

    } catch (error) {
      console.error('Erro ao buscar links de autoridade:', error);
      return this.generateMockAuthorityLinks(keyword, niche, limit);
    }
  }

  /**
   * Buscar links de autoridade (simulado)
   */
  async searchAuthorityLinks(keyword, niche, limit) {
    // Em produção, integrar com APIs como Ahrefs, SEMrush, ou fazer scraping ético
    const mockLinks = this.generateMockAuthorityLinks(keyword, niche, limit);
    
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return mockLinks;
  }

  /**
   * Gerar links de autoridade simulados
   */
  generateMockAuthorityLinks(keyword, niche, limit) {
    const links = [];
    const domains = this.authorityDomains[niche] || this.authorityDomains.general;
    
    // Tipos de conteúdo por categoria
    const contentTypes = {
      resource: {
        titles: [
          `The Complete Guide to ${keyword}`,
          `${keyword}: Essential Resources and Tools`,
          `Ultimate ${keyword} Resource Library`,
          `${keyword} Best Practices and Guidelines`
        ],
        contexts: [
          `Para uma compreensão mais profunda sobre`,
          `Consulte este guia abrangente sobre`,
          `Encontre recursos adicionais sobre`,
          `Para mais informações detalhadas sobre`
        ]
      },
      statistic: {
        titles: [
          `${keyword} Statistics and Trends 2024`,
          `Latest ${keyword} Market Research Data`,
          `${keyword} Industry Report and Analytics`,
          `Key ${keyword} Metrics and Benchmarks`
        ],
        contexts: [
          `De acordo com dados recentes sobre`,
          `Estatísticas mostram que`,
          `Pesquisas indicam que`,
          `Dados do setor revelam que`
        ]
      },
      study: {
        titles: [
          `Research Study: Impact of ${keyword}`,
          `${keyword} Case Study Analysis`,
          `Scientific Research on ${keyword}`,
          `${keyword}: Academic Research Findings`
        ],
        contexts: [
          `Um estudo abrangente sobre`,
          `Pesquisas acadêmicas demonstram que`,
          `Análises científicas indicam que`,
          `Estudos de caso mostram que`
        ]
      },
      tool: {
        titles: [
          `Top ${keyword} Tools and Software`,
          `Best ${keyword} Platforms and Solutions`,
          `${keyword} Tool Comparison Guide`,
          `Professional ${keyword} Software Review`
        ],
        contexts: [
          `Para implementar efetivamente`,
          `Utilize ferramentas especializadas em`,
          `As melhores soluções para`,
          `Ferramentas recomendadas para`
        ]
      },
      guide: {
        titles: [
          `How to Master ${keyword}: Step-by-Step Guide`,
          `${keyword} Implementation Handbook`,
          `Beginner's Guide to ${keyword}`,
          `Advanced ${keyword} Strategies Guide`
        ],
        contexts: [
          `Siga este guia detalhado sobre`,
          `Aprenda mais sobre`,
          `Para dominar completamente`,
          `Este manual abrangente sobre`
        ]
      }
    };

    const linkTypes = Object.keys(contentTypes);
    
    for (let i = 0; i < Math.min(limit, domains.length * 3); i++) {
      const domain = domains[i % domains.length];
      const linkType = linkTypes[i % linkTypes.length];
      const typeData = contentTypes[linkType];
      
      const title = typeData.titles[Math.floor(Math.random() * typeData.titles.length)];
      const context = typeData.contexts[Math.floor(Math.random() * typeData.contexts.length)];
      
      // Calcular score de relevância baseado em múltiplos fatores
      const relevanceScore = this.calculateRelevanceScore(keyword, title, domain.authority, linkType);
      
      links.push({
        domain: domain.domain,
        url: `https://${domain.domain}/${this.generateUrlSlug(title)}`,
        title,
        domainAuthority: domain.authority,
        relevanceScore,
        linkType,
        anchorTextSuggestion: this.generateAnchorText(keyword, linkType),
        contextSuggestion: `${context} ${keyword}`
      });
    }

    // Ordenar por relevância e autoridade
    return links
      .sort((a, b) => (b.relevanceScore + b.domainAuthority) - (a.relevanceScore + a.domainAuthority))
      .slice(0, limit);
  }

  /**
   * Calcular score de relevância
   */
  calculateRelevanceScore(keyword, title, domainAuthority, linkType) {
    let score = 50; // Base score
    
    // Relevância do título
    const keywordInTitle = title.toLowerCase().includes(keyword.toLowerCase());
    if (keywordInTitle) score += 30;
    
    // Bonus por autoridade do domínio
    if (domainAuthority >= 90) score += 20;
    else if (domainAuthority >= 80) score += 15;
    else if (domainAuthority >= 70) score += 10;
    
    // Bonus por tipo de link
    const typeBonus = {
      statistic: 15,
      study: 20,
      resource: 10,
      guide: 12,
      tool: 8
    };
    score += typeBonus[linkType] || 5;
    
    // Variação aleatória para simular outros fatores
    score += Math.floor(Math.random() * 10) - 5;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Gerar texto âncora sugerido
   */
  generateAnchorText(keyword, linkType) {
    const templates = {
      resource: [
        `guia completo de ${keyword}`,
        `recursos sobre ${keyword}`,
        `biblioteca de ${keyword}`,
        `materiais de ${keyword}`
      ],
      statistic: [
        `estatísticas de ${keyword}`,
        `dados sobre ${keyword}`,
        `pesquisa de ${keyword}`,
        `números do ${keyword}`
      ],
      study: [
        `estudo sobre ${keyword}`,
        `pesquisa de ${keyword}`,
        `análise de ${keyword}`,
        `caso de ${keyword}`
      ],
      tool: [
        `ferramentas de ${keyword}`,
        `software de ${keyword}`,
        `plataformas de ${keyword}`,
        `soluções de ${keyword}`
      ],
      guide: [
        `como fazer ${keyword}`,
        `tutorial de ${keyword}`,
        `guia de ${keyword}`,
        `manual de ${keyword}`
      ]
    };

    const options = templates[linkType] || [`mais sobre ${keyword}`];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Gerar slug de URL
   */
  generateUrlSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Verificar disponibilidade de links
   */
  async verifyLinkAvailability(links) {
    const verifiedLinks = [];
    
    for (const link of links) {
      try {
        // Em produção, fazer verificação HTTP real
        // const response = await axios.head(link.url, { timeout: 5000 });
        // const isAvailable = response.status === 200;
        
        // Simular verificação (90% dos links estão disponíveis)
        const isAvailable = Math.random() > 0.1;
        
        if (isAvailable) {
          verifiedLinks.push({
            ...link,
            verified: true,
            lastChecked: new Date().toISOString()
          });
        }
      } catch (error) {
        // Link não disponível
        console.log(`Link não disponível: ${link.url}`);
      }
    }
    
    return verifiedLinks;
  }

  /**
   * Buscar links por categoria específica
   */
  async findLinksByCategory(keyword, category, limit = 10) {
    try {
      const categoryMap = {
        statistics: 'statistic',
        studies: 'study',
        tools: 'tool',
        guides: 'guide',
        resources: 'resource'
      };
      
      const linkType = categoryMap[category] || 'resource';
      const allLinks = await this.findAuthorityLinks(keyword, 'general', limit * 2);
      
      return allLinks
        .filter(link => link.linkType === linkType)
        .slice(0, limit);
        
    } catch (error) {
      console.error(`Erro ao buscar links da categoria ${category}:`, error);
      return [];
    }
  }

  /**
   * Analisar qualidade dos links
   */
  analyzeLinksQuality(links) {
    const analysis = {
      totalLinks: links.length,
      highAuthority: links.filter(l => l.domainAuthority >= 80).length,
      mediumAuthority: links.filter(l => l.domainAuthority >= 60 && l.domainAuthority < 80).length,
      lowAuthority: links.filter(l => l.domainAuthority < 60).length,
      highRelevance: links.filter(l => l.relevanceScore >= 80).length,
      averageAuthority: links.reduce((sum, l) => sum + l.domainAuthority, 0) / links.length,
      averageRelevance: links.reduce((sum, l) => sum + l.relevanceScore, 0) / links.length,
      typeDistribution: {}
    };

    // Distribuição por tipo
    links.forEach(link => {
      analysis.typeDistribution[link.linkType] = 
        (analysis.typeDistribution[link.linkType] || 0) + 1;
    });

    return analysis;
  }

  /**
   * Gerar relatório de recomendações
   */
  generateLinkRecommendations(links, targetKeyword) {
    const analysis = this.analyzeLinksQuality(links);
    const recommendations = [];

    if (analysis.highAuthority < 3) {
      recommendations.push({
        type: 'authority',
        priority: 'high',
        message: 'Inclua mais links de alta autoridade (DA 80+) para aumentar a credibilidade',
        suggestion: 'Procure por estudos acadêmicos, sites governamentais ou publicações renomadas'
      });
    }

    if (analysis.highRelevance < links.length * 0.6) {
      recommendations.push({
        type: 'relevance',
        priority: 'medium',
        message: 'Melhore a relevância dos links escolhidos',
        suggestion: 'Selecione links que mencionem diretamente sua palavra-chave principal'
      });
    }

    if (!analysis.typeDistribution.statistic) {
      recommendations.push({
        type: 'diversity',
        priority: 'medium',
        message: 'Adicione links com estatísticas para aumentar a credibilidade',
        suggestion: 'Inclua dados e pesquisas que suportem seus argumentos'
      });
    }

    return {
      analysis,
      recommendations,
      bestPractices: [
        'Use 2-4 links externos por 1000 palavras',
        'Varie os tipos de links (estudos, estatísticas, recursos)',
        'Prefira links de alta autoridade (DA 70+)',
        'Use texto âncora natural e contextualmente relevante',
        'Verifique regularmente se os links ainda funcionam'
      ]
    };
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

module.exports = new ExternalLinksService();
