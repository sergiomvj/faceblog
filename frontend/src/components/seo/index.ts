// SEO Component Exports - FaceBlog Standalone SEO System
export { default as SEOWizard } from './SEOWizard';
export { default as TrendingSuggestions } from '../TrendingSuggestions';
export { default as KeywordResearch } from './KeywordResearch';
export { default as CompetitorAnalysis } from './CompetitorAnalysis';
export { default as SEOAnalyzer } from './SEOAnalyzer';
export { default as ExternalLinkSuggestions } from './ExternalLinkSuggestions';

// Types
export type {
  SEOAnalysisResult,
  KeywordData,
  CompetitorData,
  TrendingData,
  ExternalLink,
  SEOScore
} from './types';

// Hooks
export { useSEOAnalysis } from './hooks/useSEOAnalysis';
export { useGoogleTrends } from './hooks/useGoogleTrends';
export { useBuzzSumo } from './hooks/useBuzzSumo';
export { useKeywordPlanner } from './hooks/useKeywordPlanner';
