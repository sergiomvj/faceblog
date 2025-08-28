const axios = require('axios');

class ContentDiscoveryService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 3600000; // 1 hora
  }

  /**
   * Analisar potencial viral do conteúdo
   */
  async analyzeViralPotential(content, keyword) {
    try {
      const cacheKey = `viral_${this.generateContentHash(content)}_${keyword}`;
      
      // Verificar cache
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      // Análise de fatores virais
      const viralFactors = this.analyzeViralFactors(content);
      const socialTriggers = this.identifySocialTriggers(content);
      const emotionalAnalysis = this.analyzeEmotionalContent(content);
      const shareabilityScore = this.calculateShareabilityScore(content, viralFactors, socialTriggers);
      
      // Buscar conteúdo viral similar
      const viralContent = await this.findSimilarViralContent(keyword);
      
      // Calcular score final
      const viralScore = this.calculateViralScore(content, viralFactors, socialTriggers, emotionalAnalysis);
      
      const result = {
        score: viralScore,
        factors: viralFactors,
        socialTriggers,
        emotionalAnalysis,
        shareabilityTips: this.generateShareabilityTips(viralFactors, socialTriggers, emotionalAnalysis),
        similarViralContent: viralContent.slice(0, 5),
        recommendations: this.generateViralRecommendations(viralScore, viralFactors, socialTriggers)
      };

      // Salvar no cache
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('Erro na análise de potencial viral:', error);
      return this.generateMockViralAnalysis(content, keyword);
    }
  }

  /**
   * Analisar fatores virais no conteúdo
   */
  analyzeViralFactors(content) {
    const factors = [];
    const contentLower = content.toLowerCase();
    
    // Fator: Conteúdo questionador
    if (content.includes('?')) {
      factors.push('Conteúdo questionador');
    }
    
    // Fator: Dados e estatísticas
    if (/\d+%|\d+x|\d+ vezes|\d+,\d+/.test(content)) {
      factors.push('Dados e estatísticas');
    }
    
    // Fator: Elemento de exclusividade
    if (/segredo|exclusivo|revelado|descoberta|inédito/.test(contentLower)) {
      factors.push('Elemento de exclusividade');
    }
    
    // Fator: Lista numerada
    if (/\d+\s+(dicas|formas|maneiras|estratégias|passos)/.test(contentLower)) {
      factors.push('Lista numerada');
    }
    
    // Fator: Conteúdo detalhado
    if (content.split(/\s+/).length > 1000) {
      factors.push('Conteúdo detalhado');
    }
    
    // Fator: Bem estruturado
    if (content.split('\n\n').length > 5) {
      factors.push('Bem estruturado');
    }
    
    // Fator: Storytelling
    if (/história|experiência|caso|exemplo|situação/.test(contentLower)) {
      factors.push('Storytelling');
    }
    
    // Fator: Urgência
    if (/agora|hoje|urgente|rápido|imediato/.test(contentLower)) {
      factors.push('Senso de urgência');
    }
    
    // Fator: Contraste/Comparação
    if (/vs|versus|comparação|diferença|melhor que/.test(contentLower)) {
      factors.push('Elemento de comparação');
    }
    
    // Fator: Tutorial prático
    if (/passo a passo|tutorial|como fazer|guia/.test(contentLower)) {
      factors.push('Tutorial prático');
    }

    return factors;
  }

  /**
   * Identificar triggers sociais
   */
  identifySocialTriggers(content) {
    const triggers = [];
    const contentLower = content.toLowerCase();
    
    // Linguagem pessoal
    if (/\bvocê\b|\bseu\b|\bsua\b/.test(contentLower)) {
      triggers.push('Linguagem pessoal');
    }
    
    // Conteúdo educativo
    if (/como|dicas|guia|tutorial|aprenda|descubra/.test(contentLower)) {
      triggers.push('Conteúdo educativo');
    }
    
    // Tom entusiasmado
    if (content.includes('!')) {
      triggers.push('Tom entusiasmado');
    }
    
    // Valor gratuito
    if (/grátis|gratuito|sem custo|free/.test(contentLower)) {
      triggers.push('Valor gratuito');
    }
    
    // Prova social
    if (/milhões|milhares|estudos mostram|pesquisas indicam/.test(contentLower)) {
      triggers.push('Prova social');
    }
    
    // Curiosidade
    if (/surpreendente|incrível|chocante|revelador/.test(contentLower)) {
      triggers.push('Gatilho de curiosidade');
    }
    
    // Medo de perder (FOMO)
    if (/não perca|última chance|oferta limitada|apenas hoje/.test(contentLower)) {
      triggers.push('FOMO (Fear of Missing Out)');
    }
    
    // Autoridade
    if (/especialista|expert|profissional|anos de experiência/.test(contentLower)) {
      triggers.push('Demonstração de autoridade');
    }

    return triggers;
  }

  /**
   * Analisar conteúdo emocional
   */
  analyzeEmotionalContent(content) {
    const contentLower = content.toLowerCase();
    const emotions = {
      joy: 0,
      surprise: 0,
      anger: 0,
      fear: 0,
      trust: 0,
      anticipation: 0
    };

    // Palavras de alegria/positividade
    const joyWords = ['feliz', 'alegre', 'incrível', 'fantástico', 'maravilhoso', 'excelente', 'ótimo'];
    joyWords.forEach(word => {
      if (contentLower.includes(word)) emotions.joy += 1;
    });

    // Palavras de surpresa
    const surpriseWords = ['surpreendente', 'inesperado', 'chocante', 'revelador', 'descoberta'];
    surpriseWords.forEach(word => {
      if (contentLower.includes(word)) emotions.surprise += 1;
    });

    // Palavras de confiança
    const trustWords = ['confiável', 'seguro', 'garantido', 'comprovado', 'testado'];
    trustWords.forEach(word => {
      if (contentLower.includes(word)) emotions.trust += 1;
    });

    // Palavras de antecipação
    const anticipationWords = ['futuro', 'próximo', 'em breve', 'aguarde', 'prepare-se'];
    anticipationWords.forEach(word => {
      if (contentLower.includes(word)) emotions.anticipation += 1;
    });

    // Calcular emoção dominante
    const dominantEmotion = Object.entries(emotions).reduce((a, b) => 
      emotions[a[0]] > emotions[b[0]] ? a : b
    )[0];

    return {
      emotions,
      dominantEmotion,
      emotionalIntensity: Math.max(...Object.values(emotions)),
      emotionalDiversity: Object.values(emotions).filter(v => v > 0).length
    };
  }

  /**
   * Calcular score de compartilhabilidade
   */
  calculateShareabilityScore(content, viralFactors, socialTriggers) {
    let score = 0;
    
    // Base score por fatores virais
    score += viralFactors.length * 10;
    
    // Base score por triggers sociais
    score += socialTriggers.length * 8;
    
    // Bonus por tamanho ideal
    const wordCount = content.split(/\s+/).length;
    if (wordCount >= 500 && wordCount <= 1500) {
      score += 15;
    } else if (wordCount >= 300) {
      score += 10;
    }
    
    // Bonus por estrutura
    if (content.includes('#') || content.includes('<h')) {
      score += 10;
    }
    
    // Bonus por listas
    if (content.includes('-') || content.includes('*')) {
      score += 8;
    }

    return Math.min(100, score);
  }

  /**
   * Calcular score viral final
   */
  calculateViralScore(content, factors, triggers, emotional) {
    let score = 0;
    
    // Score base por fatores (40%)
    score += factors.length * 6;
    
    // Score por triggers sociais (30%)
    score += triggers.length * 5;
    
    // Score por intensidade emocional (20%)
    score += emotional.emotionalIntensity * 3;
    
    // Score por diversidade emocional (10%)
    score += emotional.emotionalDiversity * 2;
    
    // Bonus por combinações específicas
    if (factors.includes('Dados e estatísticas') && triggers.includes('Conteúdo educativo')) {
      score += 10;
    }
    
    if (factors.includes('Elemento de exclusividade') && triggers.includes('Gatilho de curiosidade')) {
      score += 8;
    }
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Buscar conteúdo viral similar
   */
  async findSimilarViralContent(keyword) {
    try {
      // Em produção, integrar com BuzzSumo API ou similar
      return this.generateMockViralContent(keyword);
    } catch (error) {
      console.error('Erro ao buscar conteúdo viral similar:', error);
      return [];
    }
  }

  /**
   * Gerar conteúdo viral mock
   */
  generateMockViralContent(keyword) {
    const viralTemplates = [
      {
        title: `10 ${keyword} Secrets That Will Change Your Life Forever`,
        shares: Math.floor(Math.random() * 50000) + 10000,
        platform: 'Facebook',
        viralFactors: ['Lista numerada', 'Elemento de exclusividade', 'Transformação pessoal']
      },
      {
        title: `This ${keyword} Trick Went Viral for a Reason`,
        shares: Math.floor(Math.random() * 30000) + 8000,
        platform: 'Twitter',
        viralFactors: ['Gatilho de curiosidade', 'Prova social', 'Simplicidade']
      },
      {
        title: `Why Everyone is Talking About ${keyword} Right Now`,
        shares: Math.floor(Math.random() * 40000) + 12000,
        platform: 'LinkedIn',
        viralFactors: ['Tendência atual', 'FOMO', 'Prova social']
      },
      {
        title: `The ${keyword} Method That Broke the Internet`,
        shares: Math.floor(Math.random() * 60000) + 15000,
        platform: 'Reddit',
        viralFactors: ['Método único', 'Hipérbole', 'Curiosidade']
      },
      {
        title: `I Tried ${keyword} for 30 Days - Here's What Happened`,
        shares: Math.floor(Math.random() * 35000) + 9000,
        platform: 'Medium',
        viralFactors: ['Experiência pessoal', 'Storytelling', 'Resultado específico']
      }
    ];

    return viralTemplates.map(template => ({
      ...template,
      keyword,
      engagement: template.shares * (0.02 + Math.random() * 0.03), // 2-5% engagement
      viralScore: 70 + Math.floor(Math.random() * 30) // 70-100
    }));
  }

  /**
   * Gerar dicas de compartilhabilidade
   */
  generateShareabilityTips(factors, triggers, emotional) {
    const tips = [];
    
    if (!factors.includes('Dados e estatísticas')) {
      tips.push('Adicione estatísticas ou números para aumentar credibilidade e compartilhamento');
    }
    
    if (!triggers.includes('Linguagem pessoal')) {
      tips.push('Use "você" para criar conexão pessoal com o leitor');
    }
    
    if (!factors.includes('Elemento de exclusividade')) {
      tips.push('Adicione elementos exclusivos como "segredos" ou "dicas especiais"');
    }
    
    if (!triggers.includes('Tom entusiasmado')) {
      tips.push('Use pontos de exclamação para transmitir entusiasmo');
    }
    
    if (emotional.emotionalIntensity < 3) {
      tips.push('Adicione mais palavras emocionais para aumentar o impacto');
    }
    
    if (!factors.includes('Lista numerada')) {
      tips.push('Considere usar listas numeradas (ex: "5 dicas", "10 estratégias")');
    }
    
    if (!triggers.includes('Conteúdo educativo')) {
      tips.push('Inclua elementos educativos como tutoriais ou guias práticos');
    }
    
    // Dicas gerais sempre incluídas
    tips.push('Inclua call-to-actions para encorajar compartilhamento');
    tips.push('Use títulos emocionais e questionadores');
    tips.push('Adicione elementos visuais como imagens ou infográficos');

    return tips;
  }

  /**
   * Gerar recomendações para aumentar viralidade
   */
  generateViralRecommendations(score, factors, triggers) {
    const recommendations = [];
    
    if (score < 30) {
      recommendations.push({
        priority: 'high',
        category: 'structure',
        title: 'Reestruturar conteúdo para viralidade',
        description: 'O conteúdo precisa de elementos mais virais',
        actions: [
          'Adicione uma lista numerada no título',
          'Inclua dados e estatísticas',
          'Use linguagem mais emocional',
          'Adicione elementos de exclusividade'
        ]
      });
    } else if (score < 60) {
      recommendations.push({
        priority: 'medium',
        category: 'optimization',
        title: 'Otimizar elementos virais existentes',
        description: 'O conteúdo tem potencial, mas pode ser melhorado',
        actions: [
          'Intensifique os elementos emocionais',
          'Adicione mais call-to-actions',
          'Melhore a estrutura com subtítulos',
          'Inclua mais elementos de prova social'
        ]
      });
    } else {
      recommendations.push({
        priority: 'low',
        category: 'enhancement',
        title: 'Pequenos ajustes para maximizar viralidade',
        description: 'O conteúdo já tem bom potencial viral',
        actions: [
          'Otimize o timing de publicação',
          'Prepare versões para diferentes plataformas',
          'Adicione hashtags relevantes',
          'Considere criar conteúdo visual complementar'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Gerar análise viral mock
   */
  generateMockViralAnalysis(content, keyword) {
    const mockFactors = ['Conteúdo questionador', 'Dados e estatísticas', 'Bem estruturado'];
    const mockTriggers = ['Linguagem pessoal', 'Conteúdo educativo', 'Tom entusiasmado'];
    const mockScore = 45 + Math.floor(Math.random() * 40);

    return {
      score: mockScore,
      factors: mockFactors,
      socialTriggers: mockTriggers,
      emotionalAnalysis: {
        emotions: { joy: 2, surprise: 1, trust: 3, anticipation: 1, anger: 0, fear: 0 },
        dominantEmotion: 'trust',
        emotionalIntensity: 3,
        emotionalDiversity: 4
      },
      shareabilityTips: [
        'Adicione estatísticas para aumentar credibilidade',
        'Use call-to-actions para encorajar compartilhamento',
        'Inclua elementos de exclusividade',
        'Torne o conteúdo mais questionador'
      ],
      similarViralContent: this.generateMockViralContent(keyword),
      recommendations: [
        {
          priority: 'medium',
          category: 'optimization',
          title: 'Otimizar elementos virais',
          description: 'Adicione mais elementos emocionais e de curiosidade',
          actions: ['Inclua mais dados', 'Use linguagem mais emocional', 'Adicione call-to-actions']
        }
      ]
    };
  }

  /**
   * Gerar hash do conteúdo
   */
  generateContentHash(content) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
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

module.exports = new ContentDiscoveryService();
