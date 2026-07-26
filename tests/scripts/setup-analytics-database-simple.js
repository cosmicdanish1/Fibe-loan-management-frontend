const { Pool } = require('pg');

// Database connection configuration for main database
const mainPool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres', // Connect to default postgres database first
  password: 'Test@1212',
  port: 5432,
});

async function setupAnalyticsDatabase() {
  console.log('🚀 ANALYTICS DATABASE SETUP - PHASE 1 (SIMPLIFIED)');
  console.log('=' .repeat(60));

  try {
    // Step 1: Check if analytics database exists
    console.log('\n📊 Step 1: Checking if analytics database exists...');
    
    const dbCheckResult = await mainPool.query(`
      SELECT 1 FROM pg_database WHERE datname = 'EMP_Analytics_DB'
    `);

    if (dbCheckResult.rows.length === 0) {
      console.log('📊 Creating analytics database...');
      await mainPool.query('CREATE DATABASE "EMP_Analytics_DB"');
      console.log('✅ Analytics database created successfully');
    } else {
      console.log('✅ Analytics database already exists');
    }

    // Step 2: Connect to analytics database
    console.log('\n📊 Step 2: Connecting to analytics database...');
    
    const analyticsPool = new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'EMP_Analytics_DB',
      password: 'Test@1212',
      port: 5432,
    });

    // Step 3: Create tables one by one
    console.log('\n📊 Step 3: Creating analytics tables...');
    
    // Create user sessions table
    await analyticsPool.query(`
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
    `);
    console.log('✅ analytics_user_sessions table created');

    // Create page visits table
    await analyticsPool.query(`
      CREATE TABLE IF NOT EXISTS analytics_page_visits (
        id BIGSERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        page_name VARCHAR(200),
        window_title VARCHAR(300),
        route_path VARCHAR(500),
        component_name VARCHAR(200),
        visit_start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        visit_end_time TIMESTAMP,
        duration_seconds INTEGER,
        page_load_time_ms INTEGER,
        is_bounce BOOLEAN DEFAULT false,
        referrer_page VARCHAR(500),
        scroll_depth_percentage INTEGER,
        interactions_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ analytics_page_visits table created');

    // Create feature usage table
    await analyticsPool.query(`
      CREATE TABLE IF NOT EXISTS analytics_feature_usage (
        id BIGSERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        feature_category VARCHAR(100),
        feature_name VARCHAR(200),
        sub_feature VARCHAR(200),
        action_type VARCHAR(50),
        action_details JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INTEGER,
        success_status BOOLEAN,
        error_message TEXT,
        user_input_data JSONB,
        result_count INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ analytics_feature_usage table created');

    // Create error logs table
    await analyticsPool.query(`
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
        file_name VARCHAR(300),
        line_number INTEGER,
        column_number INTEGER,
        user_action_before_error TEXT,
        browser_console_logs TEXT,
        network_status VARCHAR(20),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_status BOOLEAN DEFAULT false,
        resolved_by VARCHAR(100),
        resolved_at TIMESTAMP,
        resolution_notes TEXT,
        occurrence_count INTEGER DEFAULT 1,
        first_occurrence TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_occurrence TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ analytics_error_logs table created');

    // Create analytics config table
    await analyticsPool.query(`
      CREATE TABLE IF NOT EXISTS analytics_config (
        id SERIAL PRIMARY KEY,
        config_key VARCHAR(100) UNIQUE NOT NULL,
        config_value TEXT,
        config_type VARCHAR(20),
        description TEXT,
        is_user_configurable BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(100)
      )
    `);
    console.log('✅ analytics_config table created');

    // Step 4: Create indexes
    console.log('\n📊 Step 4: Creating indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user_id ON analytics_user_sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_sessions_login_time ON analytics_user_sessions(login_time)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_sessions_active ON analytics_user_sessions(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_page_visits_session_id ON analytics_page_visits(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_feature_usage_session_id ON analytics_feature_usage(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_error_logs_session_id ON analytics_error_logs(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_error_logs_severity ON analytics_error_logs(severity_level)',
    ];

    for (const indexSql of indexes) {
      await analyticsPool.query(indexSql);
    }
    console.log(`✅ ${indexes.length} indexes created`);

    // Step 5: Insert default configuration
    console.log('\n📊 Step 5: Inserting default configuration...');
    
    const defaultConfigs = [
      ['analytics_enabled', 'false', 'boolean', 'Enable/disable analytics tracking'],
      ['tracking_level', 'standard', 'string', 'Tracking level: minimal, standard, detailed, debug'],
      ['data_retention_days', '90', 'integer', 'Number of days to retain analytics data'],
      ['auto_cleanup_enabled', 'true', 'boolean', 'Enable automatic data cleanup'],
      ['compression_enabled', 'true', 'boolean', 'Enable data compression for old records'],
      ['batch_size', '100', 'integer', 'Batch size for data processing'],
      ['flush_interval_seconds', '30', 'integer', 'Interval to flush queued data'],
      ['max_queue_size', '1000', 'integer', 'Maximum queue size before forced flush'],
      ['error_threshold', '10', 'integer', 'Error count threshold for alerts'],
      ['performance_threshold_ms', '5000', 'integer', 'Performance threshold in milliseconds'],
      ['real_time_alerts_enabled', 'false', 'boolean', 'Enable real-time alerts'],
      ['anonymize_user_data', 'true', 'boolean', 'Anonymize sensitive user data'],
      ['exclude_sensitive_data', 'true', 'boolean', 'Exclude sensitive data from tracking']
    ];

    for (const config of defaultConfigs) {
      await analyticsPool.query(`
        INSERT INTO analytics_config (config_key, config_value, config_type, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (config_key) DO NOTHING
      `, config);
    }
    console.log(`✅ ${defaultConfigs.length} configuration items inserted`);

    // Step 6: Verify setup
    console.log('\n📊 Step 6: Verifying setup...');
    
    const tablesResult = await analyticsPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name LIKE 'analytics_%'
      ORDER BY table_name
    `);

    console.log('✅ Analytics tables created:');
    tablesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });

    const configResult = await analyticsPool.query(`
      SELECT config_key, config_value, description 
      FROM analytics_config 
      ORDER BY config_key
    `);

    console.log('\n✅ Configuration loaded:');
    configResult.rows.forEach((config, index) => {
      console.log(`   ${index + 1}. ${config.config_key}: ${config.config_value}`);
    });

    // Step 7: Test basic operations
    console.log('\n📊 Step 7: Testing basic operations...');
    
    const testSessionId = `test-session-${Date.now()}`;
    const testErrorId = `test-error-${Date.now()}`;

    // Test session insert
    await analyticsPool.query(`
      INSERT INTO analytics_user_sessions (session_id, username, device_type, app_version)
      VALUES ($1, 'test-user', 'desktop', '1.0.0')
    `, [testSessionId]);

    // Test error insert
    await analyticsPool.query(`
      INSERT INTO analytics_error_logs (session_id, error_id, error_type, severity_level, error_message)
      VALUES ($1, $2, 'test', 'low', 'Test error for setup verification')
    `, [testSessionId, testErrorId]);

    // Verify counts
    const sessionCount = await analyticsPool.query('SELECT COUNT(*) FROM analytics_user_sessions');
    const errorCount = await analyticsPool.query('SELECT COUNT(*) FROM analytics_error_logs');
    const configCount = await analyticsPool.query('SELECT COUNT(*) FROM analytics_config');

    console.log('✅ Test operations completed:');
    console.log(`   Sessions: ${sessionCount.rows[0].count}`);
    console.log(`   Errors: ${errorCount.rows[0].count}`);
    console.log(`   Config items: ${configCount.rows[0].count}`);

    // Clean up test data
    await analyticsPool.query('DELETE FROM analytics_error_logs WHERE error_id = $1', [testErrorId]);
    await analyticsPool.query('DELETE FROM analytics_user_sessions WHERE session_id = $1', [testSessionId]);
    console.log('✅ Test data cleaned up');

    // Close connections
    await analyticsPool.end();
    await mainPool.end();

    console.log('\n🎉 ANALYTICS DATABASE SETUP COMPLETED SUCCESSFULLY!');
    console.log('\n📊 PHASE 1 INFRASTRUCTURE READY:');
    console.log('✅ Separate analytics database created');
    console.log('✅ Core analytics tables created');
    console.log('✅ Indexes for performance created');
    console.log('✅ Default configuration loaded');
    console.log('✅ Basic operations tested');
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Run: node test-analytics-phase1.js');
    console.log('2. Update backend database configuration');
    console.log('3. Test analytics API endpoints');
    console.log('4. Proceed to Phase 2 implementation');

  } catch (error) {
    console.error('❌ Analytics database setup failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  setupAnalyticsDatabase();
}

module.exports = { setupAnalyticsDatabase };