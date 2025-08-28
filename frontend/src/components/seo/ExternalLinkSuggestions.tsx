import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ExternalLink,
  BarChart3,
  Copy,
  CheckCircle,
  Star,
  TrendingUp,
  FileText,
  Database,
  Wrench as Tool,
  BookOpen
} from 'lucide-react';

import { ExternalLink as ExternalLinkType } from './types';

interface ExternalLinkSuggestionsProps {
  links: ExternalLinkType[];
  targetKeyword: string;
  className?: string;
}

const ExternalLinkSuggestions: React.FC<ExternalLinkSuggestionsProps> = ({
  links,
  targetKeyword,
  className = ''
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [filterByType, setFilterByType] = useState<'all' | 'resource' | 'statistic' | 'study' | 'tool' | 'guide'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'authority' | 'type'>('relevance');

  const filteredLinks = links
    .filter(link => 
      link.title.toLowerCase().includes(searchFilter.toLowerCase()) &&
      (filterByType === 'all' || link.linkType === filterByType)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return b.relevanceScore - a.relevanceScore;
        case 'authority':
          return b.domainAuthority - a.domainAuthority;
        case 'type':
          return a.linkType.localeCompare(b.linkType);
        default:
          return 0;
      }
    });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'resource':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'statistic':
        return <BarChart3 className="h-4 w-4 text-green-600" />;
      case 'study':
        return <Database className="h-4 w-4 text-purple-600" />;
      case 'tool':
        return <Tool className="h-4 w-4 text-orange-600" />;
      case 'guide':
        return <BookOpen className="h-4 w-4 text-indigo-600" />;
      default:
        return <ExternalLink className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'resource':
        return 'bg-blue-100 text-blue-800';
      case 'statistic':
        return 'bg-green-100 text-green-800';
      case 'study':
        return 'bg-purple-100 text-purple-800';
      case 'tool':
        return 'bg-orange-100 text-orange-800';
      case 'guide':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAuthorityColor = (authority: number) => {
    if (authority >= 70) return 'text-green-600';
    if (authority >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRelevanceStars = (score: number) => {
    const stars = Math.round(score / 20); // Convert 0-100 to 0-5 stars
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < stars ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copyLinkMarkdown = (link: ExternalLinkType) => {
    const markdown = `[${link.anchorTextSuggestion}](${link.url})`;
    copyToClipboard(markdown);
  };

  const getLinkTypeStats = () => {
    const stats = links.reduce((acc, link) => {
      acc[link.linkType] = (acc[link.linkType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(stats).map(([type, count]) => ({ type, count }));
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ExternalLink className="h-5 w-5 text-blue-600" />
            <span>Sugestões de Links Externos</span>
          </CardTitle>
          <CardDescription>
            {links.length} links de alta autoridade encontrados para "{targetKeyword}"
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Overview */}
      <Card className="border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            {getLinkTypeStats().map(({ type, count }) => (
              <div key={type} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center mb-1">
                  {getTypeIcon(type)}
                </div>
                <div className="text-xl font-bold text-gray-900">{count}</div>
                <div className="text-xs text-gray-600 capitalize">{type}s</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1">
              <Input
                placeholder="Filtrar por título ou domínio..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Tipo:</span>
              <select
                value={filterByType}
                onChange={(e) => setFilterByType(e.target.value as any)}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value="all">Todos</option>
                <option value="resource">Recursos</option>
                <option value="statistic">Estatísticas</option>
                <option value="study">Estudos</option>
                <option value="tool">Ferramentas</option>
                <option value="guide">Guias</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Ordenar:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value="relevance">Relevância</option>
                <option value="authority">Autoridade</option>
                <option value="type">Tipo</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Links List */}
      <div className="space-y-4">
        {filteredLinks.map((link, index) => (
          <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Link Header */}
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(link.linkType)}
                      <Badge className={getTypeColor(link.linkType)}>
                        {link.linkType.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {link.title}
                      </h3>
                      <p className="text-blue-600 text-sm">{link.domain}</p>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className={`text-xl font-bold ${getAuthorityColor(link.domainAuthority)}`}>
                          {link.domainAuthority}
                        </div>
                        <div className="text-xs text-gray-600">Domain Authority</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                      <div className="flex space-x-1">
                        {getRelevanceStars(link.relevanceScore)}
                      </div>
                      <div>
                        <div className="text-xl font-bold text-yellow-600">
                          {link.relevanceScore}%
                        </div>
                        <div className="text-xs text-gray-600">Relevância</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="text-xl font-bold text-green-600">
                          {link.relevanceScore >= 80 ? 'Alta' : 
                           link.relevanceScore >= 60 ? 'Média' : 'Baixa'}
                        </div>
                        <div className="text-xs text-gray-600">Prioridade</div>
                      </div>
                    </div>
                  </div>

                  {/* Anchor Text Suggestion */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Texto Âncora Sugerido
                    </h4>
                    <div className="flex items-center space-x-2">
                      <code className="bg-white px-3 py-1 rounded border text-sm font-mono">
                        {link.anchorTextSuggestion}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(link.anchorTextSuggestion)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Context Suggestion */}
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-700 mb-2">
                      Sugestão de Contexto
                    </h4>
                    <p className="text-blue-800 text-sm italic">
                      "{link.contextSuggestion}"
                    </p>
                  </div>

                  {/* Implementation Example */}
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-green-700 mb-2">
                      Exemplo de Implementação
                    </h4>
                    <div className="bg-white p-3 rounded border">
                      <code className="text-sm text-gray-800">
                        {link.contextSuggestion} <a href="{link.url}" className="text-blue-600 underline">{link.anchorTextSuggestion}</a> para obter mais informações detalhadas.
                      </code>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col space-y-2 ml-4">
                  <Button
                    size="sm"
                    onClick={() => window.open(link.url, '_blank')}
                    className="flex items-center space-x-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Visitar</span>
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyLinkMarkdown(link)}
                    className="flex items-center space-x-1"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Markdown</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(link.url)}
                    className="flex items-center space-x-1"
                  >
                    <Copy className="h-3 w-3" />
                    <span>URL</span>
                  </Button>

                  {link.relevanceScore >= 80 && (
                    <Badge variant="default" className="bg-green-600 text-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Recomendado
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLinks.length === 0 && (
        <Card className="border-0 shadow-lg">
          <CardContent className="text-center py-12">
            <ExternalLink className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum link encontrado
            </h3>
            <p className="text-gray-600">
              Tente ajustar os filtros ou realizar uma nova análise SEO.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Best Practices */}
      {links.length > 0 && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-lg text-blue-900">
              💡 Melhores Práticas para Links Externos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <ul className="space-y-2">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600">•</span>
                  <span>Use links de alta autoridade (DA 50+) sempre que possível</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600">•</span>
                  <span>Varie os tipos de links (estudos, estatísticas, recursos)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600">•</span>
                  <span>Use texto âncora natural e contextualmente relevante</span>
                </li>
              </ul>
              <ul className="space-y-2">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600">•</span>
                  <span>Adicione 2-4 links externos por 1000 palavras</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600">•</span>
                  <span>Configure links para abrir em nova aba</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600">•</span>
                  <span>Verifique regularmente se os links ainda funcionam</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExternalLinkSuggestions;
