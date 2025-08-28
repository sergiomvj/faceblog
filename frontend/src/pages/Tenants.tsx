import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { CheckCircle, Pause, XCircle, Calendar, Building, Plus, Globe, Crown, Edit, Trash2 } from 'lucide-react';
import { apiService, Tenant } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import TenantForm from '../components/TenantForm';

const Tenants: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTenants();
      
      if (response.success && response.data) {
        setTenants(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch tenants');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // CRUD Functions
  const handleCreateTenant = () => {
    setEditingTenant(null);
    setIsFormOpen(true);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setIsFormOpen(true);
  };

  const handleSaveTenant = (tenant: Tenant) => {
    if (editingTenant) {
      // Update existing tenant in list
      setTenants(prev => prev.map(t => t.id === tenant.id ? tenant : t));
    } else {
      // Add new tenant to list
      setTenants(prev => [...prev, tenant]);
    }
    setIsFormOpen(false);
    setEditingTenant(null);
  };

  const handleDeleteTenant = async (tenantId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Tenant',
      message: 'Are you sure you want to delete this tenant? This action cannot be undone.',
      onConfirm: () => deleteTenant(tenantId)
    });
  };

  const deleteTenant = async (tenantId: string) => {
    try {
      setActionLoading(tenantId);
      const response = await apiService.deleteTenant(tenantId);
      
      if (response.success) {
        setTenants(prev => prev.filter(t => t.id !== tenantId));
      } else {
        alert(response.error || 'Failed to delete tenant');
      }
    } catch (error) {
      alert('An error occurred while deleting the tenant');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (tenantId: string, newStatus: 'active' | 'inactive' | 'suspended') => {
    try {
      setActionLoading(tenantId);
      const response = await apiService.updateTenantStatus(tenantId, newStatus);
      
      if (response.success && response.data) {
        setTenants(prev => prev.map(t => t.id === tenantId ? response.data! : t));
      } else {
        alert(response.error || 'Failed to update tenant status');
      }
    } catch (error) {
      alert('An error occurred while updating tenant status');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter tenants
  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = 
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.subdomain.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
    const matchesPlan = planFilter === 'all' || tenant.plan === planFilter;
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  // Get plan badge color
  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'bg-yellow-100 text-yellow-800';
      case 'pro': return 'bg-purple-100 text-purple-800';
      case 'starter': return 'bg-blue-100 text-blue-800';
      case 'free': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'inactive': return <Pause className="w-4 h-4" />;
      case 'suspended': return <XCircle className="w-4 h-4" />;
      case 'trial': return <Calendar className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Tenants</h1>
        <button 
          onClick={handleCreateTenant}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Tenant
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search tenants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Plan Filter */}
          <div>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Plans</option>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white shadow rounded-lg p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading tenants...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchTenants}
            className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Tenants List */}
      {!loading && !error && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Tenants ({filteredTenants.length})
            </h3>
          </div>

          {filteredTenants.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <Building className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No tenants found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' || planFilter !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'Get started by creating a new tenant.'}
              </p>
              {!searchTerm && statusFilter === 'all' && planFilter === 'all' && (
                <div className="mt-6">
                  <button
                    onClick={handleCreateTenant}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
                    New Tenant
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tenant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      {/* Tenant Info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {tenant.logo_url ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={tenant.logo_url}
                                alt={tenant.name}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <Building className="h-6 w-6 text-gray-600" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {tenant.name}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Globe className="w-3 h-3 mr-1" />
                              {tenant.subdomain}.blogservice.com
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanBadgeColor(tenant.plan)}`}>
                          <Crown className="w-3 h-3 mr-1" />
                          {tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(tenant.status)}`}>
                          {getStatusIcon(tenant.status)}
                          <span className="ml-1">{tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}</span>
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Status Actions */}
                          {tenant.status === 'active' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(tenant.id, 'inactive')}
                                disabled={actionLoading === tenant.id}
                                className="text-gray-600 hover:text-gray-900 p-1 rounded transition-colors"
                                title="Set Inactive"
                              >
                                <Pause className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleStatusChange(tenant.id, 'suspended')}
                                disabled={actionLoading === tenant.id}
                                className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                                title="Suspend Tenant"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          
                          {tenant.status !== 'active' && (
                            <button
                              onClick={() => handleStatusChange(tenant.id, 'active')}
                              disabled={actionLoading === tenant.id}
                              className="text-green-600 hover:text-green-900 p-1 rounded transition-colors"
                              title="Activate Tenant"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit */}
                          <button 
                            onClick={() => handleEditTenant(tenant)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                            title="Edit tenant"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button 
                            onClick={() => handleDeleteTenant(tenant.id)}
                            disabled={actionLoading === tenant.id}
                            className="text-red-600 hover:text-red-900 p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete tenant"
                          >
                            {actionLoading === tenant.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tenant Form Modal */}
      <TenantForm
        tenant={editingTenant}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTenant(null);
        }}
        onSave={handleSaveTenant}
      />
    </div>
  );
};

export default Tenants;
