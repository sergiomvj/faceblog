import { useState, useCallback } from 'react';
import { GoogleTrendsResponse, TrendingData } from '../types';

export const useGoogleTrends = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTrends = useCallback(async (
    keyword: string,
    geo: string = 'BR',
    timeframe: string = 'today 12-m'
  ): Promise<TrendingData> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/seo/google-trends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          geo,
          timeframe
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar tendências do Google');
      }

      const data: GoogleTrendsResponse = await response.json();
      
      // Transformar dados do Google Trends para nosso formato
      const trendingData: TrendingData = {
        mainTopic: keyword,
        niche: 'general',
        geo,
        timestamp: Date.now(),
        trendingTerms: [
          ...data.relatedQueries.map(q => ({
            term: q.query,
            growth: q.value > 50 ? 'high' : q.value > 20 ? 'medium' : 'low',
            source: 'Google Trends',
            searchVolume: q.value,
            competition: 'medium' as const
          })),
          ...data.risingQueries.map(q => ({
            term: q.query,
            growth: 'rising',
            source: 'Google Trends',
            searchVolume: q.value,
            competition: 'low' as const
          }))
        ],
        popularQuestions: await generatePopularQuestions(keyword),
        seasonalTrends: await analyzeSeasonalTrends(data.interest),
        opportunities: await identifyOpportunities(data.relatedQueries, data.risingQueries)
      };

      return trendingData;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro no Google Trends:', err);
      
      // Retornar dados mock em caso de erro
      return getMockTrendingData(keyword, geo);
    } finally {
      setLoading(false);
    }
  }, []);

  const getRelatedKeywords = useCallback(async (keyword: string, geo: string = 'BR') => {
    try {
      const response = await fetch('/api/v1/seo/google-trends/related', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword, geo })
      });

      if (!response.ok) throw new Error('Erro ao buscar palavras relacionadas');
      
      const data = await response.json();
      return data.relatedKeywords || [];

    } catch (error) {
      console.error('Erro ao buscar palavras relacionadas:', error);
      return [];
    }
  }, []);

  const getSeasonalData = useCallback(async (keyword: string, geo: string = 'BR') => {
    try {
      const response = await fetch('/api/v1/seo/google-trends/seasonal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword, geo })
      });

      if (!response.ok) throw new Error('Erro ao buscar dados sazonais');
      
      const data = await response.json();
      return data.seasonalData || null;

    } catch (error) {
      console.error('Erro ao buscar dados sazonais:', error);
      return null;
    }
  }, []);

  // Funções auxiliares
  const generatePopularQuestions = async (keyword: string) => {
    // Simular geração de perguntas populares baseadas na palavra-chave
    const questionTemplates = {
      what: [`O que é ${keyword}?`, `O que significa ${keyword}?`, `O que faz ${keyword}?`],
      how: [`Como usar ${keyword}?`, `Como funciona ${keyword}?`, `Como implementar ${keyword}?`],
      why: [`Por que ${keyword} é importante?`, `Por que usar ${keyword}?`, `Por que ${keyword} funciona?`],
      when: [`Quando usar ${keyword}?`, `Quando ${keyword} é necessário?`, `Quando aplicar ${keyword}?`],
      where: [`Onde encontrar ${keyword}?`, `Onde usar ${keyword}?`, `Onde aplicar ${keyword}?`]
    };

    return questionTemplates;
  };

  const analyzeSeasonalTrends = async (interestData: Array<{ time: string; value: number }>) => {
    if (!interestData || interestData.length === 0) {
      return {
        peakMonths: [],
        lowMonths: [],
        currentTrend: 'stable',
        prediction: 'Dados insuficientes para análise sazonal'
      };
    }

    // Analisar padrões sazonais
    const monthlyData: { [key: number]: number[] } = {};
    
    interestData.forEach(point => {
      const date = new Date(point.time);
      const month = date.getMonth() + 1;
      
      if (!monthlyData[month]) monthlyData[month] = [];
      monthlyData[month].push(point.value);
    });

    // Calcular médias mensais
    const monthlyAverages = Object.entries(monthlyData).map(([month, values]) => ({
      month: parseInt(month),
      average: values.reduce((sum, val) => sum + val, 0) / values.length
    }));

    // Identificar picos e baixas
    const sortedByValue = [...monthlyAverages].sort((a, b) => b.average - a.average);
    const peakMonths = sortedByValue.slice(0, 3).map(m => m.month);
    const lowMonths = sortedByValue.slice(-3).map(m => m.month);

    // Determinar tendência atual
    const recentData = interestData.slice(-6);
    const trend = recentData.length > 1 ? 
      (recentData[recentData.length - 1].value > recentData[0].value ? 'rising' : 'declining') : 
      'stable';

    return {
      peakMonths,
      lowMonths,
      currentTrend: trend,
      prediction: `Tendência ${trend === 'rising' ? 'crescente' : trend === 'declining' ? 'decrescente' : 'estável'} baseada nos últimos 6 meses`
    };
  };

  const identifyOpportunities = async (
    relatedQueries: Array<{ query: string; value: number }>,
    risingQueries: Array<{ query: string; value: number }>
  ) => {
    const opportunities: Array<{
      keyword: string;
      type: string;
      potential: string;
      reason: string;
      difficulty?: number;
      cpc?: number;
    }> = [];

    // Oportunidades de palavras-chave em alta
    risingQueries.slice(0, 5).forEach(query => {
      opportunities.push({
        keyword: query.query,
        type: 'rising_trend',
        potential: 'high',
        reason: 'Palavra-chave em tendência crescente',
        difficulty: Math.floor(Math.random() * 30) + 20, // 20-50
        cpc: Math.random() * 2 + 0.5 // R$ 0.50 - R$ 2.50
      });
    });

    // Oportunidades de long-tail
    relatedQueries
      .filter(q => q.query.split(' ').length >= 3)
      .slice(0, 3)
      .forEach(query => {
        opportunities.push({
          keyword: query.query,
          type: 'long_tail',
          potential: 'medium',
          reason: 'Long-tail keyword com boa relevância',
          difficulty: Math.floor(Math.random() * 20) + 10, // 10-30
          cpc: Math.random() * 1.5 + 0.3 // R$ 0.30 - R$ 1.80
        });
      });

    // Oportunidades de nicho
    relatedQueries
      .filter(q => q.value < 20 && q.value > 5)
      .slice(0, 2)
      .forEach(query => {
        opportunities.push({
          keyword: query.query,
          type: 'niche',
          potential: 'medium',
          reason: 'Nicho com baixa competição',
          difficulty: Math.floor(Math.random() * 25) + 15, // 15-40
          cpc: Math.random() * 1 + 0.2 // R$ 0.20 - R$ 1.20
        });
      });

    return opportunities;
  };

  const getMockTrendingData = (keyword: string, geo: string): TrendingData => {
    return {
      mainTopic: keyword,
      niche: 'general',
      geo,
      timestamp: Date.now(),
      trendingTerms: [
        {
          term: `${keyword} 2024`,
          growth: 'high',
          source: 'Mock Data',
          searchVolume: 1000,
          competition: 'medium'
        },
        {
          term: `como ${keyword}`,
          growth: 'rising',
          source: 'Mock Data',
          searchVolume: 800,
          competition: 'low'
        },
        {
          term: `${keyword} grátis`,
          growth: 'medium',
          source: 'Mock Data',
          searchVolume: 600,
          competition: 'high'
        }
      ],
      popularQuestions: {
        what: [`O que é ${keyword}?`, `O que significa ${keyword}?`],
        how: [`Como usar ${keyword}?`, `Como funciona ${keyword}?`],
        why: [`Por que ${keyword} é importante?`, `Por que usar ${keyword}?`],
        when: [`Quando usar ${keyword}?`, `Quando ${keyword} é necessário?`],
        where: [`Onde encontrar ${keyword}?`, `Onde usar ${keyword}?`]
      },
      seasonalTrends: {
        peakMonths: [6, 7, 12],
        lowMonths: [2, 3, 8],
        currentTrend: 'stable',
        prediction: 'Tendência estável com picos no meio e fim do ano'
      },
      opportunities: [
        {
          keyword: `${keyword} tutorial`,
          type: 'educational',
          potential: 'high',
          reason: 'Alta demanda por conteúdo educativo',
          difficulty: 35,
          cpc: 1.2
        },
        {
          keyword: `melhor ${keyword}`,
          type: 'commercial',
          potential: 'medium',
          reason: 'Intenção comercial clara',
          difficulty: 45,
          cpc: 2.1
        }
      ]
    };
  };

  return {
    getTrends,
    getRelatedKeywords,
    getSeasonalData,
    loading,
    error,
    clearError: () => setError(null)
  };
};
