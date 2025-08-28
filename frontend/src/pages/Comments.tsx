import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { CheckCircle, Clock, XCircle, AlertTriangle, Plus, Search, MessageSquare, User, Mail, Edit, Trash2 } from 'lucide-react';
import { apiService, Comment } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import CommentForm from '../components/CommentForm';

const Comments: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [articleFilter, setArticleFilter] = useState<string>('all');

  // Articles for form
  const [articles, setArticles] = useState<Array<{ id: string; title: string; }>>([]);

  useEffect(() => {
    fetchComments();
    fetchArticles();
  }, []);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await apiService.getComments();
      
      if (response.success && response.data) {
        setComments(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch comments');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchArticles = async () => {
    try {
      const response = await apiService.getArticles();
      if (response.success && response.data) {
        setArticles(response.data.data?.map((article: any) => ({
          id: article.id,
          title: article.title
        })) || []);
      }
    } catch (err) {
      console.error('Error fetching articles:', err);
    }
  };

  // CRUD Functions
  const handleCreateComment = () => {
    setEditingComment(null);
    setIsFormOpen(true);
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment);
    setIsFormOpen(true);
  };

  const handleSaveComment = (comment: Comment) => {
    if (editingComment) {
      // Update existing comment in list
      setComments(prev => prev.map(c => c.id === comment.id ? comment : c));
    } else {
      // Add new comment to list
      setComments(prev => [comment, ...prev]);
    }
    setIsFormOpen(false);
    setEditingComment(null);
  };

  const handleDeleteComment = async (commentId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Comment',
      message: 'Are you sure you want to delete this comment? This action cannot be undone.',
      onConfirm: () => deleteComment(commentId)
    });
  };

  const deleteComment = async (commentId: string) => {
    try {
      setActionLoading(commentId);
      const response = await apiService.deleteComment(commentId);
      
      if (response.success) {
        setComments(prev => prev.filter(c => c.id !== commentId));
      } else {
        alert(response.error || 'Failed to delete comment');
      }
    } catch (error) {
      alert('An error occurred while deleting the comment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (commentId: string, newStatus: 'pending' | 'approved' | 'rejected' | 'spam') => {
    try {
      setActionLoading(commentId);
      const response = await apiService.updateCommentStatus(commentId, newStatus);
      
      if (response.success && response.data) {
        setComments(prev => prev.map(c => c.id === commentId ? response.data! : c));
      } else {
        alert(response.error || 'Failed to update comment status');
      }
    } catch (error) {
      alert('An error occurred while updating comment status');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter comments
  const filteredComments = comments.filter(comment => {
    const matchesSearch = 
      comment.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comment.author_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comment.author_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || comment.status === statusFilter;
    const matchesArticle = articleFilter === 'all' || comment.article_id === articleFilter;
    
    return matchesSearch && matchesStatus && matchesArticle;
  });

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'spam': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'spam': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Comments</h1>
        <button 
          onClick={handleCreateComment}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Comment
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search comments..."
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
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="spam">Spam</option>
            </select>
          </div>

          {/* Article Filter */}
          <div>
            <select
              value={articleFilter}
              onChange={(e) => setArticleFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Articles</option>
              {articles.map((article) => (
                <option key={article.id} value={article.id}>
                  {article.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white shadow rounded-lg p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading comments...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchComments}
            className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Comments List */}
      {!loading && !error && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Comments ({filteredComments.length})
            </h3>
          </div>

          {filteredComments.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No comments found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' || articleFilter !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'Get started by creating a new comment.'}
              </p>
              {!searchTerm && statusFilter === 'all' && articleFilter === 'all' && (
                <div className="mt-6">
                  <button
                    onClick={handleCreateComment}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
                    New Comment
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredComments.map((comment) => (
                <div key={comment.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Comment Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-900">
                              {comment.author_name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-500">
                              {comment.author_email}
                            </span>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(comment.status)}`}>
                          {getStatusIcon(comment.status)}
                          <span className="ml-1">{comment.status.charAt(0).toUpperCase() + comment.status.slice(1)}</span>
                        </span>
                      </div>

                      {/* Comment Content */}
                      <div className="mb-3">
                        <p className="text-gray-900 text-sm leading-relaxed">
                          {comment.content}
                        </p>
                      </div>

                      {/* Comment Meta */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-4">
                          {comment.article && (
                            <span>Article: {comment.article.title}</span>
                          )}
                          {comment.parent_id && (
                            <span>Reply to: {comment.parent_id}</span>
                          )}
                        </div>
                        <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      {/* Status Actions */}
                      {comment.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(comment.id, 'approved')}
                            disabled={actionLoading === comment.id}
                            className="text-green-600 hover:text-green-900 p-1 rounded transition-colors"
                            title="Approve Comment"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(comment.id, 'rejected')}
                            disabled={actionLoading === comment.id}
                            className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                            title="Reject Comment"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(comment.id, 'spam')}
                            disabled={actionLoading === comment.id}
                            className="text-gray-600 hover:text-gray-900 p-1 rounded transition-colors"
                            title="Mark as Spam"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      
                      {comment.status !== 'pending' && (
                        <button
                          onClick={() => handleStatusChange(comment.id, 'pending')}
                          disabled={actionLoading === comment.id}
                          className="text-yellow-600 hover:text-yellow-900 p-1 rounded transition-colors"
                          title="Set to Pending"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                      )}

                      {/* Edit */}
                      <button 
                        onClick={() => handleEditComment(comment)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                        title="Edit comment"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button 
                        onClick={() => handleDeleteComment(comment.id)}
                        disabled={actionLoading === comment.id}
                        className="text-red-600 hover:text-red-900 p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete comment"
                      >
                        {actionLoading === comment.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comment Form Modal */}
      <CommentForm
        comment={editingComment}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingComment(null);
        }}
        onSave={handleSaveComment}
        articles={articles}
      />
    </div>
  );
};

export default Comments;
