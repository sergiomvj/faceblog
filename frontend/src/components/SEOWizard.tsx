import React, { useState, useEffect } from 'react';
import { 
  LightBulbIcon, 
  ChartBarIcon, 
  LinkIcon, 
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface SEOAnalysis {
  topicAnalysis: {
    mainTopic: string;
    themes: Array<{ term: string; frequency: number; relevance: number }>;
    niche: string;
    confidence: number;
    readabilityScore: number;
    wordCount: number;
  };
  trends: {
    trendingTerms: Array<{ term: string; growth: string; source: string }>;
    popularQuestions: {
      what: string[];
      how: string[];
      why: string[];
      when: string[];
      where: string[];
    };
    opportunities: Array<{ keyword: string; type: string; potential: string; reason: string }>;
  };
  externalLinks: {
    authorityLinks: Array<{ title: string; url: string; domain: string; authorityScore: number }>;
    recommendations: Array<{ title: string; url: string; reason: string; priority: string }>;
  };
  seoSuggestions: {
    title: Array<{ title: string; score: number; reason: string }>;
    description: Array<{ description: string; length: number; score: number; reason: string }>;
    keywords: Array<{ keyword: string; frequency: number; difficulty: string; opportunity: number }>;
    improvements: string[];
  };
  overallScore: number;
  actionItems: Array<{ type: string; priority: string; action: string; description: string }>;
}

interface SEOWizardProps {
  title: string;
  content: string;
  category?: string;
  metaDescription?: string;
  onSuggestionApply: (type: string, value: string) => void;
  onAnalysisComplete?: (analysis: SEOAnalysis) => void;
}

const SEOWizard: React.FC<SEOWizardProps> = ({
  title,
  content,
  category,
  metaDescription,
  onSuggestionApply,
  onAnalysisComplete
}) => {
  const [analysis, setAnalysis] = useState<SEOAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState<string | null>(null);

  // Realizar análise SEO quando o conteúdo mudar
  useEffect(() => {
    if (title && content && title.length > 5 && content.length > 50) {
      performSEOAnalysis();
    }
  }, [title, content, category]);

  const performSEOAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/seo/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          category,
          meta_description: metaDescription
        }),
      });

      if (!response.ok) {
        throw new Error('Erro na análise SEO');
      }

      const result = await response.json();
      setAnalysis(result.data);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(result.data);
      }
    } catch (error) {
      console.error('Erro na análise SEO:', error);
      setError('Não foi possível realizar a análise SEO. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!title || !content || title.length < 5 || content.length < 50) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center">
          <SparklesIcon className="h-6 w-6 text-blue-600 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-blue-900">Assistente SEO Inteligente</h3>
            <p className="text-blue-700 mt-1">
              Digite um título e conteúdo para começar a análise SEO automática
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Analisando SEO...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-red-900">Erro na Análise</h3>
            <p className="text-red-700 mt-1">{error}</p>
            <button
              onClick={performSEOAnalysis}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const tabs = [
    { id: 'overview', name: 'Visão Geral', icon: ChartBarIcon },
    { id: 'trends', name: 'Tendências', icon: SparklesIcon },
    { id: 'links', name: 'Links Externos', icon: LinkIcon },
    { id: 'suggestions', name: 'Sugestões', icon: LightBulbIcon },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <SparklesIcon className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Assistente SEO Inteligente</h3>
              <p className="text-sm text-gray-500">
                Assunto: <span className="font-medium">{analysis.topicAnalysis.mainTopic}</span> • 
                Nicho: <span className="font-medium">{analysis.topicAnalysis.niche}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBgColor(analysis.overallScore)} ${getScoreColor(analysis.overallScore)}`}>
              Score SEO: {analysis.overallScore}/100
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Métricas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <ChartBarIcon className="h-5 w-5 text-gray-600 mr-2" />
                  <span className="text-sm font-medium text-gray-600">Confiança</span>
                </div>
                <div className={`text-2xl font-bold mt-1 ${getScoreColor(analysis.topicAnalysis.confidence)}`}>
                  {analysis.topicAnalysis.confidence}%
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <EyeIcon className="h-5 w-5 text-gray-600 mr-2" />
                  <span className="text-sm font-medium text-gray-600">Legibilidade</span>
                </div>
                <div className={`text-2xl font-bold mt-1 ${getScoreColor(analysis.topicAnalysis.readabilityScore)}`}>
                  {analysis.topicAnalysis.readabilityScore}/100
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-600">Palavras</span>
                </div>
                <div className="text-2xl font-bold mt-1 text-gray-900">
                  {analysis.topicAnalysis.wordCount}
                </div>
              </div>
            </div>

            {/* Itens de Ação */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Itens de Ação</h4>
              <div className="space-y-3">
                {analysis.actionItems.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg">
                    <div className={`px-2 py-1 rounded text-xs font-medium mr-3 ${getPriorityColor(item.priority)}`}>
                      {item.priority.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{item.action}</h5>
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="space-y-6">
            {/* Termos em Tendência */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Termos em Tendência</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.trends.trendingTerms.slice(0, 6).map((term, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">{term.term}</span>
                      <span className="text-sm text-gray-500 ml-2">({term.source})</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-green-600 font-medium">{term.growth}</span>
                      <button
                        onClick={() => onSuggestionApply('keyword', term.term)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <ArrowRightIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Perguntas Populares */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Perguntas Populares</h4>
              <div className="space-y-2">
                {Object.entries(analysis.trends.popularQuestions).map(([type, questions]) => 
                  questions.slice(0, 2).map((question, index) => (
                    <div key={`${type}-${index}`} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-gray-900">{question}</span>
                      <button
                        onClick={() => onSuggestionApply('question', question)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ArrowRightIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'links' && (
          <div className="space-y-6">
            {/* Links de Autoridade */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Links de Alta Autoridade</h4>
              <div className="space-y-3">
                {analysis.externalLinks.authorityLinks.slice(0, 5).map((link, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{link.title}</h5>
                      <p className="text-sm text-gray-500">{link.domain}</p>
                      <div className="flex items-center mt-1">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          DA: {link.authorityScore}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => onSuggestionApply('link', link.url)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="space-y-6">
            {/* Sugestões de Título */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Sugestões de Título</h4>
              <div className="space-y-3">
                {analysis.seoSuggestions.title.slice(0, 3).map((suggestion, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{suggestion.title}</h5>
                      <p className="text-sm text-gray-500">{suggestion.reason}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${getScoreColor(suggestion.score)}`}>
                        {suggestion.score}/100
                      </span>
                      <button
                        onClick={() => onSuggestionApply('title', suggestion.title)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sugestões de Meta Description */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Sugestões de Meta Description</h4>
              <div className="space-y-3">
                {analysis.seoSuggestions.description.slice(0, 3).map((suggestion, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <p className="text-gray-900">{suggestion.description}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {suggestion.length} caracteres • {suggestion.reason}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${getScoreColor(suggestion.score)}`}>
                        {suggestion.score}/100
                      </span>
                      <button
                        onClick={() => onSuggestionApply('description', suggestion.description)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SEOWizard;
