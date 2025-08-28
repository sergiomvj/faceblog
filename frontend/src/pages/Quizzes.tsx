import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Eye, Play, Archive, FileText, Clock, Target, Loader2 } from 'lucide-react';
import { Quiz, ApiResponse } from '../services/api';
import apiService from '../services/api';
import QuizForm from '../components/QuizForm';

const Quizzes: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  useEffect(() => {
    loadQuizzes();
  }, [statusFilter, difficultyFilter]);

  const loadQuizzes = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (difficultyFilter) params.difficulty = difficultyFilter;

      const response: ApiResponse<Quiz[]> = await apiService.getQuizzes(params);
      if (response.success && response.data) {
        setQuizzes(response.data);
      } else {
        setError(response.error || 'Failed to load quizzes');
      }
    } catch (err) {
      setError('Failed to load quizzes');
      console.error('Error loading quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuiz = async (quizData: any) => {
    try {
      const response: ApiResponse<Quiz> = await apiService.createQuiz(quizData);
      if (response.success) {
        setShowForm(false);
        setEditingQuiz(undefined);
        await loadQuizzes();
      } else {
        throw new Error(response.error || 'Failed to create quiz');
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
      throw error;
    }
  };

  const handleUpdateQuiz = async (quizData: any) => {
    if (!editingQuiz) return;

    try {
      const response: ApiResponse<Quiz> = await apiService.updateQuiz(editingQuiz.id, quizData);
      if (response.success) {
        setShowForm(false);
        setEditingQuiz(undefined);
        await loadQuizzes();
      } else {
        throw new Error(response.error || 'Failed to update quiz');
      }
    } catch (error) {
      console.error('Error updating quiz:', error);
      throw error;
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return;
    }

    setDeletingId(id);
    try {
      const response: ApiResponse<void> = await apiService.deleteQuiz(id);
      if (response.success) {
        await loadQuizzes();
      } else {
        setError(response.error || 'Failed to delete quiz');
      }
    } catch (err) {
      setError('Failed to delete quiz');
      console.error('Error deleting quiz:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (id: string, status: 'draft' | 'published' | 'archived') => {
    setUpdatingStatusId(id);
    try {
      const response: ApiResponse<Quiz> = await apiService.updateQuizStatus(id, status);
      if (response.success) {
        await loadQuizzes();
      } else {
        setError(response.error || 'Failed to update quiz status');
      }
    } catch (err) {
      setError('Failed to update quiz status');
      console.error('Error updating quiz status:', err);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.article?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-green-100 text-green-800',
      archived: 'bg-red-100 text-red-800',
    };
    return badges[status as keyof typeof badges] || badges.draft;
  };

  const getDifficultyBadge = (difficulty: string) => {
    const badges = {
      easy: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      hard: 'bg-red-100 text-red-800',
    };
    return badges[difficulty as keyof typeof badges] || badges.easy;
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
          <h1 className="text-2xl font-bold text-gray-900">Quizzes</h1>
          <p className="text-gray-600">Manage interactive quizzes for your blog</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Quiz
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search quizzes..."
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
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Quizzes Grid */}
      {filteredQuizzes.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter || difficultyFilter
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first quiz'}
          </p>
          {!searchTerm && !statusFilter && !difficultyFilter && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Quiz
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {quiz.title}
                    </h3>
                    {quiz.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {quiz.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(quiz.status)}`}>
                    {quiz.status}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyBadge(quiz.difficulty)}`}>
                    {quiz.difficulty}
                  </span>
                </div>

                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  {quiz.article && (
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      <span className="truncate">{quiz.article.title}</span>
                    </div>
                  )}
                  {quiz.time_limit && quiz.time_limit > 0 && (
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>{quiz.time_limit} minutes</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <Target className="w-4 h-4 mr-2" />
                    <span>{quiz.passing_score}% to pass</span>
                  </div>
                  {quiz.questions && (
                    <div className="flex items-center">
                      <Eye className="w-4 h-4 mr-2" />
                      <span>{quiz.questions.length} questions</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingQuiz(quiz);
                        setShowForm(true);
                      }}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Edit quiz"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      disabled={deletingId === quiz.id}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      title="Delete quiz"
                    >
                      {deletingId === quiz.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center space-x-1">
                    {quiz.status === 'draft' && (
                      <button
                        onClick={() => handleStatusChange(quiz.id, 'published')}
                        disabled={updatingStatusId === quiz.id}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        title="Publish quiz"
                      >
                        {updatingStatusId === quiz.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                      </button>
                    )}
                    {quiz.status === 'published' && (
                      <button
                        onClick={() => handleStatusChange(quiz.id, 'archived')}
                        disabled={updatingStatusId === quiz.id}
                        className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                        title="Archive quiz"
                      >
                        {updatingStatusId === quiz.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Archive className="w-3 h-3" />
                        )}
                      </button>
                    )}
                    {quiz.status === 'archived' && (
                      <button
                        onClick={() => handleStatusChange(quiz.id, 'draft')}
                        disabled={updatingStatusId === quiz.id}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        title="Move to draft"
                      >
                        {updatingStatusId === quiz.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          'Draft'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quiz Form Modal */}
      {showForm && (
        <QuizForm
          quiz={editingQuiz}
          onSubmit={editingQuiz ? handleUpdateQuiz : handleCreateQuiz}
          onCancel={() => {
            setShowForm(false);
            setEditingQuiz(undefined);
          }}
        />
      )}
    </div>
  );
};

export default Quizzes;
