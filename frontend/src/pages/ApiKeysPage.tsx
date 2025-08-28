import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Plus, 
  Eye, 
  EyeOff, 
  Copy, 
  RefreshCw, 
  Trash2, 
  Edit, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  BarChart3,
  Shield,
  Download,
  TrendingUp
} from 'lucide-react';
import ApiKeyModal from '../components/ApiKeyModal';
import BulkCreateModal from '../components/BulkCreateModal';
import ApiKeyAnalytics from '../components/ApiKeyAnalytics';

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  permissions: string[];
  rate_limit_per_hour: number;
  is_active: boolean;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

interface ApiKeyUsage {
  endpoint: string;
  count: number;
}

interface HealthCheck {
  health_score: number;
  status: 'healthy' | 'warning' | 'critical';
  summary: {
    total_keys: number;
    active_keys: number;
    inactive_keys: number;
    expired_keys: any[];
    expiring_soon: any[];
    never_used: any[];
    unused_30_days: any[];
    issues: any[];
  };
  recommendations: any[];
}

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
    top_endpoints: ApiKeyUsage[];
    status_distribution: Record<string, number>;
    most_active_keys: { key_id: string; count: number }[];
  };
}

const ApiKeysPage: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [healthCheck, setHealthCheck] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Estados para filtros e paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [currentPage, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadApiKeys(),
        loadAnalytics(),
        loadHealthCheck()
      ]);
    } catch (err) {
      setError('Erro ao carregar dados');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadApiKeys = async () => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: '10',
      ...(statusFilter !== 'all' && { status: statusFilter })
    });

    const response = await fetch(`/api/v1/api-keys?${params}`, {
      headers: {
        'X-API-Key': localStorage.getItem('api_key') || ''
      }
    });

    if (!response.ok) throw new Error('Failed to load API keys');
    
    const result = await response.json();
    setApiKeys(result.data.api_keys);
  };

  const loadAnalytics = async () => {
    const response = await fetch('/api/v1/api-keys/analytics/overview?days=30', {
      headers: {
        'X-API-Key': localStorage.getItem('api_key') || ''
      }
    });

    if (!response.ok) throw new Error('Failed to load analytics');
    
    const result = await response.json();
    setAnalytics(result.data);
  };

  const loadHealthCheck = async () => {
    const response = await fetch('/api/v1/api-keys/health-check', {
      headers: {
        'X-API-Key': localStorage.getItem('api_key') || ''
      }
    });

    if (!response.ok) throw new Error('Failed to load health check');
    
    const result = await response.json();
    setHealthCheck(result.data);
  };

  const createApiKey = async (keyData: any) => {
    const response = await fetch('/api/v1/api-keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': localStorage.getItem('api_key') || ''
      },
      body: JSON.stringify(keyData)
    });

    if (!response.ok) throw new Error('Failed to create API key');
    
    const result = await response.json();
    setNewApiKey(result.data.api_key);
    showToast('API Key criada com sucesso!');
    loadData();
    return result.data;
  };

  const updateApiKey = async (keyId: string, keyData: any) => {
    const response = await fetch(`/api/v1/api-keys/${keyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': localStorage.getItem('api_key') || ''
      },
      body: JSON.stringify(keyData)
    });

    if (!response.ok) throw new Error('Failed to update API key');
    
    const result = await response.json();
    setShowEditModal(false);
    setSelectedKey(null);
    showToast('API Key atualizada com sucesso!');
    loadData();
    return result.data;
  };

  const bulkCreateApiKeys = async (keys: any[]) => {
    const response = await fetch('/api/v1/api-keys/bulk-create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': localStorage.getItem('api_key') || ''
      },
      body: JSON.stringify({ keys })
    });

    if (!response.ok) throw new Error('Failed to bulk create API keys');
    
    const result = await response.json();
    showToast(`${result.data.created_keys.length} API Keys criadas com sucesso!`);
    loadData();
    return result.data;
  };

  const regenerateApiKey = async (keyId: string) => {
    const response = await fetch(`/api/v1/api-keys/${keyId}/regenerate`, {
      method: 'POST',
      headers: {
        'X-API-Key': localStorage.getItem('api_key') || ''
      }
    });

    if (!response.ok) throw new Error('Failed to regenerate API key');
    
    const result = await response.json();
    setNewApiKey(result.data.api_key);
    loadData();
    return result.data;
  };

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta API Key?')) return;

    const response = await fetch(`/api/v1/api-keys/${keyId}`, {
      method: 'DELETE',
      headers: {
        'X-API-Key': localStorage.getItem('api_key') || ''
      }
    });

    if (!response.ok) throw new Error('Failed to delete API key');
    
    loadData();
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copiado para a área de transferência!');
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleEditKey = (key: ApiKey) => {
    setSelectedKey(key);
    setShowEditModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredKeys = apiKeys.filter(key => 
    key.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    key.key_prefix.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de API Keys</h1>
          <p className="text-gray-600">Gerencie chaves de API, permissões e monitore o uso</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              showAnalytics 
                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>{showAnalytics ? 'Ocultar' : 'Mostrar'} Analytics</span>
          </button>
          <button
            onClick={() => setShowBulkCreateModal(true)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Criar em Lote</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nova API Key</span>
          </button>
        </div>
      </div>

      {/* Health Check Card */}
      {healthCheck && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Status do Sistema</h2>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(healthCheck.status)}`}>
              {healthCheck.status === 'healthy' && 'Saudável'}
              {healthCheck.status === 'warning' && 'Atenção'}
              {healthCheck.status === 'critical' && 'Crítico'}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{healthCheck.summary.total_keys}</div>
              <div className="text-sm text-gray-600">Total de Chaves</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{healthCheck.summary.active_keys}</div>
              <div className="text-sm text-gray-600">Ativas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{healthCheck.summary.expiring_soon.length}</div>
              <div className="text-sm text-gray-600">Expirando</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{healthCheck.summary.expired_keys.length}</div>
              <div className="text-sm text-gray-600">Expiradas</div>
            </div>
          </div>

          {healthCheck.recommendations.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Recomendações:</h3>
              <div className="space-y-2">
                {healthCheck.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{rec.action}:</span> {rec.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analytics Component */}
      {showAnalytics && (
        <ApiKeyAnalytics
          analytics={analytics}
          onRefresh={loadAnalytics}
          loading={loading}
        />
      )}

      {/* Filtros e Busca */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Buscar por nome ou prefixo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Apenas Ativas</option>
              <option value="inactive">Apenas Inativas</option>
            </select>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Lista de API Keys */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">API Keys ({filteredKeys.length})</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chave
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissões
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Último Uso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredKeys.map((apiKey) => (
                <tr key={apiKey.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Key className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{apiKey.name}</div>
                        <div className="text-sm text-gray-500">Criada em {formatDate(apiKey.created_at)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {visibleKeys.has(apiKey.id) ? apiKey.key_prefix + '...' : apiKey.key_prefix + '••••••••'}
                      </code>
                      <button
                        onClick={() => toggleKeyVisibility(apiKey.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {visibleKeys.has(apiKey.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(apiKey.key_prefix)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(apiKey.permissions) ? apiKey.permissions : JSON.parse(apiKey.permissions || '[]')).map((permission: string) => (
                        <span
                          key={permission}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {permission}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {apiKey.is_active ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      ) : (
                        <Clock className="h-5 w-5 text-gray-400 mr-2" />
                      )}
                      <span className={`text-sm ${apiKey.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                        {apiKey.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {apiKey.last_used_at ? formatDate(apiKey.last_used_at) : 'Nunca usado'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => regenerateApiKey(apiKey.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Regenerar"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditKey(apiKey)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteApiKey(apiKey.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Deletar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ApiKeyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={createApiKey}
        mode="create"
      />

      <ApiKeyModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedKey(null);
        }}
        onSubmit={(data) => updateApiKey(selectedKey!.id, data)}
        apiKey={selectedKey}
        mode="edit"
      />

      <BulkCreateModal
        isOpen={showBulkCreateModal}
        onClose={() => setShowBulkCreateModal(false)}
        onSubmit={bulkCreateApiKeys}
      />

      {/* Modal de Nova API Key */}
      {newApiKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Nova API Key Criada</h3>
            <p className="text-sm text-gray-600 mb-4">
              Copie esta chave agora. Ela não será mostrada novamente.
            </p>
            <div className="bg-gray-100 p-3 rounded-lg mb-4">
              <code className="text-sm break-all">{newApiKey}</code>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => copyToClipboard(newApiKey)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Copiar
              </button>
              <button
                onClick={() => setNewApiKey(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiKeysPage;

// CSS para animação do toast (adicione ao seu arquivo CSS global)
// .animate-fade-in {
//   animation: fadeIn 0.3s ease-in-out;
// }
// 
// @keyframes fadeIn {
//   from { opacity: 0; transform: translateY(10px); }
//   to { opacity: 1; transform: translateY(0); }
// }
