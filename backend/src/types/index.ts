// Core types for Blog-as-a-Service Backend

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  schema_name: string;
  status: 'active' | 'suspended' | 'trial' | 'expired';
  plan: 'free' | 'pro' | 'enterprise';
  settings: TenantSettings;
  created_at: Date;
  updated_at: Date;
  expires_at?: Date;
}

export interface TenantSettings {
  theme: string;
  custom_domain?: string;
  custom_css?: string;
  logo_url?: string;
  favicon_url?: string;
  meta_title?: string;
  meta_description?: string;
  integrations: {
    bigwriter: boolean;
    social_media: boolean;
    newsletter: boolean;
    analytics: boolean;
  };
  features: {
    comments: boolean;
    social_sharing: boolean;
    newsletter_signup: boolean;
    search: boolean;
  };
  limits: {
    max_articles: number;
    max_users: number;
    max_storage_mb: number;
  };
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  name: string;
  avatar_url?: string;
  role: 'super_admin' | 'admin' | 'editor' | 'author' | 'reviewer';
  status: 'active' | 'inactive' | 'pending';
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Article {
  id: string;
  tenant_id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  published_at?: Date;
  scheduled_at?: Date;
  author_id: string;
  category_id?: string;
  tags: string[];
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  reading_time_minutes: number;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  sort_order: number;
  article_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface Tag {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  color?: string;
  article_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface Comment {
  id: string;
  tenant_id: string;
  article_id: string;
  parent_id?: string;
  author_name: string;
  author_email: string;
  author_url?: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  ip_address: string;
  user_agent: string;
  created_at: Date;
  updated_at: Date;
}

export interface Media {
  id: string;
  tenant_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  url: string;
  alt_text?: string;
  caption?: string;
  uploaded_by: string;
  created_at: Date;
}

export interface ApiKey {
  id: string;
  tenant_id: string;
  name: string;
  key_hash: string;
  permissions: string[];
  last_used_at?: Date;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface WebhookEndpoint {
  id: string;
  tenant_id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  last_triggered_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// Request/Response types
export interface AuthRequest extends Request {
  user?: User;
  tenant?: Tenant;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  meta?: any;
}

// BigWriter Integration types
export interface BigWriterRequest {
  tenant_id: string;
  topic: string;
  keywords: string[];
  tone: 'professional' | 'casual' | 'technical' | 'friendly';
  length: 'short' | 'medium' | 'long';
  language: string;
  target_audience?: string;
}

export interface BigWriterResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  title?: string;
  content?: string;
  excerpt?: string;
  meta_description?: string;
  suggested_tags?: string[];
  error_message?: string;
  created_at: Date;
  completed_at?: Date;
}

// Social Media Integration types
export interface SocialMediaPost {
  id: string;
  tenant_id: string;
  article_id: string;
  platform: 'twitter' | 'facebook' | 'linkedin' | 'instagram';
  post_id?: string;
  content: string;
  status: 'pending' | 'posted' | 'failed';
  scheduled_at?: Date;
  posted_at?: Date;
  error_message?: string;
  created_at: Date;
}

// Newsletter types
export interface NewsletterSubscriber {
  id: string;
  tenant_id: string;
  email: string;
  name?: string;
  status: 'active' | 'unsubscribed' | 'bounced';
  subscribed_at: Date;
  unsubscribed_at?: Date;
}

export interface NewsletterCampaign {
  id: string;
  tenant_id: string;
  subject: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduled_at?: Date;
  sent_at?: Date;
  recipient_count: number;
  open_count: number;
  click_count: number;
  created_at: Date;
}
