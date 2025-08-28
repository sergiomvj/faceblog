import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Eye,
  FileText,
  Search,
  Target,
  BarChart3,
  CheckCircle,
  AlertCircle,
  XCircle,
  Lightbulb,
  TrendingUp,
  Clock,
  Users
} from 'lucide-react';

import { SEOScore } from './types';

interface SEOAnalyzerProps {
  content: string;
  score: SEOScore;
  suggestions: Array<{
    category: string;
    issue: string;
    impact: 'high' | 'medium' | 'low';
    solution: string;
  }>;
  className?: string;
}

const SEOAnalyzer: React.FC<SEOAnalyzerProps> = ({
  content,
  score,
  suggestions,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const getScoreColor = (scoreValue: number) => {
    if (scoreValue >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (scoreValue >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreIcon = (scoreValue: number) => {
    if (scoreValue >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (scoreValue >= 60) return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const analyzeContentStructure = () => {
    const lines = content.split('\n');
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    const charCount = content.length;
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0).length;
    
    // Detect headings (simplified)
    const headings = lines.filter(line => 
      line.trim().startsWith('#') || 
      line.trim().match(/^[A-Z][^.!?]*$/) && line.trim().length < 100
    ).length;

    // Detect lists
    const lists = lines.filter(line => 
      line.trim().startsWith('-') || 
      line.trim().startsWith('*') || 
      line.trim().match(/^\d+\./)
    ).length;

    // Average sentence length
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((acc, sentence) => 
      acc + sentence.split(/\s+/).length, 0
    ) / sentences.length || 0;

    return {
      wordCount,
      charCount,
      paragraphs,
      headings,
      lists,
      sentences: sentences.length,
      avgSentenceLength: Math.round(avgSentenceLength)
    };
  };

  const analyzeReadability = () => {
    const structure = analyzeContentStructure();
    
    // Simple readability metrics
    const readabilityScore = Math.max(0, Math.min(100, 
      100 - (structure.avgSentenceLength - 15) * 2
    ));

    const readabilityLevel = readabilityScore >= 80 ? 'Fácil' :
                            readabilityScore >= 60 ? 'Médio' : 'Difícil';

    return {
      score: Math.round(readabilityScore),
      level: readabilityLevel,
      avgWordsPerSentence: structure.avgSentenceLength
    };
  };

  const analyzeKeywordDensity = () => {
    const words = content.toLowerCase().split(/\s+/);
    const totalWords = words.length;
    
    // Count word frequency
    const frequency: { [key: string]: number } = {};
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 3) {
        frequency[cleanWord] = (frequency[cleanWord] || 0) + 1;
      }
    });

    // Get top keywords
    const topKeywords = Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({
        word,
        count,
        density: ((count / totalWords) * 100).toFixed(2)
      }));

    return topKeywords;
  };

  const structure = analyzeContentStructure();
  const readability = analyzeReadability();
  const keywordDensity = analyzeKeywordDensity();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5 text-blue-600" />
            <span>Análise Detalhada de SEO</span>
          </CardTitle>
          <CardDescription>
            Análise completa do conteúdo com {structure.wordCount} palavras
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-gray-100">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="structure">Estrutura</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="suggestions">Sugestões</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Score Overview */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className={`border-2 ${getScoreColor(score.overall)}`}>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  {getScoreIcon(score.overall)}
                </div>
                <div className="text-2xl font-bold">{score.overall}</div>
                <div className="text-sm font-medium">Geral</div>
                <Progress value={score.overall} className="mt-2 h-2" />
              </CardContent>
            </Card>

            <Card className={`border-2 ${getScoreColor(score.keyword)}`}>
              <CardContent className="p-4 text-center">
                <Target className="h-5 w-5 mx-auto mb-2" />
                <div className="text-2xl font-bold">{score.keyword}</div>
                <div className="text-sm font-medium">Keywords</div>
                <Progress value={score.keyword} className="mt-2 h-2" />
              </CardContent>
            </Card>

            <Card className={`border-2 ${getScoreColor(score.content)}`}>
              <CardContent className="p-4 text-center">
                <FileText className="h-5 w-5 mx-auto mb-2" />
                <div className="text-2xl font-bold">{score.content}</div>
                <div className="text-sm font-medium">Conteúdo</div>
                <Progress value={score.content} className="mt-2 h-2" />
              </CardContent>
            </Card>

            <Card className={`border-2 ${getScoreColor(score.technical)}`}>
              <CardContent className="p-4 text-center">
                <Search className="h-5 w-5 mx-auto mb-2" />
                <div className="text-2xl font-bold">{score.technical}</div>
                <div className="text-sm font-medium">Técnico</div>
                <Progress value={score.technical} className="mt-2 h-2" />
              </CardContent>
            </Card>

            <Card className={`border-2 ${getScoreColor(score.backlinks)}`}>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-5 w-5 mx-auto mb-2" />
                <div className="text-2xl font-bold">{score.backlinks}</div>
                <div className="text-sm font-medium">Backlinks</div>
                <Progress value={score.backlinks} className="mt-2 h-2" />
              </CardContent>
            </Card>

            <Card className={`border-2 ${getScoreColor(score.social)}`}>
              <CardContent className="p-4 text-center">
                <Users className="h-5 w-5 mx-auto mb-2" />
                <div className="text-2xl font-bold">{score.social}</div>
                <div className="text-sm font-medium">Social</div>
                <Progress value={score.social} className="mt-2 h-2" />
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Estatísticas Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{structure.wordCount}</div>
                  <div className="text-sm text-gray-600">Palavras</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{structure.sentences}</div>
                  <div className="text-sm text-gray-600">Frases</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{structure.paragraphs}</div>
                  <div className="text-sm text-gray-600">Parágrafos</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{readability.score}</div>
                  <div className="text-sm text-gray-600">Legibilidade</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Structure Tab */}
        <TabsContent value="structure" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Content Structure */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Estrutura do Conteúdo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span>Total de palavras</span>
                  <Badge variant={structure.wordCount >= 300 ? 'default' : 'destructive'}>
                    {structure.wordCount}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span>Caracteres</span>
                  <Badge variant="outline">{structure.charCount}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span>Parágrafos</span>
                  <Badge variant={structure.paragraphs >= 3 ? 'default' : 'secondary'}>
                    {structure.paragraphs}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span>Headings detectados</span>
                  <Badge variant={structure.headings > 0 ? 'default' : 'destructive'}>
                    {structure.headings}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span>Listas detectadas</span>
                  <Badge variant={structure.lists > 0 ? 'default' : 'secondary'}>
                    {structure.lists}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Readability */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Análise de Legibilidade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {readability.score}
                  </div>
                  <div className="text-lg font-semibold text-blue-800">
                    {readability.level}
                  </div>
                  <Progress value={readability.score} className="mt-3" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Palavras por frase</span>
                    <Badge variant={readability.avgWordsPerSentence <= 20 ? 'default' : 'destructive'}>
                      {readability.avgWordsPerSentence}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Total de frases</span>
                    <Badge variant="outline">{structure.sentences}</Badge>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">Dicas de Legibilidade</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Mantenha frases com menos de 20 palavras</li>
                    <li>• Use parágrafos curtos (3-4 frases)</li>
                    <li>• Inclua listas e headings para organizar</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Keywords Tab */}
        <TabsContent value="keywords" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Densidade de Palavras-chave</CardTitle>
              <CardDescription>
                Top 10 palavras mais frequentes no conteúdo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {keywordDensity.map((keyword, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <span className="font-medium">{keyword.word}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600">{keyword.count}x</span>
                      <Badge variant={
                        parseFloat(keyword.density) >= 1 && parseFloat(keyword.density) <= 3 
                          ? 'default' 
                          : 'secondary'
                      }>
                        {keyword.density}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Densidade Ideal</h4>
                <p className="text-sm text-blue-700">
                  A densidade ideal de palavra-chave principal deve estar entre 1-3%. 
                  Densidades muito altas podem ser penalizadas pelos mecanismos de busca.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                <span>Sugestões de Melhoria</span>
              </CardTitle>
              <CardDescription>
                {suggestions.length} sugestões para otimizar seu conteúdo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Badge className={getImpactColor(suggestion.impact)}>
                          {suggestion.impact.toUpperCase()}
                        </Badge>
                        <span className="font-medium text-gray-600">
                          {suggestion.category}
                        </span>
                      </div>
                    </div>
                    
                    <h4 className="font-semibold text-gray-900 mb-2">
                      {suggestion.issue}
                    </h4>
                    
                    <p className="text-blue-600 text-sm">
                      <strong>Solução:</strong> {suggestion.solution}
                    </p>
                  </div>
                ))}
              </div>

              {suggestions.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Excelente trabalho!
                  </h3>
                  <p className="text-gray-600">
                    Seu conteúdo está bem otimizado. Continue assim!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SEOAnalyzer;
