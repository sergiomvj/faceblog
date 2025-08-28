import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { FolderOpen, Edit, Trash2, Plus, Search } from 'lucide-react';
import { apiService, Category } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import CategoryForm from '../components/CategoryForm';

const Categories: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCategories();
      
      if (response.success && response.data) {
        setCategories(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch categories');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // CRUD Functions
  const handleCreateCategory = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleSaveCategory = (category: Category) => {
    if (editingCategory) {
      // Update existing category in list
      setCategories(prev => prev.map(c => c.id === category.id ? category : c));
    } else {
      // Add new category to list
      setCategories(prev => [...prev, category]);
    }
    setIsFormOpen(false);
    setEditingCategory(null);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category? This action cannot be undone.',
      onConfirm: () => deleteCategory(categoryId)
    });
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      setActionLoading(categoryId);
      const response = await apiService.deleteCategory(categoryId);
      
      if (response.success) {
        setCategories(prev => prev.filter(c => c.id !== categoryId));
      } else {
        alert(response.error || 'Failed to delete category');
      }
    } catch (error) {
      alert('An error occurred while deleting the category');
    } finally {
      setActionLoading(null);
    }
  };

  // CategoryItem component for displaying individual categories
  const CategoryItem = ({ 
    category, 
    onEdit, 
    onDelete, 
    actionLoading 
  }: { 
    category: Category; 
    onEdit: (category: Category) => void;
    onDelete: (categoryId: string) => Promise<void>;
    actionLoading: string | null;
  }) => (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50">
      <div className="flex items-center space-x-3">
        <FolderOpen className="h-5 w-5 text-blue-500" />
        <div>
          <h3 className="text-sm font-medium text-gray-900">{category.name}</h3>
          {category.description && (
            <p className="text-sm text-gray-500">{category.description}</p>
          )}
          <div className="flex items-center space-x-4 mt-1">
            <span className="text-xs text-gray-400">Slug: {category.slug}</span>
            {category.article_count !== undefined && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {category.article_count} articles
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button 
          onClick={() => onEdit(category)}
          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-md transition-colors"
          title="Edit category"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button 
          onClick={() => onDelete(category.id)}
          disabled={actionLoading === category.id}
          className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
          title="Delete category"
        >
          {actionLoading === category.id ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Categorias</h1>
        <button 
          onClick={handleCreateCategory}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </button>
      </div>

      {/* Search */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar categorias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white shadow rounded-lg p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading categories...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchCategories}
            className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Categories List */}
      {!loading && !error && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Categorias ({filteredCategories.length})</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredCategories.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No categories found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search.' : 'Get started by creating a new category.'}
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <button
                      onClick={handleCreateCategory}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="-ml-1 mr-2 h-5 w-5" />
                      New Category
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filteredCategories.map((category) => (
                <CategoryItem 
                  key={category.id} 
                  category={category} 
                  onEdit={handleEditCategory}
                  onDelete={handleDeleteCategory}
                  actionLoading={actionLoading}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Category Form Modal */}
      <CategoryForm
        category={editingCategory}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
      />
    </div>
  );
};

export default Categories;
