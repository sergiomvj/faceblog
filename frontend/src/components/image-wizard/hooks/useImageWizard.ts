import { useState, useCallback } from 'react';
import { ImageResult, ImageSearchOptions, ImageSearchFilters, ImageMetrics } from '../types';

export const useImageWizard = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ImageResult[]>([]);
  const [selectedImages, setSelectedImages] = useState<ImageResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const searchImages = useCallback(async (options: ImageSearchOptions): Promise<ImageResult[]> => {
    const { query, contentContext, targetAudience, filters, limit = 12 } = options;

    if (!query.trim()) {
      setError('Query de busca não pode estar vazia');
      return [];
    }

    setIsSearching(true);
    setError(null);

    try {
      // Simular chamada para API de busca de imagens
      // Em produção, isso seria uma chamada real para o backend
      await new Promise(resolve => setTimeout(resolve, 1500));

      const results = await generateIntelligentImageResults(query, contentContext, targetAudience, filters, limit);
      setSearchResults(results);
      return results;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido na busca de imagens';
      setError(errorMessage);
      console.error('Erro na busca de imagens:', err);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  const selectImage = useCallback((image: ImageResult) => {
    setSelectedImages(prev => {
      const isAlreadySelected = prev.some(img => img.id === image.id);
      if (isAlreadySelected) {
        return prev.filter(img => img.id !== image.id);
      }
      return [...prev, image];
    });
  }, []);

  const removeImage = useCallback((imageId: string) => {
    setSelectedImages(prev => prev.filter(img => img.id !== imageId));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedImages([]);
  }, []);

  const clearResults = useCallback(() => {
    setSearchResults([]);
    setSelectedImages([]);
    setError(null);
  }, []);

  const getImageMetrics = useCallback((): ImageMetrics => {
    const totalImages = searchResults.length;
    const selectedCount = selectedImages.length;
    
    const avgSeoScore = selectedImages.length > 0 
      ? selectedImages.reduce((sum, img) => sum + img.seoScore, 0) / selectedImages.length 
      : 0;
    
    const avgRelevanceScore = selectedImages.length > 0 
      ? selectedImages.reduce((sum, img) => sum + img.relevanceScore, 0) / selectedImages.length 
      : 0;
    
    const avgQualityScore = selectedImages.length > 0 
      ? selectedImages.reduce((sum, img) => sum + img.qualityScore, 0) / selectedImages.length 
      : 0;

    const sourceDistribution = selectedImages.reduce((acc, img) => {
      acc[img.source] = (acc[img.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const emotionalImpactDistribution = selectedImages.reduce((acc, img) => {
      acc[img.emotionalImpact] = (acc[img.emotionalImpact] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalImages,
      selectedImages: selectedCount,
      averageSeoScore: Math.round(avgSeoScore),
      averageRelevanceScore: Math.round(avgRelevanceScore),
      averageQualityScore: Math.round(avgQualityScore),
      sourceDistribution,
      emotionalImpactDistribution
    };
  }, [searchResults, selectedImages]);

  const getTopPerformingImages = useCallback((limit: number = 5): ImageResult[] => {
    return searchResults
      .sort((a, b) => (b.seoScore + b.relevanceScore + b.qualityScore) - (a.seoScore + a.relevanceScore + a.qualityScore))
      .slice(0, limit);
  }, [searchResults]);

  const filterResults = useCallback((filters: Partial<ImageSearchFilters>): ImageResult[] => {
    return searchResults.filter(image => {
      if (filters.source && filters.source !== 'all' && image.source !== filters.source) {
        return false;
      }
      
      if (filters.minSeoScore && image.seoScore < filters.minSeoScore) {
        return false;
      }
      
      if (filters.minRelevanceScore && image.relevanceScore < filters.minRelevanceScore) {
        return false;
      }
      
      if (filters.minQualityScore && image.qualityScore < filters.minQualityScore) {
        return false;
      }

      if (filters.orientation && filters.orientation !== 'all') {
        const { width, height } = image.dimensions;
        const aspectRatio = width / height;
        
        switch (filters.orientation) {
          case 'landscape':
            if (aspectRatio <= 1.2) return false;
            break;
          case 'portrait':
            if (aspectRatio >= 0.8) return false;
            break;
          case 'square':
            if (aspectRatio < 0.9 || aspectRatio > 1.1) return false;
            break;
        }
      }

      return true;
    });
  }, [searchResults]);

  return {
    isSearching,
    searchResults,
    selectedImages,
    error,
    searchImages,
    selectImage,
    removeImage,
    clearSelection,
    clearResults,
    getImageMetrics,
    getTopPerformingImages,
    filterResults
  };
};

// Função auxiliar para gerar resultados inteligentes
async function generateIntelligentImageResults(
  query: string, 
  contentContext?: string, 
  targetAudience?: string, 
  filters?: Partial<ImageSearchFilters>,
  limit: number = 12
): Promise<ImageResult[]> {
  
  const sources: Array<'unsplash' | 'pexels' | 'pixabay' | 'freepik'> = ['unsplash', 'pexels', 'pixabay', 'freepik'];
  const emotions = ['inspiring', 'calming', 'energetic', 'professional', 'friendly', 'creative', 'trustworthy'];
  const results: ImageResult[] = [];

  // Gerar palavras-chave relacionadas baseadas no contexto
  const relatedKeywords = generateRelatedKeywords(query, contentContext, targetAudience);

  for (let i = 0; i < limit; i++) {
    const source = filters?.source && filters.source !== 'all' 
      ? filters.source as 'unsplash' | 'pexels' | 'pixabay' | 'freepik'
      : sources[Math.floor(Math.random() * sources.length)];
    
    const emotion = emotions[Math.floor(Math.random() * emotions.length)];
    const relatedKeyword = relatedKeywords[Math.floor(Math.random() * relatedKeywords.length)];
    
    // Calcular scores baseados no contexto
    const contextBonus = contentContext ? Math.floor(Math.random() * 15) + 5 : 0;
    const audienceBonus = targetAudience ? Math.floor(Math.random() * 10) + 5 : 0;
    
    const baseSeoScore = Math.floor(Math.random() * 30) + 60;
    const baseRelevanceScore = Math.floor(Math.random() * 25) + 65;
    const baseQualityScore = Math.floor(Math.random() * 20) + 75;

    // Aplicar filtros de score mínimo
    const seoScore = Math.min(100, baseSeoScore + contextBonus);
    const relevanceScore = Math.min(100, baseRelevanceScore + audienceBonus);
    const qualityScore = Math.min(100, baseQualityScore + Math.floor(Math.random() * 10));

    // Pular se não atender aos filtros mínimos
    if (filters?.minSeoScore && seoScore < filters.minSeoScore) continue;
    if (filters?.minRelevanceScore && relevanceScore < filters.minRelevanceScore) continue;
    if (filters?.minQualityScore && qualityScore < filters.minQualityScore) continue;

    // Gerar dimensões baseadas na orientação filtrada
    let dimensions = { width: 800, height: 600 };
    if (filters?.orientation) {
      switch (filters.orientation) {
        case 'landscape':
          dimensions = { width: 1200, height: 800 };
          break;
        case 'portrait':
          dimensions = { width: 600, height: 900 };
          break;
        case 'square':
          dimensions = { width: 800, height: 800 };
          break;
      }
    }

    const image: ImageResult = {
      id: `img-${Date.now()}-${i}`,
      url: `https://picsum.photos/${dimensions.width}/${dimensions.height}?random=${i + Date.now()}`,
      thumbnailUrl: `https://picsum.photos/300/300?random=${i + Date.now()}`,
      title: `${relatedKeyword} - ${query}`,
      alt: `${relatedKeyword} - ${query}`,
      description: `Imagem de alta qualidade relacionada a ${query}${contentContext ? ` no contexto de ${contentContext}` : ''}`,
      photographer: `Photographer ${Math.floor(Math.random() * 100) + 1}`,
      source,
      tags: [query, relatedKeyword, contentContext, targetAudience].filter(Boolean) as string[],
      dimensions,
      orientation: dimensions.width > dimensions.height ? 'landscape' : dimensions.width < dimensions.height ? 'portrait' : 'square',
      seoScore,
      relevanceScore,
      qualityScore,
      emotionalImpact: emotion,
      colorPalette: generateSmartColorPalette(emotion),
      downloadUrl: `https://picsum.photos/${dimensions.width}/${dimensions.height}?random=${i + Date.now()}`,
      license: source === 'freepik' ? 'Premium license required' : 'Free for commercial use'
    };

    results.push(image);
  }

  // Ordenar por score combinado (SEO + Relevância + Qualidade)
  return results.sort((a, b) => {
    const scoreA = a.seoScore + a.relevanceScore + a.qualityScore;
    const scoreB = b.seoScore + b.relevanceScore + b.qualityScore;
    return scoreB - scoreA;
  });
}

function generateRelatedKeywords(query: string, context?: string, audience?: string): string[] {
  const baseKeywords = [query];
  
  // Adicionar variações da query
  baseKeywords.push(
    `${query} profissional`,
    `${query} moderno`,
    `${query} criativo`,
    `${query} conceito`,
    `${query} abstrato`
  );

  // Adicionar palavras baseadas no contexto
  if (context) {
    baseKeywords.push(
      `${context} ${query}`,
      `${query} para ${context}`,
      `${context} profissional`
    );
  }

  // Adicionar palavras baseadas no público
  if (audience) {
    baseKeywords.push(
      `${query} ${audience}`,
      `${audience} ${query}`,
      `${query} para ${audience}`
    );
  }

  return baseKeywords;
}

function generateSmartColorPalette(emotion: string): string[] {
  const palettes = {
    inspiring: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA726'],
    calming: ['#81C784', '#64B5F6', '#AED581', '#4FC3F7'],
    energetic: ['#FF5722', '#FF9800', '#FFC107', '#FFEB3B'],
    professional: ['#37474F', '#546E7A', '#607D8B', '#78909C'],
    friendly: ['#FF8A65', '#FFB74D', '#81C784', '#64B5F6'],
    creative: ['#AB47BC', '#EC407A', '#FF7043', '#FFCA28'],
    trustworthy: ['#1976D2', '#388E3C', '#455A64', '#6A1B9A']
  };

  return palettes[emotion as keyof typeof palettes] || palettes.professional;
}
