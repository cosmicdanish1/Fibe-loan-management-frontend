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

async function analyzeBackendArchitecture() {
  console.log('🔍 BACKEND ARCHITECTURE ANALYSIS');
  console.log('=' .repeat(70));
  
  try {
    const client = await pool.connect();
    
    // 1. Database Tables Analysis
    console.log('1. 📊 DATABASE TABLES ANALYSIS');
    console.log('-' .repeat(40));
    
    const tables = await client.query(`
      SELECT 
        t.table_name,
        pg_size_pretty(pg_total_relation_size(t.table_name)) as size
      FROM information_schema.tables t
      WHERE t.table_schema = 'public'
      ORDER BY pg_total_relation_size(t.table_name) DESC
    `);
    
    console.log('📋 Tables by size:');
    tables.rows.slice(0, 15).forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.table_name}: ${table.size}`);
    });
    
    // 2. Loan-related Tables
    console.log('\n2. 🏦 LOAN-RELATED TABLES');
    console.log('-' .repeat(40));
    
    const loanTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%loan%' OR table_name LIKE '%credit%' OR table_name LIKE '%debit%')
      ORDER BY table_name
    `);
    
    console.log('📋 Loan-related tables:');
    for (const table of loanTables.rows) {
      try {
        const count = await client.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
        console.log(`   • ${table.table_name}: ${count.rows[0].count} records`);
      } catch (error) {
        console.log(`   • ${table.table_name}: Error (${error.message.substring(0, 50)})`);
      }
    }
    
    // 3. Key Tables Analysis
    console.log('\n3. 📊 KEY TABLES ANALYSIS');
    console.log('-' .repeat(40));
    
    const keyTables = ['member_master', 'ledger', 'headmaster', 'loan_master', 'loan_application'];
    
    for (const tableName of keyTables) {
      try {
        const exists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [tableName]);
        
        if (exists.rows[0].exists) {
          const count = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
          const columns = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = $1 AND table_schema = 'public'
            ORDER BY ordinal_position
          `, [tableName]);
          
          console.log(`\n   📊 ${tableName.toUpperCase()}:`);
          console.log(`      Records: ${count.rows[0].count}`);
          console.log(`      Columns: ${columns.rows.length}`);
          
          // Show key columns
          const keyColumns = columns.rows.slice(0, 8);
          keyColumns.forEach(col => {
            const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(required)';
            console.log(`        • ${col.column_name}: ${col.data_type} ${nullable}`);
          });
          if (columns.rows.length > 8) {
            console.log(`        ... and ${columns.rows.length - 8} more columns`);
          }
        } else {
          console.log(`   ❌ ${tableName}: Table not found`);
        }
      } catch (error) {
        console.log(`   ❌ ${tableName}: Error (${error.message})`);
      }
    }
    
    // 4. Index Analysis
    console.log('\n4. 🔍 INDEX ANALYSIS');
    console.log('-' .repeat(40));
    
    const indexes = await client.query(`
      SELECT 
        t.relname as table_name,
        i.relname as index_name,
        array_to_string(array_agg(a.attname), ', ') as columns
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relkind = 'r'
      AND t.relname IN ('member_master', 'ledger', 'loan_master', 'loan_application')
      GROUP BY t.relname, i.relname
      ORDER BY t.relname, i.relname
    `);
    
    console.log('📋 Indexes on key tables:');
    indexes.rows.forEach(idx => {
      console.log(`   ${idx.table_name}.${idx.index_name}: (${idx.columns})`);
    });
    
    client.release();
    
    // 5. Backend Code Structure Analysis
    console.log('\n5. 🏗️ BACKEND CODE STRUCTURE');
    console.log('-' .repeat(40));
    
    const backendPath = 'backend/src';
    if (fs.existsSync(backendPath)) {
      // Check modules
      const modulesPath = path.join(backendPath, 'modules');
      if (fs.existsSync(modulesPath)) {
        const modules = fs.readdirSync(modulesPath);
        console.log(`📋 Backend modules (${modules.length}):`);
        
        modules.forEach(module => {
          const modulePath = path.join(modulesPath, module);
          if (fs.statSync(modulePath).isDirectory()) {
            const files = fs.readdirSync(modulePath);
            
            // Check for standard NestJS patterns
            const hasController = files.some(f => f.includes('controller'));
            const hasService = files.some(f => f.includes('service'));
            const hasEntity = files.some(f => f.includes('entity') || f.includes('entities'));
            const hasDto = files.some(f => f.includes('dto'));
            const hasModule = files.some(f => f.includes('module'));
            
            const patterns = [];
            if (hasController) patterns.push('C');
            if (hasService) patterns.push('S');
            if (hasEntity) patterns.push('E');
            if (hasDto) patterns.push('D');
            if (hasModule) patterns.push('M');
            
            const status = patterns.length >= 4 ? '✅' : patterns.length >= 2 ? '⚠️' : '❌';
            console.log(`   ${status} ${module}: [${patterns.join('')}] ${files.length} files`);
          }
        });
      }
      
      // Check main application files
      console.log('\n📋 Main application files:');
      const mainFiles = ['main.ts', 'app.module.ts', 'app.controller.ts', 'app.service.ts'];
      mainFiles.forEach(file => {
        const filePath = path.join(backendPath, file);
        const exists = fs.existsSync(filePath) ? '✅' : '❌';
        console.log(`   ${exists} ${file}`);
      });
    }
    
    // 6. Loan Module Deep Dive
    console.log('\n6. 🏦 LOAN MODULE ANALYSIS');
    console.log('-' .repeat(40));
    
    const loanModulePath = 'backend/src/modules/loan';
    if (fs.existsSync(loanModulePath)) {
      console.log('✅ Loan module exists');
      
      const loanFiles = fs.readdirSync(loanModulePath, { recursive: true });
      console.log('📋 Loan module structure:');
      loanFiles.forEach(file => {
        if (typeof file === 'string') {
          console.log(`   📄 ${file}`);
        }
      });
      
      // Analyze loan service
      const loanServicePath = path.join(loanModulePath, 'loan.service.ts');
      if (fs.existsSync(loanServicePath)) {
        const serviceContent = fs.readFileSync(loanServicePath, 'utf8');
        const lines = serviceContent.split('\n').length;
        const methods = (serviceContent.match(/async \w+\(/g) || []).length;
        const queries = (serviceContent.match(/query\(/g) || []).length;
        
        console.log('\n📊 Loan Service Analysis:');
        console.log(`   Lines of code: ${lines}`);
        console.log(`   Methods: ${methods}`);
        console.log(`   Database queries: ${queries}`);
        
        // Check for common patterns
        const hasValidation = serviceContent.includes('validate') || serviceContent.includes('ValidationPipe');
        const hasErrorHandling = serviceContent.includes('try') && serviceContent.includes('catch');
        const hasTransactions = serviceContent.includes('transaction') || serviceContent.includes('queryRunner');
        const hasLogging = serviceContent.includes('logger') || serviceContent.includes('console.log');
        
        console.log('\n📋 Code Quality Indicators:');
        console.log(`   ${hasValidation ? '✅' : '❌'} Input validation`);
        console.log(`   ${hasErrorHandling ? '✅' : '❌'} Error handling`);
        console.log(`   ${hasTransactions ? '✅' : '❌'} Transaction support`);
        console.log(`   ${hasLogging ? '✅' : '❌'} Logging`);
      }
    } else {
      console.log('❌ Loan module not found');
    }
    
    // 7. Performance Analysis
    console.log('\n7. ⚡ PERFORMANCE CONSIDERATIONS');
    console.log('-' .repeat(40));
    
    // Check for common performance issues
    const performanceChecks = [
      {
        name: 'Database Connection Pooling',
        check: fs.existsSync('backend/src/database') || fs.existsSync('backend/src/config'),
        recommendation: 'Configure connection pooling in database config'
      },
      {
        name: 'Caching Implementation',
        check: fs.existsSync('backend/src/cache') || 
               (fs.existsSync('backend/package.json') && 
                fs.readFileSync('backend/package.json', 'utf8').includes('cache')),
        recommendation: 'Implement Redis or in-memory caching for frequently accessed data'
      },
      {
        name: 'API Rate Limiting',
        check: fs.existsSync('backend/package.json') && 
               fs.readFileSync('backend/package.json', 'utf8').includes('throttler'),
        recommendation: 'Add rate limiting to prevent API abuse'
      },
      {
        name: 'Request Validation',
        check: fs.existsSync('backend/package.json') && 
               fs.readFileSync('backend/package.json', 'utf8').includes('class-validator'),
        recommendation: 'Use class-validator for input validation'
      }
    ];
    
    console.log('📋 Performance checklist:');
    performanceChecks.forEach(check => {
      const status = check.check ? '✅' : '❌';
      console.log(`   ${status} ${check.name}`);
      if (!check.check) {
        console.log(`      💡 ${check.recommendation}`);
      }
    });
    
    // 8. Generate Final Recommendations
    console.log('\n' + '=' .repeat(70));
    console.log('🎯 RECOMMENDATIONS SUMMARY');
    console.log('=' .repeat(70));
    
    console.log('\n🚀 IMMEDIATE IMPROVEMENTS (High Priority):');
    console.log('   1. 🔍 Add database indexes on frequently queried columns');
    console.log('   2. 📊 Implement pagination for large data sets');
    console.log('   3. 🔒 Add comprehensive input validation');
    console.log('   4. 📝 Implement proper error handling and logging');
    console.log('   5. 🧪 Add unit tests for critical loan operations');
    
    console.log('\n⚡ PERFORMANCE OPTIMIZATIONS (Medium Priority):');
    console.log('   1. 🚀 Implement Redis caching for reports');
    console.log('   2. 📈 Add database query optimization');
    console.log('   3. 🔄 Implement connection pooling optimization');
    console.log('   4. 📊 Add API response compression');
    console.log('   5. 🎯 Implement lazy loading for complex queries');
    
    console.log('\n🏗️ ARCHITECTURE ENHANCEMENTS (Long Term):');
    console.log('   1. 📦 Standardize all modules to follow NestJS patterns');
    console.log('   2. 🔐 Implement comprehensive security middleware');
    console.log('   3. 📊 Add monitoring and analytics');
    console.log('   4. 🔔 Implement event-driven architecture for notifications');
    console.log('   5. 📱 Add API versioning strategy');
    
    console.log('\n🏦 LOAN APPLICATION SPECIFIC:');
    console.log('   1. 🔄 Implement loan state machine for workflow management');
    console.log('   2. 📋 Add loan eligibility calculation engine');
    console.log('   3. 🔐 Implement maker-checker approval workflow');
    console.log('   4. 📊 Add loan performance analytics and reporting');
    console.log('   5. 🔔 Implement automated notifications for loan status changes');
    
    console.log('\n⚠️ CRITICAL ISSUES TO ADDRESS:');
    console.log('   • Ensure data consistency across all loan-related operations');
    console.log('   • Implement proper transaction handling for financial operations');
    console.log('   • Add comprehensive audit logging for compliance');
    console.log('   • Implement backup and disaster recovery procedures');
    console.log('   • Add security measures for sensitive financial data');
    
    console.log('\n📋 NEXT STEPS:');
    console.log('   1. Review and approve recommended improvements');
    console.log('   2. Prioritize implementation based on business impact');
    console.log('   3. Create implementation timeline');
    console.log('   4. Set up monitoring and testing procedures');
    console.log('   5. Plan for gradual rollout to avoid breaking existing functionality');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the analysis
analyzeBackendArchitecture();