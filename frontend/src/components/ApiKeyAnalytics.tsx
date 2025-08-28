import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Clock, 
  RefreshCw,
  Calendar,
  Filter
} from 'lucide-react';

interface Analytics {
  period_days: number;
  overview: {
    total_keys: number;
    active_keys: number;
    inactive_keys: number;
    expired_keys: number;
    recently_used: number;
    total_requests: number;
    requests_by_day: Record<string, number>;
    top_endpoints: { endpoint: string; count: number }[];
    status_distribution: Record<string, number>;
    most_active_keys: { key_id: string; count: number }[];
  };
}

interface ApiKeyAnalyticsProps {
  analytics: Analytics | null;
  onRefresh: () => void;
  loading?: boolean;
}

const ApiKeyAnalytics: React.FC<ApiKeyAnalyticsProps> = ({
  analytics,
  onRefresh,
  loading = false
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'endpoints' | 'status'>('overview');

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const getStatusColor = (status: string) => {
    if (status.startsWith('2')) return 'bg-green-500';
    if (status.startsWith('3')) return 'bg-yellow-500';
    if (status.startsWith('4')) return 'bg-red-500';
    if (status.startsWith('5')) return 'bg-purple-500';
    return 'bg-gray-500';
  };

  const renderBarChart = (data: Record<string, number>, title: string, color: string = 'bg-blue-500') => {
    const entries = Object.entries(data);
    if (entries.length === 0) return <div className="text-gray-500 text-center py-8">Sem dados</div>;

    const maxValue = Math.max(...entries.map(([, value]) => value));

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <div className="space-y-2">
          {entries.slice(0, 10).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-3">
              <div className="w-24 text-sm text-gray-600 truncate" title={key}>
                {key}
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${color}`}
                  style={{ width: `${(value / maxValue) * 100}%` }}
                />
              </div>
              <div className="w-16 text-sm text-gray-900 text-right">
                {formatNumber(value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLineChart = (data: Record<string, number>) => {
    const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
    if (entries.length === 0) return <div className="text-gray-500 text-center py-8">Sem dados</div>;

    const maxValue = Math.max(...entries.map(([, value]) => value));
    const minValue = Math.min(...entries.map(([, value]) => value));

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Requisições por Dia</h4>
        <div className="h-48 flex items-end space-x-1 bg-gray-50 p-4 rounded-lg">
          {entries.map(([date, value]) => {
            const height = maxValue > 0 ? ((value - minValue) / (maxValue - minValue)) * 100 : 0;
            return (
              <div key={date} className="flex-1 flex flex-col items-center">
                <div
                  className="bg-blue-500 rounded-t w-full min-h-[4px] transition-all duration-300 hover:bg-blue-600"
                  style={{ height: `${Math.max(height, 10)}%` }}
                  title={`${date}: ${formatNumber(value)} requisições`}
                />
                <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-left">
                  {new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!analytics) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500">Carregando analytics...</div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'usage', label: 'Uso por Tempo', icon: TrendingUp },
    { id: 'endpoints', label: 'Endpoints', icon: Activity },
    { id: 'status', label: 'Status HTTP', icon: Clock }
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Analytics de API Keys</h2>
          <div className="flex items-center space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={7}>Últimos 7 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
            </select>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mt-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatNumber(analytics.overview.total_requests)}
                  </div>
                  <div className="text-sm text-gray-600">Total de Requisições</div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <div className="text-2xl font-bold text-gray-900">
                    {analytics.overview.active_keys}
                  </div>
                  <div className="text-sm text-gray-600">Chaves Ativas</div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-yellow-600" />
                <div className="ml-3">
                  <div className="text-2xl font-bold text-gray-900">
                    {analytics.overview.recently_used}
                  </div>
                  <div className="text-sm text-gray-600">Usadas Recentemente</div>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.round((analytics.overview.active_keys / analytics.overview.total_keys) * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">Taxa de Ativação</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="space-y-6">
            {renderLineChart(analytics.overview.requests_by_day)}
          </div>
        )}

        {activeTab === 'endpoints' && (
          <div className="space-y-6">
            {renderBarChart(
              analytics.overview.top_endpoints.reduce((acc, item) => {
                acc[item.endpoint] = item.count;
                return acc;
              }, {} as Record<string, number>),
              'Endpoints Mais Utilizados',
              'bg-green-500'
            )}
          </div>
        )}

        {activeTab === 'status' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(analytics.overview.status_distribution).map(([status, count]) => (
                <div key={status} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(status)} mr-3`} />
                    <div>
                      <div className="text-lg font-bold text-gray-900">{formatNumber(count)}</div>
                      <div className="text-sm text-gray-600">{status}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {renderBarChart(
              analytics.overview.status_distribution,
              'Distribuição de Status HTTP',
              'bg-purple-500'
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Dados dos últimos {analytics.period_days} dias
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Atualizado em tempo real</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyAnalytics;
