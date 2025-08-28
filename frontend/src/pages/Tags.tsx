import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, HashtagIcon } from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import TagForm from '../components/TagForm';

interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  article_count?: number;
}

type TagType = 'all' | 'active' | 'inactive';

const Tags: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTags();
      
      if (response.success && response.data) {
        setTags(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch tags');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // CRUD Functions
  const handleCreateTag = () => {
    setEditingTag(null);
    setIsFormOpen(true);
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setIsFormOpen(true);
  };

  const handleSaveTag = (tag: Tag) => {
    if (editingTag) {
      // Update existing tag in list
      setTags(prev => prev.map(t => t.id === tag.id ? tag : t));
    } else {
      // Add new tag to list
      setTags(prev => [...prev, tag]);
    }
    setIsFormOpen(false);
    setEditingTag(null);
  };

  const handleDeleteTag = async (tagId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Tag',
      message: 'Are you sure you want to delete this tag? This action cannot be undone.',
      onConfirm: () => deleteTag(tagId)
    });
  };

  const deleteTag = async (tagId: string) => {
    try {
      setActionLoading(tagId);
      const response = await apiService.deleteTag(tagId);
      
      if (response.success) {
        setTags(prev => prev.filter(t => t.id !== tagId));
      } else {
        alert(response.error || 'Failed to delete tag');
      }
    } catch (error) {
      alert('An error occurred while deleting the tag');
    } finally {
      setActionLoading(null);
    }
  };

  const mockTags = [
    { id: 1, name: 'React', slug: 'react', color: '#61DAFB', articlesCount: 34 },
    { id: 2, name: 'TypeScript', slug: 'typescript', color: '#3178C6', articlesCount: 28 },
    { id: 3, name: 'Node.js', slug: 'nodejs', color: '#339933', articlesCount: 22 },
    { id: 4, name: 'JavaScript', slug: 'javascript', color: '#F7DF1E', articlesCount: 45 },
    { id: 5, name: 'CSS', slug: 'css', color: '#1572B6', articlesCount: 19 },
    { id: 6, name: 'HTML', slug: 'html', color: '#E34F26', articlesCount: 15 },
    { id: 7, name: 'Python', slug: 'python', color: '#3776AB', articlesCount: 31 },
    { id: 8, name: 'API', slug: 'api', color: '#FF6B6B', articlesCount: 26 },
    { id: 9, name: 'Database', slug: 'database', color: '#4ECDC4', articlesCount: 18 },
    { id: 10, name: 'DevOps', slug: 'devops', color: '#45B7D1', articlesCount: 12 },
    { id: 11, name: 'Security', slug: 'security', color: '#96CEB4', articlesCount: 14 },
    { id: 12, name: 'Performance', slug: 'performance', color: '#FFEAA7', articlesCount: 9 },
  ];

  const getTextColor = (bgColor: string) => {
    // Convert hex to RGB
    const r = parseInt(bgColor.slice(1, 3), 16);
    const g = parseInt(bgColor.slice(3, 5), 16);
    const b = parseInt(bgColor.slice(5, 7), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tag.slug && tag.slug.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedTags = filteredTags.sort((a, b) => (b.article_count || 0) - (a.article_count || 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Tags</h1>
        <button 
          onClick={handleCreateTag}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Nova Tag
        </button>
      </div>

      {/* Search */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white shadow rounded-lg p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading tags...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchTags}
            className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Tags Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedTags.map((tag) => (
            <div
              key={tag.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <HashtagIcon className="h-4 w-4 text-gray-400" />
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: tag.color || '#3B82F6',
                      color: getTextColor(tag.color || '#3B82F6')
                    }}
                  >
                    {tag.name}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => handleEditTag(tag)}
                    className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                    title="Edit tag"
                  >
                    <PencilIcon className="h-3 w-3" />
                  </button>
                  <button 
                    onClick={() => handleDeleteTag(tag.id)}
                    disabled={actionLoading === tag.id}
                    className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="Delete tag"
                  >
                    {actionLoading === tag.id ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-red-600"></div>
                    ) : (
                      <TrashIcon className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                {tag.slug && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Slug:</span> {tag.slug}
                  </div>
                )}
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Color:</span> 
                  <span className="ml-2 inline-block w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: tag.color || '#3B82F6' }}></span>
                  <span className="ml-1 font-mono text-xs">{tag.color || '#3B82F6'}</span>
                </div>
                {tag.article_count !== undefined && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Articles</span>
                    <span className="text-lg font-semibold text-blue-600">{tag.article_count}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && sortedTags.length === 0 && (
        <div className="text-center py-12">
          <HashtagIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tags found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm 
              ? 'Try adjusting your search.'
              : 'Get started by creating your first tag.'
            }
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button 
                onClick={handleCreateTag}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                New Tag
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tag Form Modal */}
      <TagForm
        tag={editingTag}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTag(null);
        }}
        onSave={handleSaveTag}
      />

      {/* Stats */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Estatísticas das Tags</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600">{tags.length}</div>
            <div className="text-sm text-gray-500">Total de Tags</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {tags.reduce((acc, tag) => acc + (tag.article_count || 0), 0)}
            </div>
            <div className="text-sm text-gray-500">Artigos com Tags</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(tags.reduce((acc, tag) => acc + (tag.article_count || 0), 0) / tags.length)}
            </div>
            <div className="text-sm text-gray-500">Média por Tag</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {tags.filter(tag => (tag.article_count || 0) > 20).length}
            </div>
            <div className="text-sm text-gray-500">Tags Populares</div>
          </div>
        </div>
      </div>

      {/* Popular Tags */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Tags Mais Populares</h3>
        <div className="flex flex-wrap gap-2">
          {tags
            .sort((a, b) => (b.article_count || 0) - (a.article_count || 0))
            .slice(0, 10)
            .map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border"
                style={{
                  backgroundColor: tag.color + '20',
                  borderColor: tag.color,
                  color: tag.color
                }}
              >
                #{tag.name}
                <span className="ml-2 text-xs bg-white bg-opacity-50 px-1.5 py-0.5 rounded-full">
                  {tag.article_count || 0}
                </span>
              </span>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Tags;
