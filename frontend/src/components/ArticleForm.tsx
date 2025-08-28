import React, { useState, useEffect } from 'react';
import { X, Save, Eye, FileText, Sparkles, TrendingUp } from 'lucide-react';
import { apiService, Article, Category, Tag } from '../services/api';
import SEOWizard from './SEOWizard';
import TrendingSuggestions from './TrendingSuggestions';
import ExternalLinkSuggestions from './ExternalLinkSuggestions';
import SEOPreview from './SEOPreview';
import ContentOptimizer from './ContentOptimizer';
import KeywordResearch from './KeywordResearch';

interface ArticleFormProps {
  article?: Article | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (article: Article) => void;
}

export const ArticleForm: React.FC<ArticleFormProps> = ({
  article,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    category_id: '',
    tags: [] as string[],
    status: 'draft' as 'draft' | 'published' | 'archived',
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'seo'>('content');
  const [seoData, setSeoData] = useState({
    metaTitle: '',
    metaDescription: '',
    slug: '',
    keywords: [] as string[],
    focusKeyword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load categories and tags on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoriesRes, tagsRes] = await Promise.all([
          apiService.getCategories(),
          apiService.getTags(),
        ]);

        if (categoriesRes.success && categoriesRes.data) {
          setCategories(categoriesRes.data);
        }

        if (tagsRes.success && tagsRes.data) {
          setTags(tagsRes.data);
        }
      } catch (error) {
        console.error('Failed to load form data:', error);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Populate form when editing
  useEffect(() => {
    if (article) {
      setFormData({
        title: article.title || '',
        content: article.content || '',
        excerpt: article.excerpt || '',
        category_id: article.category_id || '',
        tags: article.article_tags?.map((at: any) => at.tags?.id || at.tag_id || at.id) || [],
        status: article.status as 'draft' | 'published' | 'archived',
      });
      // Populate SEO data from article
      setSeoData({
        metaTitle: article.meta_title || article.title || '',
        metaDescription: article.meta_description || article.excerpt || '',
        slug: article.slug || '',
        keywords: [],
        focusKeyword: ''
      });
    } else {
      setFormData({
        title: '',
        content: '',
        excerpt: '',
        category_id: '',
        tags: [],
        status: 'draft',
      });
      setSeoData({
        metaTitle: '',
        metaDescription: '',
        slug: '',
        keywords: [],
        focusKeyword: ''
      });
    }
    setErrors({});
  }, [article]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-generate SEO data when title changes
    if (name === 'title') {
      setSeoData(prev => ({
        ...prev,
        metaTitle: prev.metaTitle || value,
        slug: prev.slug || generateSlug(value)
      }));
    }
    
    // Auto-generate meta description from excerpt
    if (name === 'excerpt') {
      setSeoData(prev => ({
        ...prev,
        metaDescription: prev.metaDescription || value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSEOChange = (field: keyof typeof seoData, value: any) => {
    setSeoData(prev => ({ ...prev, [field]: value }));
  };

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleSEOSuggestionApply = (type: string, value: string) => {
    switch (type) {
      case 'title':
        setFormData(prev => ({ ...prev, title: value }));
        setSeoData(prev => ({ ...prev, metaTitle: value }));
        break;
      case 'description':
        setFormData(prev => ({ ...prev, excerpt: value }));
        setSeoData(prev => ({ ...prev, metaDescription: value }));
        break;
      case 'keyword':
        setSeoData(prev => ({ 
          ...prev, 
          keywords: [...prev.keywords, value],
          focusKeyword: prev.focusKeyword || value
        }));
        break;
      default:
        console.log('Applied SEO suggestion:', type, value);
    }
  };

  const handleLinkSelect = (url: string, title: string, type: string) => {
    // Insert link into content at cursor position or append
    const linkMarkdown = `[${title}](${url})`;
    setFormData(prev => ({
      ...prev,
      content: prev.content + '\n\n' + linkMarkdown
    }));
  };

  const handleOptimizationApply = (type: string, value: string) => {
    console.log('Applied optimization:', type, value);
    // Handle different optimization types
    switch (type) {
      case 'content_length':
        // Could show suggestions for expanding content
        break;
      case 'structure':
        // Could suggest heading improvements
        break;
      case 'readability':
        // Could suggest sentence improvements
        break;
      default:
        break;
    }
  };

  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter(id => id !== tagId)
        : [...prev.tags, tagId],
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
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
      
      if (article) {
        // Update existing article
        response = await apiService.updateArticle(article.id, formData);
      } else {
        // Create new article
        response = await apiService.createArticle(formData);
      }

      if (response.success && response.data) {
        onSave(response.data);
        onClose();
      } else {
        setErrors({ submit: response.error || 'Failed to save article' });
      }
    } catch (error) {
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const generateExcerpt = () => {
    if (formData.content) {
      const excerpt = formData.content
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .substring(0, 200) + '...';
      setFormData(prev => ({ ...prev, excerpt }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">
              {article ? 'Edit Article' : 'Create New Article'}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setPreview(!preview)}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>{preview ? 'Edit' : 'Preview'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        {!preview && (
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('content')}
                className={`${
                  activeTab === 'content'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <FileText className="w-4 h-4 mr-2" />
                Conteúdo
              </button>
              <button
                onClick={() => setActiveTab('seo')}
                className={`${
                  activeTab === 'seo'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Assistente SEO
                {(formData.title && formData.content) && (
                  <TrendingUp className="w-3 h-3 ml-1 text-green-500" />
                )}
              </button>
            </nav>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {preview ? (
            // Preview Mode
            <div className="p-6">
              <div className="prose max-w-none">
                <h1>{formData.title || 'Untitled Article'}</h1>
                {formData.excerpt && (
                  <p className="text-gray-600 italic">{formData.excerpt}</p>
                )}
                <div dangerouslySetInnerHTML={{ __html: formData.content }} />
              </div>
            </div>
          ) : activeTab === 'content' ? (
            // Content Edit Mode
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter article title..."
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content *
                </label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  rows={12}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.content ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Write your article content here..."
                />
                {errors.content && (
                  <p className="mt-1 text-sm text-red-600">{errors.content}</p>
                )}
              </div>

              {/* Excerpt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Excerpt
                  </label>
                  <button
                    type="button"
                    onClick={generateExcerpt}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Generate from content
                  </button>
                </div>
                <textarea
                  name="excerpt"
                  value={formData.excerpt}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of the article..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
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
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.id)}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        formData.tags.includes(tag.id)
                          ? 'bg-blue-100 border-blue-300 text-blue-800'
                          : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={{
                        backgroundColor: formData.tags.includes(tag.id) 
                          ? `${tag.color}20` 
                          : undefined,
                        borderColor: formData.tags.includes(tag.id) 
                          ? tag.color 
                          : undefined,
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* SEO Quick Fields */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-3 flex items-center">
                  <Sparkles className="w-4 h-4 mr-1" />
                  SEO Rápido
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-blue-800 mb-1">
                      Meta Título
                    </label>
                    <input
                      type="text"
                      value={seoData.metaTitle}
                      onChange={(e) => handleSEOChange('metaTitle', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Título otimizado para SEO..."
                    />
                    <div className="text-xs text-blue-600 mt-1">
                      {seoData.metaTitle.length}/60 caracteres
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-blue-800 mb-1">
                      Slug
                    </label>
                    <input
                      type="text"
                      value={seoData.slug}
                      onChange={(e) => handleSEOChange('slug', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="url-amigavel"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-blue-800 mb-1">
                    Meta Descrição
                  </label>
                  <textarea
                    value={seoData.metaDescription}
                    onChange={(e) => handleSEOChange('metaDescription', e.target.value)}
                    rows={2}
                    className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Descrição otimizada para mecanismos de busca..."
                  />
                  <div className="text-xs text-blue-600 mt-1">
                    {seoData.metaDescription.length}/160 caracteres
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
              )}
            </form>
          ) : (
            // SEO Assistant Mode
            <div className="p-6 space-y-6">
              {/* SEO Preview */}
              <SEOPreview
                title={seoData.metaTitle || formData.title}
                description={seoData.metaDescription || formData.excerpt}
                slug={seoData.slug || generateSlug(formData.title)}
                siteName="FaceBlog"
                domain="exemplo.com"
              />

              {/* SEO Wizard */}
              <SEOWizard
                title={formData.title}
                content={formData.content}
                category={categories.find(c => c.id === formData.category_id)?.name || ''}
                onSuggestionApply={handleSEOSuggestionApply}
              />

              {/* Content Optimizer */}
              <ContentOptimizer
                title={formData.title}
                content={formData.content}
                targetKeywords={seoData.keywords}
                onOptimizationApply={handleOptimizationApply}
              />

              {/* Trending Suggestions */}
              <TrendingSuggestions
                mainTopic={seoData.focusKeyword}
                niche={formData.category_id}
                className=""
                onSuggestionSelect={(suggestion: string) => {
                  setSeoData(prev => ({
                    ...prev,
                    keywords: [...prev.keywords, suggestion]
                  }));
                }}
              />

              {/* External Links */}
              <ExternalLinkSuggestions
                mainTopic={formData.title}
                niche={categories.find(c => c.id === formData.category_id)?.name || 'general'}
                keywords={seoData.keywords}
                onLinkSelect={handleLinkSelect}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {!preview && (
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
              <span>{loading ? 'Saving...' : 'Save Article'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticleForm;
