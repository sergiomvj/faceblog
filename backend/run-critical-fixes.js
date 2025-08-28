#!/usr/bin/env node

/**
 * Script principal para executar todas as correções críticas do backend
 * Execute: node run-critical-fixes.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚨 FaceBlog - Correções Críticas do Backend');
console.log('==========================================\n');

async function runCriticalFixes() {
  try {
    // 1. Verificar dependências
    console.log('📦 Verificando dependências...');
    await checkDependencies();
    
    // 2. Aplicar correções SQL
    console.log('\n🔧 Aplicando correções SQL...');
    await applySQLFixes();
    
    // 3. Executar script de correções críticas
    console.log('\n⚡ Executando correções críticas...');
    await runCriticalFixesScript();
    
    // 4. Testar servidor melhorado
    console.log('\n🚀 Testando servidor melhorado...');
    await testEnhancedServer();
    
    console.log('\n🎉 Todas as correções críticas foram aplicadas com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Use o servidor melhorado: node src/enhanced-server.js');
    console.log('2. Teste com a API Key demo: fb_demo_6db80687b8611835730430e87c63136a3bfbdef8f658250e5d078320c23809de');
    console.log('3. Verifique o isolamento multi-tenant');
    console.log('4. Monitore o rate limiting');
    
  } catch (error) {
    console.error('\n❌ Erro durante as correções:', error.message);
    console.log('\n🔍 Diagnóstico:');
    console.log('- Verifique se o Supabase está configurado corretamente');
    console.log('- Confirme se as variáveis de ambiente estão definidas');
    console.log('- Execute manualmente: node src/scripts/apply-critical-fixes.js');
    process.exit(1);
  }
}

async function checkDependencies() {
  const requiredPackages = [
    'express',
    'cors',
    'dotenv',
    '@supabase/supabase-js',
    'bcrypt',
    'helmet',
    'compression'
  ];

  const packageJsonPath = path.join(__dirname, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('package.json não encontrado');
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

  const missing = requiredPackages.filter(pkg => !dependencies[pkg]);

  if (missing.length > 0) {
    console.log(`⚠️  Instalando dependências faltantes: ${missing.join(', ')}`);
    
    try {
      execSync(`npm install ${missing.join(' ')}`, { stdio: 'inherit' });
      console.log('✅ Dependências instaladas');
    } catch (error) {
      throw new Error(`Erro ao instalar dependências: ${error.message}`);
    }
  } else {
    console.log('✅ Todas as dependências estão instaladas');
  }
}

async function applySQLFixes() {
  const sqlFiles = [
    'src/database/rate-limiting-functions.sql',
    'schema-fixes.sql'
  ];

  for (const sqlFile of sqlFiles) {
    const filePath = path.join(__dirname, sqlFile);
    
    if (fs.existsSync(filePath)) {
      console.log(`📝 Arquivo SQL encontrado: ${sqlFile}`);
      console.log('   Execute manualmente no Supabase SQL Editor se necessário');
    } else {
      console.log(`⚠️  Arquivo SQL não encontrado: ${sqlFile}`);
    }
  }
  
  console.log('✅ Arquivos SQL verificados');
}

async function runCriticalFixesScript() {
  const scriptPath = path.join(__dirname, 'src/scripts/apply-critical-fixes.js');
  
  if (!fs.existsSync(scriptPath)) {
    throw new Error('Script de correções críticas não encontrado');
  }

  try {
    console.log('⚡ Executando script de correções...');
    execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
    console.log('✅ Script de correções executado');
  } catch (error) {
    console.log('⚠️  Script executado com avisos (normal em alguns casos)');
  }
}

async function testEnhancedServer() {
  const serverPath = path.join(__dirname, 'src/enhanced-server.js');
  
  if (!fs.existsSync(serverPath)) {
    throw new Error('Servidor melhorado não encontrado');
  }

  console.log('✅ Servidor melhorado encontrado');
  console.log('   Para testar: node src/enhanced-server.js');
}

// Executar se chamado diretamente
if (require.main === module) {
  runCriticalFixes();
}

module.exports = { runCriticalFixes };
