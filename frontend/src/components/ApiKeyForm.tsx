import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ApiKeyFormProps {
  apiKey?: {
    id: string;
    name: string;
    permissions: string[];
    rate_limit_per_hour: number;
    is_active: boolean;
    expires_at?: string;
  } | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

const ApiKeyForm: React.FC<ApiKeyFormProps> = ({ apiKey, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    permissions: ['read'] as string[],
    rate_limit_per_hour: 1000,
    is_active: true,
    expires_at: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (apiKey) {
      setFormData({
        name: apiKey.name,
        permissions: apiKey.permissions,
        rate_limit_per_hour: apiKey.rate_limit_per_hour,
        is_active: apiKey.is_active,
        expires_at: apiKey.expires_at ? apiKey.expires_at.split('T')[0] : ''
      });
    }
  }, [apiKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (formData.permissions.length === 0) {
      setError('At least one permission is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const submitData = {
        ...formData,
        name: formData.name.trim(),
        expires_at: formData.expires_at || null
      };

      await onSubmit(submitData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        permissions: [...prev.permissions, permission]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => p !== permission)
      }));
    }
  };

  const availablePermissions = [
    { value: 'read', label: 'Read', description: 'View articles, categories, tags, and comments' },
    { value: 'write', label: 'Write', description: 'Create and update content' },
    { value: 'admin', label: 'Admin', description: 'Full access including user and tenant management' }
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-lg bg-white rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {apiKey ? 'Edit API Key' : 'Create API Key'}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., Production API, Mobile App Key"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              A descriptive name to help you identify this API key
            </p>
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permissions *
            </label>
            <div className="space-y-2">
              {availablePermissions.map((permission) => (
                <div key={permission.value} className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id={`permission-${permission.value}`}
                      type="checkbox"
                      checked={formData.permissions.includes(permission.value)}
                      onChange={(e) => handlePermissionChange(permission.value, e.target.checked)}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor={`permission-${permission.value}`} className="font-medium text-gray-700">
                      {permission.label}
                    </label>
                    <p className="text-gray-500">{permission.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rate Limit */}
          <div>
            <label htmlFor="rate_limit" className="block text-sm font-medium text-gray-700">
              Rate Limit (requests per hour)
            </label>
            <input
              type="number"
              id="rate_limit"
              min="1"
              max="10000"
              value={formData.rate_limit_per_hour}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                rate_limit_per_hour: parseInt(e.target.value) || 1000 
              }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximum number of API requests allowed per hour
            </p>
          </div>

          {/* Expiration Date */}
          <div>
            <label htmlFor="expires_at" className="block text-sm font-medium text-gray-700">
              Expiration Date (optional)
            </label>
            <input
              type="date"
              id="expires_at"
              value={formData.expires_at}
              onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave empty for no expiration
            </p>
          </div>

          {/* Active Status (only for editing) */}
          {apiKey && (
            <div className="flex items-center">
              <input
                id="is_active"
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                Active
              </label>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (apiKey ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApiKeyForm;
