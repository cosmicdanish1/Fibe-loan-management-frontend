const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection configuration for main database
const mainPool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres', // Connect to default postgres database first
  password: 'Test@1212',
  port: 5432,
});

async function setupAnalyticsDatabase() {
  console.log('🚀 ANALYTICS DATABASE SETUP - PHASE 1');
  console.log('=' .repeat(60));

  try {
    // Step 1: Check if analytics database exists
    console.log('\n📊 Step 1: Checking if analytics database exists...');
    
    const dbCheckResult = await mainPool.query(`
      SELECT 1 FROM pg_database WHERE datname = 'EMP_Analytics_DB'
    `);

    if (dbCheckResult.rows.length > 0) {
      console.log('✅ Analytics database already exists');
    } else {
      console.log('📊 Creating analytics database...');
      
      // Create the analytics database
      await mainPool.query('CREATE DATABASE "EMP_Analytics_DB"');
      console.log('✅ Analytics database created successfully');
    }

    // Step 2: Connect to analytics database and run setup script
    console.log('\n📊 Step 2: Setting up analytics database schema...');
    
    const analyticsPool = new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'EMP_Analytics_DB',
      password: 'Test@1212',
      port: 5432,
    });

    // Read and execute the analytics database setup script
    const setupScriptPath = path.join(__dirname, 'backend', 'database', 'analytics', 'create-analytics-database.sql');
    
    if (fs.existsSync(setupScriptPath)) {
      const setupScript = fs.readFileSync(setupScriptPath, 'utf8');
      
      // Split script into individual statements and execute them
      const statements = setupScript
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('\\c'));

      console.log(`📊 Executing ${statements.length} SQL statements...`);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.trim()) {
          try {
            await analyticsPool.query(statement);
            console.log(`   ✅ Statement ${i + 1}/${statements.length} executed`);
          } catch (error) {
            if (error.message.includes('already exists')) {
              console.log(`   ⚠️  Statement ${i + 1}/${statements.length} skipped (already exists)`);
            } else {
              console.log(`   ❌ Statement ${i + 1}/${statements.length} failed:`, error.message);
            }
          }
        }
      }
    } else {
      console.log('⚠️  Setup script not found, creating basic tables...');
      
      // Create basic tables if script not found
      await createBasicTables(analyticsPool);
    }

    // Step 3: Verify table creation
    console.log('\n📊 Step 3: Verifying analytics database setup...');
    
    const tablesResult = await analyticsPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('✅ Analytics database tables created:');
    tablesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });

    // Step 4: Check configuration
    console.log('\n📊 Step 4: Checking analytics configuration...');
    
    const configResult = await analyticsPool.query(`
      SELECT config_key, config_value, description 
      FROM analytics_config 
      ORDER BY config_key
    `);

    console.log('✅ Analytics configuration loaded:');
    configResult.rows.forEach((config, index) => {
      console.log(`   ${index + 1}. ${config.config_key}: ${config.config_value}`);
      console.log(`      ${config.description}`);
    });

    // Step 5: Test basic operations
    console.log('\n📊 Step 5: Testing basic analytics operations...');
    
    // Test session tracking
    const testSessionId = `test-session-${Date.now()}`;
    await analyticsPool.query(`
      INSERT INTO analytics_user_sessions (session_id, username, device_type, app_version)
      VALUES ($1, 'test-user', 'desktop', '1.0.0')
    `, [testSessionId]);

    // Test error logging
    const testErrorId = `test-error-${Date.now()}`;
    await analyticsPool.query(`
      INSERT INTO analytics_error_logs (session_id, error_id, error_type, severity_level, error_message)
      VALUES ($1, $2, 'test', 'low', 'Test error for setup verification')
    `, [testSessionId, testErrorId]);

    // Verify test data
    const sessionCount = await analyticsPool.query('SELECT COUNT(*) FROM analytics_user_sessions');
    const errorCount = await analyticsPool.query('SELECT COUNT(*) FROM analytics_error_logs');

    console.log(`✅ Test operations completed:`);
    console.log(`   - Total sessions: ${sessionCount.rows[0].count}`);
    console.log(`   - Total errors: ${errorCount.rows[0].count}`);

    // Clean up test data
    await analyticsPool.query('DELETE FROM analytics_error_logs WHERE error_id = $1', [testErrorId]);
    await analyticsPool.query('DELETE FROM analytics_user_sessions WHERE session_id = $1', [testSessionId]);

    console.log('✅ Test data cleaned up');

    // Close connections
    await analyticsPool.end();
    await mainPool.end();

    console.log('\n🎉 ANALYTICS DATABASE SETUP COMPLETED SUCCESSFULLY!');
    console.log('📊 Analytics system is ready for Phase 1 testing');
    console.log('\nNext steps:');
    console.log('1. Update backend database configuration to include analytics connection');
    console.log('2. Test analytics API endpoints');
    console.log('3. Implement frontend analytics settings component');

  } catch (error) {
    console.error('❌ Analytics database setup failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

async function createBasicTables(pool) {
  console.log('📊 Creating basic analytics tables...');

  const tables = [
    {
      name: 'analytics_user_sessions',
      sql: `
        CREATE TABLE IF NOT EXISTS analytics_user_sessions (
          id BIGSERIAL PRIMARY KEY,
          session_id VARCHAR(255) UNIQUE NOT NULL,
          user_id INTEGER,
          username VARCHAR(100),
          login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          logout_time TIMESTAMP,
          session_duration_minutes INTEGER,
          ip_address INET,
          user_agent TEXT,
          device_type VARCHAR(50),
          browser_name VARCHAR(100),
          browser_version VARCHAR(50),
          os_name VARCHAR(100),
          os_version VARCHAR(50),
          screen_resolution VARCHAR(20),
          timezone VARCHAR(50),
          app_version VARCHAR(20),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    {
      name: 'analytics_error_logs',
      sql: `
        CREATE TABLE IF NOT EXISTS analytics_error_logs (
          id BIGSERIAL PRIMARY KEY,
          session_id VARCHAR(255) NOT NULL,
          error_id VARCHAR(255) UNIQUE,
          error_type VARCHAR(50),
          severity_level VARCHAR(20),
          error_message TEXT NOT NULL,
          error_code VARCHAR(50),
          stack_trace TEXT,
          component_name VARCHAR(200),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          resolved_status BOOLEAN DEFAULT false,
          occurrence_count INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    {
      name: 'analytics_config',
      sql: `
        CREATE TABLE IF NOT EXISTS analytics_config (
          id SERIAL PRIMARY KEY,
          config_key VARCHAR(100) UNIQUE NOT NULL,
          config_value TEXT,
          config_type VARCHAR(20),
          description TEXT,
          is_user_configurable BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    }
  ];

  for (const table of tables) {
    try {
      await pool.query(table.sql);
      console.log(`   ✅ Table ${table.name} created`);
    } catch (error) {
      console.log(`   ❌ Failed to create table ${table.name}:`, error.message);
    }
  }

  // Insert default configuration
  const defaultConfigs = [
    ['analytics_enabled', 'false', 'boolean', 'Enable/disable analytics tracking'],
    ['tracking_level', 'standard', 'string', 'Tracking level: minimal, standard, detailed, debug'],
    ['data_retention_days', '90', 'integer', 'Number of days to retain analytics data'],
    ['auto_cleanup_enabled', 'true', 'boolean', 'Enable automatic data cleanup']
  ];

  for (const config of defaultConfigs) {
    try {
      await pool.query(`
        INSERT INTO analytics_config (config_key, config_value, config_type, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (config_key) DO NOTHING
      `, config);
    } catch (error) {
      console.log(`   ⚠️  Config ${config[0]} already exists or failed to insert`);
    }
  }

  console.log('✅ Basic analytics tables created');
}

// Run the setup
if (require.main === module) {
  setupAnalyticsDatabase();
}

module.exports = { setupAnalyticsDatabase };