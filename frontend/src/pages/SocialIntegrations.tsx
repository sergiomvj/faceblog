import React, { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, Edit, Trash2, Power, PowerOff, AlertCircle, CheckCircle, Clock, Facebook, Twitter, Instagram, Linkedin, Youtube, Hash, Loader2 } from 'lucide-react';
import { SocialIntegration, ApiResponse } from '../services/api';
import apiService from '../services/api';
import SocialIntegrationForm from '../components/SocialIntegrationForm';

const SocialIntegrations: React.FC = () => {
  const [integrations, setIntegrations] = useState<SocialIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<SocialIntegration | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, [platformFilter, statusFilter]);

  const loadIntegrations = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (platformFilter) params.platform = platformFilter;
      if (statusFilter) params.status = statusFilter;

      const response: ApiResponse<SocialIntegration[]> = await apiService.getSocialIntegrations(params);
      if (response.success && response.data) {
        setIntegrations(response.data);
      } else {
        setError(response.error || 'Failed to load social integrations');
      }
    } catch (err) {
      setError('Failed to load social integrations');
      console.error('Error loading social integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIntegration = async (integrationData: any) => {
    try {
      const response: ApiResponse<SocialIntegration> = await apiService.createSocialIntegration(integrationData);
      if (response.success) {
        setShowForm(false);
        setEditingIntegration(undefined);
        await loadIntegrations();
      } else {
        throw new Error(response.error || 'Failed to create integration');
      }
    } catch (error) {
      console.error('Error creating integration:', error);
      throw error;
    }
  };

  const handleUpdateIntegration = async (integrationData: any) => {
    if (!editingIntegration) return;

    try {
      const response: ApiResponse<SocialIntegration> = await apiService.updateSocialIntegration(editingIntegration.id, integrationData);
      if (response.success) {
        setShowForm(false);
        setEditingIntegration(undefined);
        await loadIntegrations();
      } else {
        throw new Error(response.error || 'Failed to update integration');
      }
    } catch (error) {
      console.error('Error updating integration:', error);
      throw error;
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this social integration? This action cannot be undone.')) {
      return;
    }

    setDeletingId(id);
    try {
      const response: ApiResponse<void> = await apiService.deleteSocialIntegration(id);
      if (response.success) {
        await loadIntegrations();
      } else {
        setError(response.error || 'Failed to delete integration');
      }
    } catch (err) {
      setError('Failed to delete integration');
      console.error('Error deleting integration:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (id: string, status: 'active' | 'inactive' | 'error') => {
    setUpdatingStatusId(id);
    try {
      const response: ApiResponse<SocialIntegration> = await apiService.updateSocialIntegrationStatus(id, status);
      if (response.success) {
        await loadIntegrations();
      } else {
        setError(response.error || 'Failed to update integration status');
      }
    } catch (err) {
      setError('Failed to update integration status');
      console.error('Error updating integration status:', err);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleSync = async (id: string) => {
    setSyncingId(id);
    try {
      const response = await apiService.syncSocialIntegration(id);
      if (response.success) {
        await loadIntegrations();
        // Show sync result
        if (response.data?.sync_result) {
          alert(`Sync completed!\nPosts synced: ${response.data.sync_result.posts_synced}\nFollowers: ${response.data.sync_result.followers_count}\nEngagement: ${response.data.sync_result.engagement_rate}`);
        }
      } else {
        setError(response.error || 'Failed to sync integration');
      }
    } catch (err) {
      setError('Failed to sync integration');
      console.error('Error syncing integration:', err);
    } finally {
      setSyncingId(null);
    }
  };

  const filteredIntegrations = integrations.filter(integration =>
    integration.platform.toLowerCase().includes(searchTerm.toLowerCase()) ||
    integration.platform_username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    integration.platform_user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPlatformIcon = (platform: string) => {
    const icons = {
      facebook: Facebook,
      twitter: Twitter,
      instagram: Instagram,
      linkedin: Linkedin,
      youtube: Youtube,
      tiktok: Hash,
    };
    return icons[platform as keyof typeof icons] || Hash;
  };

  const getPlatformColor = (platform: string) => {
    const colors = {
      facebook: 'text-blue-600',
      twitter: 'text-sky-500',
      instagram: 'text-pink-600',
      linkedin: 'text-blue-700',
      youtube: 'text-red-600',
      tiktok: 'text-black',
    };
    return colors[platform as keyof typeof colors] || 'text-gray-600';
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
    };
    return badges[status as keyof typeof badges] || badges.inactive;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Social Integrations</h1>
          <p className="text-gray-600">Connect and manage your social media accounts</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Integration
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search integrations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Platforms</option>
            <option value="facebook">Facebook</option>
            <option value="twitter">Twitter</option>
            <option value="instagram">Instagram</option>
            <option value="linkedin">LinkedIn</option>
            <option value="youtube">YouTube</option>
            <option value="tiktok">TikTok</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Integrations Grid */}
      {filteredIntegrations.length === 0 ? (
        <div className="text-center py-12">
          <div className="flex justify-center space-x-2 mb-4">
            <Facebook className="w-8 h-8 text-blue-600" />
            <Twitter className="w-8 h-8 text-sky-500" />
            <Instagram className="w-8 h-8 text-pink-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No integrations found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || platformFilter || statusFilter
              ? 'Try adjusting your search or filters'
              : 'Connect your social media accounts to start sharing your content'}
          </p>
          {!searchTerm && !platformFilter && !statusFilter && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Integration
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIntegrations.map((integration) => {
            const PlatformIcon = getPlatformIcon(integration.platform);
            return (
              <div key={integration.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-gray-50 rounded-lg mr-3">
                        <PlatformIcon className={`w-6 h-6 ${getPlatformColor(integration.platform)}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 capitalize">
                          {integration.platform}
                        </h3>
                        {integration.platform_username && (
                          <p className="text-sm text-gray-600">@{integration.platform_username}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      {getStatusIcon(integration.status)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(integration.status)}`}>
                      {integration.status}
                    </span>
                    {integration.settings?.auto_post && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Auto Post
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>User ID:</span>
                      <span className="font-mono text-xs">{integration.platform_user_id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Last Sync:</span>
                      <span>{formatDate(integration.last_sync_at)}</span>
                    </div>
                    {integration.settings?.last_sync_result && (
                      <div className="text-xs bg-gray-50 p-2 rounded">
                        <div>Posts: {integration.settings.last_sync_result.posts_synced}</div>
                        <div>Followers: {integration.settings.last_sync_result.followers_count}</div>
                        <div>Engagement: {integration.settings.last_sync_result.engagement_rate}</div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingIntegration(integration);
                          setShowForm(true);
                        }}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit integration"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteIntegration(integration.id)}
                        disabled={deletingId === integration.id}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                        title="Delete integration"
                      >
                        {deletingId === integration.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center space-x-1">
                      {integration.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleSync(integration.id)}
                            disabled={syncingId === integration.id}
                            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                            title="Sync now"
                          >
                            {syncingId === integration.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={() => handleStatusChange(integration.id, 'inactive')}
                            disabled={updatingStatusId === integration.id}
                            className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                            title="Deactivate"
                          >
                            {updatingStatusId === integration.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <PowerOff className="w-3 h-3" />
                            )}
                          </button>
                        </>
                      )}
                      {integration.status === 'inactive' && (
                        <button
                          onClick={() => handleStatusChange(integration.id, 'active')}
                          disabled={updatingStatusId === integration.id}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                          title="Activate"
                        >
                          {updatingStatusId === integration.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Power className="w-3 h-3" />
                          )}
                        </button>
                      )}
                      {integration.status === 'error' && (
                        <button
                          onClick={() => handleStatusChange(integration.id, 'active')}
                          disabled={updatingStatusId === integration.id}
                          className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                          title="Retry"
                        >
                          {updatingStatusId === integration.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            'Retry'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Integration Form Modal */}
      {showForm && (
        <SocialIntegrationForm
          integration={editingIntegration}
          onSubmit={editingIntegration ? handleUpdateIntegration : handleCreateIntegration}
          onCancel={() => {
            setShowForm(false);
            setEditingIntegration(undefined);
          }}
        />
      )}
    </div>
  );
};

export default SocialIntegrations;
