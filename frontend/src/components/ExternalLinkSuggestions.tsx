import React, { useState, useEffect } from 'react';
import {
  LinkIcon,
  StarIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon as RefreshIcon,
  GlobeAltIcon,
  AcademicCapIcon,
  ChatBubbleLeftRightIcon,
  FireIcon
} from '@heroicons/react/24/outline';

interface AuthorityLink {
  title: string;
  url: string;
  domain: string;
  authorityScore: number;
  relevanceScore: number;
  type: string;
  description: string;
  lastChecked: number;
}

interface PopularContent {
  title: string;
  url: string;
  platform: string;
  shares: number;
  views: number;
  engagementScore: number;
  publishDate: Date;
  authorityScore: number;
}

interface Discussion {
  title: string;
  url: string;
  subreddit: string;
  upvotes: number;
  comments: number;
  relevanceScore: number;
}

interface ExternalLinksData {
  mainTopic: string;
  niche: string;
  timestamp: number;
  authorityLinks: AuthorityLink[];
  popularContent: PopularContent[];
  discussions: Discussion[];
  academicSources: Array<{
    title: string;
    url: string;
    source: string;
    type: string;
    authorityScore: number;
    relevanceScore: number;
  }>;
  recommendations: Array<{
    title: string;
    url: string;
    reason: string;
    priority: string;
    placement: string;
    authorityScore?: number;
  }>;
}

interface ExternalLinkSuggestionsProps {
  mainTopic: string;
  niche?: string;
  keywords?: string[];
  onLinkSelect: (url: string, title: string, type: string) => void;
  className?: string;
}

