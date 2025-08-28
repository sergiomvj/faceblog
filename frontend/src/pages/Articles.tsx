import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import { apiService, Article } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import ArticleForm from '../components/ArticleForm';

const Articles: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await apiService.getArticles();
      
      if (response.success && response.data) {
        setArticles(response.data.data || []);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch articles');
        setArticles([]);
      }
    } catch (err) {
      setError('Network error occurred');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  // CRUD Functions
  const handleCreateArticle = () => {
    setEditingArticle(null);
    setIsFormOpen(true);
  };

  const handleEditArticle = (article: Article) => {
    setEditingArticle(article);
    setIsFormOpen(true);
  };

  const handleSaveArticle = (article: Article) => {
    if (editingArticle) {
      // Update existing article in list
      setArticles(prev => prev.map(a => a.id === article.id ? article : a));
    } else {
      // Add new article to list
      setArticles(prev => [article, ...prev]);
    }
    setIsFormOpen(false);
    setEditingArticle(null);
  };

  const handleDeleteArticle = async (articleId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Article',
      message: 'Are you sure you want to delete this article? This action cannot be undone.',
      onConfirm: () => deleteArticle(articleId)
    });
  };

  const deleteArticle = async (articleId: string) => {
    try {
      setActionLoading(articleId);
      const response = await apiService.deleteArticle(articleId);
      
      if (response.success) {
        // Remove from list or update status to deleted
        setArticles(prev => prev.filter(a => a.id !== articleId));
      } else {
        alert(response.error || 'Failed to delete article');
      }
    } catch (error) {
      alert('An error occurred while deleting the article');
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeStatus = async (articleId: string, newStatus: 'draft' | 'published' | 'archived') => {
    try {
      setActionLoading(articleId);
      const response = await apiService.changeArticleStatus(articleId, newStatus);
      
      if (response.success && response.data) {
        // Update article in list
        setArticles(prev => prev.map(a => a.id === articleId ? response.data! : a));
      } else {
        alert(response.error || 'Failed to change article status');
      }
    } catch (error) {
      alert('An error occurred while changing the article status');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      published: { bg: 'bg-green-100', text: 'text-green-800', label: 'Publicado' },
      draft: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Rascunho' },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Agendado' },
      archived: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Arquivado' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const filteredArticles = articles.filter((article: Article) => {
    const authorName = article.users ? `${article.users.first_name} ${article.users.last_name}` : '';
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         authorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || article.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Artigos</h1>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Carregando artigos...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Artigos</h1>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500">Erro: {error}</div>
          <button 
            onClick={fetchArticles}
            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Artigos</h1>
        <button 
          onClick={handleCreateArticle}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Novo Artigo
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Buscar artigos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="sm:w-48">
          <select
            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos os status</option>
            <option value="published">Publicados</option>
            <option value="draft">Rascunhos</option>
            <option value="scheduled">Agendados</option>
            <option value="archived">Arquivados</option>
          </select>
        </div>
      </div>

      {/* Articles Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Título
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Autor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visualizações
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Publicado em
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredArticles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Nenhum artigo encontrado com os filtros aplicados.' 
                      : 'Nenhum artigo encontrado. Crie seu primeiro artigo!'
                    }
                  </td>
                </tr>
              ) : (
                filteredArticles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">{article.title}</div>
                      {article.excerpt && (
                        <div className="text-gray-500 text-xs mt-1 truncate max-w-xs">
                          {article.excerpt}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {article.users ? `${article.users.first_name} ${article.users.last_name}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {article.categories?.name || 'Sem categoria'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(article.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <EyeIcon className="h-4 w-4 mr-1" />
                        {article.view_count.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {article.published_at 
                        ? new Date(article.published_at).toLocaleDateString('pt-BR') 
                        : 'Não publicado'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Edit Button */}
                        <button 
                          onClick={() => handleEditArticle(article)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="Editar artigo"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        
                        {/* Status Change Dropdown */}
                        <div className="relative group">
                          <button 
                            className="text-gray-600 hover:text-gray-900 p-1 rounded"
                            title="Alterar status"
                          >
                            <EllipsisVerticalIcon className="h-4 w-4" />
                          </button>
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                            <div className="py-1">
                              {article.status !== 'draft' && (
                                <button
                                  onClick={() => handleChangeStatus(article.id, 'draft')}
                                  disabled={actionLoading === article.id}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                >
                                  Mover para Rascunho
                                </button>
                              )}
                              {article.status !== 'published' && (
                                <button
                                  onClick={() => handleChangeStatus(article.id, 'published')}
                                  disabled={actionLoading === article.id}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                >
                                  Publicar
                                </button>
                              )}
                              {article.status !== 'archived' && (
                                <button
                                  onClick={() => handleChangeStatus(article.id, 'archived')}
                                  disabled={actionLoading === article.id}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                >
                                  Arquivar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Delete Button */}
                        <button 
                          onClick={() => handleDeleteArticle(article.id)}
                          disabled={actionLoading === article.id}
                          className="text-red-600 hover:text-red-900 p-1 rounded disabled:opacity-50"
                          title="Deletar artigo"
                        >
                          {actionLoading === article.id ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <TrashIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats */}
      {articles.length > 0 && (
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-lg font-medium text-gray-900">
                  {filteredArticles.length} de {articles.length} artigos
                </div>
              </div>
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {articles.filter(a => a.status === 'published').length} publicados, {' '}
              {articles.filter(a => a.status === 'draft').length} rascunhos, {' '}
              {articles.filter(a => a.status === 'archived').length} arquivados
            </div>
          </div>
        </div>
      )}

      {/* Article Form Modal */}
      <ArticleForm
        article={editingArticle}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingArticle(null);
        }}
        onSave={handleSaveArticle}
      />
    </div>
  );
};

export default Articles;
