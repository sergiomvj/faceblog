const natural = require('natural');
const stopwords = require('stopwords-iso');

/**
 * SEO Intelligence Service
 * Análise inteligente de conteúdo para otimização SEO
 */
class SEOIntelligenceService {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    this.tfidf = new natural.TfIdf();
  }

  /**
   * Identifica o assunto principal do artigo
   * @param {string} title - Título do artigo
   * @param {string} content - Conteúdo do artigo
   * @param {string} category - Categoria do artigo
   * @returns {Object} Análise do assunto principal
   */
  async identifyMainTopic(title, content, category = null) {
    try {
      // Combinar título e conteúdo para análise
      const fullText = `${title} ${content}`;
      
      // Tokenizar e limpar texto
      const tokens = this.tokenizer.tokenize(fullText.toLowerCase());
      const cleanTokens = this.removeStopwords(tokens);
      
      // Análise de frequência de termos
      const termFrequency = this.calculateTermFrequency(cleanTokens);
      
      // Extrair temas principais
      const mainThemes = this.extractMainThemes(cleanTokens, termFrequency);
      
      // Classificar nicho
      const niche = this.classifyNiche(title, content, category);
      
      // Extrair contexto semântico
      const semanticContext = this.extractSemanticContext(title, content);
      
      return {
        mainTopic: mainThemes[0]?.term || 'general',
        themes: mainThemes.slice(0, 5),
        niche: niche,
        semanticContext: semanticContext,
        keywords: this.extractKeywords(cleanTokens, termFrequency),
        readabilityScore: this.calculateReadability(content),
        wordCount: cleanTokens.length,
        confidence: this.calculateConfidence(mainThemes, niche)
      };
    } catch (error) {
      console.error('Erro na identificação do assunto principal:', error);
      return {
        mainTopic: 'general',
        themes: [],
        niche: 'general',
        semanticContext: {},
        keywords: [],
        readabilityScore: 0,
        wordCount: 0,
        confidence: 0
      };
    }
  }

  /**
   * Remove stopwords do texto
   */
  removeStopwords(tokens) {
    const portugueseStopwords = stopwords.pt;
    const englishStopwords = stopwords.en;
    const allStopwords = [...portugueseStopwords, ...englishStopwords];
    
    return tokens.filter(token => 
      token.length > 2 && 
      !allStopwords.includes(token) &&
      /^[a-záàâãéêíóôõúç]+$/i.test(token)
    );
  }

  /**
   * Calcula frequência de termos
   */
  calculateTermFrequency(tokens) {
    const frequency = {};
    tokens.forEach(token => {
      const stem = this.stemmer.stem(token);
      frequency[stem] = (frequency[stem] || 0) + 1;
    });
    return frequency;
  }

  /**
   * Extrai temas principais baseado em frequência e relevância
   */
  extractMainThemes(tokens, termFrequency) {
    const themes = Object.entries(termFrequency)
      .map(([term, freq]) => ({
        term,
        frequency: freq,
        relevance: this.calculateRelevance(term, freq, tokens.length)
      }))
      .sort((a, b) => b.relevance - a.relevance);
    
    return themes.slice(0, 10);
  }

  /**
   * Classifica o nicho do conteúdo
   */
  classifyNiche(title, content, category) {
    const text = `${title} ${content}`.toLowerCase();
    
    const niches = {
      'technology': ['tecnologia', 'software', 'programação', 'desenvolvimento', 'code', 'javascript', 'react', 'node', 'api'],
      'business': ['negócios', 'empresa', 'marketing', 'vendas', 'empreendedorismo', 'startup', 'business'],
      'health': ['saúde', 'medicina', 'fitness', 'exercício', 'dieta', 'bem-estar', 'health'],
      'education': ['educação', 'ensino', 'aprendizado', 'curso', 'tutorial', 'education', 'learning'],
      'lifestyle': ['estilo', 'vida', 'lifestyle', 'viagem', 'culinária', 'moda', 'decoração'],
      'finance': ['finanças', 'dinheiro', 'investimento', 'economia', 'finance', 'money'],
      'entertainment': ['entretenimento', 'filme', 'música', 'jogo', 'entertainment', 'game']
    };

    let bestMatch = 'general';
    let maxScore = 0;

    Object.entries(niches).forEach(([niche, keywords]) => {
      const score = keywords.reduce((acc, keyword) => {
        return acc + (text.includes(keyword) ? 1 : 0);
      }, 0);
      
      if (score > maxScore) {
        maxScore = score;
        bestMatch = niche;
      }
    });

    return category || bestMatch;
  }

  /**
   * Extrai contexto semântico
   */
  extractSemanticContext(title, content) {
    const context = {
      intent: this.detectIntent(title, content),
      tone: this.detectTone(content),
      targetAudience: this.detectTargetAudience(title, content),
      contentType: this.detectContentType(title, content)
    };

    return context;
  }

  /**
   * Detecta intenção do conteúdo
   */
  detectIntent(title, content) {
    const text = `${title} ${content}`.toLowerCase();
    
    if (text.includes('como') || text.includes('tutorial') || text.includes('guia')) {
      return 'tutorial';
    } else if (text.includes('review') || text.includes('análise') || text.includes('comparação')) {
      return 'review';
    } else if (text.includes('notícia') || text.includes('novo') || text.includes('lançamento')) {
      return 'news';
    } else if (text.includes('opinião') || text.includes('acho') || text.includes('acredito')) {
      return 'opinion';
    }
    
    return 'informational';
  }

  /**
   * Detecta tom do conteúdo
   */
  detectTone(content) {
    const text = content.toLowerCase();
    
    if (text.includes('!') || text.includes('incrível') || text.includes('fantástico')) {
      return 'enthusiastic';
    } else if (text.includes('problema') || text.includes('erro') || text.includes('falha')) {
      return 'problem-solving';
    } else if (text.includes('profissional') || text.includes('empresa') || text.includes('negócio')) {
      return 'professional';
    }
    
    return 'neutral';
  }

  /**
   * Detecta público-alvo
   */
  detectTargetAudience(title, content) {
    const text = `${title} ${content}`.toLowerCase();
    
    if (text.includes('iniciante') || text.includes('começar') || text.includes('básico')) {
      return 'beginner';
    } else if (text.includes('avançado') || text.includes('expert') || text.includes('profissional')) {
      return 'advanced';
    } else if (text.includes('desenvolvedor') || text.includes('programador')) {
      return 'developer';
    }
    
    return 'general';
  }

  /**
   * Detecta tipo de conteúdo
   */
  detectContentType(title, content) {
    const title_lower = title.toLowerCase();
    
    if (title_lower.includes('lista') || title_lower.includes('top')) {
      return 'list';
    } else if (title_lower.includes('como') || title_lower.includes('tutorial')) {
      return 'howto';
    } else if (title_lower.includes('vs') || title_lower.includes('comparação')) {
      return 'comparison';
    }
    
    return 'article';
  }

  /**
   * Extrai palavras-chave relevantes
   */
  extractKeywords(tokens, termFrequency) {
    return Object.entries(termFrequency)
      .filter(([term, freq]) => freq > 1 && term.length > 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([term, freq]) => ({ keyword: term, frequency: freq }));
  }

  /**
   * Calcula relevância de um termo
   */
  calculateRelevance(term, frequency, totalWords) {
    const tf = frequency / totalWords;
    const lengthBonus = Math.min(term.length / 10, 1);
    return tf * lengthBonus;
  }

  /**
   * Calcula score de legibilidade
   */
  calculateReadability(content) {
    const sentences = content.split(/[.!?]+/).length;
    const words = content.split(/\s+/).length;
    const avgWordsPerSentence = words / sentences;
    
    // Score simples baseado em tamanho médio de sentenças
    if (avgWordsPerSentence < 15) return 90;
    if (avgWordsPerSentence < 20) return 80;
    if (avgWordsPerSentence < 25) return 70;
    return 60;
  }

  /**
   * Calcula confiança da análise
   */
  calculateConfidence(themes, niche) {
    const themeStrength = themes.length > 0 ? themes[0].relevance * 100 : 0;
    const nicheConfidence = niche !== 'general' ? 80 : 40;
    return Math.min((themeStrength + nicheConfidence) / 2, 95);
  }

  /**
   * Gera sugestões de otimização SEO
   */
  async generateSEOSuggestions(analysis, currentTitle, currentDescription) {
    const suggestions = {
      title: this.generateTitleSuggestions(analysis, currentTitle),
      description: this.generateDescriptionSuggestions(analysis, currentDescription),
      keywords: this.generateKeywordSuggestions(analysis),
      structure: this.generateStructureSuggestions(analysis),
      improvements: this.generateImprovementSuggestions(analysis)
    };

    return suggestions;
  }

  /**
   * Gera sugestões de título
   */
  generateTitleSuggestions(analysis, currentTitle) {
    const mainTopic = analysis.mainTopic;
    const niche = analysis.niche;
    
    const suggestions = [
      `Guia Completo: ${mainTopic} em 2025`,
      `Como ${mainTopic}: Tutorial Passo a Passo`,
      `${mainTopic}: Tudo que Você Precisa Saber`,
      `Top 10 Dicas sobre ${mainTopic}`,
      `${mainTopic} para Iniciantes: Guia Definitivo`
    ];

    return suggestions.map(suggestion => ({
      title: suggestion,
      score: this.scoreTitleSEO(suggestion),
      reason: 'Otimizado para busca e engajamento'
    }));
  }

  /**
   * Gera sugestões de meta description
   */
  generateDescriptionSuggestions(analysis, currentDescription) {
    const mainTopic = analysis.mainTopic;
    const keywords = analysis.keywords.slice(0, 3).map(k => k.keyword).join(', ');
    
    const suggestions = [
      `Descubra tudo sobre ${mainTopic}. Guia completo com ${keywords} e dicas práticas. Leia agora!`,
      `Aprenda ${mainTopic} de forma simples e eficaz. Tutorial com ${keywords} e exemplos reais.`,
      `${mainTopic}: guia definitivo com ${keywords}. Dicas, truques e melhores práticas em um só lugar.`
    ];

    return suggestions.map(suggestion => ({
      description: suggestion,
      length: suggestion.length,
      score: this.scoreDescriptionSEO(suggestion),
      reason: suggestion.length <= 160 ? 'Tamanho ideal para Google' : 'Muito longo - considere reduzir'
    }));
  }

  /**
   * Gera sugestões de palavras-chave
   */
  generateKeywordSuggestions(analysis) {
    return analysis.keywords.map(k => ({
      keyword: k.keyword,
      frequency: k.frequency,
      difficulty: this.estimateKeywordDifficulty(k.keyword),
      opportunity: this.estimateKeywordOpportunity(k.keyword, analysis.niche)
    }));
  }

  /**
   * Gera sugestões de estrutura
   */
  generateStructureSuggestions(analysis) {
    return [
      'Adicione subtítulos (H2, H3) com palavras-chave',
      'Inclua uma introdução clara nos primeiros 100 caracteres',
      'Use listas numeradas ou com marcadores',
      'Adicione uma conclusão com call-to-action',
      'Inclua links internos para artigos relacionados'
    ];
  }

  /**
   * Gera sugestões de melhoria
   */
  generateImprovementSuggestions(analysis) {
    const suggestions = [];
    
    if (analysis.wordCount < 300) {
      suggestions.push('Conteúdo muito curto - considere expandir para pelo menos 500 palavras');
    }
    
    if (analysis.readabilityScore < 70) {
      suggestions.push('Melhore a legibilidade usando frases mais curtas');
    }
    
    if (analysis.keywords.length < 5) {
      suggestions.push('Adicione mais palavras-chave relevantes ao conteúdo');
    }
    
    return suggestions;
  }

  /**
   * Calcula score SEO do título
   */
  scoreTitleSEO(title) {
    let score = 50;
    
    if (title.length >= 30 && title.length <= 60) score += 20;
    if (title.includes('2025') || title.includes('guia') || title.includes('como')) score += 15;
    if (title.includes(':')) score += 10;
    if (/\d+/.test(title)) score += 5;
    
    return Math.min(score, 100);
  }

  /**
   * Calcula score SEO da descrição
   */
  scoreDescriptionSEO(description) {
    let score = 50;
    
    if (description.length >= 120 && description.length <= 160) score += 30;
    if (description.includes('!')) score += 10;
    if (description.toLowerCase().includes('leia') || description.toLowerCase().includes('descubra')) score += 10;
    
    return Math.min(score, 100);
  }

  /**
   * Estima dificuldade da palavra-chave
   */
  estimateKeywordDifficulty(keyword) {
    // Simulação simples - em produção usar APIs reais
    const length = keyword.length;
    if (length < 5) return 'high';
    if (length < 10) return 'medium';
    return 'low';
  }

  /**
   * Estima oportunidade da palavra-chave
   */
  estimateKeywordOpportunity(keyword, niche) {
    // Simulação baseada no nicho
    const nicheMultiplier = {
      'technology': 0.8,
      'business': 0.9,
      'health': 0.7,
      'education': 0.6,
      'lifestyle': 0.5
    };
    
    const base = Math.random() * 100;
    return Math.round(base * (nicheMultiplier[niche] || 0.5));
  }
}

module.exports = SEOIntelligenceService;
