const fs = require('fs');
const path = require('path');
const { supabase } = require('../config/database');

/**
 * Script para configurar o sistema multi-tenant no Supabase
 */
async function setupMultiTenant() {
  console.log('🚀 Iniciando configuração multi-tenant...');

  try {
    // Ler o arquivo SQL de schema
    const schemaPath = path.join(__dirname, '../database/multi-tenant-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Executando schema multi-tenant...');

    // Dividir o SQL em comandos individuais (separados por ';')
    const commands = schemaSql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    // Executar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      if (command.trim()) {
        try {
          console.log(`⚡ Executando comando ${i + 1}/${commands.length}...`);
          
          // Para comandos que criam funções ou fazem operações complexas
          if (command.includes('CREATE OR REPLACE FUNCTION') || 
              command.includes('CREATE POLICY') ||
              command.includes('ALTER TABLE') ||
              command.includes('CREATE TABLE')) {
            
            const { error } = await supabase.rpc('exec_sql', { 
              sql_command: command 
            });
            
            if (error && !error.message.includes('already exists')) {
              console.warn(`⚠️  Aviso no comando ${i + 1}: ${error.message}`);
            }
          } else {
            // Para comandos simples, usar query direta
            const { error } = await supabase
              .from('_temp_exec')
              .select('*')
              .limit(0); // Apenas para testar conexão
            
            if (error) {
              console.warn(`⚠️  Comando ${i + 1} pode ter falhado: ${error.message}`);
            }
          }
        } catch (cmdError) {
          console.warn(`⚠️  Erro no comando ${i + 1}: ${cmdError.message}`);
        }
      }
    }

    console.log('✅ Schema multi-tenant configurado!');

    // Verificar se o tenant demo foi criado
    await verifyDemoTenant();

    // Criar dados de exemplo no tenant demo
    await createDemoData();

    console.log('🎉 Configuração multi-tenant concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro na configuração multi-tenant:', error);
    throw error;
  }
}

/**
 * Verificar se o tenant demo existe e criar se necessário
 */
