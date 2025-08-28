import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  KeyIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { apiService } from '../services/api';
import ApiKeyForm from '../components/ApiKeyForm';
import ApiKeyUsageModal from '../components/ApiKeyUsageModal';
import ConfirmDialog from '../components/ConfirmDialog';

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

interface ApiKeyWithSecret extends ApiKey {
  api_key?: string;
}

const ApiKeys: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [showUsage, setShowUsage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [regenerateConfirm, setRegenerateConfirm] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/api/v1/api-keys');
      setApiKeys(response.data.api_keys || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch API keys');
      console.error('Error fetching API keys:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (data: any) => {
    try {
      const response = await apiService.post('/api/v1/api-keys', data);
      const createdKey = response.data as ApiKeyWithSecret;
      
      setApiKeys(prev => [createdKey, ...prev]);
      setNewApiKey(createdKey.api_key || null);
      setShowForm(false);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create API key');
      throw err;
    }
  };

  const handleUpdateKey = async (id: string, data: any) => {
    try {
      const response = await apiService.put(`/api/v1/api-keys/${id}`, data);
      const updatedKey = response.data;
      
      setApiKeys(prev => prev.map(key => 
        key.id === id ? updatedKey : key
      ));
      setEditingKey(null);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update API key');
      throw err;
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      await apiService.delete(`/api/v1/api-keys/${id}`);
      setApiKeys(prev => prev.filter(key => key.id !== id));
      setDeleteConfirm(null);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete API key');
    }
  };

  const handleRegenerateKey = async (id: string) => {
    try {
      const response = await apiService.post(`/api/v1/api-keys/${id}/regenerate`);
      const regeneratedKey = response.data as ApiKeyWithSecret;
      
      setApiKeys(prev => prev.map(key => 
        key.id === id ? regeneratedKey : key
      ));
      setNewApiKey(regeneratedKey.api_key || null);
      setRegenerateConfirm(null);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to regenerate API key');
    }
  };

  const copyToClipboard = async (text: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPermissionBadgeColor = (permission: string) => {
    switch (permission) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'write': return 'bg-yellow-100 text-yellow-800';
      case 'read': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isExpired = (expiresAt?: string) => {
    return expiresAt && new Date(expiresAt) < new Date();
  };

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
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-600 mt-1">
            Manage API keys for accessing your blog content programmatically
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create API Key
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* New API Key Alert */}
      {newApiKey && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckIcon className="h-5 w-5 text-green-400" />
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-green-800">
                API Key Created Successfully
              </h3>
              <p className="text-sm text-green-700 mt-1">
                Save this key securely - it will not be shown again.
              </p>
              <div className="mt-3 flex items-center space-x-2">
                <code className="bg-green-100 px-2 py-1 rounded text-sm font-mono text-green-800 flex-1">
                  {newApiKey}
                </code>
                <button
                  onClick={() => copyToClipboard(newApiKey, 'new')}
                  className="inline-flex items-center px-2 py-1 border border-green-300 rounded text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200"
                >
                  {copiedKey === 'new' ? (
                    <CheckIcon className="h-3 w-3" />
                  ) : (
                    <ClipboardDocumentIcon className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => setNewApiKey(null)}
              className="ml-3 text-green-400 hover:text-green-500"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* API Keys List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {apiKeys.length === 0 ? (
          <div className="text-center py-12">
            <KeyIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No API keys</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first API key.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create API Key
              </button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {apiKeys.map((apiKey) => (
              <li key={apiKey.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <KeyIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {apiKey.name}
                          </p>
                          {!apiKey.is_active && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Inactive
                            </span>
                          )}
                          {isExpired(apiKey.expires_at) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Expired
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <p className="text-sm text-gray-500 font-mono">
                            {apiKey.key_prefix}...
                          </p>
                          <div className="flex space-x-1">
                            {apiKey.permissions.map((permission) => (
                              <span
                                key={permission}
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPermissionBadgeColor(permission)}`}
                              >
                                {permission}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <span>Rate limit: {apiKey.rate_limit_per_hour}/hour</span>
                          <span>Created: {formatDate(apiKey.created_at)}</span>
                          {apiKey.last_used_at && (
                            <span>Last used: {formatDate(apiKey.last_used_at)}</span>
                          )}
                          {apiKey.expires_at && (
                            <span>Expires: {formatDate(apiKey.expires_at)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowUsage(apiKey.id)}
                      className="inline-flex items-center p-1 border border-transparent rounded text-gray-400 hover:text-gray-500"
                      title="View usage statistics"
                    >
                      <ChartBarIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingKey(apiKey)}
                      className="inline-flex items-center p-1 border border-transparent rounded text-gray-400 hover:text-gray-500"
                      title="Edit API key"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setRegenerateConfirm(apiKey.id)}
                      className="inline-flex items-center p-1 border border-transparent rounded text-gray-400 hover:text-gray-500"
                      title="Regenerate API key"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(apiKey.id)}
                      className="inline-flex items-center p-1 border border-transparent rounded text-red-400 hover:text-red-500"
                      title="Delete API key"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {(showForm || editingKey) && (
        <ApiKeyForm
          apiKey={editingKey}
          onSubmit={editingKey ? 
            (data) => handleUpdateKey(editingKey.id, data) : 
            handleCreateKey
          }
          onCancel={() => {
            setShowForm(false);
            setEditingKey(null);
          }}
        />
      )}

      {/* Usage Statistics Modal */}
      {showUsage && (
        <ApiKeyUsageModal
          apiKeyId={showUsage}
          onClose={() => setShowUsage(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Delete API Key"
          message="Are you sure you want to delete this API key? This action cannot be undone and will immediately revoke access for any applications using this key."
          confirmText="Delete"
          confirmClass="bg-red-600 hover:bg-red-700"
          onConfirm={() => handleDeleteKey(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* Regenerate Confirmation */}
      {regenerateConfirm && (
        <ConfirmDialog
          title="Regenerate API Key"
          message="Are you sure you want to regenerate this API key? The current key will be immediately invalidated and you'll need to update any applications using it."
          confirmText="Regenerate"
          confirmClass="bg-yellow-600 hover:bg-yellow-700"
          onConfirm={() => handleRegenerateKey(regenerateConfirm)}
          onCancel={() => setRegenerateConfirm(null)}
        />
      )}
    </div>
  );
};

export default ApiKeys;
