import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  ExternalLink,
  TrendingUp,
  FileText,
  Link,
  Share2,
  Target,
  BarChart3,
  Eye,
  AlertTriangle
} from 'lucide-react';

import { CompetitorData } from './types';

interface CompetitorAnalysisProps {
  competitors: CompetitorData[];
  targetKeyword: string;
  className?: string;
}

const CompetitorAnalysis: React.FC<CompetitorAnalysisProps> = ({
  competitors,
  targetKeyword,
  className = ''
}) => {
  const [sortBy, setSortBy] = useState<'ranking' | 'authority' | 'backlinks' | 'social'>('ranking');

  const sortedCompetitors = [...competitors].sort((a, b) => {
    switch (sortBy) {
      case 'ranking':
        return a.ranking - b.ranking;
      case 'authority':
        return b.domainAuthority - a.domainAuthority;
      case 'backlinks':
        return b.backlinks - a.backlinks;
      case 'social':
        const aTotalShares = Object.values(a.socialShares).reduce((sum, val) => sum + val, 0);
        const bTotalShares = Object.values(b.socialShares).reduce((sum, val) => sum + val, 0);
        return bTotalShares - aTotalShares;
      default:
        return 0;
    }
  });

  const getAuthorityColor = (authority: number) => {
    if (authority >= 70) return 'text-green-600 bg-green-50';
    if (authority >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getRankingBadge = (ranking: number) => {
    if (ranking <= 3) return 'bg-green-600 text-white';
    if (ranking <= 10) return 'bg-blue-600 text-white';
    return 'bg-gray-600 text-white';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getTotalSocialShares = (shares: CompetitorData['socialShares']) => {
    return Object.values(shares).reduce((sum, val) => sum + val, 0);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>Análise de Concorrentes</span>
          </CardTitle>
          <CardDescription>
            Análise de {competitors.length} principais concorrentes para "{targetKeyword}"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border rounded px-3 py-1 text-sm"
            >
              <option value="ranking">Posição no Google</option>
              <option value="authority">Autoridade do Domínio</option>
              <option value="backlinks">Backlinks</option>
              <option value="social">Compartilhamentos</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Competitors List */}
      <div className="space-y-6">
        {sortedCompetitors.map((competitor, index) => (
          <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Badge className={getRankingBadge(competitor.ranking)}>
                    #{competitor.ranking}
                  </Badge>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {competitor.title}
                    </h3>
                    <p className="text-blue-600 text-sm">{competitor.domain}</p>
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(competitor.url, '_blank')}
                  className="flex items-center space-x-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Visitar</span>
                </Button>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className={`text-2xl font-bold p-2 rounded ${getAuthorityColor(competitor.domainAuthority)}`}>
                    {competitor.domainAuthority}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Domain Authority</div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Link className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatNumber(competitor.backlinks)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Backlinks</div>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatNumber(competitor.contentLength)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Palavras</div>
                </div>

                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Share2 className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatNumber(getTotalSocialShares(competitor.socialShares))}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Shares</div>
                </div>
              </div>

              {/* Authority Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Autoridade do Domínio</span>
                  <span>{competitor.domainAuthority}/100</span>
                </div>
                <Progress 
                  value={competitor.domainAuthority} 
                  className="h-3"
                />
              </div>

              {/* Social Shares Breakdown */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Compartilhamentos por Plataforma
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <span className="text-sm">Facebook: {formatNumber(competitor.socialShares.facebook)}</span>
                  </div>
                  <div className="flex items-center space-x-2 p-2 bg-sky-50 rounded">
                    <div className="w-3 h-3 bg-sky-600 rounded-full"></div>
                    <span className="text-sm">Twitter: {formatNumber(competitor.socialShares.twitter)}</span>
                  </div>
                  <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
                    <div className="w-3 h-3 bg-blue-800 rounded-full"></div>
                    <span className="text-sm">LinkedIn: {formatNumber(competitor.socialShares.linkedin)}</span>
                  </div>
                  <div className="flex items-center space-x-2 p-2 bg-orange-50 rounded">
                    <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                    <span className="text-sm">Reddit: {formatNumber(competitor.socialShares.reddit)}</span>
                  </div>
                </div>
              </div>

              {/* Keywords Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-1">
                    <Target className="h-4 w-4 text-green-600" />
                    <span>Palavras-chave Utilizadas</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {competitor.keywordsUsed.slice(0, 8).map((keyword, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                    {competitor.keywordsUsed.length > 8 && (
                      <Badge variant="secondary" className="text-xs">
                        +{competitor.keywordsUsed.length - 8} mais
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-1">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span>Oportunidades Perdidas</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {competitor.missingKeywords.slice(0, 6).map((keyword, idx) => (
                      <Badge key={idx} variant="destructive" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                    {competitor.missingKeywords.length > 6 && (
                      <Badge variant="secondary" className="text-xs">
                        +{competitor.missingKeywords.length - 6} mais
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Content Gaps */}
              {competitor.contentGaps.length > 0 && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>Lacunas de Conteúdo Identificadas</span>
                  </h4>
                  <ul className="space-y-1">
                    {competitor.contentGaps.slice(0, 4).map((gap, idx) => (
                      <li key={idx} className="text-sm text-yellow-700 flex items-start space-x-2">
                        <span className="text-yellow-600">•</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                  {competitor.contentGaps.length > 4 && (
                    <p className="text-xs text-yellow-600 mt-2">
                      +{competitor.contentGaps.length - 4} lacunas adicionais identificadas
                    </p>
                  )}
                </div>
              )}

              {/* Competitive Advantage */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">
                  Vantagem Competitiva
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600 font-medium">Força:</span>
                    <p className="text-blue-700">
                      {competitor.domainAuthority > 70 ? 'Alta autoridade' : 
                       competitor.backlinks > 1000 ? 'Muitos backlinks' : 
                       'Conteúdo extenso'}
                    </p>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Fraqueza:</span>
                    <p className="text-blue-700">
                      {competitor.missingKeywords.length > 5 ? 'Palavras-chave perdidas' :
                       getTotalSocialShares(competitor.socialShares) < 100 ? 'Baixo engajamento social' :
                       'Conteúdo desatualizado'}
                    </p>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Oportunidade:</span>
                    <p className="text-blue-700">
                      {competitor.contentGaps.length > 0 ? 'Lacunas de conteúdo' : 'Melhor SEO técnico'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {competitors.length === 0 && (
        <Card className="border-0 shadow-lg">
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum concorrente encontrado
            </h3>
            <p className="text-gray-600">
              Execute uma nova análise SEO para identificar concorrentes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CompetitorAnalysis;
