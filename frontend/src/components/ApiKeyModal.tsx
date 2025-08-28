import React, { useState, useEffect } from 'react';
import { X, Calendar, Shield, Zap, AlertCircle } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  permissions: string[];
  rate_limit_per_hour: number;
  expires_at?: string;
  is_active: boolean;
}

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  apiKey?: ApiKey | null;
  mode: 'create' | 'edit';
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  apiKey,
  mode
}) => {
  const [formData, setFormData] = useState({
    name: '',
    permissions: ['read'],
    rate_limit_per_hour: 1000,
    expires_at: '',
    is_active: true
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode === 'edit' && apiKey) {
      setFormData({
        name: apiKey.name,
        permissions: apiKey.permissions,
        rate_limit_per_hour: apiKey.rate_limit_per_hour,
        expires_at: apiKey.expires_at ? apiKey.expires_at.split('T')[0] : '',
        is_active: apiKey.is_active
      });
    } else {
      setFormData({
        name: '',
        permissions: ['read'],
        rate_limit_per_hour: 1000,
        expires_at: '',
        is_active: true
      });
    }
    setErrors({});
  }, [mode, apiKey, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (formData.permissions.length === 0) {
      newErrors.permissions = 'Pelo menos uma permissão deve ser selecionada';
    }

    if (formData.rate_limit_per_hour < 1 || formData.rate_limit_per_hour > 100000) {
      newErrors.rate_limit_per_hour = 'Rate limit deve estar entre 1 e 100.000';
    }

    if (formData.expires_at) {
      const expirationDate = new Date(formData.expires_at);
      if (expirationDate <= new Date()) {
        newErrors.expires_at = 'Data de expiração deve ser no futuro';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        expires_at: formData.expires_at || null
      });
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (permission: string) => {
    const newPermissions = formData.permissions.includes(permission)
      ? formData.permissions.filter(p => p !== permission)
      : [...formData.permissions, permission];
    
    setFormData({ ...formData, permissions: newPermissions });
  };

  const availablePermissions = [
    { value: 'read', label: 'Read', description: 'Visualizar dados', color: 'bg-blue-100 text-blue-800' },
    { value: 'write', label: 'Write', description: 'Criar e editar dados', color: 'bg-green-100 text-green-800' },
    { value: 'admin', label: 'Admin', description: 'Acesso administrativo completo', color: 'bg-red-100 text-red-800' }
  ];

  const rateLimitPresets = [
    { value: 100, label: '100/hora - Desenvolvimento' },
    { value: 1000, label: '1.000/hora - Padrão' },
    { value: 5000, label: '5.000/hora - Alto Volume' },
    { value: 10000, label: '10.000/hora - Enterprise' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Criar Nova API Key' : 'Editar API Key'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome da API Key *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Ex: Produção API, Desenvolvimento, Integração..."
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Permissões */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Shield className="inline h-4 w-4 mr-1" />
              Permissões *
            </label>
            <div className="space-y-3">
              {availablePermissions.map((permission) => (
                <div key={permission.value} className="flex items-start">
                  <input
                    type="checkbox"
                    id={permission.value}
                    checked={formData.permissions.includes(permission.value)}
                    onChange={() => handlePermissionChange(permission.value)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <label htmlFor={permission.value} className="flex items-center cursor-pointer">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${permission.color} mr-2`}>
                        {permission.label}
                      </span>
                      <span className="text-sm text-gray-700">{permission.description}</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
            {errors.permissions && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.permissions}
              </p>
            )}
          </div>

          {/* Rate Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Zap className="inline h-4 w-4 mr-1" />
              Rate Limit (requisições por hora) *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="number"
                  value={formData.rate_limit_per_hour}
                  onChange={(e) => setFormData({ ...formData, rate_limit_per_hour: parseInt(e.target.value) || 0 })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.rate_limit_per_hour ? 'border-red-300' : 'border-gray-300'
                  }`}
                  min="1"
                  max="100000"
                />
                {errors.rate_limit_per_hour && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.rate_limit_per_hour}
                  </p>
                )}
              </div>
              <div>
                <select
                  onChange={(e) => setFormData({ ...formData, rate_limit_per_hour: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Presets</option>
                  {rateLimitPresets.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Data de Expiração */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Data de Expiração (opcional)
            </label>
            <input
              type="date"
              value={formData.expires_at}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.expires_at ? 'border-red-300' : 'border-gray-300'
              }`}
              min={new Date().toISOString().split('T')[0]}
            />
            {errors.expires_at && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.expires_at}
              </p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Deixe em branco para uma chave sem expiração
            </p>
          </div>

          {/* Status (apenas para edição) */}
          {mode === 'edit' && (
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">API Key ativa</span>
              </label>
              <p className="mt-1 text-sm text-gray-500">
                Desative para suspender temporariamente o acesso
              </p>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : mode === 'create' ? 'Criar API Key' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApiKeyModal;
