import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface ContentAnalysis {
  wordCount: number;
  readabilityScore: number;
  keywordDensity: { [key: string]: number };
  headingStructure: {
    h1: number;
    h2: number;
    h3: number;
    h4: number;
  };
  sentenceLength: {
    average: number;
    longest: number;
    shortest: number;
  };
  paragraphCount: number;
  readingTime: number;
  issues: Array<{
    type: 'error' | 'warning' | 'suggestion';
    message: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  suggestions: Array<{
    type: string;
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
  }>;
}

interface ContentOptimizerProps {
  title: string;
  content: string;
  targetKeywords?: string[];
  onOptimizationApply: (type: string, value: string) => void;
  className?: string;
}

const ContentOptimizer: React.FC<ContentOptimizerProps> = ({
  title,
  content,
  targetKeywords = [],
  onOptimizationApply,
  className = ''
}) => {
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (title && content && content.length > 50) {
      analyzeContent();
    }
  }, [title, content, targetKeywords]);

  const analyzeContent = async () => {
    setLoading(true);

    try {
      // Análise local do conteúdo
      const localAnalysis = performLocalAnalysis(title, content, targetKeywords);
      setAnalysis(localAnalysis);
    } catch (error) {
      console.error('Erro na análise de conteúdo:', error);
    } finally {
      setLoading(false);
    }
  };

  const performLocalAnalysis = (title: string, content: string, keywords: string[]): ContentAnalysis => {
    // Análise básica de texto
    const words = content.split(/\s+/).filter(word => word.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    // Contagem de headings
    const headingMatches = {
      h1: (content.match(/^# /gm) || []).length,
      h2: (content.match(/^## /gm) || []).length,
      h3: (content.match(/^### /gm) || []).length,
      h4: (content.match(/^#### /gm) || []).length,
    };

    // Análise de sentenças
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
    const avgSentenceLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length || 0;

    // Densidade de palavras-chave
    const keywordDensity: { [key: string]: number } = {};
    const contentLower = content.toLowerCase();
    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      const matches = (contentLower.match(new RegExp(keywordLower, 'g')) || []).length;
      keywordDensity[keyword] = (matches / words.length) * 100;
    });

    // Score de legibilidade (simplificado)
    const readabilityScore = calculateReadabilityScore(avgSentenceLength, words.length, sentences.length);

    // Tempo de leitura (250 palavras por minuto)
    const readingTime = Math.ceil(words.length / 250);

    // Identificar problemas e sugestões
    const issues = identifyIssues(words.length, readabilityScore, headingMatches, keywordDensity, avgSentenceLength);
    const suggestions = generateSuggestions(words.length, readabilityScore, headingMatches, keywordDensity);

    return {
      wordCount: words.length,
      readabilityScore,
      keywordDensity,
      headingStructure: headingMatches,
      sentenceLength: {
        average: Math.round(avgSentenceLength),
        longest: Math.max(...sentenceLengths, 0),
        shortest: Math.min(...sentenceLengths, 0)
      },
      paragraphCount: paragraphs.length,
      readingTime,
      issues,
      suggestions
    };
  };

  const calculateReadabilityScore = (avgSentenceLength: number, wordCount: number, sentenceCount: number): number => {
    // Fórmula simplificada baseada no Flesch Reading Ease
    const avgWordsPerSentence = wordCount / sentenceCount;
    let score = 206.835 - (1.015 * avgWordsPerSentence);
    
    // Normalizar para 0-100
    score = Math.max(0, Math.min(100, score));
    return Math.round(score);
  };

  const identifyIssues = (
    wordCount: number, 
    readabilityScore: number, 
    headings: any, 
    keywordDensity: any, 
    avgSentenceLength: number
  ) => {
    const issues = [];

    // Problemas de tamanho
    if (wordCount < 300) {
      issues.push({
        type: 'warning' as const,
        message: 'Conteúdo muito curto para SEO (menos de 300 palavras)',
        severity: 'high' as const
      });
    }

    // Problemas de legibilidade
    if (readabilityScore < 60) {
      issues.push({
        type: 'warning' as const,
        message: 'Legibilidade baixa - considere usar frases mais simples',
        severity: 'medium' as const
      });
    }

    // Problemas de estrutura
    if (headings.h1 === 0 && headings.h2 === 0) {
      issues.push({
        type: 'error' as const,
        message: 'Sem estrutura de headings - adicione H1 ou H2',
        severity: 'high' as const
      });
    }

    // Problemas de densidade de palavras-chave
    Object.entries(keywordDensity).forEach(([keyword, density]) => {
      if ((density as number) > 3) {
        issues.push({
          type: 'warning' as const,
          message: `Densidade alta da palavra-chave "${keyword}" (${(density as number).toFixed(1)}%)`,
          severity: 'medium' as const
        });
      } else if ((density as number) < 0.5) {
        issues.push({
          type: 'suggestion' as const,
          message: `Considere usar mais a palavra-chave "${keyword}"`,
          severity: 'low' as const
        });
      }
    });

    // Problemas de tamanho de sentenças
    if (avgSentenceLength > 25) {
      issues.push({
        type: 'suggestion' as const,
        message: 'Sentenças muito longas - considere dividir em frases menores',
        severity: 'medium' as const
      });
    }

    return issues;
  };

  const generateSuggestions = (wordCount: number, readabilityScore: number, headings: any, keywordDensity: any) => {
    const suggestions = [];

    // Sugestões de tamanho
    if (wordCount < 500) {
      suggestions.push({
        type: 'content_length',
        title: 'Expandir Conteúdo',
        description: 'Adicione mais detalhes, exemplos ou seções para atingir 500+ palavras',
        impact: 'high' as const
      });
    }

    // Sugestões de estrutura
    if (headings.h2 < 2) {
      suggestions.push({
        type: 'structure',
        title: 'Melhorar Estrutura',
        description: 'Adicione mais subtítulos (H2) para organizar melhor o conteúdo',
        impact: 'medium' as const
      });
    }

    // Sugestões de legibilidade
    if (readabilityScore < 70) {
      suggestions.push({
        type: 'readability',
        title: 'Melhorar Legibilidade',
        description: 'Use frases mais curtas e palavras mais simples',
        impact: 'medium' as const
      });
    }

    // Sugestões de SEO
    suggestions.push({
      type: 'seo',
      title: 'Otimização SEO',
      description: 'Adicione links internos e externos relevantes',
      impact: 'high' as const
    });

    return suggestions;
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

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />;
      case 'warning': return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />;
      case 'suggestion': return <LightBulbIcon className="h-4 w-4 text-blue-600" />;
      default: return <ExclamationTriangleIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getIssueColor = (type: string) => {
    switch (type) {
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'suggestion': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!title || !content || content.length < 50) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <DocumentTextIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>Digite conteúdo para análise de otimização</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Analisando conteúdo...</span>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const tabs = [
    { id: 'overview', name: 'Visão Geral', icon: ChartBarIcon },
    { id: 'issues', name: 'Problemas', icon: ExclamationTriangleIcon, count: analysis.issues.length },
    { id: 'suggestions', name: 'Sugestões', icon: LightBulbIcon, count: analysis.suggestions.length },
  ];

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <DocumentTextIcon className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Otimizador de Conteúdo</h3>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-1" />
              <span>{analysis.readingTime} min leitura</span>
            </div>
            <div className="flex items-center">
              <DocumentTextIcon className="h-4 w-4 mr-1" />
              <span>{analysis.wordCount} palavras</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6 px-4" aria-label="Tabs">
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
                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Icon className="h-4 w-4 mr-1" />
                {tab.name}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Métricas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Legibilidade</span>
                  <EyeIcon className="h-4 w-4 text-gray-400" />
                </div>
                <div className={`text-2xl font-bold mt-1 ${getScoreColor(analysis.readabilityScore)}`}>
                  {analysis.readabilityScore}/100
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Palavras</span>
                  <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                </div>
                <div className="text-2xl font-bold mt-1 text-gray-900">
                  {analysis.wordCount}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Parágrafos</span>
                  <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                </div>
                <div className="text-2xl font-bold mt-1 text-gray-900">
                  {analysis.paragraphCount}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Leitura</span>
                  <ClockIcon className="h-4 w-4 text-gray-400" />
                </div>
                <div className="text-2xl font-bold mt-1 text-gray-900">
                  {analysis.readingTime}min
                </div>
              </div>
            </div>

            {/* Estrutura de Headings */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">Estrutura de Headings</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(analysis.headingStructure).map(([level, count]) => (
                  <div key={level} className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{count}</div>
                    <div className="text-sm text-blue-800 uppercase">{level}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Densidade de Palavras-chave */}
            {Object.keys(analysis.keywordDensity).length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">Densidade de Palavras-chave</h4>
                <div className="space-y-2">
                  {Object.entries(analysis.keywordDensity).map(([keyword, density]) => (
                    <div key={keyword} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-900">{keyword}</span>
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                          <div
                            className={`h-2 rounded-full ${
                              density > 3 ? 'bg-red-500' : 
                              density > 1 ? 'bg-green-500' : 'bg-yellow-500'
                            }`}
                            style={{ width: `${Math.min(density * 20, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          {density.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'issues' && (
          <div className="space-y-3">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Problemas Identificados</h4>
            {analysis.issues.length > 0 ? (
              analysis.issues.map((issue, index) => (
                <div key={index} className={`flex items-start p-4 rounded-lg border ${getIssueColor(issue.type)}`}>
                  <div className="flex-shrink-0 mr-3 mt-0.5">
                    {getIssueIcon(issue.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900">{issue.message}</p>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        issue.severity === 'high' ? 'bg-red-100 text-red-800' :
                        issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {issue.severity === 'high' ? 'Alta' : 
                         issue.severity === 'medium' ? 'Média' : 'Baixa'} prioridade
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum problema encontrado! 🎉</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Sugestões de Melhoria</h4>
            {analysis.suggestions.map((suggestion, index) => (
              <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <LightBulbIcon className="h-5 w-5 text-blue-600 mr-2" />
                      <h5 className="font-medium text-gray-900">{suggestion.title}</h5>
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getImpactColor(suggestion.impact)}`}>
                        {suggestion.impact === 'high' ? 'Alto' : 
                         suggestion.impact === 'medium' ? 'Médio' : 'Baixo'} impacto
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                  </div>
                  <button
                    onClick={() => onOptimizationApply(suggestion.type, suggestion.title)}
                    className="ml-4 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Análise atualizada em tempo real
          </span>
          <span>
            {analysis.issues.filter(i => i.severity === 'high').length} problemas críticos
          </span>
        </div>
      </div>
    </div>
  );
};

export default ContentOptimizer;
