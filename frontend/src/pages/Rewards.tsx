import React, { useState, useEffect } from 'react';
import { Plus, Search, Gift, Star, ShoppingBag, FileText, Smartphone, Award, Edit, Trash2, Loader2 } from 'lucide-react';
import { Reward, UserReward, ApiResponse } from '../services/api';
import apiService from '../services/api';

interface RewardFormData {
  title: string;
  description: string;
  type: 'badge' | 'discount' | 'content' | 'physical' | 'digital';
  cost_points: number;
  max_claims?: number;
  reward_data: Record<string, any>;
}

const Rewards: React.FC = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<RewardFormData>({
    title: '',
    description: '',
    type: 'badge',
    cost_points: 100,
    max_claims: undefined,
    reward_data: {},
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadRewards();
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    if (editingReward) {
      setFormData({
        title: editingReward.title,
        description: editingReward.description || '',
        type: editingReward.type,
        cost_points: editingReward.cost_points,
        max_claims: editingReward.max_claims || undefined,
        reward_data: editingReward.reward_data || {},
      });
    } else {
      setFormData({
        title: '',
        description: '',
        type: 'badge',
        cost_points: 100,
        max_claims: undefined,
        reward_data: {},
      });
    }
  }, [editingReward]);

  const loadRewards = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;

      const response: ApiResponse<Reward[]> = await apiService.getRewards(params);
      if (response.success && response.data) {
        setRewards(response.data);
      } else {
        setError(response.error || 'Failed to load rewards');
      }
    } catch (err) {
      setError('Failed to load rewards');
      console.error('Error loading rewards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const response: ApiResponse<Reward> = await apiService.createReward(formData);
      if (response.success) {
        setShowForm(false);
        setEditingReward(undefined);
        setFormErrors({});
        await loadRewards();
      } else {
        setError(response.error || 'Failed to create reward');
      }
    } catch (error) {
      setError('Failed to create reward');
      console.error('Error creating reward:', error);
    }
  };

  const handleDeleteReward = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this reward? This action cannot be undone.')) {
      return;
    }

    setDeletingId(id);
    try {
      // Note: Delete endpoint not implemented in backend yet
      setError('Delete functionality not yet implemented');
    } catch (err) {
      setError('Failed to delete reward');
      console.error('Error deleting reward:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClaimReward = async (rewardId: string) => {
    // For demo purposes, using a mock user ID
    const userId = 'demo-user-id';
    
    setClaimingId(rewardId);
    try {
      const response: ApiResponse<UserReward> = await apiService.claimReward(rewardId, userId);
      if (response.success) {
        await loadRewards();
        // Show success message
        alert('Reward claimed successfully!');
      } else {
        setError(response.error || 'Failed to claim reward');
      }
    } catch (err) {
      setError('Failed to claim reward');
      console.error('Error claiming reward:', err);
    } finally {
      setClaimingId(null);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.cost_points <= 0) {
      newErrors.cost_points = 'Cost points must be greater than 0';
    }

    if (formData.max_claims !== undefined && formData.max_claims <= 0) {
      newErrors.max_claims = 'Max claims must be greater than 0';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const filteredRewards = rewards.filter(reward =>
    reward.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reward.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    const icons = {
      badge: Award,
      discount: Star,
      content: FileText,
      physical: ShoppingBag,
      digital: Smartphone,
    };
    const Icon = icons[type as keyof typeof icons] || Gift;
    return <Icon className="w-5 h-5" />;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      expired: 'bg-red-100 text-red-800',
    };
    return badges[status as keyof typeof badges] || badges.active;
  };

  const getTypeBadge = (type: string) => {
    const badges = {
      badge: 'bg-purple-100 text-purple-800',
      discount: 'bg-yellow-100 text-yellow-800',
      content: 'bg-blue-100 text-blue-800',
      physical: 'bg-green-100 text-green-800',
      digital: 'bg-indigo-100 text-indigo-800',
    };
    return badges[type as keyof typeof badges] || badges.badge;
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
          <h1 className="text-2xl font-bold text-gray-900">Rewards</h1>
          <p className="text-gray-600">Manage rewards that users can claim with points</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Reward
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search rewards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="expired">Expired</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            <option value="badge">Badge</option>
            <option value="discount">Discount</option>
            <option value="content">Content</option>
            <option value="physical">Physical</option>
            <option value="digital">Digital</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Rewards Grid */}
      {filteredRewards.length === 0 ? (
        <div className="text-center py-12">
          <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No rewards found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter || typeFilter
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first reward'}
          </p>
          {!searchTerm && !statusFilter && !typeFilter && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Reward
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRewards.map((reward) => (
            <div key={reward.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg mr-3">
                      {getTypeIcon(reward.type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {reward.title}
                      </h3>
                      {reward.description && (
                        <p className="text-gray-600 text-sm line-clamp-2">
                          {reward.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(reward.status)}`}>
                    {reward.status}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(reward.type)}`}>
                    {reward.type}
                  </span>
                </div>

                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Cost:</span>
                    <span className="font-medium text-blue-600">{reward.cost_points} points</span>
                  </div>
                  {reward.max_claims && (
                    <div className="flex items-center justify-between">
                      <span>Available:</span>
                      <span className="font-medium">
                        {reward.max_claims - reward.current_claims} / {reward.max_claims}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>Claimed:</span>
                    <span className="font-medium">{reward.current_claims} times</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingReward(reward);
                        setShowForm(true);
                      }}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Edit reward"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteReward(reward.id)}
                      disabled={deletingId === reward.id}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      title="Delete reward"
                    >
                      {deletingId === reward.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {reward.status === 'active' && (
                    <button
                      onClick={() => handleClaimReward(reward.id)}
                      disabled={claimingId === reward.id || (reward.max_claims ? reward.current_claims >= reward.max_claims : false)}
                      className="flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {claimingId === reward.id ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Gift className="w-3 h-3 mr-1" />
                      )}
                      Claim
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reward Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingReward ? 'Edit Reward' : 'Create New Reward'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingReward(undefined);
                  setFormErrors({});
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateReward} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter reward title"
                />
                {formErrors.title && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter reward description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="badge">Badge</option>
                    <option value="discount">Discount</option>
                    <option value="content">Content</option>
                    <option value="physical">Physical</option>
                    <option value="digital">Digital</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost Points *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.cost_points}
                    onChange={(e) => handleInputChange('cost_points', parseInt(e.target.value) || 100)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.cost_points ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="100"
                  />
                  {formErrors.cost_points && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.cost_points}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Claims (optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_claims || ''}
                  onChange={(e) => handleInputChange('max_claims', e.target.value ? parseInt(e.target.value) : undefined)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.max_claims ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Leave empty for unlimited"
                />
                {formErrors.max_claims && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.max_claims}</p>
                )}
              </div>

              <div className="flex items-center justify-end space-x-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingReward(undefined);
                    setFormErrors({});
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  {editingReward ? 'Update Reward' : 'Create Reward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rewards;
