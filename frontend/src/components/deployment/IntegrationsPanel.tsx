import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Mail,
  Globe,
  BarChart3,
  Cloud,
  Zap,
  Play,
  Pause,
  TestTube
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface IntegrationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Provider {
  key: string;
  name: string;
  type: string;
  enabled: boolean;
  api_url?: string;
}

interface IntegrationHealth {
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  providers: Record<string, {
    name: string;
    type: string;
    status: 'healthy' | 'unhealthy' | 'disabled';
    error?: string;
  }>;
  last_check: string;
}

interface TenantIntegrations {
  integrations: {
    deployment?: any;
    dns?: any;
    email?: any;
    analytics?: any[];
    storage?: any;
  };
  configured_at?: string;
  available_providers: Provider[];
}

const IntegrationsPanel: React.FC<IntegrationsPanelProps> = ({ isOpen, onClose }) => {
  const [health, setHealth] = useState<IntegrationHealth | null>(null);
  const [tenantIntegrations, setTenantIntegrations] = useState<TenantIntegrations | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: Settings },
    { id: 'deployment', label: 'Deploy', icon: Zap },
    { id: 'dns', label: 'DNS', icon: Globe },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'storage', label: 'Storage', icon: Cloud }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [healthResponse, integrationsResponse] = await Promise.all([
        fetch('/api/integrations/health'),
        fetch('/api/v1/integrations', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-API-Key': localStorage.getItem('apiKey') || ''
          }
        })
      ]);

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setHealth(healthData.data);
      }

      if (integrationsResponse.ok) {
        const integrationsData = await integrationsResponse.json();
        setTenantIntegrations(integrationsData.data);
      }
    } catch (error) {
      console.error('Error fetching integrations data:', error);
      toast.error('Erro ao carregar dados das integrações');
    } finally {
      setLoading(false);
    }
  };

  const testIntegration = async (provider: string) => {
    setTestingProvider(provider);
    try {
      const response = await fetch(`/api/v1/integrations/test/${provider}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-API-Key': localStorage.getItem('apiKey') || '',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`${provider} testado com sucesso!`);
      } else {
        toast.error(`Teste falhou: ${data.error}`);
      }
      
      // Refresh health data
      fetchData();
    } catch (error) {
      console.error('Error testing integration:', error);
      toast.error('Erro ao testar integração');
    } finally {
      setTestingProvider(null);
    }
  };

  const setupIntegrations = async () => {
    try {
      const response = await fetch('/api/v1/integrations/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-API-Key': localStorage.getItem('apiKey') || '',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to setup integrations');
      
      toast.success('Integrações configuradas com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Error setting up integrations:', error);
      toast.error('Erro ao configurar integrações');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'disabled':
        return <Pause className="w-5 h-5 text-gray-400" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      case 'disabled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getProvidersByType = (type: string) => {
    if (!health) return [];
    return Object.entries(health.providers).filter(([key, provider]) => provider.type === type);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Painel de Integrações
              </h2>
              <p className="text-gray-600">
                Gerencie e monitore integrações externas
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={setupIntegrations}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Configurar Tudo
            </button>
            
            <button
              onClick={fetchData}
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

        {/* Status Overview */}
        {health && (
          <div className="p-6 border-b bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Status Geral</h3>
              <div className="flex items-center gap-2">
                {getStatusIcon(health.overall_status)}
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(health.overall_status)}`}>
                  {health.overall_status.toUpperCase()}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-2xl font-bold text-green-600">
                  {Object.values(health.providers).filter(p => p.status === 'healthy').length}
                </div>
                <div className="text-sm text-gray-600">Saudáveis</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-2xl font-bold text-red-600">
                  {Object.values(health.providers).filter(p => p.status === 'unhealthy').length}
                </div>
                <div className="text-sm text-gray-600">Com Problemas</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-2xl font-bold text-gray-600">
                  {Object.values(health.providers).filter(p => p.status === 'disabled').length}
                </div>
                <div className="text-sm text-gray-600">Desabilitadas</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-2xl font-bold text-blue-600">
                  {Object.keys(health.providers).length}
                </div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b">
          <div className="flex space-x-8 px-6 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
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
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && health && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Object.entries(
                      Object.values(health.providers).reduce((acc, provider) => {
                        acc[provider.type] = (acc[provider.type] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([type, count]) => (
                      <div key={type} className="bg-white border rounded-lg p-6">
                        <h4 className="text-lg font-medium text-gray-900 mb-4 capitalize">
                          {type} Providers
                        </h4>
                        <div className="space-y-3">
                          {getProvidersByType(type).map(([key, provider]) => (
                            <div key={key} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getStatusIcon(provider.status)}
                                <span className="font-medium">{provider.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(provider.status)}`}>
                                  {provider.status}
                                </span>
                                {provider.status !== 'disabled' && (
                                  <button
                                    onClick={() => testIntegration(key)}
                                    disabled={testingProvider === key}
                                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                  >
                                    <TestTube className={`w-4 h-4 ${testingProvider === key ? 'animate-pulse' : ''}`} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tenant Integrations Status */}
                  {tenantIntegrations && (
                    <div className="bg-white border rounded-lg p-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">
                        Integrações do Tenant
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-blue-500" />
                            <span>Deploy</span>
                          </div>
                          {tenantIntegrations.integrations.deployment ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-blue-500" />
                            <span>DNS</span>
                          </div>
                          {tenantIntegrations.integrations.dns ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-blue-500" />
                            <span>Email</span>
                          </div>
                          {tenantIntegrations.integrations.email?.sent ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-blue-500" />
                            <span>Analytics</span>
                          </div>
                          {tenantIntegrations.integrations.analytics?.length ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Cloud className="w-4 h-4 text-blue-500" />
                            <span>Storage</span>
                          </div>
                          {tenantIntegrations.integrations.storage?.configured ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      
                      {tenantIntegrations.configured_at && (
                        <p className="text-sm text-gray-500 mt-4">
                          Configurado em: {new Date(tenantIntegrations.configured_at).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Provider-specific tabs */}
              {activeTab !== 'overview' && health && (
                <div className="space-y-6">
                  <div className="bg-white border rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 capitalize">
                      {activeTab} Providers
                    </h4>
                    
                    <div className="space-y-4">
                      {getProvidersByType(activeTab).map(([key, provider]) => (
                        <div key={key} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(provider.status)}
                              <div>
                                <h5 className="font-medium text-gray-900">{provider.name}</h5>
                                <p className="text-sm text-gray-500">Provider: {key}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(provider.status)}`}>
                                {provider.status}
                              </span>
                              
                              {provider.status !== 'disabled' && (
                                <button
                                  onClick={() => testIntegration(key)}
                                  disabled={testingProvider === key}
                                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
                                >
                                  <TestTube className={`w-3 h-3 ${testingProvider === key ? 'animate-pulse' : ''}`} />
                                  Testar
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {provider.error && (
                            <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-700">
                              <strong>Erro:</strong> {provider.error}
                            </div>
                          )}
                          
                          {provider.status === 'disabled' && (
                            <div className="bg-gray-50 border border-gray-200 p-3 rounded text-sm text-gray-600">
                              Esta integração está desabilitada. Verifique as variáveis de ambiente.
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {getProvidersByType(activeTab).length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>Nenhum provider de {activeTab} configurado</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {health && (
              <>
                Última verificação: {new Date(health.last_check).toLocaleString('pt-BR')}
              </>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <a
              href="/docs/integrations"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Documentação
            </a>
            
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPanel;
