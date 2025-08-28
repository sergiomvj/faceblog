import React, { useState, useEffect } from 'react';
import { 
  X, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  ExternalLink,
  Copy,
  Play,
  Pause,
  Terminal,
  Globe,
  Mail,
  Settings
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface DeploymentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  deployment: {
    id: string;
    blog_name: string;
    subdomain: string;
    custom_domain?: string;
    status: string;
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
  };
  onRefresh: () => void;
}

const DeploymentStatusModal: React.FC<DeploymentStatusModalProps> = ({
  isOpen,
  onClose,
  deployment,
  onRefresh
}) => {
  const [currentDeployment, setCurrentDeployment] = useState(deployment);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    setCurrentDeployment(deployment);
  }, [deployment]);

  useEffect(() => {
    if (!isOpen || !autoRefresh) return;

    const interval = setInterval(() => {
      if (['initializing', 'running'].includes(currentDeployment.status)) {
        handleRefresh();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, currentDeployment.status]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/deployment/status/${currentDeployment.id}`);
      if (!response.ok) throw new Error('Failed to fetch status');
      
      const data = await response.json();
      setCurrentDeployment(data.data);
      onRefresh();
    } catch (error) {
      console.error('Error refreshing deployment status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setRefreshing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'running':
        return <Clock className="w-6 h-6 text-blue-500 animate-spin" />;
      case 'initializing':
        return <RefreshCw className="w-6 h-6 text-yellow-500 animate-spin" />;
      default:
        return <AlertCircle className="w-6 h-6 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'running':
        return 'text-blue-600 bg-blue-100';
      case 'initializing':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  const getEstimatedTime = () => {
    const elapsed = Date.now() - new Date(currentDeployment.started_at).getTime();
    const elapsedMinutes = Math.floor(elapsed / 60000);
    
    if (currentDeployment.status === 'completed') {
      return `Concluído em ${elapsedMinutes} minutos`;
    } else if (currentDeployment.status === 'failed') {
      return `Falhou após ${elapsedMinutes} minutos`;
    } else {
      const estimatedTotal = 8; // 8 minutos estimado
      const remaining = Math.max(0, estimatedTotal - elapsedMinutes);
      return `~${remaining} minutos restantes`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            {getStatusIcon(currentDeployment.status)}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {currentDeployment.blog_name}
              </h2>
              <p className="text-gray-600">
                {currentDeployment.subdomain}.faceblog.com
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                autoRefresh 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </button>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status Overview */}
            <div className="lg:col-span-2 space-y-6">
              {/* Status Card */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Status do Deployment</h3>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(currentDeployment.status)}`}>
                    {currentDeployment.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progresso</span>
                      <span>{currentDeployment.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${currentDeployment.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Iniciado:</span>
                    <span>{formatTimestamp(currentDeployment.started_at)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Atualizado:</span>
                    <span>{formatTimestamp(currentDeployment.updated_at)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tempo estimado:</span>
                    <span>{getEstimatedTime()}</span>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {currentDeployment.error && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-800 mb-1">Erro no Deployment</h4>
                      <p className="text-red-700 text-sm">{currentDeployment.error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Deployment Steps */}
              <div className="bg-white border rounded-lg">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Terminal className="w-5 h-5" />
                    Log de Deployment
                  </h3>
                </div>
                
                <div className="p-4 max-h-96 overflow-y-auto">
                  {currentDeployment.steps.length > 0 ? (
                    <div className="space-y-3">
                      {currentDeployment.steps.map((step, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">{step.message}</p>
                            <p className="text-xs text-gray-500">
                              {formatTimestamp(step.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum log disponível ainda</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Deployment Info */}
              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Informações</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">ID do Deployment</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1">
                        {currentDeployment.id}
                      </code>
                      <button
                        onClick={() => copyToClipboard(currentDeployment.id)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Template</label>
                    <p className="text-sm text-gray-900 mt-1">{currentDeployment.template}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Tema</label>
                    <p className="text-sm text-gray-900 mt-1">{currentDeployment.theme}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Subdomínio</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1">
                        {currentDeployment.subdomain}.faceblog.com
                      </code>
                      <button
                        onClick={() => copyToClipboard(`${currentDeployment.subdomain}.faceblog.com`)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {currentDeployment.custom_domain && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Domínio Customizado</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1">
                          {currentDeployment.custom_domain}
                        </code>
                        <button
                          onClick={() => copyToClipboard(currentDeployment.custom_domain!)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Ações</h3>
                
                <div className="space-y-3">
                  {currentDeployment.deploy_url && (
                    <a
                      href={currentDeployment.deploy_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Globe className="w-4 h-4" />
                      Visitar Site
                    </a>
                  )}
                  
                  {currentDeployment.status === 'completed' && (
                    <button className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2">
                      <Play className="w-4 h-4" />
                      Redesplegar
                    </button>
                  )}
                  
                  {['initializing', 'running'].includes(currentDeployment.status) && (
                    <button className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2">
                      <Pause className="w-4 h-4" />
                      Pausar
                    </button>
                  )}
                  
                  <button className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2">
                    <Settings className="w-4 h-4" />
                    Configurações
                  </button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Estatísticas</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Steps executados:</span>
                    <span className="text-sm font-medium">{currentDeployment.steps.length}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Tempo decorrido:</span>
                    <span className="text-sm font-medium">
                      {Math.floor((Date.now() - new Date(currentDeployment.started_at).getTime()) / 60000)} min
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Última atualização:</span>
                    <span className="text-sm font-medium">
                      {Math.floor((Date.now() - new Date(currentDeployment.updated_at).getTime()) / 1000)}s atrás
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Deployment ID: <code className="bg-gray-100 px-2 py-1 rounded">{currentDeployment.id}</code>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            
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

export default DeploymentStatusModal;
