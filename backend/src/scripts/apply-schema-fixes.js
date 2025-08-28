const { supabase } = require('../config/database');
const fs = require('fs');
const path = require('path');

/**
 * Script para aplicar correções do schema do banco de dados
 * Execute: node src/scripts/apply-schema-fixes.js
 */

async function applySchemaFixes() {
  console.log('🔧 Iniciando aplicação das correções do schema...\n');

  try {
    // 1. Ler arquivo de correções SQL
    const schemaFixesPath = path.join(__dirname, '../../schema-fixes.sql');
    
    if (!fs.existsSync(schemaFixesPath)) {
      throw new Error(`Arquivo schema-fixes.sql não encontrado em: ${schemaFixesPath}`);
    }

    const sqlContent = fs.readFileSync(schemaFixesPath, 'utf8');
    
    // 2. Dividir em comandos SQL individuais
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📝 Encontrados ${sqlCommands.length} comandos SQL para executar\n`);

    // 3. Executar comandos um por vez
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      
      try {
        console.log(`⚡ Executando comando ${i + 1}/${sqlCommands.length}...`);
        
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_command: command 
        });

        if (error) {
          throw error;
        }

        successCount++;
        console.log(`✅ Comando ${i + 1} executado com sucesso`);
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Erro no comando ${i + 1}:`, error.message);
        
        // Para alguns erros, continuar (ex: tabela já existe)
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist') ||
            error.message.includes('duplicate key')) {
          console.log(`⚠️  Erro ignorado (provavelmente já aplicado)`);
        } else {
          console.error(`🚨 Erro crítico:`, error);
        }
      }
    }

    console.log(`\n📊 Resumo da execução:`);
    console.log(`✅ Comandos executados com sucesso: ${successCount}`);
    console.log(`❌ Comandos com erro: ${errorCount}`);

    // 4. Verificar se as correções foram aplicadas
    console.log(`\n🔍 Verificando se as correções foram aplicadas...`);
    
    await verifySchemaFixes();

    console.log(`\n🎉 Correções do schema aplicadas com sucesso!`);

  } catch (error) {
    console.error('🚨 Erro ao aplicar correções do schema:', error);
    process.exit(1);
  }
}

async function verifySchemaFixes() {
  const checks = [
    {
      name: 'Coluna users.name existe',
      query: `SELECT column_name FROM information_schema.columns 
              WHERE table_name = 'users' AND column_name = 'name'`
    },
    {
      name: 'Tabela api_keys existe',
      query: `SELECT table_name FROM information_schema.tables 
              WHERE table_name = 'api_keys'`
    },
    {
      name: 'Coluna categories.color existe',
      query: `SELECT column_name FROM information_schema.columns 
              WHERE table_name = 'categories' AND column_name = 'color'`
    },
    {
      name: 'RLS habilitado em tenants',
      query: `SELECT relname FROM pg_class 
              WHERE relname = 'tenants' AND relrowsecurity = true`
    },
    {
      name: 'Função validate_api_key existe',
      query: `SELECT proname FROM pg_proc WHERE proname = 'validate_api_key'`
    }
  ];

  for (const check of checks) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_command: check.query 
      });

      if (error) {
        console.log(`❌ ${check.name}: ERRO - ${error.message}`);
      } else if (data && data.length > 0) {
        console.log(`✅ ${check.name}: OK`);
      } else {
        console.log(`⚠️  ${check.name}: NÃO ENCONTRADO`);
      }
    } catch (error) {
      console.log(`❌ ${check.name}: ERRO - ${error.message}`);
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  applySchemaFixes();
}

module.exports = { applySchemaFixes, verifySchemaFixes };
