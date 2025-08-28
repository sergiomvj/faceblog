const axios = require('axios');
const { supabase } = require('../../config/supabase');

class SEOIntelligenceService {
  constructor() {
    this.trendsService = require('./trends-api');
    this.externalLinksService = require('./external-links');
    this.contentDiscoveryService = require('./content-discovery');
    this.competitorAnalysisService = require('./competitor-analysis');
  }

  /**
   * Análise completa de SEO para um conteúdo
   */
  async analyzeContent(content, targetKeyword, niche = 'general', geo = 'BR') {
    try {
      console.log(`Iniciando análise SEO para: ${targetKeyword}`);

      // 1. Análise de palavras-chave
      const keywordAnalysis = await this.analyzeKeywords(content, targetKeyword);
      
      // 2. Análise de tendências
      const trendingData = await this.trendsService.getTrendingData(targetKeyword, niche, geo);
      
      // 3. Análise de concorrentes
      const competitorData = await this.competitorAnalysisService.analyzeCompetitors(targetKeyword, niche);
      
      // 4. Sugestões de links externos
      const externalLinks = await this.externalLinksService.findAuthorityLinks(targetKeyword, niche);
      
      // 5. Análise de conteúdo viral
      const viralAnalysis = await this.contentDiscoveryService.analyzeViralPotential(content, targetKeyword);
      
      // 6. Score SEO geral
      const seoScore = this.calculateSEOScore(content, keywordAnalysis, competitorData);
      
      // 7. Recomendações personalizadas
      const recommendations = this.generateRecommendations(content, keywordAnalysis, competitorData, seoScore);

      const result = {
        content,
        targetKeyword,
        keywords: keywordAnalysis,
        competitors: competitorData,
        externalLinks,
        trending: trendingData,
        score: seoScore,
        recommendations,
        viralPotential: viralAnalysis,
        timestamp: Date.now()
      };

      // Salvar análise no banco (opcional)
      await this.saveAnalysis(result);

      return result;

    } catch (error) {
      console.error('Erro na análise SEO:', error);
      throw new Error(`Falha na análise SEO: ${error.message}`);
    }
  }

  /**
   * Análise de palavras-chave no conteúdo
   */
  async analyzeKeywords(content, targetKeyword) {
    try {
      // Extrair palavras-chave do conteúdo
      const extractedKeywords = this.extractKeywordsFromContent(content);
      
      // Analisar densidade da palavra-chave principal
      const targetKeywordDensity = this.calculateKeywordDensity(content, targetKeyword);
      
      // Buscar dados de volume e competição (simulado - em produção usar Google Keyword Planner)
      const keywordData = await this.getKeywordMetrics([targetKeyword, ...extractedKeywords.slice(0, 10)]);
      
      return keywordData;

    } catch (error) {
      console.error('Erro na análise de palavras-chave:', error);
      return [];
    }
  }

  /**
   * Calcular score SEO geral
   */
  calculateSEOScore(content, keywords, competitors) {
    try {
      // Análise de densidade de palavras-chave (30%)
      const keywordScore = this.analyzeKeywordDensity(content, keywords);
      
      // Análise de estrutura do conteúdo (25%)
      const contentScore = this.analyzeContentStructure(content);
      
      // Análise técnica básica (20%)
      const technicalScore = this.analyzeTechnicalFactors(content);
      
      // Score de backlinks potenciais (15%)
      const backlinkScore = this.analyzeBacklinkPotential(keywords, competitors);
      
      // Score social (10%)
      const socialScore = this.analyzeSocialFactors(content);

      const overall = Math.round(
        keywordScore * 0.3 + 
        contentScore * 0.25 + 
        technicalScore * 0.2 + 
        backlinkScore * 0.15 + 
        socialScore * 0.1
      );

      const suggestions = this.generateSEOSuggestions(
        keywordScore, contentScore, technicalScore, backlinkScore, socialScore
      );

      return {
        overall,
        keyword: keywordScore,
        content: contentScore,
        technical: technicalScore,
        backlinks: backlinkScore,
        social: socialScore,
        suggestions
      };

    } catch (error) {
      console.error('Erro no cálculo do score SEO:', error);
      return {
        overall: 50,
        keyword: 50,
        content: 50,
        technical: 50,
        backlinks: 50,
        social: 50,
        suggestions: []
      };
    }
  }

