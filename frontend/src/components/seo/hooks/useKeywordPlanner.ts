import { useState, useCallback } from 'react';
import { KeywordPlannerResponse, KeywordData } from '../types';

export const useKeywordPlanner = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getKeywordData = useCallback(async (
    keyword: string,
    geo: string = 'BR',
    language: string = 'pt'
  ): Promise<KeywordData | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/seo/keyword-planner/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          geo,
          language
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar dados da palavra-chave');
      }

      const data = await response.json();
      return transformKeywordData(data, keyword);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro no Keyword Planner:', err);
      
      // Retornar dados mock em caso de erro
      return getMockKeywordData(keyword);
    } finally {
      setLoading(false);
    }
  }, []);

  const getKeywordIdeas = useCallback(async (
    seedKeywords: string[],
    geo: string = 'BR',
    language: string = 'pt',
    limit: number = 50
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/seo/keyword-planner/ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seedKeywords,
          geo,
          language,
          limit
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar ideias de palavras-chave');
      }

      const data: KeywordPlannerResponse = await response.json();
      return data.keywords.map(kw => transformKeywordData(kw, kw.keyword));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao buscar ideias:', err);
      
      return getMockKeywordIdeas(seedKeywords);
    } finally {
      setLoading(false);
    }
  }, []);

  const getCompetitionAnalysis = useCallback(async (
    keywords: string[],
    geo: string = 'BR'
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/seo/keyword-planner/competition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords,
          geo
        })
      });

      if (!response.ok) {
        throw new Error('Erro na análise de competição');
      }

      const data = await response.json();
      return data.competitionAnalysis || {};

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro na análise de competição:', err);
      
      return getMockCompetitionAnalysis(keywords);
    } finally {
      setLoading(false);
    }
  }, []);

  const getSeasonalInsights = useCallback(async (
    keyword: string,
    geo: string = 'BR'
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/seo/keyword-planner/seasonal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          geo
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar insights sazonais');
      }

      const data = await response.json();
      return data.seasonalInsights || null;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro nos insights sazonais:', err);
      
      return getMockSeasonalInsights(keyword);
    } finally {
      setLoading(false);
    }
  }, []);

  // Funções de transformação e mock
  const transformKeywordData = (rawData: any, keyword: string): KeywordData => {
    return {
      keyword,
      searchVolume: rawData.avgMonthlySearches || rawData.searchVolume || 0,
      competition: mapCompetitionLevel(rawData.competition || rawData.competitionIndex),
      cpc: rawData.highTopOfPageBid || rawData.cpc || 0,
      difficulty: calculateDifficulty(rawData),
      trend: determineTrend(rawData),
      relatedKeywords: rawData.relatedKeywords || [],
      longTailSuggestions: generateLongTailSuggestions(keyword),
      intent: determineIntent(keyword)
    };
  };

  const mapCompetitionLevel = (competition: any): 'low' | 'medium' | 'high' => {
    if (typeof competition === 'string') {
      return competition.toLowerCase() as 'low' | 'medium' | 'high';
    }
    
    if (typeof competition === 'number') {
      if (competition < 0.33) return 'low';
      if (competition < 0.66) return 'medium';
      return 'high';
    }
    
    return 'medium';
  };

  const calculateDifficulty = (rawData: any): number => {
    const competition = rawData.competitionIndex || 0.5;
    const searchVolume = rawData.avgMonthlySearches || 1000;
    const cpc = rawData.highTopOfPageBid || 1;
    
    // Fórmula simplificada para calcular dificuldade
    const volumeScore = Math.min(searchVolume / 10000, 1) * 40;
    const competitionScore = competition * 40;
    const cpcScore = Math.min(cpc / 5, 1) * 20;
    
    return Math.round(volumeScore + competitionScore + cpcScore);
  };

  const determineTrend = (rawData: any): 'rising' | 'stable' | 'declining' => {
    // Lógica simplificada - em produção usar dados históricos
    if (rawData.trend) return rawData.trend;
    
    const searchVolume = rawData.avgMonthlySearches || 1000;
    if (searchVolume > 5000) return 'rising';
    if (searchVolume < 500) return 'declining';
    return 'stable';
  };

  const generateLongTailSuggestions = (keyword: string): string[] => {
    const prefixes = ['como', 'melhor', 'o que é', 'por que', 'quando usar'];
    const suffixes = ['grátis', '2024', 'online', 'tutorial', 'guia', 'dicas'];
    
    const suggestions: string[] = [];
    
    // Adicionar prefixos
    prefixes.forEach(prefix => {
      suggestions.push(`${prefix} ${keyword}`);
    });
    
    // Adicionar sufixos
    suffixes.forEach(suffix => {
      suggestions.push(`${keyword} ${suffix}`);
    });
    
    return suggestions.slice(0, 8);
  };

  const determineIntent = (keyword: string): 'informational' | 'commercial' | 'transactional' | 'navigational' => {
    const keywordLower = keyword.toLowerCase();
    
    // Palavras transacionais
    if (/comprar|preço|custo|valor|orçamento|contratar/.test(keywordLower)) {
      return 'transactional';
    }
    
    // Palavras comerciais
    if (/melhor|comparar|vs|review|avaliação|recomendação/.test(keywordLower)) {
      return 'commercial';
    }
    
    // Palavras navegacionais
    if (/login|site|oficial|empresa|contato/.test(keywordLower)) {
      return 'navigational';
    }
    
    // Por padrão, informacional
    return 'informational';
  };

  const getMockKeywordData = (keyword: string): KeywordData => {
    return {
      keyword,
      searchVolume: Math.floor(Math.random() * 10000) + 500,
      competition: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
      cpc: Math.random() * 3 + 0.5,
      difficulty: Math.floor(Math.random() * 60) + 20,
      trend: ['rising', 'stable', 'declining'][Math.floor(Math.random() * 3)] as 'rising' | 'stable' | 'declining',
      relatedKeywords: [
        `${keyword} tutorial`,
        `como usar ${keyword}`,
        `${keyword} grátis`,
        `melhor ${keyword}`,
        `${keyword} 2024`
      ],
      longTailSuggestions: generateLongTailSuggestions(keyword),
      intent: determineIntent(keyword)
    };
  };

  const getMockKeywordIdeas = (seedKeywords: string[]): KeywordData[] => {
    const ideas: KeywordData[] = [];
    
    seedKeywords.forEach(seed => {
      // Gerar 5-8 ideias por seed keyword
      const variations = [
        `${seed} tutorial`,
        `como ${seed}`,
        `${seed} grátis`,
        `melhor ${seed}`,
        `${seed} 2024`,
        `${seed} dicas`,
        `${seed} guia`,
        `${seed} online`
      ];
      
      variations.forEach(variation => {
        ideas.push(getMockKeywordData(variation));
      });
    });
    
    return ideas.slice(0, 50);
  };

  const getMockCompetitionAnalysis = (keywords: string[]) => {
    const analysis: { [key: string]: any } = {};
    
    keywords.forEach(keyword => {
      analysis[keyword] = {
        competition: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        difficulty: Math.floor(Math.random() * 60) + 20,
        topCompetitors: [
          'competitor1.com',
          'competitor2.com',
          'competitor3.com'
        ],
        avgCpc: Math.random() * 3 + 0.5,
        searchVolume: Math.floor(Math.random() * 10000) + 500,
        opportunities: Math.floor(Math.random() * 5) + 1
      };
    });
    
    return analysis;
  };

  const getMockSeasonalInsights = (keyword: string) => {
    return {
      keyword,
      seasonalityScore: Math.floor(Math.random() * 100),
      peakMonths: [
        Math.floor(Math.random() * 12) + 1,
        Math.floor(Math.random() * 12) + 1,
        Math.floor(Math.random() * 12) + 1
      ],
      lowMonths: [
        Math.floor(Math.random() * 12) + 1,
        Math.floor(Math.random() * 12) + 1
      ],
      yearOverYearTrend: ['growing', 'stable', 'declining'][Math.floor(Math.random() * 3)],
      recommendations: [
        'Foque em conteúdo durante os meses de pico',
        'Prepare campanhas antecipadamente',
        'Monitore tendências sazonais regularmente'
      ]
    };
  };

  return {
    getKeywordData,
    getKeywordIdeas,
    getCompetitionAnalysis,
    getSeasonalInsights,
    loading,
    error,
    clearError: () => setError(null)
  };
};
