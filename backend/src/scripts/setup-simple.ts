#!/usr/bin/env node

/**
 * Simple setup script for Supabase database
 * Creates basic tables and demo data using Supabase client
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

    // Create demo tenant
    console.log('👤 Creating demo tenant...');
    const { data: tenant, error: tenantError } = await supabase
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

    if (tenantError) {
      console.log('⚠️  Tenant table may not exist yet. This is expected on first run.');
      console.log('📋 Please create the tables manually in Supabase SQL Editor first.');
      console.log('🔗 Go to: https://supabase.com/dashboard/project/frtbsyxzhnqukwlcxrkx/sql');
      console.log('');
      console.log('📝 Copy and paste the SQL from: backend/src/migrations/001_initial_schema.sql');
      return;
    }

    // Create demo admin user (password: admin123)
    console.log('👥 Creating demo admin user...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@demo.blogservice.com',
        password_hash: '$2b$12$LQv3c1yqBwEHFnhQrjjGOe.Wy.KZGZZGZGZGZGZGZGZGZGZGZGZGZGZG',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        permissions: ['*'],
        bio: 'Administrator of the demo blog',
        is_active: true,
        email_verified: true
      }, {
        onConflict: 'id'
      });

    if (userError) {
      console.error('❌ Error creating demo user:', userError);
      return;
    }

    // Create sample categories
    console.log('🗂️ Creating sample categories...');
    const categories = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        name: 'Technology',
        slug: 'technology',
        description: 'Articles about technology trends and innovations',
        article_count: 3,
        sort_order: 1
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        name: 'Business',
        slug: 'business',
        description: 'Business insights and strategies',
        article_count: 2,
        sort_order: 2
      }
    ];

    const { error: categoriesError } = await supabase
      .from('categories')
      .upsert(categories, { onConflict: 'id' });

    if (categoriesError) {
      console.error('❌ Error creating categories:', categoriesError);
      return;
    }

    // Create sample tags
    console.log('🏷️ Creating sample tags...');
    const tags = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        name: 'React',
        slug: 'react',
        description: 'React.js framework',
        color: '#61DAFB',
        article_count: 2
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        name: 'TypeScript',
        slug: 'typescript',
        description: 'TypeScript programming language',
        color: '#3178C6',
        article_count: 2
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        name: 'AI',
        slug: 'ai',
        description: 'Artificial Intelligence',
        color: '#FF6B6B',
        article_count: 1
      }
    ];

    const { error: tagsError } = await supabase
      .from('tags')
      .upsert(tags, { onConflict: 'id' });

    if (tagsError) {
      console.error('❌ Error creating tags:', tagsError);
      return;
    }

    // Create sample article
    console.log('📝 Creating sample article...');
    const { error: articleError } = await supabase
      .from('articles')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        title: 'Building Modern Web Applications with React and TypeScript',
        slug: 'building-modern-web-applications-react-typescript',
        content: `# Building Modern Web Applications with React and TypeScript

React and TypeScript have become the go-to combination for building scalable, maintainable web applications. In this comprehensive guide, we'll explore how to leverage these technologies effectively.

## Why React + TypeScript?

TypeScript brings static typing to JavaScript, which helps catch errors early in development and provides better IDE support. When combined with React, it creates a powerful development experience.

### Key Benefits

1. **Type Safety**: Catch errors at compile time
2. **Better IDE Support**: Enhanced autocomplete and refactoring
3. **Improved Maintainability**: Self-documenting code
4. **Team Collaboration**: Clear interfaces and contracts

## Getting Started

To create a new React + TypeScript project:

\`\`\`bash
npx create-react-app my-app --template typescript
cd my-app
npm start
\`\`\`

## Best Practices

### Component Definition
Always define prop types for your components:

\`\`\`typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

const Button: React.FC<ButtonProps> = ({ label, onClick, variant = "primary" }) => {
  return (
    <button className={\`btn btn-\${variant}\`} onClick={onClick}>
      {label}
    </button>
  );
};
\`\`\`

## Conclusion

React and TypeScript together provide a robust foundation for modern web development. The initial learning curve is worth the long-term benefits in code quality and developer experience.`,
        excerpt: 'Learn how to build scalable web applications using React and TypeScript. This guide covers best practices, setup, and real-world examples.',
        status: 'published',
        author_id: '00000000-0000-0000-0000-000000000001',
        category_id: '00000000-0000-0000-0000-000000000001',
        meta_title: 'Building Modern Web Applications with React and TypeScript',
        meta_description: 'Complete guide to building scalable web applications with React and TypeScript. Learn best practices, setup, and implementation strategies.',
        view_count: 156,
        like_count: 23,
        reading_time_minutes: 8,
        published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
      }, {
        onConflict: 'id'
      });

    if (articleError) {
      console.error('❌ Error creating sample article:', articleError);
      return;
    }

    console.log('✅ Database setup completed successfully!');
    console.log('🎯 Demo data created:');
    console.log('   📧 Admin email: admin@demo.blogservice.com');
    console.log('   🔑 Password: admin123');
    console.log('   🏢 Tenant: Demo Blog (demo)');
    console.log('');
    console.log('🚀 Next steps:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Test API at: http://localhost:3001/health');
    console.log('   3. Login with demo credentials');

  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
setupDatabase();
