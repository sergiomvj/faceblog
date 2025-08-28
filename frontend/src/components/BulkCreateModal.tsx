import React, { useState } from 'react';
import { X, Plus, Trash2, AlertCircle, Download, Upload } from 'lucide-react';

interface BulkKeyData {
  name: string;
  permissions: string[];
  rate_limit_per_hour: number;
  expires_at: string;
}

interface BulkCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (keys: BulkKeyData[]) => Promise<void>;
}

const BulkCreateModal: React.FC<BulkCreateModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [keys, setKeys] = useState<BulkKeyData[]>([
    {
      name: '',
      permissions: ['read'],
      rate_limit_per_hour: 1000,
      expires_at: ''
    }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});

  const addKey = () => {
    if (keys.length >= 10) return;
    
    setKeys([
      ...keys,
      {
        name: '',
        permissions: ['read'],
        rate_limit_per_hour: 1000,
        expires_at: ''
      }
    ]);
  };

  const removeKey = (index: number) => {
    if (keys.length <= 1) return;
    
    const newKeys = keys.filter((_, i) => i !== index);
    setKeys(newKeys);
    
    // Remove errors for this index
    const newErrors = { ...errors };
    delete newErrors[index];
    setErrors(newErrors);
  };

  const updateKey = (index: number, field: keyof BulkKeyData, value: any) => {
    const newKeys = [...keys];
    newKeys[index] = { ...newKeys[index], [field]: value };
    setKeys(newKeys);
    
    // Clear error for this field
    if (errors[index]?.[field]) {
      const newErrors = { ...errors };
      delete newErrors[index][field];
      setErrors(newErrors);
    }
  };

  const updatePermissions = (index: number, permission: string) => {
    const currentPermissions = keys[index].permissions;
    const newPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission];
    
    updateKey(index, 'permissions', newPermissions);
  };

  const validateKeys = () => {
    const newErrors: Record<number, Record<string, string>> = {};
    
    keys.forEach((key, index) => {
      const keyErrors: Record<string, string> = {};
      
      if (!key.name.trim()) {
        keyErrors.name = 'Nome é obrigatório';
      }
      
      if (key.permissions.length === 0) {
        keyErrors.permissions = 'Pelo menos uma permissão';
      }
      
      if (key.rate_limit_per_hour < 1 || key.rate_limit_per_hour > 100000) {
        keyErrors.rate_limit_per_hour = 'Entre 1 e 100.000';
      }
      
      if (key.expires_at) {
        const expirationDate = new Date(key.expires_at);
        if (expirationDate <= new Date()) {
          keyErrors.expires_at = 'Data deve ser no futuro';
        }
      }
      
      if (Object.keys(keyErrors).length > 0) {
        newErrors[index] = keyErrors;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateKeys()) return;
    
    setLoading(true);
    try {
      await onSubmit(keys);
      onClose();
    } catch (error) {
      console.error('Error creating bulk keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const importFromCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const lines = csv.split('\n').filter(line => line.trim());
      
      if (lines.length <= 1) return; // No data rows
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const newKeys: BulkKeyData[] = [];
      
      for (let i = 1; i < lines.length && newKeys.length < 10; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const key: BulkKeyData = {
          name: '',
          permissions: ['read'],
          rate_limit_per_hour: 1000,
          expires_at: ''
        };
        
        headers.forEach((header, index) => {
          const value = values[index] || '';
          switch (header) {
            case 'name':
            case 'nome':
              key.name = value;
              break;
            case 'permissions':
            case 'permissões':
            case 'permissoes':
              key.permissions = value.split(';').filter(p => p.trim());
              break;
            case 'rate_limit':
            case 'rate_limit_per_hour':
            case 'limite':
              key.rate_limit_per_hour = parseInt(value) || 1000;
              break;
            case 'expires_at':
            case 'expira_em':
            case 'expiracao':
              key.expires_at = value;
              break;
          }
        });
        
        if (key.name) {
          newKeys.push(key);
        }
      }
      
      if (newKeys.length > 0) {
        setKeys(newKeys);
      }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  const exportTemplate = () => {
    const csvContent = [
      'name,permissions,rate_limit_per_hour,expires_at',
      'API Key Exemplo,read;write,1000,2024-12-31',
      'API Key Desenvolvimento,read,500,',
      'API Key Produção,read;write;admin,10000,2025-06-30'
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'api_keys_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Criar API Keys em Lote
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Import/Export Controls */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Importar CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={importFromCSV}
                  className="hidden"
                />
              </label>
              <button
                onClick={exportTemplate}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Template CSV
              </button>
            </div>
            <div className="text-sm text-gray-600">
              {keys.length}/10 chaves
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {keys.map((key, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    API Key #{index + 1}
                  </h3>
                  {keys.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeKey(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome *
                    </label>
                    <input
                      type="text"
                      value={key.name}
                      onChange={(e) => updateKey(index, 'name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors[index]?.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Nome da API Key"
                    />
                    {errors[index]?.name && (
                      <p className="mt-1 text-xs text-red-600">{errors[index].name}</p>
                    )}
                  </div>

                  {/* Rate Limit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rate Limit/hora *
                    </label>
                    <input
                      type="number"
                      value={key.rate_limit_per_hour}
                      onChange={(e) => updateKey(index, 'rate_limit_per_hour', parseInt(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors[index]?.rate_limit_per_hour ? 'border-red-300' : 'border-gray-300'
                      }`}
                      min="1"
                      max="100000"
                    />
                    {errors[index]?.rate_limit_per_hour && (
                      <p className="mt-1 text-xs text-red-600">{errors[index].rate_limit_per_hour}</p>
                    )}
                  </div>

                  {/* Permissões */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Permissões *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['read', 'write', 'admin'].map((permission) => (
                        <label key={permission} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={key.permissions.includes(permission)}
                            onChange={() => updatePermissions(index, permission)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 capitalize">
                            {permission}
                          </span>
                        </label>
                      ))}
                    </div>
                    {errors[index]?.permissions && (
                      <p className="mt-1 text-xs text-red-600">{errors[index].permissions}</p>
                    )}
                  </div>

                  {/* Expiração */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiração (opcional)
                    </label>
                    <input
                      type="date"
                      value={key.expires_at}
                      onChange={(e) => updateKey(index, 'expires_at', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors[index]?.expires_at ? 'border-red-300' : 'border-gray-300'
                      }`}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {errors[index]?.expires_at && (
                      <p className="mt-1 text-xs text-red-600">{errors[index].expires_at}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Add Key Button */}
            {keys.length < 10 && (
              <button
                type="button"
                onClick={addKey}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 flex items-center justify-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Adicionar API Key ({keys.length}/10)
              </button>
            )}
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || keys.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Criando...' : `Criar ${keys.length} API Key${keys.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkCreateModal;
