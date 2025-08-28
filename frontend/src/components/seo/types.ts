// SEO Component Types - FaceBlog Standalone SEO System

export interface TrendingData {
  mainTopic: string;
  niche: string;
  geo: string;
  timestamp: number;
  trendingTerms: Array<{
    term: string;
    growth: string;
    source: string;
    searchVolume?: number;
    competition?: 'low' | 'medium' | 'high';
  }>;
  popularQuestions: {
    what: string[];
    how: string[];
    why: string[];
    when: string[];
    where: string[];
  };
  seasonalTrends: {
    peakMonths: number[];
    lowMonths: number[];
    currentTrend: string;
    prediction: string;
  };
  opportunities: Array<{
    keyword: string;
    type: string;
    potential: string;
    reason: string;
    difficulty?: number;
    cpc?: number;
  }>;
}

export interface KeywordData {
  keyword: string;
  searchVolume: number;
  competition: 'low' | 'medium' | 'high';
  cpc: number;
  difficulty: number;
  trend: 'rising' | 'stable' | 'declining';
  relatedKeywords: string[];
  longTailSuggestions: string[];
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
}

export interface CompetitorData {
  domain: string;
  title: string;
  url: string;
  ranking: number;
  backlinks: number;
  domainAuthority: number;
  contentLength: number;
  keywordsUsed: string[];
  missingKeywords: string[];
  contentGaps: string[];
  socialShares: {
    facebook: number;
    twitter: number;
    linkedin: number;
    reddit: number;
  };
}

export interface ExternalLink {
  domain: string;
  url: string;
  title: string;
  domainAuthority: number;
  relevanceScore: number;
  linkType: 'resource' | 'statistic' | 'study' | 'tool' | 'guide';
  anchorTextSuggestion: string;
  contextSuggestion: string;
}

export interface SEOScore {
  overall: number;
  keyword: number;
  content: number;
  technical: number;
  backlinks: number;
  social: number;
  suggestions: Array<{
    category: string;
    issue: string;
    impact: 'high' | 'medium' | 'low';
    solution: string;
  }>;
}

export interface SEOAnalysisResult {
  content: string;
  targetKeyword: string;
  keywords: KeywordData[];
  competitors: CompetitorData[];
  externalLinks: ExternalLink[];
  trending: TrendingData;
  score: SEOScore;
  recommendations: Array<{
    type: 'keyword' | 'content' | 'structure' | 'links';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    implementation: string;
  }>;
  viralPotential: {
    score: number;
    factors: string[];
    socialTriggers: string[];
    shareabilityTips: string[];
  };
}

export interface SEOWizardProps {
  content?: string;
  targetKeyword?: string;
  niche?: string;
  geo?: string;
  onAnalysisComplete?: (result: SEOAnalysisResult) => void;
  className?: string;
}

export interface GoogleTrendsResponse {
  keyword: string;
  interest: Array<{
    time: string;
    value: number;
  }>;
  relatedQueries: Array<{
    query: string;
    value: number;
  }>;
  risingQueries: Array<{
    query: string;
    value: number;
  }>;
  geo: string;
  timeframe: string;
}

export interface BuzzSumoResponse {
  articles: Array<{
    title: string;
    url: string;
    domain: string;
    shares: {
      facebook: number;
      twitter: number;
      linkedin: number;
      pinterest: number;
      reddit: number;
    };
    totalShares: number;
    publishedDate: string;
    contentType: string;
    wordCount: number;
  }>;
  influencers: Array<{
    name: string;
    handle: string;
    platform: string;
    followers: number;
    engagement: number;
    relevanceScore: number;
  }>;
}

export interface KeywordPlannerResponse {
  keywords: Array<{
    keyword: string;
    avgMonthlySearches: number;
    competition: 'LOW' | 'MEDIUM' | 'HIGH';
    competitionIndex: number;
    lowTopOfPageBid: number;
    highTopOfPageBid: number;
    keywordIdeaMetrics: {
      avgMonthlySearches: number;
      competition: string;
      competitionIndex: number;
    };
  }>;
  adGroupIdeas: Array<{
    adGroup: string;
    keywords: string[];
  }>;
}
