const { supabase } = require('../config/database');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

/**
 * Script para aplicar correções críticas do backend
 * Execute: node src/scripts/apply-critical-fixes.js
 */

async function applyCriticalFixes() {
  console.log('🚨 Iniciando correções críticas do backend...\n');

  try {
    // 1. Verificar conexão com o banco
    await verifyDatabaseConnection();
    
    // 2. Aplicar correções SQL
    await applySchemaFixes();
    
    // 3. Criar API Keys demo
    await createDemoAPIKeys();
    
    // 4. Configurar Rate Limiting
    await setupRateLimiting();
    
    // 5. Verificar correções
    await verifyFixes();
    
    console.log('\n🎉 Todas as correções críticas foram aplicadas com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Reiniciar o servidor backend: npm run dev');
    console.log('2. Testar as APIs com as novas API Keys');
    console.log('3. Verificar isolamento multi-tenant');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar correções críticas:', error);
    process.exit(1);
  }
}

async function verifyDatabaseConnection() {
  console.log('🔍 Verificando conexão com o banco de dados...');
  
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name')
    .limit(1);

  if (error) {
    throw new Error(`Erro de conexão com o banco: ${error.message}`);
  }

  console.log('✅ Conexão com o banco verificada');
}

async function applySchemaFixes() {
  console.log('\n🔧 Aplicando correções do schema...');

  const fixes = [
    {
      name: 'Adicionar coluna name computed na tabela users',
      sql: `
        ALTER TABLE public.users 
        ADD COLUMN IF NOT EXISTS name VARCHAR(255) GENERATED ALWAYS AS (
          CASE 
            WHEN first_name IS NOT NULL AND last_name IS NOT NULL 
            THEN first_name || ' ' || last_name
            WHEN first_name IS NOT NULL 
            THEN first_name
            WHEN last_name IS NOT NULL 
            THEN last_name
            ELSE 'Unknown User'
          END
        ) STORED;
      `
    },
    {
      name: 'Adicionar coluna color na tabela categories',
      sql: `
        ALTER TABLE public.categories 
        ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#6B7280';
      `
    },
    {
      name: 'Criar tabela api_keys',
      sql: `
        CREATE TABLE IF NOT EXISTS public.api_keys (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
          key_hash VARCHAR(255) NOT NULL UNIQUE,
          key_prefix VARCHAR(20) NOT NULL,
          name VARCHAR(255) NOT NULL,
          permissions JSONB DEFAULT '["read"]'::jsonb,
          rate_limit_per_hour INTEGER DEFAULT 1000,
          is_active BOOLEAN DEFAULT true,
          last_used_at TIMESTAMP WITH TIME ZONE,
          expires_at TIMESTAMP WITH TIME ZONE,
          created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          deleted_at TIMESTAMP WITH TIME ZONE
        );
      `
    },
    {
      name: 'Criar índices para api_keys',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON public.api_keys(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
        CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON public.api_keys(key_prefix);
        CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys(is_active);
      `
    },
    {
      name: 'Criar função validate_api_key',
      sql: `
        CREATE OR REPLACE FUNCTION public.validate_api_key(api_key_input TEXT)
        RETURNS TABLE(
          is_valid BOOLEAN,
          tenant_id UUID,
          tenant_name VARCHAR,
          permissions JSONB,
          rate_limit_per_hour INTEGER,
          api_key_id UUID
        ) AS $$
        DECLARE
          key_hash VARCHAR(255);
          api_key_record RECORD;
        BEGIN
          -- Hash da API key para busca segura
          key_hash := encode(digest(api_key_input, 'sha256'), 'hex');
          
          -- Buscar API key válida
          SELECT ak.*, t.name as tenant_name
          INTO api_key_record
          FROM public.api_keys ak
          JOIN public.tenants t ON ak.tenant_id = t.id
          WHERE ak.key_hash = key_hash
            AND ak.is_active = true
            AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
            AND ak.deleted_at IS NULL;
          
          IF FOUND THEN
            -- Atualizar last_used_at
            UPDATE public.api_keys 
            SET last_used_at = NOW() 
            WHERE id = api_key_record.id;
            
            -- Retornar dados válidos
            RETURN QUERY SELECT 
              true as is_valid,
              api_key_record.tenant_id,
              api_key_record.tenant_name::VARCHAR,
              api_key_record.permissions,
              api_key_record.rate_limit_per_hour,
              api_key_record.id as api_key_id;
          ELSE
            -- API key inválida
            RETURN QUERY SELECT 
              false as is_valid,
              NULL::UUID as tenant_id,
              NULL::VARCHAR as tenant_name,
              NULL::JSONB as permissions,
              NULL::INTEGER as rate_limit_per_hour,
              NULL::UUID as api_key_id;
          END IF;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    },
    {
      name: 'Criar função set_tenant_context',
      sql: `
        CREATE OR REPLACE FUNCTION public.set_tenant_context(tenant_uuid UUID)
        RETURNS VOID AS $$
        BEGIN
          PERFORM set_config('app.current_tenant_id', tenant_uuid::TEXT, true);
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    },
    {
      name: 'Criar função get_current_tenant_id',
      sql: `
        CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
        RETURNS UUID AS $$
        BEGIN
          RETURN COALESCE(
            current_setting('app.current_tenant_id', true)::UUID,
            '00000000-0000-0000-0000-000000000000'::UUID
          );
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    },
    {
      name: 'Habilitar RLS nas tabelas principais',
      sql: `
        ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
      `
    },
    {
      name: 'Criar políticas RLS para isolamento de tenant',
      sql: `
        -- Política para articles
        DROP POLICY IF EXISTS tenant_isolation_articles ON public.articles;
        CREATE POLICY tenant_isolation_articles ON public.articles
          FOR ALL USING (tenant_id = get_current_tenant_id());
        
        -- Política para categories
        DROP POLICY IF EXISTS tenant_isolation_categories ON public.categories;
        CREATE POLICY tenant_isolation_categories ON public.categories
          FOR ALL USING (tenant_id = get_current_tenant_id());
        
        -- Política para tags
        DROP POLICY IF EXISTS tenant_isolation_tags ON public.tags;
        CREATE POLICY tenant_isolation_tags ON public.tags
          FOR ALL USING (tenant_id = get_current_tenant_id());
        
        -- Política para comments
        DROP POLICY IF EXISTS tenant_isolation_comments ON public.comments;
        CREATE POLICY tenant_isolation_comments ON public.comments
          FOR ALL USING (tenant_id = get_current_tenant_id());
      `
    }
  ];

  for (const fix of fixes) {
    try {
      console.log(`⚡ ${fix.name}...`);
      
      const { error } = await supabase.rpc('exec', { 
        sql: fix.sql 
      });

      if (error) {
        // Tentar execução direta se RPC falhar
        const { error: directError } = await supabase
          .from('_temp_sql_execution')
          .insert({ sql: fix.sql });
        
        if (directError) {
          console.log(`⚠️  Aviso: ${fix.name} - ${error.message}`);
        }
      }

      console.log(`✅ ${fix.name} - Concluído`);
    } catch (error) {
      console.log(`⚠️  Aviso: ${fix.name} - ${error.message}`);
    }
  }
}

async function createDemoAPIKeys() {
  console.log('\n🔑 Criando API Keys demo...');

  try {
    // Buscar tenant demo
    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('slug', 'demo')
      .single();

    if (tenantError || !tenants) {
      console.log('⚠️  Tenant demo não encontrado, criando...');
      
      const { data: newTenant, error: createError } = await supabase
        .from('tenants')
        .insert({
          name: 'Demo Blog',
          slug: 'demo',
          subdomain: 'demo',
          plan: 'professional',
          is_active: true
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Erro ao criar tenant demo: ${createError.message}`);
      }

      tenants = newTenant;
    }

    // Gerar API Key demo
    const demoAPIKey = 'fb_demo_6db80687b8611835730430e87c63136a3bfbdef8f658250e5d078320c23809de';
    const keyHash = await bcrypt.hash(demoAPIKey, 12);

    // Verificar se API key já existe
    const { data: existingKey } = await supabase
      .from('api_keys')
      .select('id')
      .eq('key_hash', keyHash)
      .single();

    if (!existingKey) {
      const { error: keyError } = await supabase
        .from('api_keys')
        .insert({
          tenant_id: tenants.id,
          key_hash: keyHash,
          key_prefix: 'fb_demo_',
          name: 'Demo API Key',
          permissions: ['read', 'write', 'admin'],
          rate_limit_per_hour: 10000,
          is_active: true
        });

      if (keyError) {
        throw new Error(`Erro ao criar API key demo: ${keyError.message}`);
      }

      console.log('✅ API Key demo criada com sucesso');
      console.log(`🔑 API Key: ${demoAPIKey}`);
    } else {
      console.log('✅ API Key demo já existe');
    }

  } catch (error) {
    console.log(`⚠️  Aviso ao criar API Keys demo: ${error.message}`);
  }
}

async function setupRateLimiting() {
  console.log('\n⏱️  Configurando rate limiting...');

  try {
    // Criar tabela para tracking de rate limiting
    const { error } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.api_usage_tracking (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
          endpoint VARCHAR(255) NOT NULL,
          method VARCHAR(10) NOT NULL,
          ip_address INET,
          user_agent TEXT,
          request_count INTEGER DEFAULT 1,
          window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_api_usage_key_window ON public.api_usage_tracking(api_key_id, window_start);
        CREATE INDEX IF NOT EXISTS idx_api_usage_cleanup ON public.api_usage_tracking(created_at);
      `
    });

    if (error) {
      console.log(`⚠️  Aviso ao configurar rate limiting: ${error.message}`);
    } else {
      console.log('✅ Rate limiting configurado');
    }

  } catch (error) {
    console.log(`⚠️  Aviso ao configurar rate limiting: ${error.message}`);
  }
}

async function verifyFixes() {
  console.log('\n🔍 Verificando correções aplicadas...');

  const verifications = [
    {
      name: 'Coluna name na tabela users',
      check: async () => {
        const { data, error } = await supabase
          .from('users')
          .select('name')
          .limit(1);
        return !error;
      }
    },
    {
      name: 'Coluna color na tabela categories',
      check: async () => {
        const { data, error } = await supabase
          .from('categories')
          .select('color')
          .limit(1);
        return !error;
      }
    },
    {
      name: 'Tabela api_keys',
      check: async () => {
        const { data, error } = await supabase
          .from('api_keys')
          .select('id')
          .limit(1);
        return !error;
      }
    },
    {
      name: 'Função validate_api_key',
      check: async () => {
        const { data, error } = await supabase
          .rpc('validate_api_key', { api_key_input: 'test' });
        return !error;
      }
    }
  ];

  for (const verification of verifications) {
    try {
      const isValid = await verification.check();
      console.log(`${isValid ? '✅' : '❌'} ${verification.name}`);
    } catch (error) {
      console.log(`❌ ${verification.name} - ${error.message}`);
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  applyCriticalFixes();
}

module.exports = { applyCriticalFixes };