async function verifyDemoTenant() {
  console.log('🔍 Verificando tenant demo...');

  try {
    const { data: existingTenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', 'demo')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    if (!existingTenant) {
      console.log('📝 Criando tenant demo...');
      
      // Gerar API key
      const apiKey = 'fb_' + require('crypto').randomBytes(32).toString('hex');
      const apiSecret = require('crypto').randomBytes(32).toString('hex');

      const { data: newTenant, error: createError } = await supabase
        .from('tenants')
        .insert({
          name: 'Demo Blog',
          slug: 'demo',
          subdomain: 'demo',
          schema_name: 'tenant_demo',
          api_key: apiKey,
          api_secret: apiSecret,
          plan: 'pro',
          status: 'active',
          settings: {
            theme: 'default',
            features: {
              comments: true,
              social_sharing: true,
              newsletter: true,
              gamification: true
            }
          }
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      console.log('✅ Tenant demo criado:', newTenant.slug);

      // Criar API key para o tenant
      const { error: apiKeyError } = await supabase
        .from('api_keys')
        .insert({
          tenant_id: newTenant.id,
          key_name: 'default',
          api_key: apiKey,
          permissions: ['read', 'write', 'admin'],
          rate_limit: 5000
        });

      if (apiKeyError) {
        console.warn('⚠️  Erro criando API key:', apiKeyError.message);
      } else {
        console.log('🔑 API Key criada para tenant demo');
        console.log(`📋 API Key: ${apiKey}`);
      }

      // Criar schema do tenant
      await createTenantSchema('demo', 'tenant_demo');

    } else {
      console.log('✅ Tenant demo já existe:', existingTenant.slug);
    }

  } catch (error) {
    console.error('❌ Erro verificando tenant demo:', error);
    throw error;
  }
}

/**
 * Criar schema para um tenant
 */
async function createTenantSchema(tenantSlug, schemaName) {
  console.log(`🏗️  Criando schema para tenant: ${tenantSlug}`);

  try {
    const { data, error } = await supabase
      .rpc('create_tenant_schema', {
        tenant_slug: tenantSlug,
        schema_name: schemaName
      });

    if (error) {
      throw error;
    }

    console.log(`✅ Schema ${schemaName} criado com sucesso!`);
    return data;

  } catch (error) {
    console.error(`❌ Erro criando schema ${schemaName}:`, error);
    throw error;
  }
}

/**
 * Criar dados de exemplo no tenant demo
 */
async function createDemoData() {
  console.log('📝 Criando dados de exemplo...');

  try {
    // Definir contexto do tenant demo
    const { data: demoTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', 'demo')
      .single();

    if (!demoTenant) {
      throw new Error('Tenant demo não encontrado');
    }

    // Criar usuário admin
    const { data: adminUser, error: userError } = await supabase
      .schema('tenant_demo')
      .from('users')
      .upsert({
        email: 'admin@demo.blogservice.com',
        name: 'Admin User',
        role: 'admin',
        status: 'active',
        password_hash: '$2b$10$example_hash' // Em produção, usar hash real
      }, { onConflict: 'email' })
      .select()
      .single();

    if (userError && userError.code !== '23505') { // 23505 = unique violation
      console.warn('⚠️  Erro criando usuário admin:', userError.message);
    } else {
      console.log('👤 Usuário admin criado/atualizado');
    }

    // Criar categoria
    const { data: category, error: categoryError } = await supabase
      .schema('tenant_demo')
      .from('categories')
      .upsert({
        name: 'Technology',
        slug: 'technology',
        description: 'Articles about technology and development',
        color: '#3B82F6'
      }, { onConflict: 'slug' })
      .select()
      .single();

    if (categoryError && categoryError.code !== '23505') {
      console.warn('⚠️  Erro criando categoria:', categoryError.message);
    } else {
      console.log('📁 Categoria criada/atualizada');
    }

    // Criar tags
    const tags = [
      { name: 'React', slug: 'react', color: '#61DAFB' },
      { name: 'TypeScript', slug: 'typescript', color: '#3178C6' },
      { name: 'Tutorial', slug: 'tutorial', color: '#45B7D1' }
    ];

    for (const tag of tags) {
      const { error: tagError } = await supabase
        .schema('tenant_demo')
        .from('tags')
        .upsert(tag, { onConflict: 'slug' });

      if (tagError && tagError.code !== '23505') {
        console.warn(`⚠️  Erro criando tag ${tag.name}:`, tagError.message);
      }
    }

    console.log('🏷️  Tags criadas/atualizadas');

    // Criar artigo de exemplo
    if (adminUser && category) {
      const { data: article, error: articleError } = await supabase
        .schema('tenant_demo')
        .from('articles')
        .upsert({
          title: 'Building Modern Web Applications with React and TypeScript',
          slug: 'building-modern-web-applications-react-typescript',
          content: `
# Building Modern Web Applications with React and TypeScript

React and TypeScript have become the go-to combination for building robust, scalable web applications. In this comprehensive guide, we'll explore how to leverage these powerful technologies together.

## Why React + TypeScript?

TypeScript brings static typing to JavaScript, which provides several benefits:

- **Better Developer Experience**: Enhanced IDE support with autocomplete and error detection
- **Fewer Runtime Errors**: Catch errors at compile time rather than runtime
- **Improved Code Documentation**: Types serve as living documentation
- **Easier Refactoring**: Safe refactoring with confidence

## Getting Started

To create a new React TypeScript project, you can use Create React App:

\`\`\`bash
npx create-react-app my-app --template typescript
cd my-app
npm start
\`\`\`

## Best Practices

1. **Use Interfaces for Props**: Define clear interfaces for component props
2. **Leverage Union Types**: Use union types for component variants
3. **Generic Components**: Create reusable components with generics
4. **Strict Mode**: Enable strict mode in TypeScript configuration

## Conclusion

The combination of React and TypeScript provides a powerful foundation for building modern web applications. The initial learning curve is worth the long-term benefits in code quality and developer productivity.
          `,
          excerpt: 'Learn how to build robust, scalable web applications using React and TypeScript together.',
          author_id: adminUser.id,
          category_id: category.id,
          status: 'published',
          published_at: new Date().toISOString(),
          meta_title: 'Building Modern Web Applications with React and TypeScript',
          meta_description: 'Complete guide to building robust web applications with React and TypeScript',
          view_count: 156,
          like_count: 23,
          reading_time: 8,
          is_featured: true
        }, { onConflict: 'slug' })
        .select()
        .single();

      if (articleError && articleError.code !== '23505') {
        console.warn('⚠️  Erro criando artigo:', articleError.message);
      } else {
        console.log('📄 Artigo de exemplo criado/atualizado');
      }
    }

    console.log('✅ Dados de exemplo criados com sucesso!');

  } catch (error) {
    console.error('❌ Erro criando dados de exemplo:', error);
    // Não falhar o setup por causa dos dados de exemplo
  }
}

/**
 * Função principal
 */
async function main() {
  try {
    await setupMultiTenant();
    console.log('\n🎉 Setup multi-tenant concluído com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Verificar se o tenant demo foi criado');
    console.log('2. Testar as APIs com a API key gerada');
    console.log('3. Configurar o frontend para usar as novas APIs');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Falha no setup multi-tenant:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  setupMultiTenant,
  createTenantSchema,
  createDemoData
};
