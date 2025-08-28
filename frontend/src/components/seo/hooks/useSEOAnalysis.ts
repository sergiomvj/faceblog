import { useState, useCallback } from 'react';
import { SEOAnalysisResult, KeywordData, CompetitorData, ExternalLink, SEOScore, TrendingData } from '../types';

export const useSEOAnalysis = () => {
  const [analysis, setAnalysis] = useState<SEOAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeContent = useCallback(async (
    content: string,
    targetKeyword: string,
    niche: string = 'general',
    geo: string = 'BR'
  ): Promise<SEOAnalysisResult | null> => {
    setLoading(true);
    setError(null);

    try {
      // 1. Análise de palavras-chave
      const keywordAnalysis = await analyzeKeywords(content, targetKeyword);
      
      // 2. Análise de concorrentes
      const competitorAnalysis = await analyzeCompetitors(targetKeyword, niche);
      
      // 3. Sugestões de links externos
      const externalLinks = await findExternalLinks(targetKeyword, niche);
      
      // 4. Análise de tendências
      const trendingData = await getTrendingData(targetKeyword, geo, niche);
      
      // 5. Análise de conteúdo viral
      const viralAnalysis = await analyzeViralPotential(content, targetKeyword);
      
      // 6. Score SEO geral
      const seoScore = calculateSEOScore(content, keywordAnalysis, competitorAnalysis);
      
      // 7. Recomendações personalizadas
      const recommendations = generateRecommendations(
        content,
        keywordAnalysis,
        competitorAnalysis,
        seoScore
      );

      const result: SEOAnalysisResult = {
        content,
        targetKeyword,
        keywords: keywordAnalysis,
        competitors: competitorAnalysis,
        externalLinks,
        trending: trendingData,
        score: seoScore,
        recommendations,
        viralPotential: viralAnalysis
      };

      setAnalysis(result);
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro na análise SEO';
      setError(errorMessage);
      console.error('Erro na análise SEO:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Análise de palavras-chave
  const analyzeKeywords = async (content: string, targetKeyword: string): Promise<KeywordData[]> => {
    try {
      // Extrair palavras-chave do conteúdo
      const extractedKeywords = extractKeywordsFromContent(content);
      
      // Simular dados de palavras-chave
      const keywords = [targetKeyword, ...extractedKeywords.slice(0, 10)];
      return keywords.map(keyword => ({
        keyword,
        searchVolume: Math.floor(Math.random() * 10000) + 1000,
        competition: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
        cpc: Math.round((Math.random() * 5 + 0.5) * 100) / 100,
        difficulty: Math.floor(Math.random() * 100),
        trend: ['rising', 'stable', 'declining'][Math.floor(Math.random() * 3)] as 'rising' | 'stable' | 'declining',
        relatedKeywords: [`${keyword} dicas`, `${keyword} guia`, `como ${keyword}`],
        longTailSuggestions: [`${keyword} para iniciantes`, `melhor ${keyword}`, `${keyword} 2024`],
        intent: ['informational', 'commercial', 'transactional', 'navigational'][Math.floor(Math.random() * 4)] as any
      }));

    } catch (error) {
      console.error('Erro na análise de palavras-chave:', error);
      return [];
    }
  };

  // Função auxiliar para extrair palavras-chave do conteúdo
  const extractKeywordsFromContent = (content: string): string[] => {
    const words = content.toLowerCase().match(/\b\w{3,}\b/g) || [];
    const frequency: { [key: string]: number } = {};
    
    words.forEach(word => {
      if (!['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'que', 'para', 'com', 'uma', 'mais'].includes(word)) {
        frequency[word] = (frequency[word] || 0) + 1;
      }
    });
    
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  };

  const analyzeCompetitors = async (keyword: string, niche: string): Promise<CompetitorData[]> => {
    try {
      // Simular dados de concorrentes
      const competitors: CompetitorData[] = [
        {
          domain: 'exemplo1.com',
          title: `Guia Completo de ${keyword}`,
          url: `https://exemplo1.com/${keyword}-guia`,
          ranking: 1,
          domainAuthority: 85,
          backlinks: 1250,
          contentLength: 2500,
          keywordsUsed: [`${keyword}`, `${keyword} dicas`, `como ${keyword}`],
          missingKeywords: [`${keyword} avançado`, `${keyword} profissional`],
          contentGaps: ['Exemplos práticos', 'Casos de uso'],
          socialShares: {
            facebook: 450,
            twitter: 230,
            linkedin: 120,
            reddit: 90
          }
        },
        {
          domain: 'exemplo2.com',
          title: `${keyword}: Dicas e Estratégias`,
          url: `https://exemplo2.com/${keyword}-estrategias`,
          ranking: 2,
          domainAuthority: 72,
          backlinks: 890,
          contentLength: 1800,
          keywordsUsed: [`${keyword}`, `${keyword} estratégias`],
          missingKeywords: [`${keyword} iniciantes`, `${keyword} ferramentas`],
          contentGaps: ['Tutorial passo a passo', 'Métricas de sucesso'],
          socialShares: {
            facebook: 280,
            twitter: 150,
            linkedin: 80,
            reddit: 50
          }
        },
        {
          domain: 'exemplo3.com',
          title: `Como Dominar ${keyword}`,
          url: `https://exemplo3.com/dominar-${keyword}`,
          ranking: 3,
          domainAuthority: 68,
          backlinks: 650,
          contentLength: 2100,
          keywordsUsed: [`${keyword}`, `dominar ${keyword}`],
          missingKeywords: [`${keyword} básico`, `${keyword} tendências`],
          contentGaps: ['Recursos gratuitos', 'Comunidade'],
          socialShares: {
            facebook: 200,
            twitter: 120,
            linkedin: 60,
            reddit: 40
          }
        }
      ];

      return competitors;

    } catch (error) {
      console.error('Erro na análise de concorrentes:', error);
      return [];
    }
  };

  const findExternalLinks = async (keyword: string, niche: string): Promise<ExternalLink[]> => {
    try {
      // Simular dados de links externos relevantes
      const externalLinks: ExternalLink[] = [
        {
          domain: 'wikipedia.org',
          url: `https://pt.wikipedia.org/wiki/${keyword}`,
          title: `${keyword} - Wikipedia`,
          domainAuthority: 95,
          relevanceScore: 90,
          linkType: 'resource',
          anchorTextSuggestion: `definição de ${keyword}`,
          contextSuggestion: `Para uma definição completa de ${keyword}, consulte a Wikipedia.`
        },
        {
          domain: 'scholar.google.com',
          url: `https://scholar.google.com/scholar?q=${keyword}`,
          title: `Estudos acadêmicos sobre ${keyword}`,
          domainAuthority: 92,
          relevanceScore: 85,
          linkType: 'study',
          anchorTextSuggestion: `pesquisas sobre ${keyword}`,
          contextSuggestion: `Diversos estudos acadêmicos comprovam a eficácia de ${keyword}.`
        },
        {
          domain: 'statista.com',
          url: `https://www.statista.com/search/?q=${keyword}`,
          title: `Estatísticas de ${keyword}`,
          domainAuthority: 88,
          relevanceScore: 80,
          linkType: 'statistic',
          anchorTextSuggestion: `estatísticas de ${keyword}`,
          contextSuggestion: `Segundo dados da Statista, ${keyword} tem mostrado crescimento significativo.`
        },
        {
          domain: 'github.com',
          url: `https://github.com/search?q=${keyword}`,
          title: `Ferramentas de ${keyword} no GitHub`,
          domainAuthority: 85,
          relevanceScore: 75,
          linkType: 'tool',
          anchorTextSuggestion: `ferramentas de ${keyword}`,
          contextSuggestion: `Existem várias ferramentas open-source para ${keyword} disponíveis no GitHub.`
        },
        {
          domain: 'medium.com',
          url: `https://medium.com/search?q=${keyword}`,
          title: `Guias sobre ${keyword}`,
          domainAuthority: 82,
          relevanceScore: 70,
          linkType: 'guide',
          anchorTextSuggestion: `guia de ${keyword}`,
          contextSuggestion: `Para aprender mais sobre ${keyword}, recomendamos este guia detalhado.`
        }
      ];

      return externalLinks;

    } catch (error) {
      console.error('Erro ao buscar links externos:', error);
      return [];
    }
  };

  const getTrendingData = async (keyword: string, geo: string, niche: string): Promise<TrendingData> => {
    try {
      // Simular dados de tendências
      const trendingData: TrendingData = {
        mainTopic: keyword,
        niche,
        geo,
        timestamp: Date.now(),
        trendingTerms: [
          { 
            term: `${keyword} 2024`, 
            growth: 'high', 
            source: 'google', 
            searchVolume: Math.floor(Math.random() * 5000) + 1000,
            competition: 'medium' 
          },
          { 
            term: `${keyword} dicas`, 
            growth: 'medium', 
            source: 'google', 
            searchVolume: Math.floor(Math.random() * 3000) + 500,
            competition: 'low' 
          },
          { 
            term: `como ${keyword}`, 
            growth: 'high', 
            source: 'google', 
            searchVolume: Math.floor(Math.random() * 4000) + 800,
            competition: 'medium' 
          },
          { 
            term: `${keyword} grátis`, 
            growth: 'medium', 
            source: 'google', 
            searchVolume: Math.floor(Math.random() * 2000) + 300,
            competition: 'low' 
          }
        ],
        popularQuestions: {
          what: [
            `O que é ${keyword}?`,
            `O que significa ${keyword}?`,
            `O que faz ${keyword}?`
          ],
          how: [
            `Como usar ${keyword}?`,
            `Como fazer ${keyword}?`,
            `Como implementar ${keyword}?`
          ],
          why: [
            `Por que ${keyword}?`,
            `Por que usar ${keyword}?`,
            `Por que ${keyword} é importante?`
          ],
          when: [
            `Quando usar ${keyword}?`,
            `Quando aplicar ${keyword}?`,
            `Quando ${keyword} é necessário?`
          ],
          where: [
            `Onde encontrar ${keyword}?`,
            `Onde usar ${keyword}?`,
            `Onde aprender ${keyword}?`
          ]
        },
        seasonalTrends: {
          peakMonths: [3, 6, 9, 12],
          lowMonths: [1, 7],
          currentTrend: 'stable',
          prediction: 'growth expected'
        },
        opportunities: [
          { 
            keyword: `${keyword} guia`, 
            type: 'content', 
            potential: 'high', 
            reason: 'Low competition', 
            difficulty: 30, 
            cpc: 1.2 
          },
          { 
            keyword: `${keyword} tutorial`, 
            type: 'content', 
            potential: 'medium', 
            reason: 'Growing search volume', 
            difficulty: 45, 
            cpc: 0.8 
          },
          { 
            keyword: `${keyword} ferramentas`, 
            type: 'content', 
            potential: 'high', 
            reason: 'High commercial intent', 
            difficulty: 55, 
            cpc: 2.1 
          }
        ]
      };

      return trendingData;

    } catch (error) {
      console.error('Erro ao buscar dados de tendências:', error);
      return {
        mainTopic: keyword,
        niche,
        geo,
        timestamp: Date.now(),
        trendingTerms: [],
        popularQuestions: { what: [], how: [], why: [], when: [], where: [] },
        seasonalTrends: { peakMonths: [], lowMonths: [], currentTrend: 'stable', prediction: 'unknown' },
        opportunities: []
      };
    }
  };

  const analyzeViralPotential = async (content: string, keyword: string) => {
    try {
      // Análise de fatores virais no conteúdo
      const viralFactors = analyzeViralFactors(content);
      const socialTriggers = identifySocialTriggers(content);
      
      // Score baseado em análise do conteúdo
      const score = calculateViralScore(content, viralFactors);

      return {
        score,
        factors: viralFactors,
        socialTriggers,
        shareabilityTips: generateShareabilityTips(viralFactors, socialTriggers)
      };

    } catch (error) {
      console.error('Erro na análise viral:', error);
      return {
        score: 0,
        factors: [],
        socialTriggers: [],
        shareabilityTips: []
      };
    }
  };

  // Funções auxiliares para análise viral
  const analyzeViralFactors = (content: string) => {
    const factors = [];
    const text = content.toLowerCase();
    
    if (text.includes('incrível') || text.includes('surpreendente') || text.includes('impressionante')) {
      factors.push('emotional_trigger');
    }
    if (text.includes('lista') || text.includes('dicas') || text.includes('passos')) {
      factors.push('list_format');
    }
    if (text.includes('?')) {
      factors.push('questions');
    }
    if (text.length > 1000) {
      factors.push('comprehensive');
    }
    if (text.includes('compartilhe') || text.includes('share') || text.includes('divulgue')) {
      factors.push('call_to_action');
    }
    if (text.includes('segredo') || text.includes('exclusivo') || text.includes('revelado')) {
      factors.push('curiosity_gap');
    }
    
    return factors;
  };

  const identifySocialTriggers = (content: string) => {
    const triggers = [];
    const text = content.toLowerCase();
    
    if (text.includes('exclusivo') || text.includes('segredo') || text.includes('apenas')) {
      triggers.push('exclusivity');
    }
    if (text.includes('urgente') || text.includes('agora') || text.includes('limitado')) {
      triggers.push('urgency');
    }
    if (text.includes('grátis') || text.includes('free') || text.includes('gratuito')) {
      triggers.push('value');
    }
    if (text.includes('novo') || text.includes('novidade') || text.includes('lançamento')) {
      triggers.push('novelty');
    }
    if (text.includes('prova') || text.includes('resultado') || text.includes('evidência')) {
      triggers.push('social_proof');
    }
    
    return triggers;
  };

  const calculateViralScore = (content: string, factors: string[]): number => {
    let score = 40; // Base score
    
    factors.forEach(factor => {
      switch (factor) {
        case 'emotional_trigger': score += 15; break;
        case 'list_format': score += 12; break;
        case 'questions': score += 8; break;
        case 'comprehensive': score += 10; break;
        case 'call_to_action': score += 12; break;
        case 'curiosity_gap': score += 13; break;
      }
    });
    
    // Bonus por comprimento adequado
    if (content.length >= 500 && content.length <= 2000) {
      score += 10;
    }
    
    return Math.min(100, score);
  };

  const generateShareabilityTips = (factors: string[], triggers: string[]) => {
    const tips = [];
    
    if (!factors.includes('emotional_trigger')) {
      tips.push('Adicione palavras que despertem emoções (incrível, surpreendente, revolucionário)');
    }
    if (!factors.includes('call_to_action')) {
      tips.push('Inclua chamadas para ação que incentivem o compartilhamento');
    }
    if (!triggers.includes('value')) {
      tips.push('Destaque o valor gratuito ou benefícios exclusivos do conteúdo');
    }
    if (!factors.includes('list_format')) {
      tips.push('Organize o conteúdo em listas numeradas ou com bullet points');
    }
    if (!triggers.includes('social_proof')) {
      tips.push('Adicione evidências, estatísticas ou depoimentos para aumentar a credibilidade');
    }
    if (!factors.includes('curiosity_gap')) {
      tips.push('Crie curiosidade com títulos que prometem revelar segredos ou informações exclusivas');
    }
    
    return tips;
  };

  const calculateSEOScore = (content: string, keywords: KeywordData[], competitors: CompetitorData[]): SEOScore => {
    // Análise de densidade de palavras-chave
    const keywordScore = analyzeKeywordDensity(content, keywords);
    
    // Análise de estrutura do conteúdo
    const contentScore = analyzeContentStructure(content);
    
    // Análise técnica básica
    const technicalScore = analyzeTechnicalFactors(content);
    
    // Score de backlinks potenciais
    const backlinkScore = analyzeBacklinkPotential(keywords, competitors);
    
    // Score social
    const socialScore = analyzeSocialFactors(content);

    const overall = Math.round(
      (keywordScore * 0.3 + contentScore * 0.25 + technicalScore * 0.2 + 
       backlinkScore * 0.15 + socialScore * 0.1)
    );

    const suggestions = [
      {
        category: 'keyword',
        issue: 'Densidade de palavras-chave',
        impact: 'high' as const,
        solution: 'Otimize a densidade para 1-3%'
      },
      {
        category: 'content',
        issue: 'Estrutura do conteúdo',
        impact: 'medium' as const,
        solution: 'Adicione mais títulos e subtítulos'
      },
      {
        category: 'technical',
        issue: 'Links internos e externos',
        impact: 'medium' as const,
        solution: 'Inclua mais links relevantes'
      }
    ];

    return {
      overall,
      keyword: keywordScore,
      content: contentScore,
      technical: technicalScore,
      backlinks: backlinkScore,
      social: socialScore,
      suggestions
    };
  };

  // Funções auxiliares para cálculo de scores
  const analyzeKeywordDensity = (content: string, keywords: KeywordData[]): number => {
    if (keywords.length === 0) return 0;
    
    const text = content.toLowerCase();
    const wordCount = text.split(/\s+/).length;
    let keywordCount = 0;
    
    keywords.forEach(kw => {
      const regex = new RegExp(kw.keyword.toLowerCase(), 'g');
      const matches = text.match(regex);
      keywordCount += matches ? matches.length : 0;
    });
    
    const density = (keywordCount / wordCount) * 100;
    
    if (density >= 1 && density <= 3) return 90;
    if (density >= 0.5 && density < 1) return 70;
    if (density > 3) return 40;
    return 30;
  };

  const analyzeContentStructure = (content: string): number => {
    let score = 0;
    
    // Verifica títulos (H1, H2, etc.)
    if (content.includes('#')) score += 20;
    
    // Verifica parágrafos
    const paragraphs = content.split('\n\n').length;
    if (paragraphs >= 3) score += 20;
    
    // Verifica listas
    if (content.includes('-') || content.includes('*')) score += 15;
    
    // Verifica comprimento adequado
    if (content.length >= 300 && content.length <= 2000) score += 25;
    
    // Verifica meta description simulada
    if (content.length >= 150) score += 20;
    
    return Math.min(100, score);
  };

  const analyzeTechnicalFactors = (content: string): number => {
    let score = 50; // Base score
    
    // Simula análise técnica básica
    if (content.length > 300) score += 20;
    if (content.includes('http')) score += 10; // Links
    if (content.split('\n').length > 5) score += 20; // Formatação
    
    return Math.min(100, score);
  };

  const analyzeBacklinkPotential = (keywords: KeywordData[], competitors: CompetitorData[]): number => {
    if (keywords.length === 0) return 50;
    
    const avgDifficulty = keywords.reduce((sum, kw) => sum + kw.difficulty, 0) / keywords.length;
    return Math.max(0, 100 - avgDifficulty);
  };

  const analyzeSocialFactors = (content: string): number => {
    let score = 50;
    
    const text = content.toLowerCase();
    if (text.includes('compartilhe')) score += 15;
    if (text.includes('?')) score += 10;
    if (text.includes('!')) score += 10;
    if (text.length > 500) score += 15;
    
    return Math.min(100, score);
  };

  const generateRecommendations = (content: string, keywords: KeywordData[], competitors: CompetitorData[], score: SEOScore) => {
    const recommendations = [];

    // Recomendações de palavras-chave
    if (score.keyword < 70) {
      recommendations.push({
        type: 'keyword' as const,
        priority: 'high' as const,
        title: 'Otimizar densidade de palavras-chave',
        description: 'A densidade das palavras-chave principais está abaixo do ideal',
        implementation: 'Inclua a palavra-chave principal 2-3 vezes no primeiro parágrafo e distribua naturalmente pelo texto'
      });
    }

    // Recomendações de conteúdo
    if (score.content < 60) {
      recommendations.push({
        type: 'content' as const,
        priority: 'high' as const,
        title: 'Melhorar estrutura do conteúdo',
        description: 'O conteúdo precisa de melhor organização e headings',
        implementation: 'Use H2 e H3 para organizar o conteúdo, adicione listas e parágrafos curtos'
      });
    }

    // Recomendações técnicas
    if (score.technical < 65) {
      recommendations.push({
        type: 'links' as const,
        priority: 'medium' as const,
        title: 'Adicionar links relevantes',
        description: 'O conteúdo precisa de mais links internos e externos',
        implementation: 'Inclua 3-5 links para fontes autoritativas e páginas relacionadas do seu site'
      });
    }

    // Recomendações baseadas em concorrentes
    const topCompetitor = competitors.find(c => c.ranking === 1);
    if (topCompetitor && topCompetitor.contentLength > content.length * 1.5) {
      recommendations.push({
        type: 'content' as const,
        priority: 'medium' as const,
        title: 'Expandir conteúdo',
        description: `Concorrentes top têm conteúdo ~${topCompetitor.contentLength} palavras`,
        implementation: 'Adicione mais detalhes, exemplos práticos e seções complementares'
      });
    }

    // Recomendações de estrutura
    if (score.social < 60) {
      recommendations.push({
        type: 'structure' as const,
        priority: 'low' as const,
        title: 'Melhorar engajamento social',
        description: 'O conteúdo precisa de elementos que incentivem compartilhamento',
        implementation: 'Adicione perguntas, call-to-actions e elementos visuais atraentes'
      });
    }

    // Recomendações de links (backlinks)
    if (score.backlinks < 50) {
      recommendations.push({
        type: 'links' as const,
        priority: 'medium' as const,
        title: 'Focar em palavras-chave menos competitivas',
        description: 'As palavras-chave escolhidas têm alta dificuldade',
        implementation: 'Considere long-tail keywords e termos com menor competição'
      });
    }

    return recommendations;
  };

  return {
    analyzeContent,
    analysis,
    loading,
    error,
    clearAnalysis: () => setAnalysis(null)
  };
};