const ExternalLinkSuggestions: React.FC<ExternalLinkSuggestionsProps> = ({
  mainTopic,
  niche = 'general',
  keywords = [],
  onLinkSelect,
  className = ''
}) => {
  const [linksData, setLinksData] = useState<ExternalLinksData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('authority');
  const [validatingLinks, setValidatingLinks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (mainTopic && mainTopic.length > 2) {
      fetchExternalLinks();
    }
  }, [mainTopic, niche, keywords]);

  const fetchExternalLinks = async () => {
    setLoading(true);
    setError(null);

    try {
      const keywordsParam = keywords.length > 0 ? `&keywords=${keywords.join(',')}` : '';
      const response = await fetch(
        `/api/seo/external-links/${encodeURIComponent(mainTopic)}?niche=${niche}${keywordsParam}`
      );
      
      if (!response.ok) {
        throw new Error('Erro ao buscar links externos');
      }

      const result = await response.json();
      setLinksData(result.data);
    } catch (error) {
      console.error('Erro ao buscar links externos:', error);
      setError('Não foi possível carregar os links externos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const validateLink = async (url: string) => {
    setValidatingLinks(prev => new Set(prev).add(url));

    try {
      const response = await fetch('/api/seo/validate-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();
      
      if (result.success && result.data.isValid) {
        return true;
      } else {
        console.warn('Link validation failed:', result.data);
        return false;
      }
    } catch (error) {
      console.error('Erro na validação do link:', error);
      return false;
    } finally {
      setValidatingLinks(prev => {
        const newSet = new Set(prev);
        newSet.delete(url);
        return newSet;
      });
    }
  };

  const handleLinkSelect = async (url: string, title: string, type: string) => {
    const isValid = await validateLink(url);
    if (isValid) {
      onLinkSelect(url, title, type);
    } else {
      alert('Este link não está acessível no momento. Tente outro.');
    }
  };

  const getAuthorityColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-blue-600 bg-blue-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reference':
        return <AcademicCapIcon className="h-4 w-4" />;
      case 'technical':
        return <GlobeAltIcon className="h-4 w-4" />;
      case 'discussion':
        return <ChatBubbleLeftRightIcon className="h-4 w-4" />;
      case 'tutorial':
        return <EyeIcon className="h-4 w-4" />;
      default:
        return <LinkIcon className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (!mainTopic || mainTopic.length < 3) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="text-center text-gray-500">
          <LinkIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>Digite um tópico para encontrar links relevantes</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Buscando links externos...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
          <button
            onClick={fetchExternalLinks}
            className="text-red-600 hover:text-red-800"
          >
            <RefreshIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!linksData) {
    return null;
  }

  const categories = [
    { id: 'authority', name: 'Alta Autoridade', icon: StarIcon, count: linksData.authorityLinks.length },
    { id: 'popular', name: 'Conteúdo Popular', icon: FireIcon, count: linksData.popularContent.length },
    { id: 'academic', name: 'Fontes Acadêmicas', icon: AcademicCapIcon, count: linksData.academicSources.length },
    { id: 'discussions', name: 'Discussões', icon: ChatBubbleLeftRightIcon, count: linksData.discussions.length },
  ];

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <LinkIcon className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Links Externos</h3>
            <span className="ml-2 text-sm text-gray-500">
              {linksData.niche} • {linksData.authorityLinks.length + linksData.popularContent.length} encontrados
            </span>
          </div>
          <button
            onClick={fetchExternalLinks}
            className="text-gray-400 hover:text-gray-600"
            title="Atualizar links"
          >
            <RefreshIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6 px-4" aria-label="Tabs">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`${
                  activeCategory === category.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Icon className="h-4 w-4 mr-1" />
                {category.name}
                {category.count > 0 && (
                  <span className="ml-1 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {category.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeCategory === 'authority' && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Links de Alta Autoridade</h4>
            {linksData.authorityLinks.length > 0 ? (
              linksData.authorityLinks.slice(0, 8).map((link, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center">
                      {getTypeIcon(link.type)}
                      <h5 className="font-medium text-gray-900 ml-2">{link.title}</h5>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{link.domain}</p>
                    <p className="text-xs text-gray-500 mt-1">{link.description}</p>
                    <div className="flex items-center mt-2 space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getAuthorityColor(link.authorityScore)}`}>
                        DA: {link.authorityScore}
                      </span>
                      <span className="text-xs text-gray-500">
                        Relevância: {link.relevanceScore}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                      title="Visualizar link"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => handleLinkSelect(link.url, link.title, 'authority')}
                      disabled={validatingLinks.has(link.url)}
                      className="text-green-600 hover:text-green-800 disabled:opacity-50"
                      title="Usar este link"
                    >
                      {validatingLinks.has(link.url) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      ) : (
                        <CheckCircleIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">Nenhum link de autoridade encontrado</p>
            )}
          </div>
        )}

        {activeCategory === 'popular' && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Conteúdo Popular</h4>
            {linksData.popularContent.length > 0 ? (
              linksData.popularContent.slice(0, 6).map((content, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center">
                      <FireIcon className="h-4 w-4 text-orange-600 mr-2" />
                      <h5 className="font-medium text-gray-900">{content.title}</h5>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{content.platform}</p>
                    <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                      <span>{formatNumber(content.shares)} shares</span>
                      <span>{formatNumber(content.views)} views</span>
                      <span>Engajamento: {content.engagementScore}%</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <a
                      href={content.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-600 hover:text-orange-800"
                      title="Visualizar conteúdo"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => handleLinkSelect(content.url, content.title, 'popular')}
                      disabled={validatingLinks.has(content.url)}
                      className="text-green-600 hover:text-green-800 disabled:opacity-50"
                      title="Usar este link"
                    >
                      {validatingLinks.has(content.url) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      ) : (
                        <CheckCircleIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">Nenhum conteúdo popular encontrado</p>
            )}
          </div>
        )}

        {activeCategory === 'academic' && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Fontes Acadêmicas</h4>
            {linksData.academicSources.length > 0 ? (
              linksData.academicSources.slice(0, 5).map((source, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center">
                      <AcademicCapIcon className="h-4 w-4 text-blue-600 mr-2" />
                      <h5 className="font-medium text-gray-900">{source.title}</h5>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{source.source}</p>
                    <div className="flex items-center mt-2 space-x-2">
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {source.type}
                      </span>
                      <span className="text-xs text-gray-500">
                        Autoridade: {source.authorityScore}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                      title="Visualizar fonte"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => handleLinkSelect(source.url, source.title, 'academic')}
                      disabled={validatingLinks.has(source.url)}
                      className="text-green-600 hover:text-green-800 disabled:opacity-50"
                      title="Usar esta fonte"
                    >
                      {validatingLinks.has(source.url) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      ) : (
                        <CheckCircleIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">Nenhuma fonte acadêmica encontrada</p>
            )}
          </div>
        )}

        {activeCategory === 'discussions' && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Discussões Relevantes</h4>
            {linksData.discussions.length > 0 ? (
              linksData.discussions.slice(0, 5).map((discussion, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center">
                      <ChatBubbleLeftRightIcon className="h-4 w-4 text-purple-600 mr-2" />
                      <h5 className="font-medium text-gray-900">{discussion.title}</h5>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">r/{discussion.subreddit}</p>
                    <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                      <span>{discussion.upvotes} upvotes</span>
                      <span>{discussion.comments} comentários</span>
                      <span>Relevância: {discussion.relevanceScore}%</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <a
                      href={discussion.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-800"
                      title="Ver discussão"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => handleLinkSelect(discussion.url, discussion.title, 'discussion')}
                      disabled={validatingLinks.has(discussion.url)}
                      className="text-green-600 hover:text-green-800 disabled:opacity-50"
                      title="Usar esta discussão"
                    >
                      {validatingLinks.has(discussion.url) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      ) : (
                        <CheckCircleIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">Nenhuma discussão encontrada</p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Atualizado: {new Date(linksData.timestamp).toLocaleTimeString()}
          </span>
          <span>
            {linksData.recommendations.length} recomendações disponíveis
          </span>
        </div>
      </div>
    </div>
  );
};

export default ExternalLinkSuggestions;
