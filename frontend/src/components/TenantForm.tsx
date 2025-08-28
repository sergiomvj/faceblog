import React, { useState, useEffect } from 'react';
import { X, Save, Building, Globe, Link, Crown } from 'lucide-react';
import { apiService, Tenant } from '../services/api';

interface TenantFormProps {
  tenant?: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (tenant: Tenant) => void;
}

const PLANS = [
  { 
    value: 'free', 
    label: 'Free', 
    description: 'Basic features, 1 user, 10 articles',
    color: 'gray'
  },
  { 
    value: 'starter', 
    label: 'Starter', 
    description: 'Enhanced features, 5 users, 100 articles',
    color: 'blue'
  },
  { 
    value: 'pro', 
    label: 'Pro', 
    description: 'Advanced features, 20 users, unlimited articles',
    color: 'purple'
  },
  { 
    value: 'enterprise', 
    label: 'Enterprise', 
    description: 'All features, unlimited users, priority support',
    color: 'gold'
  },
] as const;

const STATUSES = [
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'inactive', label: 'Inactive', color: 'gray' },
  { value: 'suspended', label: 'Suspended', color: 'red' },
] as const;

export const TenantForm: React.FC<TenantFormProps> = ({
  tenant,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    subdomain: '',
    domain: '',
    description: '',
    logo_url: '',
    plan: 'free' as 'free' | 'starter' | 'pro' | 'enterprise',
    status: 'active' as 'active' | 'inactive' | 'suspended',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        slug: tenant.slug || '',
        subdomain: tenant.subdomain || '',
        domain: tenant.domain || '',
        description: tenant.description || '',
        logo_url: tenant.logo_url || '',
        plan: (tenant.plan || 'free') as 'free' | 'starter' | 'pro' | 'enterprise',
        status: (tenant.status || 'active') as 'active' | 'inactive' | 'suspended',
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        subdomain: '',
        domain: '',
        description: '',
        logo_url: '',
        plan: 'free',
        status: 'active',
      });
    }
    setErrors({});
  }, [tenant]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-generate slug from name
    if (name === 'name' && !tenant) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData(prev => ({ ...prev, slug }));
    }

    // Auto-generate subdomain from slug
    if (name === 'slug' && !tenant) {
      const subdomain = value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .trim();
      setFormData(prev => ({ ...prev, subdomain }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tenant name is required';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
    }

    if (!formData.subdomain.trim()) {
      newErrors.subdomain = 'Subdomain is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.subdomain)) {
      newErrors.subdomain = 'Subdomain must contain only lowercase letters, numbers, and hyphens';
    }

    if (formData.domain && !/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(formData.domain)) {
      newErrors.domain = 'Invalid domain format';
    }

    if (formData.logo_url && !/^https?:\/\/.+/.test(formData.logo_url)) {
      newErrors.logo_url = 'Logo URL must be a valid HTTP/HTTPS URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let response;
      
      if (tenant) {
        // Update existing tenant
        const updateData: any = {
          name: formData.name,
          slug: formData.slug,
          subdomain: formData.subdomain,
          domain: formData.domain || undefined,
          description: formData.description || undefined,
          logo_url: formData.logo_url || undefined,
          plan: formData.plan,
          status: formData.status,
        };
        
        response = await apiService.updateTenant(tenant.id, updateData);
      } else {
        // Create new tenant
        const createData = {
          name: formData.name,
          slug: formData.slug,
          subdomain: formData.subdomain,
          domain: formData.domain || undefined,
          description: formData.description || undefined,
          logo_url: formData.logo_url || undefined,
          plan: formData.plan,
        };
        
        response = await apiService.createTenant(createData);
      }

      if (response.success && response.data) {
        onSave(response.data);
        onClose();
      } else {
        setErrors({ submit: response.error || 'Failed to save tenant' });
      }
    } catch (error) {
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const getPlanBadgeColor = (plan: string) => {
    const planConfig = PLANS.find(p => p.value === plan);
    switch (planConfig?.color) {
      case 'blue': return 'bg-blue-100 text-blue-800';
      case 'purple': return 'bg-purple-100 text-purple-800';
      case 'gold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Building className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">
              {tenant ? 'Edit Tenant' : 'Create New Tenant'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tenant Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="My Awesome Blog"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slug *
              </label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.slug ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="my-awesome-blog"
              />
              {errors.slug && (
                <p className="mt-1 text-sm text-red-600">{errors.slug}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Used for internal identification. Only lowercase letters, numbers, and hyphens.
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of this tenant..."
              />
            </div>
          </div>

          {/* Domain Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Domain Configuration</h3>
            
            {/* Subdomain */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subdomain *
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  name="subdomain"
                  value={formData.subdomain}
                  onChange={handleInputChange}
                  className={`flex-1 px-3 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.subdomain ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="my-blog"
                />
                <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-gray-500">
                  .blogservice.com
                </span>
              </div>
              {errors.subdomain && (
                <p className="mt-1 text-sm text-red-600">{errors.subdomain}</p>
              )}
            </div>

            {/* Custom Domain */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Domain
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="domain"
                  value={formData.domain}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.domain ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="myblog.com"
                />
              </div>
              {errors.domain && (
                <p className="mt-1 text-sm text-red-600">{errors.domain}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Optional. Custom domain for this tenant.
              </p>
            </div>
          </div>

          {/* Plan and Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Plan & Settings</h3>
            
            {/* Plan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plan *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PLANS.map(plan => (
                  <label
                    key={plan.value}
                    className={`relative flex items-start p-3 border rounded-md cursor-pointer hover:bg-gray-50 ${
                      formData.plan === plan.value 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={plan.value}
                      checked={formData.plan === plan.value}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className="flex items-center space-x-3">
                      <Crown className={`w-5 h-5 ${
                        formData.plan === plan.value ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{plan.label}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanBadgeColor(plan.value)}`}>
                            {plan.value}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{plan.description}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Status (only for editing) */}
            {tenant && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATUSES.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Logo URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo URL
              </label>
              <div className="relative">
                <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="url"
                  name="logo_url"
                  value={formData.logo_url}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.logo_url ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              {errors.logo_url && (
                <p className="mt-1 text-sm text-red-600">{errors.logo_url}</p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : 'Save Tenant'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TenantForm;
