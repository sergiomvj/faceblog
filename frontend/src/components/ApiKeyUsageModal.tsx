import React, { useState, useEffect } from 'react';
import { XMarkIcon, ChartBarIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

interface ApiKeyUsageModalProps {
  apiKeyId: string;
  onClose: () => void;
}

interface UsageStats {
  api_key: {
    id: string;
    name: string;
  };
  period_days: number;
  statistics: {
    total_requests: number;
    requests_by_day: Record<string, number>;
    requests_by_endpoint: Record<string, number>;
    requests_by_status: Record<string, number>;
    recent_requests: Array<{
      endpoint: string;
      method: string;
      status_code: number;
      created_at: string;
    }>;
  };
}

const ApiKeyUsageModal: React.FC<ApiKeyUsageModalProps> = ({ apiKeyId, onClose }) => {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(7);

  useEffect(() => {
    fetchUsage();
  }, [apiKeyId, selectedPeriod]);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/api/v1/api-keys/${apiKeyId}/usage?days=${selectedPeriod}`);
      setUsage(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch usage statistics');
      console.error('Error fetching usage:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    if (status.startsWith('2')) return 'text-green-600 bg-green-100';
    if (status.startsWith('4')) return 'text-yellow-600 bg-yellow-100';
    if (status.startsWith('5')) return 'text-red-600 bg-red-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'get': return 'text-blue-600 bg-blue-100';
      case 'post': return 'text-green-600 bg-green-100';
      case 'put': return 'text-yellow-600 bg-yellow-100';
      case 'delete': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl bg-white rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">
              API Key Usage Statistics
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        ) : usage ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-lg font-medium text-gray-900">{usage.api_key.name}</h4>
                <p className="text-sm text-gray-500">Last {usage.period_days} days</p>
              </div>
              <div className="flex space-x-2">
                {[7, 30, 90].map((days) => (
                  <button
                    key={days}
                    onClick={() => setSelectedPeriod(days)}
                    className={`px-3 py-1 text-sm rounded-md ${
                      selectedPeriod === days
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {days}d
                  </button>
                ))}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-900">Total Requests</p>
                    <p className="text-2xl font-semibold text-blue-600">
                      {usage.statistics.total_requests}
                    </p>
                  </div>
                </div>
              </div>

              {Object.entries(usage.statistics.requests_by_status).map(([status, count]) => (
                <div key={status} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(status).split(' ')[1]}`}></div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{status} Status</p>
                      <p className="text-xl font-semibold text-gray-600">{count}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Requests by Day */}
              <div className="bg-white border rounded-lg p-4">
                <h5 className="text-sm font-medium text-gray-900 mb-3">Requests by Day</h5>
                <div className="space-y-2">
                  {Object.entries(usage.statistics.requests_by_day)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .slice(0, 7)
                    .map(([date, count]) => (
                      <div key={date} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {new Date(date).toLocaleDateString('pt-BR', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ 
                                width: `${Math.min(100, (count / Math.max(...Object.values(usage.statistics.requests_by_day))) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-8 text-right">
                            {count}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Requests by Endpoint */}
              <div className="bg-white border rounded-lg p-4">
                <h5 className="text-sm font-medium text-gray-900 mb-3">Top Endpoints</h5>
                <div className="space-y-2">
                  {Object.entries(usage.statistics.requests_by_endpoint)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([endpoint, count]) => (
                      <div key={endpoint} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 truncate flex-1 mr-2">
                          {endpoint}
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ 
                                width: `${Math.min(100, (count / Math.max(...Object.values(usage.statistics.requests_by_endpoint))) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-8 text-right">
                            {count}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Recent Requests */}
            <div className="bg-white border rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200">
                <h5 className="text-sm font-medium text-gray-900 flex items-center">
                  <ClockIcon className="h-4 w-4 mr-2" />
                  Recent Requests
                </h5>
              </div>
              <div className="divide-y divide-gray-200">
                {usage.statistics.recent_requests.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    No recent requests found
                  </div>
                ) : (
                  usage.statistics.recent_requests.map((request, index) => (
                    <div key={index} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getMethodColor(request.method)}`}>
                          {request.method}
                        </span>
                        <span className="text-sm text-gray-900 font-mono">
                          {request.endpoint}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(request.status_code.toString())}`}>
                          {request.status_code}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(request.created_at)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Close Button */}
        <div className="flex justify-end mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyUsageModal;
