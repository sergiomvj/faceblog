#!/usr/bin/env node

/**
 * Setup script for Supabase database
 * This script creates the multi-tenant schema and seed data
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  try {
    console.log('🚀 Setting up Blog-as-a-Service database...');

    // Create tenants table
    console.log('📋 Creating tenants table...');
    const { error: tenantsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.tenants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(100) UNIQUE NOT NULL,
          domain VARCHAR(255),
          subdomain VARCHAR(100) UNIQUE,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
          plan VARCHAR(50) DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'enterprise')),
          settings JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          deleted_at TIMESTAMP WITH TIME ZONE
        );
        
        CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
        CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON public.tenants(subdomain);
        CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);
      `
    });

    if (tenantsError) {
      console.error('❌ Error creating tenants table:', tenantsError);
      return;
    }

    // Insert demo tenant
    console.log('👤 Creating demo tenant...');
    const { data: tenant, error: insertTenantError } = await supabase
      .from('tenants')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Demo Blog',
        slug: 'demo',
        subdomain: 'demo',
        status: 'active',
        plan: 'pro',
        settings: {
          integrations: {
            bigwriter: true,
            social: true,
            newsletter: true,
            analytics: true
          },
          features: {
            comments: true,
            media_upload: true,
            seo_tools: true,
            custom_domain: true
          }
        }
      }, {
        onConflict: 'id'
      });

    if (insertTenantError) {
      console.error('❌ Error creating demo tenant:', insertTenantError);
      return;
    }

    // Create users table
    console.log('👥 Creating users table...');
    const { error: usersError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          role VARCHAR(50) DEFAULT 'author' CHECK (role IN ('admin', 'editor', 'author', 'subscriber')),
          permissions JSONB DEFAULT '[]',
          avatar_url VARCHAR(500),
          bio TEXT,
          is_active BOOLEAN DEFAULT true,
          email_verified BOOLEAN DEFAULT false,
          last_login_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          deleted_at TIMESTAMP WITH TIME ZONE
        );
        
        CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
        CREATE INDEX IF NOT EXISTS idx_users_tenant ON public.users(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
      `
    });

    if (usersError) {
      console.error('❌ Error creating users table:', usersError);
      return;
    }

    // Create articles table
    console.log('📝 Creating articles table...');
    const { error: articlesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.articles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          excerpt TEXT,
          status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
          author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
          category_id UUID,
          featured_image_url VARCHAR(500),
          meta_title VARCHAR(255),
          meta_description TEXT,
          view_count INTEGER DEFAULT 0,
          like_count INTEGER DEFAULT 0,
          comment_count INTEGER DEFAULT 0,
          reading_time_minutes INTEGER DEFAULT 0,
          published_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          deleted_at TIMESTAMP WITH TIME ZONE,
          UNIQUE(tenant_id, slug)
        );
        
        CREATE INDEX IF NOT EXISTS idx_articles_tenant ON public.articles(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_articles_status ON public.articles(status);
        CREATE INDEX IF NOT EXISTS idx_articles_author ON public.articles(author_id);
        CREATE INDEX IF NOT EXISTS idx_articles_published ON public.articles(published_at);
      `
    });

    if (articlesError) {
      console.error('❌ Error creating articles table:', articlesError);
      return;
    }

    // Create categories table
    console.log('🗂️ Creating categories table...');
    const { error: categoriesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL,
          description TEXT,
          parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
          article_count INTEGER DEFAULT 0,
          sort_order INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(tenant_id, slug)
        );
        
        CREATE INDEX IF NOT EXISTS idx_categories_tenant ON public.categories(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);
      `
    });

    if (categoriesError) {
      console.error('❌ Error creating categories table:', categoriesError);
      return;
    }

    // Create tags table
    console.log('🏷️ Creating tags table...');
    const { error: tagsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.tags (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL,
          description TEXT,
          color VARCHAR(7) DEFAULT '#6B7280',
          article_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(tenant_id, slug)
        );
        
        CREATE INDEX IF NOT EXISTS idx_tags_tenant ON public.tags(tenant_id);
      `
    });

    if (tagsError) {
      console.error('❌ Error creating tags table:', tagsError);
      return;
    }

    // Create BigWriter jobs table
    console.log('🤖 Creating BigWriter jobs table...');
    const { error: bigwriterError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.bigwriter_jobs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          request_data JSONB NOT NULL,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
          title VARCHAR(255),
          content TEXT,
          excerpt TEXT,
          meta_description TEXT,
          suggested_tags JSONB,
          error_message TEXT,
          imported_article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE
        );
        
        CREATE INDEX IF NOT EXISTS idx_bigwriter_tenant ON public.bigwriter_jobs(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_bigwriter_user ON public.bigwriter_jobs(user_id);
        CREATE INDEX IF NOT EXISTS idx_bigwriter_status ON public.bigwriter_jobs(status);
      `
    });

    if (bigwriterError) {
      console.error('❌ Error creating BigWriter jobs table:', bigwriterError);
      return;
    }

    console.log('✅ Database setup completed successfully!');
    console.log('🎯 Next steps:');
    console.log('   1. Run: npm run seed-data');
    console.log('   2. Run: npm run dev');
    console.log('   3. Test API at: http://localhost:3001/health');

  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
setupDatabase();