  /**
   * Extrair palavras-chave do conteúdo
   */
  extractKeywordsFromContent(content) {
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([word]) => word);
  }

  /**
   * Calcular densidade de palavra-chave
   */
  calculateKeywordDensity(content, keyword) {
    const contentLower = content.toLowerCase();
    const keywordLower = keyword.toLowerCase();
    const totalWords = content.split(/\s+/).length;
    
    const occurrences = (contentLower.match(new RegExp(keywordLower, 'g')) || []).length;
    const density = (occurrences / totalWords) * 100;
    
    return {
      keyword,
      occurrences,
      density: density.toFixed(2),
      totalWords
    };
  }

  /**
   * Análise de densidade de palavras-chave (score)
   */
  analyzeKeywordDensity(content, keywords) {
    if (!keywords.length) return 0;
    
    const contentLower = content.toLowerCase();
    const totalWords = content.split(/\s+/).length;
    let score = 0;

    keywords.forEach(kw => {
      const keywordText = typeof kw === 'string' ? kw : kw.keyword;
      const occurrences = (contentLower.match(new RegExp(keywordText.toLowerCase(), 'g')) || []).length;
      const density = (occurrences / totalWords) * 100;
      
      // Densidade ideal: 1-3%
      if (density >= 1 && density <= 3) {
        score += 20;
      } else if (density > 0) {
        score += 10;
      }
    });

    return Math.min(100, score);
  }

  /**
   * Análise de estrutura do conteúdo
   */
  analyzeContentStructure(content) {
    let score = 0;
    
    // Verifica headings
    if (content.includes('#') || content.includes('<h')) score += 25;
    
    // Verifica listas
    if (content.includes('-') || content.includes('*') || content.includes('<li>')) score += 20;
    
    // Verifica tamanho adequado
    const wordCount = content.split(/\s+/).length;
    if (wordCount >= 300 && wordCount <= 2000) score += 25;
    else if (wordCount > 100) score += 15;
    
    // Verifica parágrafos
    const paragraphs = content.split('\n\n').length;
    if (paragraphs >= 3) score += 20;
    
    // Verifica primeira frase
    const firstSentence = content.split('.')[0];
    if (firstSentence && firstSentence.length > 20) score += 10;

    return Math.min(100, score);
  }

  /**
   * Análise de fatores técnicos
   */
  analyzeTechnicalFactors(content) {
    let score = 50; // Base score
    
    // Verifica meta description simulada
    if (content.length > 150) score += 20;
    
    // Verifica readability básica
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((acc, sentence) => {
      return acc + sentence.split(' ').length;
    }, 0) / sentences.length;
    
    if (avgSentenceLength < 20) score += 15;
    else if (avgSentenceLength < 30) score += 10;
    
    // Verifica uso de palavras de transição
    const transitionWords = ['portanto', 'além disso', 'por exemplo', 'consequentemente', 'entretanto'];
    const hasTransitions = transitionWords.some(word => content.toLowerCase().includes(word));
    if (hasTransitions) score += 15;

    return Math.min(100, score);
  }

  /**
   * Análise de potencial de backlinks
   */
  analyzeBacklinkPotential(keywords, competitors) {
    // Score baseado na competitividade e autoridade dos concorrentes
    let avgCompetition = 50;
    
    if (keywords && keywords.length > 0) {
      avgCompetition = keywords.reduce((acc, kw) => {
        const competition = typeof kw === 'object' ? kw.competition : 'medium';
        const competitionScore = competition === 'low' ? 80 : competition === 'medium' ? 50 : 20;
        return acc + competitionScore;
      }, 0) / keywords.length;
    }

    return Math.round(avgCompetition);
  }

  /**
   * Análise de fatores sociais
   */
  analyzeSocialFactors(content) {
    let score = 0;
    
    // Verifica elementos emocionais
    const emotionalWords = ['incrível', 'surpreendente', 'revolucionário', 'exclusivo', 'segredo'];
    const hasEmotional = emotionalWords.some(word => content.toLowerCase().includes(word));
    if (hasEmotional) score += 30;
    
    // Verifica call-to-action
    const ctaWords = ['compartilhe', 'comente', 'curta', 'siga'];
    const hasCTA = ctaWords.some(word => content.toLowerCase().includes(word));
    if (hasCTA) score += 25;
    
    // Verifica perguntas
    if (content.includes('?')) score += 20;
    
    // Verifica números/estatísticas
    if (/\d+%|\d+x|\d+ vezes/.test(content)) score += 25;

    return Math.min(100, score);
  }

  /**
   * Gerar recomendações personalizadas
   */
  generateRecommendations(content, keywords, competitors, score) {
    const recommendations = [];

    // Recomendações de palavras-chave
    if (score.keyword < 70) {
      recommendations.push({
        type: 'keyword',
        priority: 'high',
        title: 'Otimizar densidade de palavras-chave',
        description: 'A densidade das palavras-chave principais está abaixo do ideal',
        implementation: 'Inclua a palavra-chave principal 2-3 vezes no primeiro parágrafo e distribua naturalmente pelo texto'
      });
    }

    // Recomendações de conteúdo
    if (score.content < 60) {
      recommendations.push({
        type: 'content',
        priority: 'high',
        title: 'Melhorar estrutura do conteúdo',
        description: 'O conteúdo precisa de melhor organização e headings',
        implementation: 'Use H2 e H3 para organizar o conteúdo, adicione listas e parágrafos curtos'
      });
    }

    // Recomendações técnicas
    if (score.technical < 70) {
      recommendations.push({
        type: 'structure',
        priority: 'medium',
        title: 'Melhorar aspectos técnicos',
        description: 'Legibilidade e estrutura técnica podem ser otimizadas',
        implementation: 'Use frases mais curtas, adicione palavras de transição e melhore a formatação'
      });
    }

    // Recomendações sociais
    if (score.social < 50) {
      recommendations.push({
        type: 'content',
        priority: 'low',
        title: 'Aumentar potencial de compartilhamento',
        description: 'O conteúdo pode ser mais envolvente para redes sociais',
        implementation: 'Adicione elementos emocionais, call-to-actions e torne o conteúdo mais questionador'
      });
    }

    return recommendations;
  }

  /**
   * Gerar sugestões específicas de SEO
   */
  generateSEOSuggestions(keywordScore, contentScore, technicalScore, backlinkScore, socialScore) {
    const suggestions = [];

    if (keywordScore < 70) {
      suggestions.push({
        category: 'Keywords',
        issue: 'Baixa densidade de palavras-chave',
        impact: 'high',
        solution: 'Inclua palavras-chave naturalmente no título, primeiro parágrafo e ao longo do texto'
      });
    }

    if (contentScore < 60) {
      suggestions.push({
        category: 'Content',
        issue: 'Estrutura de conteúdo pode ser melhorada',
        impact: 'high',
        solution: 'Use headings (H2, H3), listas, parágrafos curtos e organize melhor o conteúdo'
      });
    }

    if (technicalScore < 70) {
      suggestions.push({
        category: 'Technical',
        issue: 'Aspectos técnicos precisam de atenção',
        impact: 'medium',
        solution: 'Melhore a legibilidade, use palavras de transição e otimize meta descriptions'
      });
    }

    if (socialScore < 50) {
      suggestions.push({
        category: 'Social',
        issue: 'Baixo potencial de compartilhamento',
        impact: 'medium',
        solution: 'Adicione elementos emocionais, call-to-actions e torne o conteúdo mais envolvente'
      });
    }

    return suggestions;
  }

  /**
   * Buscar métricas de palavras-chave (simulado)
   */
  async getKeywordMetrics(keywords) {
    // Em produção, integrar com Google Keyword Planner API
    return keywords.map(keyword => ({
      keyword,
      searchVolume: Math.floor(Math.random() * 10000) + 500,
      competition: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      cpc: Math.random() * 3 + 0.5,
      difficulty: Math.floor(Math.random() * 60) + 20,
      trend: ['rising', 'stable', 'declining'][Math.floor(Math.random() * 3)],
      relatedKeywords: this.generateRelatedKeywords(keyword),
      longTailSuggestions: this.generateLongTailSuggestions(keyword),
      intent: this.determineIntent(keyword)
    }));
  }

  /**
   * Gerar palavras-chave relacionadas
   */
  generateRelatedKeywords(keyword) {
    const variations = [
      `${keyword} tutorial`,
      `como ${keyword}`,
      `${keyword} grátis`,
      `melhor ${keyword}`,
      `${keyword} 2024`
    ];
    return variations;
  }

  /**
   * Gerar sugestões long-tail
   */
  generateLongTailSuggestions(keyword) {
    const prefixes = ['como', 'melhor', 'o que é', 'por que', 'quando usar'];
    const suffixes = ['grátis', '2024', 'online', 'tutorial', 'guia', 'dicas'];
    
    const suggestions = [];
    
    prefixes.forEach(prefix => {
      suggestions.push(`${prefix} ${keyword}`);
    });
    
    suffixes.forEach(suffix => {
      suggestions.push(`${keyword} ${suffix}`);
    });
    
    return suggestions.slice(0, 8);
  }

  /**
   * Determinar intenção da palavra-chave
   */
  determineIntent(keyword) {
    const keywordLower = keyword.toLowerCase();
    
    if (/comprar|preço|custo|valor|orçamento|contratar/.test(keywordLower)) {
      return 'transactional';
    }
    
    if (/melhor|comparar|vs|review|avaliação|recomendação/.test(keywordLower)) {
      return 'commercial';
    }
    
    if (/login|site|oficial|empresa|contato/.test(keywordLower)) {
      return 'navigational';
    }
    
    return 'informational';
  }

  /**
   * Salvar análise no banco de dados
   */
  async saveAnalysis(analysisResult) {
    try {
      const { data, error } = await supabase
        .from('seo_analyses')
        .insert([{
          target_keyword: analysisResult.targetKeyword,
          content_hash: this.generateContentHash(analysisResult.content),
          overall_score: analysisResult.score.overall,
          keyword_score: analysisResult.score.keyword,
          content_score: analysisResult.score.content,
          technical_score: analysisResult.score.technical,
          backlinks_score: analysisResult.score.backlinks,
          social_score: analysisResult.score.social,
          recommendations_count: analysisResult.recommendations.length,
          viral_potential_score: analysisResult.viralPotential.score,
          analysis_data: analysisResult,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Erro ao salvar análise:', error);
      }

      return data;
    } catch (error) {
      console.error('Erro ao salvar análise no banco:', error);
    }
  }

  /**
   * Gerar hash do conteúdo
   */
  generateContentHash(content) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }
}

module.exports = new SEOIntelligenceService();
