import React, { useState, useEffect } from 'react';
import {
  TrendingUp as TrendingUpIcon,
  Flame as FireIcon,
  Clock as ClockIcon,
  Globe,
  ArrowRight as ArrowRightIcon,
  RefreshCw as RefreshIcon,
  BarChart3 as ChartBarIcon
} from 'lucide-react';

interface TrendingData {
  mainTopic: string;
  niche: string;
  geo: string;
  timestamp: number;
  trendingTerms: Array<{
    term: string;
    growth: string;
    source: string;
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
  }>;
}

interface TrendingSuggestionsProps {
  mainTopic: string;
  niche?: string;
  geo?: string;
  onSuggestionSelect: (type: string, value: string) => void;
  className?: string;
}

const TrendingSuggestions: React.FC<TrendingSuggestionsProps> = ({
  mainTopic,
  niche = 'general',
  geo = 'BR',
  onSuggestionSelect,
  className = ''
}) => {
  const [trendingData, setTrendingData] = useState<TrendingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('trending');

  useEffect(() => {
    if (mainTopic && mainTopic.length > 2) {
      fetchTrendingData();
    }
  }, [mainTopic, niche, geo]);

  const fetchTrendingData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/seo/trending/${encodeURIComponent(mainTopic)}?niche=${niche}&geo=${geo}`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar tendências');
      }

      const result = await response.json();
      setTrendingData(result.data);
    } catch (error) {
      console.error('Erro ao buscar tendências:', error);
      setError('Não foi possível carregar as tendências. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (growth: string) => {
    switch (growth.toLowerCase()) {
      case 'high':
      case 'rising':
        return <TrendingUpIcon className="h-4 w-4 text-green-600" />;
      case 'hot':
      case 'viral':
        return <FireIcon className="h-4 w-4 text-red-600" />;
      default:
        return <ChartBarIcon className="h-4 w-4 text-blue-600" />;
    }
  };

  const getTrendColor = (growth: string) => {
    switch (growth.toLowerCase()) {
      case 'high':
      case 'rising':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'hot':
      case 'viral':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getSeasonalMessage = () => {
    if (!trendingData?.seasonalTrends) return null;

    const currentMonth = new Date().getMonth() + 1;
    const { peakMonths, currentTrend, prediction } = trendingData.seasonalTrends;

    if (peakMonths.includes(currentMonth)) {
      return {
        type: 'peak',
        message: 'Este é um período de pico para seu tópico! 🔥',
        color: 'bg-green-50 border-green-200 text-green-800'
      };
    }

    if (currentTrend === 'rising') {
      return {
        type: 'rising',
        message: 'Seu tópico está em tendência crescente! 📈',
        color: 'bg-blue-50 border-blue-200 text-blue-800'
      };
    }

    return {
      type: 'stable',
      message: `Tendência atual: ${prediction}`,
      color: 'bg-gray-50 border-gray-200 text-gray-800'
    };
  };

  if (!mainTopic || mainTopic.length < 3) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="text-center text-gray-500">
          <TrendingUpIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>Digite um tópico para ver as tendências</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Buscando tendências...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <TrendingUpIcon className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
          <button
            onClick={fetchTrendingData}
            className="text-red-600 hover:text-red-800"
          >
            <RefreshIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!trendingData) {
    return null;
  }

  const categories = [
    { id: 'trending', name: 'Em Alta', icon: TrendingUpIcon },
    { id: 'questions', name: 'Perguntas', icon: Globe },
    { id: 'opportunities', name: 'Oportunidades', icon: FireIcon },
  ];

  const seasonalMessage = getSeasonalMessage();

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <TrendingUpIcon className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Tendências</h3>
            <span className="ml-2 text-sm text-gray-500">
              {trendingData.geo} • {trendingData.niche}
            </span>
          </div>
          <button
            onClick={fetchTrendingData}
            className="text-gray-400 hover:text-gray-600"
            title="Atualizar tendências"
          >
            <RefreshIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Seasonal Alert */}
      {seasonalMessage && (
        <div className={`mx-4 mt-4 p-3 rounded-lg border ${seasonalMessage.color}`}>
          <div className="flex items-center">
            <ClockIcon className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">{seasonalMessage.message}</span>
          </div>
        </div>
      )}

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
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeCategory === 'trending' && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Termos em Alta</h4>
            {trendingData.trendingTerms.length > 0 ? (
              trendingData.trendingTerms.slice(0, 6).map((term, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${getTrendColor(term.growth)}`}
                >
                  <div className="flex items-center">
                    {getTrendIcon(term.growth)}
                    <div className="ml-3">
                      <span className="font-medium">{term.term}</span>
                      <div className="text-xs opacity-75">
                        {term.source} • {term.growth}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onSuggestionSelect('trending_keyword', term.term)}
                    className="text-current hover:opacity-75"
                    title="Usar este termo"
                  >
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">Nenhum termo em tendência encontrado</p>
            )}
          </div>
        )}

        {activeCategory === 'questions' && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Perguntas Populares</h4>
            {Object.entries(trendingData.popularQuestions).map(([type, questions]) => (
              questions.length > 0 && (
                <div key={type}>
                  <h5 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                    {type === 'what' && 'O que'}
                    {type === 'how' && 'Como'}
                    {type === 'why' && 'Por que'}
                    {type === 'when' && 'Quando'}
                    {type === 'where' && 'Onde'}
                  </h5>
                  <div className="space-y-2">
                    {questions.slice(0, 3).map((question, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100"
                      >
                        <span className="text-sm text-gray-900">{question}</span>
                        <button
                          onClick={() => onSuggestionSelect('popular_question', question)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Usar esta pergunta"
                        >
                          <ArrowRightIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {activeCategory === 'opportunities' && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Oportunidades de Keywords</h4>
            {trendingData.opportunities.length > 0 ? (
              trendingData.opportunities.slice(0, 5).map((opportunity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">{opportunity.keyword}</span>
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                        opportunity.type === 'trending' ? 'bg-green-100 text-green-800' :
                        opportunity.type === 'long_tail' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {opportunity.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{opportunity.reason}</p>
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-yellow-700">
                        Potencial: {opportunity.potential}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onSuggestionSelect('opportunity_keyword', opportunity.keyword)}
                    className="text-yellow-600 hover:text-yellow-800 ml-3"
                    title="Usar esta oportunidade"
                  >
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">Nenhuma oportunidade encontrada</p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Atualizado: {new Date(trendingData.timestamp).toLocaleTimeString()}
          </span>
          <span>
            {trendingData.trendingTerms.length + 
             Object.values(trendingData.popularQuestions).flat().length + 
             trendingData.opportunities.length} sugestões
          </span>
        </div>
      </div>
    </div>
  );
};

export default TrendingSuggestions;
