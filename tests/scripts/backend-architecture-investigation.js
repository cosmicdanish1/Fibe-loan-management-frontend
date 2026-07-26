const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function investigateBackendArchitecture() {
  console.log('🔍 COMPREHENSIVE BACKEND ARCHITECTURE INVESTIGATION');
  console.log('=' .repeat(80));
  
  try {
    const client = await pool.connect();
    
    // 1. Database Schema Analysis
    console.log('1. 📊 DATABASE SCHEMA ANALYSIS');
    console.log('-' .repeat(50));
    
    // Get all tables and their sizes
    const tableInfo = await client.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_stat_get_tuples_inserted(c.oid) as inserts,
        pg_stat_get_tuples_updated(c.oid) as updates,
        pg_stat_get_tuples_deleted(c.oid) as deletes,
        n_tup_ins + n_tup_upd + n_tup_del as total_operations
      FROM pg_tables pt
      LEFT JOIN pg_class c ON c.relname = pt.tablename
      LEFT JOIN pg_stat_user_tables s ON s.relname = pt.tablename
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `);
    
    console.log('📋 Table Analysis (by size):');
    tableInfo.rows.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.tablename}: ${table.size} (${table.total_operations || 0} operations)`);
    });
    
    // 2. Loan Application Tables Analysis
    console.log('\n2. 🏦 LOAN APPLICATION TABLES ANALYSIS');
    console.log('-' .repeat(50));
    
    const loanTables = await client.query(`
      SELECT table_name, column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%loan%'
      ORDER BY table_name, ordinal_position
    `);
    
    const loanTableGroups = {};
    loanTables.rows.forEach(col => {
      if (!loanTableGroups[col.table_name]) {
        loanTableGroups[col.table_name] = [];
      }
      loanTableGroups[col.table_name].push(col);
    });
    
    console.log('📋 Loan-related tables:');
    Object.keys(loanTableGroups).forEach(tableName => {
      console.log(`\n   📊 ${tableName.toUpperCase()}:`);
      loanTableGroups[tableName].slice(0, 10).forEach(col => {
        const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(required)';
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        console.log(`      • ${col.column_name}: ${col.data_type}${length} ${nullable}`);
      });
      if (loanTableGroups[tableName].length > 10) {
        console.log(`      ... and ${loanTableGroups[tableName].length - 10} more columns`);
      }
    });
    
    // 3. Check loan data volume
    console.log('\n3. 📈 LOAN DATA VOLUME ANALYSIS');
    console.log('-' .repeat(50));
    
    for (const tableName of Object.keys(loanTableGroups)) {
      try {
        const count = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`   ${tableName}: ${count.rows[0].count} records`);
      } catch (error) {
        console.log(`   ${tableName}: Error reading (${error.message})`);
      }
    }
    
    // 4. Index Analysis
    console.log('\n4. 🔍 INDEX ANALYSIS');
    console.log('-' .repeat(50));
    
    const indexes = await client.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      AND tablename LIKE '%loan%'
      ORDER BY tablename, indexname
    `);
    
    console.log('📋 Loan table indexes:');
    indexes.rows.forEach(idx => {
      console.log(`   ${idx.tablename}.${idx.indexname}`);
      console.log(`      ${idx.indexdef}`);
    });
    
    // 5. Performance Issues Detection
    console.log('\n5. ⚡ PERFORMANCE ISSUES DETECTION');
    console.log('-' .repeat(50));
    
    // Check for missing indexes on foreign keys
    const missingIndexes = await client.query(`
      SELECT 
        c.conrelid::regclass AS table_name,
        string_agg(a.attname, ', ') AS columns,
        c.confrelid::regclass AS referenced_table
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      WHERE c.contype = 'f'
      AND NOT EXISTS (
        SELECT 1 FROM pg_index i 
        WHERE i.indrelid = c.conrelid 
        AND c.conkey <@ i.indkey
      )
      GROUP BY c.conrelid, c.confrelid, c.conname
      ORDER BY table_name
    `);
    
    console.log('⚠️ Missing indexes on foreign keys:');
    if (missingIndexes.rows.length === 0) {
      console.log('   ✅ No missing foreign key indexes found');
    } else {
      missingIndexes.rows.forEach(missing => {
        console.log(`   ❌ ${missing.table_name}.${missing.columns} → ${missing.referenced_table}`);
      });
    }
    
    // 6. Query Performance Analysis
    console.log('\n6. 📊 SLOW QUERY ANALYSIS');
    console.log('-' .repeat(50));
    
    const slowQueries = await client.query(`
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        rows
      FROM pg_stat_statements 
      WHERE query LIKE '%loan%' 
      ORDER BY mean_time DESC 
      LIMIT 5
    `).catch(() => ({ rows: [] }));
    
    if (slowQueries.rows.length === 0) {
      console.log('   ℹ️ pg_stat_statements not available or no loan queries recorded');
    } else {
      console.log('📋 Slowest loan-related queries:');
      slowQueries.rows.forEach((query, index) => {
        console.log(`   ${index + 1}. Mean time: ${query.mean_time}ms, Calls: ${query.calls}`);
        console.log(`      ${query.query.substring(0, 100)}...`);
      });
    }
    
    client.release();
    
    // 7. Backend Code Structure Analysis
    console.log('\n7. 🏗️ BACKEND CODE STRUCTURE ANALYSIS');
    console.log('-' .repeat(50));
    
    const backendPath = 'backend/src';
    if (fs.existsSync(backendPath)) {
      const modules = fs.readdirSync(path.join(backendPath, 'modules'));
      console.log('📋 Backend modules:');
      modules.forEach(module => {
        const modulePath = path.join(backendPath, 'modules', module);
        if (fs.statSync(modulePath).isDirectory()) {
          const files = fs.readdirSync(modulePath);
          console.log(`   📁 ${module}: ${files.length} files`);
          
          // Check for common patterns
          const hasController = files.some(f => f.includes('controller'));
          const hasService = files.some(f => f.includes('service'));
          const hasEntity = files.some(f => f.includes('entity'));
          const hasDto = files.some(f => f.includes('dto'));
          
          const patterns = [];
          if (hasController) patterns.push('Controller');
          if (hasService) patterns.push('Service');
          if (hasEntity) patterns.push('Entity');
          if (hasDto) patterns.push('DTO');
          
          console.log(`      Patterns: ${patterns.join(', ') || 'None'}`);
        }
      });
    }
    
    // 8. Loan Module Specific Analysis
    console.log('\n8. 🏦 LOAN MODULE SPECIFIC ANALYSIS');
    console.log('-' .repeat(50));
    
    const loanModulePath = 'backend/src/modules/loan';
    if (fs.existsSync(loanModulePath)) {
      const loanFiles = fs.readdirSync(loanModulePath, { recursive: true });
      console.log('📋 Loan module files:');
      loanFiles.forEach(file => {
        if (typeof file === 'string') {
          console.log(`   📄 ${file}`);
        }
      });
      
      // Analyze loan service if exists
      const loanServicePath = path.join(loanModulePath, 'loan.service.ts');
      if (fs.existsSync(loanServicePath)) {
        const serviceContent = fs.readFileSync(loanServicePath, 'utf8');
        const methodCount = (serviceContent.match(/async \w+\(/g) || []).length;
        const queryCount = (serviceContent.match(/query\(/g) || []).length;
        const transactionCount = (serviceContent.match(/transaction\(/g) || []).length;
        
        console.log('\n   📊 Loan Service Analysis:');
        console.log(`      Methods: ${methodCount}`);
        console.log(`      Database queries: ${queryCount}`);
        console.log(`      Transactions: ${transactionCount}`);
      }
    } else {
      console.log('   ⚠️ Loan module not found at expected path');
    }
    
    // 9. API Endpoint Analysis
    console.log('\n9. 🌐 API ENDPOINT ANALYSIS');
    console.log('-' .repeat(50));
    
    // Check app.module.ts for registered modules
    const appModulePath = 'backend/src/app.module.ts';
    if (fs.existsSync(appModulePath)) {
      const appModuleContent = fs.readFileSync(appModulePath, 'utf8');
      const imports = appModuleContent.match(/imports:\s*\[([\s\S]*?)\]/);
      if (imports) {
        const moduleList = imports[1].split(',').map(m => m.trim()).filter(m => m);
        console.log('📋 Registered modules:');
        moduleList.forEach(module => {
          console.log(`   • ${module}`);
        });
      }
    }
    
    // 10. Generate Recommendations
    console.log('\n' + '=' .repeat(80));
    console.log('🎯 ARCHITECTURE ANALYSIS SUMMARY & RECOMMENDATIONS');
    console.log('=' .repeat(80));
    
    console.log('\n📊 CURRENT STATE:');
    console.log(`   • Database tables: ${tableInfo.rows.length}`);
    console.log(`   • Loan-related tables: ${Object.keys(loanTableGroups).length}`);
    console.log(`   • Backend modules: ${fs.existsSync('backend/src/modules') ? fs.readdirSync('backend/src/modules').length : 'Unknown'}`);
    
    console.log('\n⚡ PERFORMANCE RECOMMENDATIONS:');
    console.log('   1. 🔍 Add indexes on frequently queried columns');
    console.log('   2. 📊 Implement query result caching for reports');
    console.log('   3. 🔄 Use database connection pooling optimization');
    console.log('   4. 📈 Add pagination for large data sets');
    console.log('   5. 🚀 Implement lazy loading for complex queries');
    
    console.log('\n🏗️ ARCHITECTURE IMPROVEMENTS:');
    console.log('   1. 📦 Standardize module structure (Controller-Service-Entity-DTO)');
    console.log('   2. 🔒 Add input validation and sanitization');
    console.log('   3. 📝 Implement comprehensive error handling');
    console.log('   4. 🧪 Add unit and integration tests');
    console.log('   5. 📊 Add API response time monitoring');
    
    console.log('\n🏦 LOAN APPLICATION SPECIFIC:');
    console.log('   1. 🔄 Implement loan workflow state management');
    console.log('   2. 📋 Add loan application validation rules');
    console.log('   3. 🔐 Implement maker-checker approval process');
    console.log('   4. 📊 Add loan performance analytics');
    console.log('   5. 🔔 Implement notification system for loan status');
    
    console.log('\n🚨 CRITICAL ISSUES TO ADDRESS:');
    if (missingIndexes.rows.length > 0) {
      console.log('   ❌ Missing foreign key indexes (performance impact)');
    }
    console.log('   ⚠️ Need to verify data consistency across loan tables');
    console.log('   ⚠️ Implement proper transaction handling for loan operations');
    console.log('   ⚠️ Add comprehensive logging for audit trails');
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the investigation
investigateBackendArchitecture();