// API Service for Blog-as-a-Service Frontend

import { API_CONFIG } from '../config/api';
import { authService } from './auth';

export interface Article {
  id: string;
  tenant_id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: 'draft' | 'published' | 'archived';
  author_id: string;
  category_id: string;
  featured_image_url?: string;
  meta_title: string;
  meta_description: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  reading_time_minutes: number;
  published_at: string;
  created_at: string;
  updated_at: string;
  users?: {
    first_name: string;
    last_name: string;
    bio?: string;
  };
  categories?: {
    name: string;
    slug: string;
  };
  article_tags?: Array<{
    tags: {
      name: string;
      slug: string;
      color: string;
    };
  }>;
}

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  article_count: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  article_count: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'author' | 'subscriber';
  avatar_url?: string;
  bio?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  domain?: string;
  description?: string;
  logo_url?: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'inactive' | 'suspended';
  settings?: {
    theme?: string;
    features?: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  article_id: string;
  parent_id?: string;
  author_name: string;
  author_email: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  tenant_id: string;
  created_at: string;
  updated_at: string;
  article?: {
    title: string;
  };
  replies?: Comment[];
}

// Gamification Interfaces
export interface Quiz {
  id: string;
  title: string;
  description?: string;
  article_id?: string;
  status: 'draft' | 'published' | 'archived';
  difficulty: 'easy' | 'medium' | 'hard';
  time_limit?: number;
  passing_score: number;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  questions?: QuizQuestion[];
  article?: {
    title: string;
  };
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'text';
  options?: string[];
  correct_answer: string;
  points: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface UserPoints {
  user_id: string;
  total_points: number;
  reading_points: number;
  quiz_points: number;
  comment_points: number;
  level: number;
  created_at: string;
  updated_at: string;
  users?: {
    name: string;
    email: string;
    avatar_url?: string;
  };
  rank?: number;
}

export interface Reward {
  id: string;
  title: string;
  description?: string;
  type: 'badge' | 'discount' | 'content' | 'physical' | 'digital';
  cost_points: number;
  max_claims?: number;
  current_claims: number;
  status: 'active' | 'inactive' | 'expired';
  reward_data: Record<string, any>;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface UserReward {
  id: string;
  user_id: string;
  reward_id: string;
  points_spent: number;
  status: 'claimed' | 'redeemed' | 'expired';
  claimed_at: string;
  rewards?: Reward;
}

// Social Integration Interfaces
export interface SocialIntegration {
  id: string;
  platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'youtube' | 'tiktok';
  platform_user_id: string;
  platform_username?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  status: 'active' | 'inactive' | 'error';
  settings: Record<string, any>;
  last_sync_at?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = {
        ...API_CONFIG.HEADERS,
        ...authService.getAuthHeaders(),
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}`,
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Articles API
  async getArticles(): Promise<ApiResponse<PaginatedResponse<Article>>> {
    return this.request<PaginatedResponse<Article>>('/articles');
  }

  async getArticle(id: string): Promise<ApiResponse<Article>> {
    return this.request<Article>(`/articles/${id}`);
  }

  async createArticle(articleData: {
    title: string;
    content: string;
    excerpt?: string;
    category_id?: string;
    tags?: string[];
    status?: 'draft' | 'published' | 'archived';
  }): Promise<ApiResponse<Article>> {
    return this.request<Article>('/articles', {
      method: 'POST',
      body: JSON.stringify(articleData),
    });
  }

  async updateArticle(id: string, articleData: {
    title?: string;
    content?: string;
    excerpt?: string;
    category_id?: string;
    tags?: string[];
    status?: 'draft' | 'published' | 'archived';
  }): Promise<ApiResponse<Article>> {
    return this.request<Article>(`/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(articleData),
    });
  }

  async deleteArticle(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/articles/${id}`, {
      method: 'DELETE',
    });
  }

  async changeArticleStatus(id: string, status: 'draft' | 'published' | 'archived' | 'deleted'): Promise<ApiResponse<Article>> {
    return this.request<Article>(`/articles/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Categories API
  async getCategories(): Promise<ApiResponse<Category[]>> {
    return this.request<Category[]>('/categories');
  }

  async createCategory(categoryData: {
    name: string;
    description?: string;
    parent_id?: string;
    sort_order?: number;
  }): Promise<ApiResponse<Category>> {
    return this.request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  }

  async updateCategory(id: string, categoryData: {
    name?: string;
    description?: string;
    parent_id?: string;
    sort_order?: number;
    is_active?: boolean;
  }): Promise<ApiResponse<Category>> {
    return this.request<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
  }

  async deleteCategory(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  async getCategory(id: string): Promise<ApiResponse<Category>> {
    return this.request<Category>(`/categories/${id}`);
  }

  // Tags API
  async getTags(): Promise<ApiResponse<Tag[]>> {
    return this.request<Tag[]>('/tags');
  }

  async createTag(tagData: {
    name: string;
    description?: string;
    color?: string;
  }): Promise<ApiResponse<Tag>> {
    return this.request<Tag>('/tags', {
      method: 'POST',
      body: JSON.stringify(tagData),
    });
  }

  async updateTag(id: string, tagData: {
    name?: string;
    description?: string;
    color?: string;
  }): Promise<ApiResponse<Tag>> {
    return this.request<Tag>(`/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tagData),
    });
  }

  async deleteTag(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/tags/${id}`, {
      method: 'DELETE',
    });
  }

  async getTag(id: string): Promise<ApiResponse<Tag>> {
    return this.request<Tag>(`/tags/${id}`);
  }

  // ==========================================
  // USERS API
  // ==========================================

  async getUsers(): Promise<ApiResponse<User[]>> {
    return this.request<User[]>('/users');
  }

  async createUser(userData: {
    email: string;
    name: string;
    role?: 'admin' | 'editor' | 'author' | 'subscriber';
    avatar_url?: string;
    bio?: string;
    password: string;
  }): Promise<ApiResponse<User>> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: {
    email?: string;
    name?: string;
    role?: 'admin' | 'editor' | 'author' | 'subscriber';
    avatar_url?: string;
    bio?: string;
    status?: 'active' | 'inactive' | 'suspended';
  }): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}`);
  }

  async updateUserStatus(id: string, status: 'active' | 'inactive' | 'suspended'): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // ==========================================
  // TENANTS API
  // ==========================================

  async getTenants(): Promise<ApiResponse<Tenant[]>> {
    return this.request<Tenant[]>('/tenants');
  }

  async createTenant(tenantData: {
    name: string;
    slug: string;
    subdomain: string;
    domain?: string;
    description?: string;
    logo_url?: string;
    plan?: 'free' | 'starter' | 'pro' | 'enterprise';
    settings?: any;
  }): Promise<ApiResponse<Tenant>> {
    return this.request<Tenant>('/tenants', {
      method: 'POST',
      body: JSON.stringify(tenantData),
    });
  }

  async updateTenant(id: string, tenantData: {
    name?: string;
    slug?: string;
    subdomain?: string;
    domain?: string;
    description?: string;
    logo_url?: string;
    plan?: 'free' | 'starter' | 'pro' | 'enterprise';
    status?: 'active' | 'inactive' | 'suspended';
    settings?: any;
  }): Promise<ApiResponse<Tenant>> {
    return this.request<Tenant>(`/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tenantData),
    });
  }

  async deleteTenant(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/tenants/${id}`, {
      method: 'DELETE',
    });
  }

  async getTenant(id: string): Promise<ApiResponse<Tenant>> {
    return this.request<Tenant>(`/tenants/${id}`);
  }

  // Update tenant status
  async updateTenantStatus(id: string, status: 'active' | 'inactive' | 'suspended'): Promise<ApiResponse<Tenant>> {
    return this.request<Tenant>(`/tenants/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // ==========================================
  // COMMENTS API
  // ==========================================

  // Get all comments
  async getComments(params?: {
    article_id?: string;
    status?: string;
    author_email?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Comment[]>> {
    const searchParams = new URLSearchParams();
    
    if (params?.article_id) searchParams.append('article_id', params.article_id);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.author_email) searchParams.append('author_email', params.author_email);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    return this.request<Comment[]>(`/comments?${searchParams}`);
  }

  // Get comment by ID
  async getComment(id: string): Promise<ApiResponse<Comment>> {
    return this.request<Comment>(`/comments/${id}`);
  }

  // Create comment
  async createComment(comment: {
    content: string;
    author_name: string;
    author_email: string;
    article_id: string;
    parent_id?: string;
  }): Promise<ApiResponse<Comment>> {
    return this.request<Comment>('/comments', {
      method: 'POST',
      body: JSON.stringify(comment),
    });
  }

  // Update comment
  async updateComment(id: string, comment: {
    content: string;
    author_name: string;
    author_email: string;
  }): Promise<ApiResponse<Comment>> {
    return this.request<Comment>(`/comments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(comment),
    });
  }

  // Delete comment
  async deleteComment(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/comments/${id}`, {
      method: 'DELETE',
    });
  }

  // Update comment status
  async updateCommentStatus(id: string, status: 'pending' | 'approved' | 'rejected' | 'spam'): Promise<ApiResponse<Comment>> {
    return this.request<Comment>(`/comments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Get comments by article ID (public endpoint)
  async getArticleComments(articleId: string, status: string = 'approved'): Promise<ApiResponse<Comment[]>> {
    return this.request<Comment[]>(`/articles/${articleId}/comments?status=${status}`);
  }

  async generateContent(params: {
    topic: string;
    keywords: string[];
    tone?: string;
    length?: string;
  }): Promise<ApiResponse<any>> {
    return this.request<any>('/bigwriter/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // ==========================================
  // GAMIFICATION API - QUIZZES
  // ==========================================

  // Get all quizzes
  async getQuizzes(params?: {
    status?: string;
    article_id?: string;
    difficulty?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Quiz[]>> {
    const searchParams = new URLSearchParams();
    
    if (params?.status) searchParams.append('status', params.status);
    if (params?.article_id) searchParams.append('article_id', params.article_id);
    if (params?.difficulty) searchParams.append('difficulty', params.difficulty);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    return this.request<Quiz[]>(`/quizzes?${searchParams}`);
  }

  // Get quiz by ID with questions
  async getQuiz(id: string): Promise<ApiResponse<Quiz>> {
    return this.request<Quiz>(`/quizzes/${id}`);
  }

  // Create quiz with questions
  async createQuiz(quiz: {
    title: string;
    description?: string;
    article_id?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    time_limit?: number;
    passing_score: number;
    questions: {
      question: string;
      type: 'multiple_choice' | 'true_false' | 'text';
      options?: string[];
      correct_answer: string;
      points: number;
    }[];
  }): Promise<ApiResponse<Quiz>> {
    return this.request<Quiz>('/quizzes', {
      method: 'POST',
      body: JSON.stringify(quiz),
    });
  }

  // Update quiz
  async updateQuiz(id: string, quiz: {
    title: string;
    description?: string;
    article_id?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    time_limit?: number;
    passing_score: number;
  }): Promise<ApiResponse<Quiz>> {
    return this.request<Quiz>(`/quizzes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(quiz),
    });
  }

  // Delete quiz
  async deleteQuiz(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/quizzes/${id}`, {
      method: 'DELETE',
    });
  }

  // Update quiz status
  async updateQuizStatus(id: string, status: 'draft' | 'published' | 'archived'): Promise<ApiResponse<Quiz>> {
    return this.request<Quiz>(`/quizzes/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // ==========================================
  // GAMIFICATION API - RANKING SYSTEM
  // ==========================================

  // Get leaderboards
  async getLeaderboards(params?: {
    type?: string;
    period?: 'today' | 'week' | 'month' | 'all_time';
    limit?: number;
  }): Promise<ApiResponse<UserPoints[]>> {
    const searchParams = new URLSearchParams();
    
    if (params?.type) searchParams.append('type', params.type);
    if (params?.period) searchParams.append('period', params.period);
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    return this.request<UserPoints[]>(`/leaderboards?${searchParams}`);
  }

  // Get user points
  async getUserPoints(userId: string): Promise<ApiResponse<UserPoints>> {
    return this.request<UserPoints>(`/users/${userId}/points`);
  }

  // Award points to user
  async awardPoints(userId: string, points: {
    points: number;
    type: 'reading' | 'quiz' | 'comment' | 'bonus';
    reason?: string;
    reference_id?: string;
  }): Promise<ApiResponse<UserPoints>> {
    return this.request<UserPoints>(`/users/${userId}/points`, {
      method: 'POST',
      body: JSON.stringify(points),
    });
  }

  // ==========================================
  // GAMIFICATION API - REWARDS SYSTEM
  // ==========================================

  // Get all rewards
  async getRewards(params?: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Reward[]>> {
    const searchParams = new URLSearchParams();
    
    if (params?.status) searchParams.append('status', params.status);
    if (params?.type) searchParams.append('type', params.type);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    return this.request<Reward[]>(`/rewards?${searchParams}`);
  }

  // Create reward
  async createReward(reward: {
    title: string;
    description?: string;
    type: 'badge' | 'discount' | 'content' | 'physical' | 'digital';
    cost_points: number;
    max_claims?: number;
    reward_data?: Record<string, any>;
  }): Promise<ApiResponse<Reward>> {
    return this.request<Reward>('/rewards', {
      method: 'POST',
      body: JSON.stringify(reward),
    });
  }

  // Claim reward
  async claimReward(rewardId: string, userId: string): Promise<ApiResponse<UserReward>> {
    return this.request<UserReward>(`/rewards/${rewardId}/claim`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  // Get user rewards
  async getUserRewards(userId: string): Promise<ApiResponse<UserReward[]>> {
    return this.request<UserReward[]>(`/users/${userId}/rewards`);
  }

  // ==========================================
  // SOCIAL INTEGRATIONS API
  // ==========================================

  // Get all social integrations
  async getSocialIntegrations(params?: {
    platform?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<SocialIntegration[]>> {
    const searchParams = new URLSearchParams();
    
    if (params?.platform) searchParams.append('platform', params.platform);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    return this.request<SocialIntegration[]>(`/social-integrations?${searchParams}`);
  }

  // Get social integration by ID
  async getSocialIntegration(id: string): Promise<ApiResponse<SocialIntegration>> {
    return this.request<SocialIntegration>(`/social-integrations/${id}`);
  }

  // Create social integration
  async createSocialIntegration(integration: {
    platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'youtube' | 'tiktok';
    platform_user_id: string;
    platform_username?: string;
    access_token?: string;
    refresh_token?: string;
    token_expires_at?: string;
    settings?: Record<string, any>;
  }): Promise<ApiResponse<SocialIntegration>> {
    return this.request<SocialIntegration>('/social-integrations', {
      method: 'POST',
      body: JSON.stringify(integration),
    });
  }

  // Update social integration
  async updateSocialIntegration(id: string, integration: {
    platform_username?: string;
    access_token?: string;
    refresh_token?: string;
    token_expires_at?: string;
    settings?: Record<string, any>;
  }): Promise<ApiResponse<SocialIntegration>> {
    return this.request<SocialIntegration>(`/social-integrations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(integration),
    });
  }

  // Delete social integration
  async deleteSocialIntegration(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/social-integrations/${id}`, {
      method: 'DELETE',
    });
  }

  // Update social integration status
  async updateSocialIntegrationStatus(id: string, status: 'active' | 'inactive' | 'error'): Promise<ApiResponse<SocialIntegration>> {
    return this.request<SocialIntegration>(`/social-integrations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Sync social integration
  async syncSocialIntegration(id: string): Promise<ApiResponse<{ integration: SocialIntegration; sync_result: any }>> {
    return this.request<{ integration: SocialIntegration; sync_result: any }>(`/social-integrations/${id}/sync`, {
      method: 'POST',
    });
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<any>> {
    return this.request('/health');
  }

  // Generic HTTP methods for API Keys and other endpoints
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const apiService = new ApiService();
export default apiService;
