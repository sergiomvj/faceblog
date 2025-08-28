import React, { useState, useEffect } from 'react';
import { 
  Rocket, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  Settings, 
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  MoreVertical,
  Play,
  Pause,
  Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import DeploymentModal from '../components/deployment/DeploymentModal';
import DeploymentStatusModal from '../components/deployment/DeploymentStatusModal';
import DeploymentAnalytics from '../components/deployment/DeploymentAnalytics';
import IntegrationsPanel from '../components/deployment/IntegrationsPanel';

interface Deployment {
  id: string;
  tenant_id: string;
  blog_name: string;
  subdomain: string;
  custom_domain?: string;
  status: 'initializing' | 'running' | 'completed' | 'failed';
  progress: number;
  started_at: string;
  updated_at: string;
  deploy_url?: string;
  error?: string;
  template: string;
  theme: string;
  steps: Array<{
    message: string;
    timestamp: string;
  }>;
}

interface DeploymentStats {
  total_deployments: number;
  active_deployments: number;
  completed_deployments: number;
  failed_deployments: number;
  success_rate: number;
}

const DeploymentsPage: React.FC = () => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [stats, setStats] = useState<DeploymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchDeployments();
    fetchStats();
    
    // Auto-refresh a cada 5 segundos se houver deployments ativos
    const interval = setInterval(() => {
      if (deployments.some(d => ['initializing', 'running'].includes(d.status))) {
        fetchDeployments();
      }
    }, 5000);
    
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const fetchDeployments = async () => {
    try {
      const response = await fetch('/api/v1/deployment/all', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-API-Key': localStorage.getItem('apiKey') || ''
        }
      });

      if (!response.ok) throw new Error('Failed to fetch deployments');
      
      const data = await response.json();
      setDeployments(data.data || []);
    } catch (error) {
      console.error('Error fetching deployments:', error);
      toast.error('Erro ao carregar deployments');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/v1/deployment/analytics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-API-Key': localStorage.getItem('apiKey') || ''
        }
      });

      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats(data.data.analytics);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreateDeployment = () => {
    setShowCreateModal(true);
  };

  const handleViewDeployment = (deployment: Deployment) => {
    setSelectedDeployment(deployment);
    setShowStatusModal(true);
  };

  const handleRedeployment = async (deploymentId: string) => {
    try {
      const response = await fetch('/api/v1/deployment/redeploy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-API-Key': localStorage.getItem('apiKey') || '',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to redeploy');
      
      toast.success('Redeployment iniciado com sucesso');
      fetchDeployments();
    } catch (error) {
      console.error('Error redeploying:', error);
      toast.error('Erro ao iniciar redeployment');
    }
  };

  const handleDeleteDeployment = async (deploymentId: string) => {
    if (window.confirm('Tem certeza que deseja deletar este deployment?')) {
      return;
    }

    try {
      const response = await fetch('/api/v1/deployment', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-API-Key': localStorage.getItem('apiKey') || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirm: 'DELETE' })
      });

      if (!response.ok) throw new Error('Failed to delete deployment');
      
      toast.success('Deployment deletado com sucesso');
      fetchDeployments();
    } catch (error) {
      console.error('Error deleting deployment:', error);
      toast.error('Erro ao deletar deployment');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'initializing':
        return <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'initializing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredDeployments = deployments.filter(deployment => {
    const matchesSearch = deployment.blog_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deployment.subdomain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || deployment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Rocket className="w-8 h-8 text-blue-500" />
            Deployments
          </h1>
          <p className="text-gray-600 mt-2">
            Gerencie e monitore deployments de blogs filhos
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAnalytics(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Analytics
          </button>
          
          <button
            onClick={() => setShowIntegrations(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Integrações
          </button>
          
          <button
            onClick={handleCreateDeployment}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Deployment
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_deployments}</p>
              </div>
              <Rocket className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ativos</p>
                <p className="text-2xl font-bold text-blue-600">{stats.active_deployments}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completos</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed_deployments}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Falhas</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed_deployments}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa de Sucesso</p>
                <p className="text-2xl font-bold text-purple-600">{stats.success_rate}%</p>
              </div>
              <AlertCircle className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome do blog ou subdomínio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os Status</option>
              <option value="initializing">Inicializando</option>
              <option value="running">Em Execução</option>
              <option value="completed">Completo</option>
              <option value="failed">Falha</option>
            </select>
          </div>
          
          <button
            onClick={fetchDeployments}
            className="px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Deployments Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Blog
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progresso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Template
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Iniciado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDeployments.map((deployment) => (
                <tr key={deployment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {deployment.blog_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {deployment.subdomain}.faceblog.com
                      </div>
                      {deployment.custom_domain && (
                        <div className="text-sm text-blue-600">
                          {deployment.custom_domain}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(deployment.status)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(deployment.status)}`}>
                        {deployment.status}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${deployment.progress}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {deployment.progress}%
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{deployment.template}</div>
                    <div className="text-sm text-gray-500">{deployment.theme}</div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(deployment.started_at).toLocaleString('pt-BR')}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {deployment.deploy_url ? (
                      <a
                        href={deployment.deploy_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Ver Site
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewDeployment(deployment)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver Detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {deployment.status === 'completed' && (
                        <button
                          onClick={() => handleRedeployment(deployment.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Redesplegar"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDeleteDeployment(deployment.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredDeployments.length === 0 && (
            <div className="text-center py-12">
              <Rocket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum deployment encontrado
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece criando seu primeiro deployment'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <button
                  onClick={handleCreateDeployment}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Criar Primeiro Deployment
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <DeploymentModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchDeployments();
            toast.success('Deployment iniciado com sucesso!');
          }}
        />
      )}

      {showStatusModal && selectedDeployment && (
        <DeploymentStatusModal
          isOpen={showStatusModal}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedDeployment(null);
          }}
          deployment={selectedDeployment}
          onRefresh={fetchDeployments}
        />
      )}

      {showAnalytics && (
        <DeploymentAnalytics
          isOpen={showAnalytics}
          onClose={() => setShowAnalytics(false)}
        />
      )}

      {showIntegrations && (
        <IntegrationsPanel
          isOpen={showIntegrations}
          onClose={() => setShowIntegrations(false)}
        />
      )}
    </div>
  );
};

export default DeploymentsPage;
