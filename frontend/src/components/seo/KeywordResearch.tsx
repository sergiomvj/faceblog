import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  DollarSign,
  BarChart3,
  Lightbulb,
  Copy,
  ExternalLink
} from 'lucide-react';

import { KeywordData } from './types';

interface KeywordResearchProps {
  keywords: KeywordData[];
  targetKeyword: string;
  onKeywordSelect?: (keyword: string) => void;
  className?: string;
}

const KeywordResearch: React.FC<KeywordResearchProps> = ({
  keywords,
  targetKeyword,
  onKeywordSelect,
  className = ''
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [sortBy, setSortBy] = useState<'volume' | 'difficulty' | 'cpc'>('volume');
  const [filterBy, setFilterBy] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  const filteredKeywords = keywords
    .filter(kw => 
      kw.keyword.toLowerCase().includes(searchFilter.toLowerCase()) &&
      (filterBy === 'all' || kw.competition === filterBy)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'volume':
          return b.searchVolume - a.searchVolume;
        case 'difficulty':
          return a.difficulty - b.difficulty;
        case 'cpc':
          return b.cpc - a.cpc;
        default:
          return 0;
      }
    });

  const getCompetitionColor = (competition: string) => {
    switch (competition) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getIntentColor = (intent: string) => {
    switch (intent) {
      case 'commercial':
        return 'bg-blue-100 text-blue-800';
      case 'transactional':
        return 'bg-purple-100 text-purple-800';
      case 'navigational':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 30) return 'text-green-600';
    if (difficulty <= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toString();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-600" />
            <span>Pesquisa de Palavras-chave</span>
          </CardTitle>
          <CardDescription>
            Análise detalhada de {keywords.length} palavras-chave relacionadas a "{targetKeyword}"
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1">
              <Input
                placeholder="Filtrar palavras-chave..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'volume' | 'difficulty' | 'cpc')}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value="volume">Volume de Busca</option>
                <option value="difficulty">Dificuldade</option>
                <option value="cpc">CPC</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Competição:</span>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as 'all' | 'low' | 'medium' | 'high')}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value="all">Todas</option>
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keywords List */}
      <div className="space-y-4">
        {filteredKeywords.map((keyword, index) => (
          <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Keyword Header */}
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {keyword.keyword}
                    </h3>
                    {keyword.keyword === targetKeyword && (
                      <Badge variant="default" className="bg-blue-600">
                        Principal
                      </Badge>
                    )}
                    <Badge className={getIntentColor(keyword.intent)}>
                      {keyword.intent}
                    </Badge>
                    <div className="flex items-center space-x-1">
                      {getTrendIcon(keyword.trend)}
                      <span className="text-sm text-gray-600 capitalize">
                        {keyword.trend}
                      </span>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-center mb-1">
                        <Search className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="text-xl font-bold text-blue-600">
                        {formatVolume(keyword.searchVolume)}
                      </div>
                      <div className="text-xs text-gray-600">Volume/mês</div>
                    </div>

                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-center mb-1">
                        <BarChart3 className={`h-4 w-4 ${getDifficultyColor(keyword.difficulty)}`} />
                      </div>
                      <div className={`text-xl font-bold ${getDifficultyColor(keyword.difficulty)}`}>
                        {keyword.difficulty}
                      </div>
                      <div className="text-xs text-gray-600">Dificuldade</div>
                    </div>

                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-center mb-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="text-xl font-bold text-green-600">
                        R$ {keyword.cpc.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-600">CPC</div>
                    </div>

                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <Badge className={getCompetitionColor(keyword.competition)} variant="outline">
                        {keyword.competition.toUpperCase()}
                      </Badge>
                      <div className="text-xs text-gray-600 mt-1">Competição</div>
                    </div>
                  </div>

                  {/* Difficulty Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Dificuldade SEO</span>
                      <span>{keyword.difficulty}/100</span>
                    </div>
                    <Progress 
                      value={keyword.difficulty} 
                      className="h-2"
                    />
                  </div>

                  {/* Related Keywords */}
                  {keyword.relatedKeywords.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Palavras-chave Relacionadas
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {keyword.relatedKeywords.slice(0, 5).map((related, idx) => (
                          <Badge 
                            key={idx} 
                            variant="outline" 
                            className="cursor-pointer hover:bg-blue-50"
                            onClick={() => onKeywordSelect?.(related)}
                          >
                            {related}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Long Tail Suggestions */}
                  {keyword.longTailSuggestions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-1">
                        <Lightbulb className="h-4 w-4 text-yellow-600" />
                        <span>Sugestões Long-tail</span>
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {keyword.longTailSuggestions.slice(0, 4).map((suggestion, idx) => (
                          <Badge 
                            key={idx} 
                            variant="secondary" 
                            className="cursor-pointer hover:bg-gray-200"
                            onClick={() => onKeywordSelect?.(suggestion)}
                          >
                            {suggestion}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col space-y-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(keyword.keyword)}
                    className="flex items-center space-x-1"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copiar</span>
                  </Button>
                  
                  {onKeywordSelect && (
                    <Button
                      size="sm"
                      onClick={() => onKeywordSelect(keyword.keyword)}
                      className="flex items-center space-x-1"
                    >
                      <Target className="h-3 w-3" />
                      <span>Usar</span>
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(keyword.keyword)}`, '_blank')}
                    className="flex items-center space-x-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Google</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredKeywords.length === 0 && (
        <Card className="border-0 shadow-lg">
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma palavra-chave encontrada
            </h3>
            <p className="text-gray-600">
              Tente ajustar os filtros ou realizar uma nova análise.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default KeywordResearch;
