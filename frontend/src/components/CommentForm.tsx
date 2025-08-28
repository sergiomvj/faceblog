import React, { useState, useEffect } from 'react';
import { X, MessageSquare, User, Mail, FileText } from 'lucide-react';
import { apiService, Comment } from '../services/api';

interface CommentFormProps {
  comment?: Comment | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (comment: Comment) => void;
  articles?: Array<{ id: string; title: string; }>;
}

const CommentForm: React.FC<CommentFormProps> = ({
  comment,
  isOpen,
  onClose,
  onSave,
  articles = []
}) => {
  const [formData, setFormData] = useState({
    content: '',
    author_name: '',
    author_email: '',
    article_id: '',
    parent_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (comment) {
      setFormData({
        content: comment.content || '',
        author_name: comment.author_name || '',
        author_email: comment.author_email || '',
        article_id: comment.article_id || '',
        parent_id: comment.parent_id || '',
      });
    } else {
      setFormData({
        content: '',
        author_name: '',
        author_email: '',
        article_id: '',
        parent_id: '',
      });
    }
    setErrors({});
  }, [comment, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    } else if (formData.content.length < 5) {
      newErrors.content = 'Content must be at least 5 characters';
    } else if (formData.content.length > 2000) {
      newErrors.content = 'Content must be less than 2000 characters';
    }

    if (!formData.author_name.trim()) {
      newErrors.author_name = 'Author name is required';
    } else if (formData.author_name.length < 2) {
      newErrors.author_name = 'Author name must be at least 2 characters';
    }

    if (!formData.author_email.trim()) {
      newErrors.author_email = 'Author email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.author_email)) {
        newErrors.author_email = 'Invalid email format';
      }
    }

    if (!formData.article_id) {
      newErrors.article_id = 'Article is required';
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
      const commentData = {
        content: formData.content.trim(),
        author_name: formData.author_name.trim(),
        author_email: formData.author_email.trim(),
        article_id: formData.article_id,
        parent_id: formData.parent_id || undefined,
      };

      let response;
      if (comment) {
        // Update existing comment
        response = await apiService.updateComment(comment.id, {
          content: commentData.content,
          author_name: commentData.author_name,
          author_email: commentData.author_email,
        });
      } else {
        // Create new comment
        response = await apiService.createComment(commentData);
      }

      if (response.success && response.data) {
        onSave(response.data);
        onClose();
      } else {
        setErrors({ submit: response.error || 'Failed to save comment' });
      }
    } catch (error) {
      setErrors({ submit: 'An error occurred while saving the comment' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            {comment ? 'Edit Comment' : 'New Comment'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-4 h-4 inline mr-1" />
              Content *
            </label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              rows={4}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                errors.content
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              placeholder="Enter comment content..."
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-600">{errors.content}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {formData.content.length}/2000 characters
            </p>
          </div>

          {/* Author Name */}
          <div>
            <label htmlFor="author_name" className="block text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4 inline mr-1" />
              Author Name *
            </label>
            <input
              type="text"
              id="author_name"
              name="author_name"
              value={formData.author_name}
              onChange={handleInputChange}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                errors.author_name
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              placeholder="Enter author name..."
            />
            {errors.author_name && (
              <p className="mt-1 text-sm text-red-600">{errors.author_name}</p>
            )}
          </div>

          {/* Author Email */}
          <div>
            <label htmlFor="author_email" className="block text-sm font-medium text-gray-700 mb-1">
              <Mail className="w-4 h-4 inline mr-1" />
              Author Email *
            </label>
            <input
              type="email"
              id="author_email"
              name="author_email"
              value={formData.author_email}
              onChange={handleInputChange}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                errors.author_email
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              placeholder="Enter author email..."
            />
            {errors.author_email && (
              <p className="mt-1 text-sm text-red-600">{errors.author_email}</p>
            )}
          </div>

          {/* Article Selection */}
          <div>
            <label htmlFor="article_id" className="block text-sm font-medium text-gray-700 mb-1">
              Article *
            </label>
            <select
              id="article_id"
              name="article_id"
              value={formData.article_id}
              onChange={handleInputChange}
              disabled={!!comment} // Disable when editing existing comment
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                errors.article_id
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              } ${comment ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
              <option value="">Select an article...</option>
              {articles.map((article) => (
                <option key={article.id} value={article.id}>
                  {article.title}
                </option>
              ))}
            </select>
            {errors.article_id && (
              <p className="mt-1 text-sm text-red-600">{errors.article_id}</p>
            )}
          </div>

          {/* Parent Comment (for replies) */}
          <div>
            <label htmlFor="parent_id" className="block text-sm font-medium text-gray-700 mb-1">
              Parent Comment (Optional)
            </label>
            <input
              type="text"
              id="parent_id"
              name="parent_id"
              value={formData.parent_id}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter parent comment ID for replies..."
            />
            <p className="mt-1 text-sm text-gray-500">
              Leave empty for top-level comments
            </p>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                comment ? 'Update Comment' : 'Create Comment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommentForm;
