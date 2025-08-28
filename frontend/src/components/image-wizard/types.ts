export interface ImageResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  title: string;
  alt: string;
  description?: string;
  photographer?: string;
  source: 'unsplash' | 'pexels' | 'pixabay' | 'freepik';
  tags: string[];
  dimensions: {
    width: number;
    height: number;
  };
  orientation: 'landscape' | 'portrait' | 'square';
  seoScore: number;
  relevanceScore: number;
  qualityScore: number;
  emotionalImpact: string;
  colorPalette: string[];
  downloadUrl: string;
  license: string;
  analysis?: ImageAnalysis;
}

export interface ImageAnalysis {
  contentRelevance: number;
  seoOptimization: number;
  visualAppeal: number;
  emotionalResonance: number;
  brandAlignment: number;
  technicalQuality: number;
  suggestions: string[];
}

export interface ImageSearchFilters {
  source: 'all' | 'unsplash' | 'pexels' | 'pixabay' | 'freepik';
  orientation: 'all' | 'landscape' | 'portrait' | 'square';
  color: 'all' | 'red' | 'blue' | 'green' | 'yellow' | 'orange' | 'purple' | 'black' | 'white';
  minSeoScore: number;
  minRelevanceScore: number;
  minQualityScore: number;
}

export interface ImageSearchOptions {
  query: string;
  contentContext?: string;
  targetAudience?: string;
  filters?: Partial<ImageSearchFilters>;
  limit?: number;
}

export interface ImageWizardConfig {
  maxSelections: number;
  enableAnalysis: boolean;
  enableFilters: boolean;
  defaultSource: string;
  apiKeys: {
    unsplash?: string;
    pexels?: string;
    pixabay?: string;
    freepik?: string;
  };
}

export interface ImageOptimizationSuggestion {
  type: 'seo' | 'performance' | 'accessibility' | 'social' | 'branding';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
}

export interface ImageMetrics {
  totalImages: number;
  selectedImages: number;
  averageSeoScore: number;
  averageRelevanceScore: number;
  averageQualityScore: number;
  sourceDistribution: Record<string, number>;
  emotionalImpactDistribution: Record<string, number>;
}
