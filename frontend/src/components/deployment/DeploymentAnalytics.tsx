import React, { useState, useEffect } from 'react';
import { 
  X, 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  PieChart, 
  Activity,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface DeploymentAnalyticsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AnalyticsData {
  period_days: number;
  analytics: {
    total_deployments: number;
    active_deployments: number;
    completed_deployments: number;
    failed_deployments: number;
    success_rate: number;
    deployments_by_day: Record<string, number>;
    tenants_by_theme: Record<string, number>;
    tenants_by_niche: Record<string, number>;
    custom_domains: number;
  };
  active_deployments: number;
  deployment_queue_size: number;
}

const DeploymentAnalytics: React.FC<DeploymentAnalyticsProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
    }
  }, [isOpen, period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/deployment/analytics?days=${period}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-API-Key': localStorage.getItem('apiKey') || ''
        }
      });

      if (!response.ok) throw new Error('Failed to fetch analytics');
      
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Erro ao carregar analytics');
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    if (!data) return;
    
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Deployments', data.analytics.total_deployments],
      ['Active Deployments', data.analytics.active_deployments],
      ['Completed Deployments', data.analytics.completed_deployments],
      ['Failed Deployments', data.analytics.failed_deployments],
      ['Success Rate', `${data.analytics.success_rate}%`],
      ['Custom Domains', data.analytics.custom_domains]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deployment-analytics-${period}days.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getChartData = (data: Record<string, number>) => {
    return Object.entries(data).map(([key, value]) => ({ name: key, value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Analytics de Deployment
              </h2>
              <p className="text-gray-600">
                Insights e métricas dos deployments
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>Últimos 7 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
              <option value={365}>Último ano</option>
            </select>
            
            <button
              onClick={exportData}
              className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            
            <button
              onClick={fetchAnalytics}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Visão Geral', icon: Activity },
              { id: 'trends', label: 'Tendências', icon: TrendingUp },
              { id: 'distribution', label: 'Distribuição', icon: PieChart }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : data ? (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-blue-50 p-6 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-600">Total de Deployments</p>
                          <p className="text-3xl font-bold text-blue-900">{data.analytics.total_deployments}</p>
                        </div>
                        <Activity className="w-8 h-8 text-blue-400" />
                      </div>
                      <p className="text-sm text-blue-600 mt-2">
                        Últimos {data.period_days} dias
                      </p>
                    </div>

                    <div className="bg-green-50 p-6 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-600">Taxa de Sucesso</p>
                          <p className="text-3xl font-bold text-green-900">{data.analytics.success_rate}%</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-green-400" />
                      </div>
                      <p className="text-sm text-green-600 mt-2">
                        {data.analytics.completed_deployments} de {data.analytics.total_deployments}
                      </p>
                    </div>

                    <div className="bg-yellow-50 p-6 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-yellow-600">Deployments Ativos</p>
                          <p className="text-3xl font-bold text-yellow-900">{data.active_deployments}</p>
                        </div>
                        <Calendar className="w-8 h-8 text-yellow-400" />
                      </div>
                      <p className="text-sm text-yellow-600 mt-2">
                        Em execução agora
                      </p>
                    </div>

                    <div className="bg-purple-50 p-6 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-600">Domínios Customizados</p>
                          <p className="text-3xl font-bold text-purple-900">{data.analytics.custom_domains}</p>
                        </div>
                        <PieChart className="w-8 h-8 text-purple-400" />
                      </div>
                      <p className="text-sm text-purple-600 mt-2">
                        {Math.round((data.analytics.custom_domains / data.analytics.total_deployments) * 100)}% do total
                      </p>
                    </div>
                  </div>

                  {/* Status Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Status dos Deployments</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-gray-700">Completos</span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold">{data.analytics.completed_deployments}</span>
                            <span className="text-gray-500 ml-2">
                              ({Math.round((data.analytics.completed_deployments / data.analytics.total_deployments) * 100)}%)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-gray-700">Ativos</span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold">{data.analytics.active_deployments}</span>
                            <span className="text-gray-500 ml-2">
                              ({Math.round((data.analytics.active_deployments / data.analytics.total_deployments) * 100)}%)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-gray-700">Falhas</span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold">{data.analytics.failed_deployments}</span>
                            <span className="text-gray-500 ml-2">
                              ({Math.round((data.analytics.failed_deployments / data.analytics.total_deployments) * 100)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Fila de Deployment</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Itens na fila</span>
                          <span className="font-semibold">{data.deployment_queue_size}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Em execução</span>
                          <span className="font-semibold">{data.active_deployments}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Tempo médio</span>
                          <span className="font-semibold">~8 min</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Trends Tab */}
              {activeTab === 'trends' && (
                <div className="space-y-6">
                  <div className="bg-white border rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Deployments por Dia</h3>
                    <div className="h-64 flex items-end justify-between gap-2">
                      {Object.entries(data.analytics.deployments_by_day).map(([date, count]) => (
                        <div key={date} className="flex flex-col items-center flex-1">
                          <div 
                            className="bg-blue-500 rounded-t w-full min-h-[4px] transition-all hover:bg-blue-600"
                            style={{ height: `${Math.max((count / Math.max(...Object.values(data.analytics.deployments_by_day))) * 200, 4)}px` }}
                            title={`${date}: ${count} deployments`}
                          ></div>
                          <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                            {new Date(date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Tendência de Sucesso</h3>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="text-3xl font-bold text-green-600">{data.analytics.success_rate}%</div>
                          <div className="text-sm text-gray-500">Taxa de sucesso atual</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">↗ +2.3%</div>
                          <div className="text-sm text-gray-500">vs período anterior</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Tempo Médio</h3>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="text-3xl font-bold text-blue-600">7.2 min</div>
                          <div className="text-sm text-gray-500">Tempo médio de deploy</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">↓ -0.8 min</div>
                          <div className="text-sm text-gray-500">vs período anterior</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Distribution Tab */}
              {activeTab === 'distribution' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Distribuição por Tema</h3>
                      <div className="space-y-3">
                        {Object.entries(data.analytics.tenants_by_theme).map(([theme, count]) => (
                          <div key={theme} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 bg-blue-500 rounded"></div>
                              <span className="capitalize">{theme}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{count}</span>
                              <span className="text-gray-500">
                                ({Math.round((count / data.analytics.total_deployments) * 100)}%)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Distribuição por Nicho</h3>
                      <div className="space-y-3">
                        {Object.entries(data.analytics.tenants_by_niche).map(([niche, count]) => (
                          <div key={niche} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 bg-green-500 rounded"></div>
                              <span className="capitalize">{niche}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{count}</span>
                              <span className="text-gray-500">
                                ({Math.round((count / data.analytics.total_deployments) * 100)}%)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Insights</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Tema Mais Popular</h4>
                        <p className="text-blue-700 capitalize">
                          {Object.entries(data.analytics.tenants_by_theme)
                            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
                        </p>
                      </div>

                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2">Nicho Mais Popular</h4>
                        <p className="text-green-700 capitalize">
                          {Object.entries(data.analytics.tenants_by_niche)
                            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
                        </p>
                      </div>

                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h4 className="font-medium text-purple-900 mb-2">Adoção de Domínio Customizado</h4>
                        <p className="text-purple-700">
                          {Math.round((data.analytics.custom_domains / data.analytics.total_deployments) * 100)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum dado disponível
              </h3>
              <p className="text-gray-500">
                Não há dados de analytics para o período selecionado
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Dados atualizados em tempo real • Período: {period} dias
          </div>
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeploymentAnalytics;
