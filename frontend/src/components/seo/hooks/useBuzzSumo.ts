import { useState, useCallback } from 'react';
import { BuzzSumoResponse } from '../types';

export const useBuzzSumo = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getViralContent = useCallback(async (
    keyword: string,
    timeframe: string = '6m',
    contentType: string = 'articles'
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/seo/buzzsumo/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          timeframe,
          contentType,
          limit: 20
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar conteúdo viral');
      }

      const data: BuzzSumoResponse = await response.json();
      return data.articles || [];

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro no BuzzSumo:', err);
      
      // Retornar dados mock em caso de erro
      return getMockViralContent(keyword);
    } finally {
      setLoading(false);
    }
  }, []);

  const getInfluencers = useCallback(async (
    keyword: string,
    platform: string = 'twitter',
    limit: number = 10
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/seo/buzzsumo/influencers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          platform,
          limit
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar influenciadores');
      }

      const data: BuzzSumoResponse = await response.json();
      return data.influencers || [];

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao buscar influenciadores:', err);
      
      // Retornar dados mock em caso de erro
      return getMockInfluencers(keyword, platform);
    } finally {
      setLoading(false);
    }
  }, []);

  const getContentAnalysis = useCallback(async (
    keyword: string,
    analysisType: 'trending' | 'evergreen' | 'seasonal' = 'trending'
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/seo/buzzsumo/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          analysisType,
          includeMetrics: true
        })
      });

      if (!response.ok) {
        throw new Error('Erro na análise de conteúdo');
      }

      const data = await response.json();
      return {
        topPerformingContent: data.topContent || [],
        contentPatterns: data.patterns || [],
        optimalTiming: data.timing || {},
        engagementInsights: data.insights || {}
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro na análise de conteúdo:', err);
      
      return getMockContentAnalysis(keyword);
    } finally {
      setLoading(false);
    }
  }, []);

  const getCompetitorContent = useCallback(async (
    competitors: string[],
    keyword: string,
    timeframe: string = '3m'
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/seo/buzzsumo/competitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          competitors,
          keyword,
          timeframe
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao analisar concorrentes');
      }

      const data = await response.json();
      return data.competitorAnalysis || [];

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro na análise de concorrentes:', err);
      
      return getMockCompetitorContent(competitors, keyword);
    } finally {
      setLoading(false);
    }
  }, []);

  // Funções mock para fallback
  const getMockViralContent = (keyword: string) => {
    return [
      {
        title: `10 Estratégias de ${keyword} que Revolucionaram o Mercado`,
        url: `https://example.com/${keyword}-estrategias`,
        domain: 'example.com',
        shares: {
          facebook: 1250,
          twitter: 890,
          linkedin: 340,
          pinterest: 120,
          reddit: 89
        },
        totalShares: 2689,
        publishedDate: '2024-01-15',
        contentType: 'article',
        wordCount: 1850
      },
      {
        title: `Como ${keyword} Mudou Minha Vida em 30 Dias`,
        url: `https://blog.example.com/${keyword}-transformacao`,
        domain: 'blog.example.com',
        shares: {
          facebook: 2100,
          twitter: 1450,
          linkedin: 680,
          pinterest: 230,
          reddit: 156
        },
        totalShares: 4616,
        publishedDate: '2024-02-03',
        contentType: 'case-study',
        wordCount: 2340
      },
      {
        title: `O Segredo do ${keyword} que Ninguém te Conta`,
        url: `https://secrets.example.com/${keyword}-segredo`,
        domain: 'secrets.example.com',
        shares: {
          facebook: 1890,
          twitter: 1120,
          linkedin: 450,
          pinterest: 180,
          reddit: 234
        },
        totalShares: 3874,
        publishedDate: '2024-01-28',
        contentType: 'guide',
        wordCount: 1650
      }
    ];
  };

  const getMockInfluencers = (keyword: string, platform: string) => {
    const platforms = {
      twitter: [
        {
          name: 'Expert em Marketing',
          handle: '@marketingexpert',
          platform: 'twitter',
          followers: 45000,
          engagement: 3.2,
          relevanceScore: 85
        },
        {
          name: 'Digital Guru',
          handle: '@digitalguru',
          platform: 'twitter',
          followers: 32000,
          engagement: 4.1,
          relevanceScore: 78
        }
      ],
      instagram: [
        {
          name: 'Lifestyle Influencer',
          handle: '@lifestyleinfluencer',
          platform: 'instagram',
          followers: 125000,
          engagement: 2.8,
          relevanceScore: 72
        }
      ],
      linkedin: [
        {
          name: 'Business Leader',
          handle: 'business-leader',
          platform: 'linkedin',
          followers: 28000,
          engagement: 5.2,
          relevanceScore: 88
        }
      ]
    };

    return platforms[platform as keyof typeof platforms] || platforms.twitter;
  };

  const getMockContentAnalysis = (keyword: string) => {
    return {
      topPerformingContent: [
        {
          type: 'how-to',
          avgShares: 2500,
          avgEngagement: 4.2,
          optimalLength: '1500-2000 words',
          bestFormats: ['numbered lists', 'step-by-step guides']
        },
        {
          type: 'case-study',
          avgShares: 1800,
          avgEngagement: 3.8,
          optimalLength: '2000-3000 words',
          bestFormats: ['before/after', 'data-driven stories']
        }
      ],
      contentPatterns: [
        'Títulos com números performam 73% melhor',
        'Conteúdo com imagens tem 94% mais visualizações',
        'Posts publicados às terças-feiras têm maior engajamento'
      ],
      optimalTiming: {
        bestDays: ['Tuesday', 'Wednesday', 'Thursday'],
        bestHours: ['9:00', '14:00', '19:00'],
        timezone: 'America/Sao_Paulo'
      },
      engagementInsights: {
        avgCommentsPerShare: 0.15,
        avgClickThroughRate: 2.3,
        topEmotionalTriggers: ['curiosity', 'surprise', 'practical value']
      }
    };
  };

  const getMockCompetitorContent = (competitors: string[], keyword: string) => {
    return competitors.map(competitor => ({
      domain: competitor,
      topContent: [
        {
          title: `${keyword} Guide by ${competitor}`,
          url: `https://${competitor}/${keyword}-guide`,
          shares: Math.floor(Math.random() * 3000) + 500,
          engagement: Math.random() * 5 + 1,
          publishedDate: '2024-01-20'
        }
      ],
      contentStrategy: {
        postFrequency: 'weekly',
        avgContentLength: Math.floor(Math.random() * 1000) + 1000,
        topTopics: [`${keyword} basics`, `advanced ${keyword}`, `${keyword} trends`]
      },
      socialPresence: {
        platforms: ['facebook', 'twitter', 'linkedin'],
        totalFollowers: Math.floor(Math.random() * 50000) + 10000,
        avgEngagement: Math.random() * 3 + 1
      }
    }));
  };

  return {
    getViralContent,
    getInfluencers,
    getContentAnalysis,
    getCompetitorContent,
    loading,
    error,
    clearError: () => setError(null)
  };
};
