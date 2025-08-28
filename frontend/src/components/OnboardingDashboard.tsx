import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon as TrendingUpIcon, 
  UserGroupIcon,
  BuildingOfficeIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface OnboardingStats {
  totalTenants: number;
  recentTenants: number;
  planDistribution: Record<string, number>;
  growthRate: string;
}

const OnboardingDashboard: React.FC = () => {
  const [stats, setStats] = useState<OnboardingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://65.181.118.38:5001/api'}/onboarding/stats`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-red-600">
          <p>Error loading onboarding stats: {error}</p>
          <button 
            onClick={fetchStats}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const planColors: Record<string, string> = {
    starter: 'bg-green-100 text-green-800',
    pro: 'bg-blue-100 text-blue-800',
    enterprise: 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Onboarding Dashboard</h2>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Tenants</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalTenants}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Last 30 Days</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.recentTenants}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUpIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Growth Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.growthRate}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserGroupIcon className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Plans</p>
              <p className="text-2xl font-semibold text-gray-900">
                {Object.keys(stats.planDistribution).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <ChartBarIcon className="h-6 w-6 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Plan Distribution</h3>
        </div>

        {Object.keys(stats.planDistribution).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(stats.planDistribution).map(([plan, count]) => {
              const percentage = stats.totalTenants > 0 
                ? ((count / stats.totalTenants) * 100).toFixed(1)
                : '0';
              
              return (
                <div key={plan} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                      planColors[plan] || 'bg-gray-100 text-gray-800'
                    }`}>
                      {plan}
                    </span>
                    <span className="ml-3 text-sm text-gray-600">
                      {count} tenant{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500">No tenants registered yet</p>
            <p className="text-sm text-gray-400">
              Start by registering your first tenant
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/register"
            className="flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <BuildingOfficeIcon className="h-5 w-5 mr-2" />
            Register New Tenant
          </a>
          
          <button
            onClick={fetchStats}
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Refresh Stats
          </button>

          <a
            href="/tenants"
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <UserGroupIcon className="h-5 w-5 mr-2" />
            Manage Tenants
          </a>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="text-center py-8">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500">Activity tracking coming soon</p>
          <p className="text-sm text-gray-400">
            We'll show recent tenant registrations and activities here
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingDashboard;
