import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, TrendingUp, Calendar, Users, Star, Loader2 } from 'lucide-react';
import { UserPoints, ApiResponse } from '../services/api';
import apiService from '../services/api';

const Leaderboards: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<UserPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all_time'>('all_time');
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    loadLeaderboard();
  }, [period, limit]);

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<UserPoints[]> = await apiService.getLeaderboards({
        period,
        limit,
      });
      if (response.success && response.data) {
        setLeaderboard(response.data);
      } else {
        setError(response.error || 'Failed to load leaderboard');
      }
    } catch (err) {
      setError('Failed to load leaderboard');
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <div className="w-6 h-6 flex items-center justify-center bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
            {rank}
          </div>
        );
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank <= 3) {
      const colors = {
        1: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        2: 'bg-gray-100 text-gray-800 border-gray-200',
        3: 'bg-amber-100 text-amber-800 border-amber-200',
      };
      return colors[rank as keyof typeof colors];
    }
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const getLevelBadge = (level: number) => {
    if (level >= 10) return 'bg-purple-100 text-purple-800';
    if (level >= 5) return 'bg-green-100 text-green-800';
    return 'bg-blue-100 text-blue-800';
  };

  const formatPoints = (points: number) => {
    if (points >= 1000000) return `${(points / 1000000).toFixed(1)}M`;
    if (points >= 1000) return `${(points / 1000).toFixed(1)}K`;
    return points.toString();
  };

  const getPeriodLabel = (period: string) => {
    const labels = {
      today: 'Today',
      week: 'This Week',
      month: 'This Month',
      all_time: 'All Time',
    };
    return labels[period as keyof typeof labels] || 'All Time';
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
          <h1 className="text-2xl font-bold text-gray-900">Leaderboards</h1>
          <p className="text-gray-600">Top performers in the community</p>
        </div>
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">
            {leaderboard.length} active users
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <label className="text-sm font-medium text-gray-700">Period:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all_time">All Time</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-gray-500" />
          <label className="text-sm font-medium text-gray-700">Show:</label>
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value={10}>Top 10</option>
            <option value={25}>Top 25</option>
            <option value={50}>Top 50</option>
            <option value={100}>Top 100</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No rankings available</h3>
          <p className="text-gray-600">
            {period !== 'all_time' 
              ? `No activity recorded for ${getPeriodLabel(period).toLowerCase()}`
              : 'Start engaging with content to appear on the leaderboard'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Top 3 Podium */}
          {leaderboard.length >= 3 && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                🏆 Top Performers - {getPeriodLabel(period)}
              </h3>
              <div className="flex items-end justify-center space-x-4">
                {/* 2nd Place */}
                {leaderboard[1] && (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-2 mx-auto">
                      <span className="text-xl font-bold text-gray-700">
                        {leaderboard[1].users?.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div className="bg-gray-100 px-3 py-1 rounded-full mb-2">
                      <Medal className="w-4 h-4 text-gray-400 mx-auto" />
                    </div>
                    <p className="font-medium text-gray-900 text-sm">
                      {leaderboard[1].users?.name || 'Anonymous'}
                    </p>
                    <p className="text-gray-600 text-xs">
                      {formatPoints(leaderboard[1].total_points)} pts
                    </p>
                  </div>
                )}

                {/* 1st Place */}
                <div className="text-center">
                  <div className="w-20 h-20 bg-yellow-200 rounded-full flex items-center justify-center mb-2 mx-auto">
                    <span className="text-2xl font-bold text-yellow-800">
                      {leaderboard[0].users?.name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className="bg-yellow-100 px-3 py-1 rounded-full mb-2">
                    <Trophy className="w-5 h-5 text-yellow-500 mx-auto" />
                  </div>
                  <p className="font-bold text-gray-900">
                    {leaderboard[0].users?.name || 'Anonymous'}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {formatPoints(leaderboard[0].total_points)} pts
                  </p>
                </div>

                {/* 3rd Place */}
                {leaderboard[2] && (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-amber-200 rounded-full flex items-center justify-center mb-2 mx-auto">
                      <span className="text-xl font-bold text-amber-800">
                        {leaderboard[2].users?.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div className="bg-amber-100 px-3 py-1 rounded-full mb-2">
                      <Award className="w-4 h-4 text-amber-600 mx-auto" />
                    </div>
                    <p className="font-medium text-gray-900 text-sm">
                      {leaderboard[2].users?.name || 'Anonymous'}
                    </p>
                    <p className="text-gray-600 text-xs">
                      {formatPoints(leaderboard[2].total_points)} pts
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Full Leaderboard Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reading
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quizzes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comments
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaderboard.map((user, index) => (
                  <tr key={user.user_id} className={`hover:bg-gray-50 ${user.rank && user.rank <= 3 ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getRankIcon(user.rank || index + 1)}
                        <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full border ${getRankBadge(user.rank || index + 1)}`}>
                          #{user.rank || index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-blue-800">
                            {user.users?.name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.users?.name || 'Anonymous'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.users?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelBadge(user.level)}`}>
                        <Star className="w-3 h-3 mr-1" />
                        Level {user.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {formatPoints(user.total_points)}
                      </div>
                      <div className="text-xs text-gray-500">points</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatPoints(user.reading_points)}
                      </div>
                      <div className="text-xs text-gray-500">reading</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatPoints(user.quiz_points)}
                      </div>
                      <div className="text-xs text-gray-500">quizzes</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatPoints(user.comment_points)}
                      </div>
                      <div className="text-xs text-gray-500">comments</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {leaderboard.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Trophy className="w-8 h-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Top Score</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatPoints(leaderboard[0]?.total_points || 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-lg font-bold text-gray-900">{leaderboard.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Star className="w-8 h-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Level</p>
                <p className="text-lg font-bold text-gray-900">
                  {Math.round(leaderboard.reduce((sum, user) => sum + user.level, 0) / leaderboard.length)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Points</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatPoints(leaderboard.reduce((sum, user) => sum + user.total_points, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboards;
