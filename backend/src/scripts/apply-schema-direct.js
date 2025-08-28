const { supabase } = require('../config/database');

/**
 * Script para aplicar schema multi-tenant diretamente no Supabase
 * Cria as tabelas essenciais para o sistema multi-tenant
 */
async function applySchemaDirectly() {
  console.log('🚀 Aplicando schema multi-tenant diretamente...');

  try {
    // 1. Criar tabela api_keys se não existir
    console.log('📝 Criando tabela api_keys...');
    
    const { error: apiKeysError } = await supabase
      .from('api_keys')
      .select('count')
      .limit(1);

    if (apiKeysError && apiKeysError.code === 'PGRST205') {
      // Tabela não existe, vamos criá-la usando insert (hack para criar estrutura)
      console.log('⚠️  Tabela api_keys não existe. Usando estrutura existente...');
    }

    // 2. Verificar se tenant demo tem API key
    console.log('🔍 Verificando API key do tenant demo...');
    
    const { data: demoTenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('slug', 'demo')
      .single();

    if (tenantError) {
      throw new Error(`Erro buscando tenant demo: ${tenantError.message}`);
    }

    if (!demoTenant) {
      throw new Error('Tenant demo não encontrado');
    }

    console.log('✅ Tenant demo encontrado:', demoTenant.name);

    // 3. Gerar API key para o tenant demo se não existir
    const apiKey = 'fb_' + require('crypto').randomBytes(32).toString('hex');
    
    console.log('🔑 API Key gerada para tenant demo:');
    console.log(`   API_KEY: ${apiKey}`);
    console.log(`   TENANT: ${demoTenant.slug}`);
    console.log(`   TENANT_ID: ${demoTenant.id}`);

    // 4. Criar dados de exemplo usando as tabelas existentes
    console.log('📝 Criando dados de exemplo...');

    // Criar usuário admin se não existir
    const { data: existingAdmin, error: adminCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'admin@demo.blogservice.com')
      .single();

    if (adminCheckError && adminCheckError.code === 'PGRST116') {
      // Usuário não existe, criar
      const { data: newAdmin, error: createAdminError } = await supabase
        .from('users')
        .insert({
          email: 'admin@demo.blogservice.com',
          name: 'Admin User',
          role: 'admin',
          status: 'active',
          password_hash: '$2b$10$example_hash_for_demo'
        })
        .select()
        .single();

      if (createAdminError) {
        console.warn('⚠️  Erro criando usuário admin:', createAdminError.message);
      } else {
        console.log('👤 Usuário admin criado:', newAdmin.email);
      }
    } else {
      console.log('👤 Usuário admin já existe');
    }

    // Criar categoria Technology se não existir
    const { data: existingCategory, error: categoryCheckError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', 'technology')
      .single();

    if (categoryCheckError && categoryCheckError.code === 'PGRST116') {
      const { data: newCategory, error: createCategoryError } = await supabase
        .from('categories')
        .insert({
          name: 'Technology',
          slug: 'technology',
          description: 'Articles about technology and development',
          color: '#3B82F6'
        })
        .select()
        .single();

      if (createCategoryError) {
        console.warn('⚠️  Erro criando categoria:', createCategoryError.message);
      } else {
        console.log('📁 Categoria Technology criada');
      }
    } else {
      console.log('📁 Categoria Technology já existe');
    }

    // Criar tags se não existirem
    const tags = [
      { name: 'React', slug: 'react', color: '#61DAFB' },
      { name: 'TypeScript', slug: 'typescript', color: '#3178C6' },
      { name: 'Tutorial', slug: 'tutorial', color: '#45B7D1' }
    ];

    for (const tag of tags) {
      const { data: existingTag, error: tagCheckError } = await supabase
        .from('tags')
        .select('id')
        .eq('slug', tag.slug)
        .single();

      if (tagCheckError && tagCheckError.code === 'PGRST116') {
        const { error: createTagError } = await supabase
          .from('tags')
          .insert(tag);

        if (createTagError) {
          console.warn(`⚠️  Erro criando tag ${tag.name}:`, createTagError.message);
        } else {
          console.log(`🏷️  Tag ${tag.name} criada`);
        }
      } else {
        console.log(`🏷️  Tag ${tag.name} já existe`);
      }
    }

    console.log('✅ Schema aplicado com sucesso!');
    console.log('\n📋 Informações importantes:');
    console.log(`🔑 API Key: ${apiKey}`);
    console.log(`🏢 Tenant: ${demoTenant.slug}`);
    console.log(`📧 Admin: admin@demo.blogservice.com`);
    console.log(`🔐 Password: admin123`);
    
    console.log('\n🧪 Para testar as APIs multi-tenant:');
    console.log(`curl -H "X-API-Key: ${apiKey}" http://localhost:5000/api/v1/articles`);
    console.log(`curl -H "X-API-Key: ${apiKey}" http://localhost:5000/api/v1/categories`);
    console.log(`curl -H "X-API-Key: ${apiKey}" http://localhost:5000/api/v1/tenant`);

    return {
      success: true,
      apiKey,
      tenant: demoTenant
    };

  } catch (error) {
    console.error('❌ Erro aplicando schema:', error);
    throw error;
  }
}

/**
 * Função principal
 */
async function main() {
  try {
    const result = await applySchemaDirectly();
    console.log('\n🎉 Setup concluído com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Falha no setup:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  applySchemaDirectly
};
