// Types for the Blog-as-a-Service application
// Export all types explicitly

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'author' | 'reviewer';
  tenantId: string;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  settings: TenantSettings;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSettings {
  theme: string;
  customFields: CustomField[];
  integrations: {
    bigWriter: boolean;
    socialMedia: boolean;
    newsletter: boolean;
  };
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date';
  required: boolean;
  options?: string[];
}

export interface Article {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  status: 'draft' | 'published' | 'scheduled';
  publishedAt?: string;
  scheduledAt?: string;
  authorId: string;
  categoryId: string;
  tags: Tag[];
  featuredImage?: string;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  children?: Category[];
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
}

export interface Comment {
  id: string;
  content: string;
  authorName: string;
  authorEmail: string;
  articleId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Analytics {
  totalArticles: number;
  totalViews: number;
  totalComments: number;
  monthlyViews: number[];
  topArticles: {
    id: string;
    title: string;
    views: number;
  }[];
}
