import React, { useState } from 'react';
import { X, Save, Loader2, Facebook, Twitter, Instagram, Linkedin, Youtube, Hash } from 'lucide-react';
import { SocialIntegration } from '../services/api';

interface SocialIntegrationFormProps {
  integration?: SocialIntegration;
  onSubmit: (integration: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const SocialIntegrationForm: React.FC<SocialIntegrationFormProps> = ({
  integration,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    platform: integration?.platform || 'facebook' as 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'youtube' | 'tiktok',
    platform_user_id: integration?.platform_user_id || '',
    platform_username: integration?.platform_username || '',
    access_token: integration?.access_token || '',
    refresh_token: integration?.refresh_token || '',
    token_expires_at: integration?.token_expires_at || '',
    settings: integration?.settings || {},
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const platforms = [
    { value: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-600' },
    { value: 'twitter', label: 'Twitter', icon: Twitter, color: 'text-sky-500' },
    { value: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-600' },
    { value: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-blue-700' },
    { value: 'youtube', label: 'YouTube', icon: Youtube, color: 'text-red-600' },
    { value: 'tiktok', label: 'TikTok', icon: Hash, color: 'text-black' },
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSettingsChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value,
      },
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.platform) {
      newErrors.platform = 'Platform is required';
    }

    if (!formData.platform_user_id.trim()) {
      newErrors.platform_user_id = 'Platform User ID is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const integrationData = {
      ...formData,
      platform_username: formData.platform_username || undefined,
      access_token: formData.access_token || undefined,
      refresh_token: formData.refresh_token || undefined,
      token_expires_at: formData.token_expires_at || undefined,
    };

    await onSubmit(integrationData);
  };

  const selectedPlatform = platforms.find(p => p.value === formData.platform);
  const PlatformIcon = selectedPlatform?.icon || Hash;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <PlatformIcon className={`w-6 h-6 mr-3 ${selectedPlatform?.color || 'text-gray-600'}`} />
            <h2 className="text-xl font-semibold text-gray-900">
              {integration ? 'Edit Social Integration' : 'Add Social Integration'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Platform Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Platform *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {platforms.map((platform) => {
                const Icon = platform.icon;
                return (
                  <button
                    key={platform.value}
                    type="button"
                    onClick={() => handleInputChange('platform', platform.value)}
                    disabled={!!integration} // Disable platform change when editing
                    className={`flex items-center p-3 border rounded-lg transition-colors ${
                      formData.platform === platform.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    } ${integration ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <Icon className={`w-5 h-5 mr-2 ${platform.color}`} />
                    <span className="text-sm font-medium">{platform.label}</span>
                  </button>
                );
              })}
            </div>
            {errors.platform && (
              <p className="text-red-500 text-sm mt-1">{errors.platform}</p>
            )}
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Platform User ID *
              </label>
              <input
                type="text"
                value={formData.platform_user_id}
                onChange={(e) => handleInputChange('platform_user_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.platform_user_id ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter platform user ID"
              />
              {errors.platform_user_id && (
                <p className="text-red-500 text-sm mt-1">{errors.platform_user_id}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                The unique identifier for your account on {selectedPlatform?.label}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username/Handle
              </label>
              <input
                type="text"
                value={formData.platform_username}
                onChange={(e) => handleInputChange('platform_username', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="@username"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your public username or handle (optional)
              </p>
            </div>
          </div>

          {/* Authentication Tokens */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Authentication</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Access Token
              </label>
              <input
                type="password"
                value={formData.access_token}
                onChange={(e) => handleInputChange('access_token', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter access token (optional)"
              />
              <p className="text-xs text-gray-500 mt-1">
                OAuth access token for API authentication
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Refresh Token
              </label>
              <input
                type="password"
                value={formData.refresh_token}
                onChange={(e) => handleInputChange('refresh_token', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter refresh token (optional)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Token used to refresh the access token
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Token Expires At
              </label>
              <input
                type="datetime-local"
                value={formData.token_expires_at}
                onChange={(e) => handleInputChange('token_expires_at', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                When the access token expires (optional)
              </p>
            </div>
          </div>

          {/* Platform-specific Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Auto Post
                </label>
                <select
                  value={formData.settings.auto_post || 'false'}
                  onChange={(e) => handleSettingsChange('auto_post', e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="false">Disabled</option>
                  <option value="true">Enabled</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Automatically post new articles to this platform
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Post Template
                </label>
                <input
                  type="text"
                  value={formData.settings.post_template || ''}
                  onChange={(e) => handleSettingsChange('post_template', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="New post: {title} {url}"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Template for auto-posted content. Use {'{title}'} and {'{url}'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Include Hashtags
                </label>
                <select
                  value={formData.settings.include_hashtags || 'true'}
                  onChange={(e) => handleSettingsChange('include_hashtags', e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Include article tags as hashtags in posts
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sync Frequency
                </label>
                <select
                  value={formData.settings.sync_frequency || 'daily'}
                  onChange={(e) => handleSettingsChange('sync_frequency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="manual">Manual Only</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  How often to sync data from this platform
                </p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {integration ? 'Update Integration' : 'Add Integration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SocialIntegrationForm;
