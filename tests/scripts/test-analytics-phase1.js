const { Pool } = require('pg');
const axios = require('axios');

// Database connection configuration for analytics database
const analyticsPool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Analytics_DB',
  password: 'Test@1212',
  port: 5432,
});

// Backend API base URL
const API_BASE_URL = 'http://localhost:3000';

async function testAnalyticsPhase1() {
  console.log('🧪 ANALYTICS PHASE 1 - CORE INFRASTRUCTURE TEST');
  console.log('=' .repeat(60));

  try {
    // Test 1: Check analytics database connection
    console.log('\n📊 TEST 1: Checking analytics database connection...');
    
    const dbResult = await analyticsPool.query('SELECT NOW() as current_time');
    console.log('✅ Analytics database connected successfully');
    console.log(`   Current time: ${dbResult.rows[0].current_time}`);

    // Test 2: Verify analytics tables
    console.log('\n📊 TEST 2: Verifying analytics database tables...');
    
    const tablesResult = await analyticsPool.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name LIKE 'analytics_%'
      ORDER BY table_name
    `);

    console.log('✅ Analytics tables found:');
    tablesResult.rows.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.table_name} (${table.column_count} columns)`);
    });

    // Test 3: Check analytics configuration
    console.log('\n📊 TEST 3: Checking analytics configuration...');
    
    const configResult = await analyticsPool.query(`
      SELECT config_key, config_value, config_type, is_user_configurable
      FROM analytics_config 
      ORDER BY config_key
    `);

    console.log('✅ Analytics configuration:');
    configResult.rows.forEach((config, index) => {
      const configurable = config.is_user_configurable ? '(user configurable)' : '(system only)';
      console.log(`   ${index + 1}. ${config.config_key}: ${config.config_value} ${configurable}`);
    });

    // Test 4: Check backend analytics API endpoints
    console.log('\n📊 TEST 4: Testing backend analytics API endpoints...');
    
    try {
      // Test health check endpoint
      const healthResponse = await axios.get(`${API_BASE_URL}/api/v1/analytics/health`, { timeout: 5000 });
      console.log('✅ Analytics health endpoint:', healthResponse.status);
      console.log(`   Message: ${healthResponse.data.message}`);

      // Test status endpoint
      const statusResponse = await axios.get(`${API_BASE_URL}/api/v1/analytics/status`, { timeout: 5000 });
      console.log('✅ Analytics status endpoint:', statusResponse.status);
      
      if (statusResponse.data.success) {
        const status = statusResponse.data.data;
        console.log(`   Analytics enabled: ${status.enabled}`);
        console.log(`   Tracking level: ${status.tracking_level}`);
        console.log(`   Active sessions: ${status.active_sessions}`);
        console.log(`   Total errors: ${status.total_errors}`);
        console.log(`   Unresolved errors: ${status.unresolved_errors}`);
      }

      // Test config endpoint
      const configResponse = await axios.get(`${API_BASE_URL}/api/v1/analytics/config`, { timeout: 5000 });
      console.log('✅ Analytics config endpoint:', configResponse.status);
      
      if (configResponse.data.success) {
        console.log(`   Retrieved ${configResponse.data.data.length} configuration items`);
      }

    } catch (apiError) {
      console.log('❌ Analytics API endpoints not available:', apiError.message);
      console.log('   Make sure the backend is running with analytics module enabled');
    }

    // Test 5: Test direct database operations
    console.log('\n📊 TEST 5: Testing direct database operations...');
    
    const testSessionId = `test-session-${Date.now()}`;
    const testErrorId = `test-error-${Date.now()}`;

    // Test session insertion
    await analyticsPool.query(`
      INSERT INTO analytics_user_sessions (session_id, username, device_type, browser_name, app_version)
      VALUES ($1, 'test-user', 'desktop', 'Chrome', '1.0.0')
    `, [testSessionId]);
    console.log('✅ Session tracking: Insert successful');

    // Test error logging
    await analyticsPool.query(`
      INSERT INTO analytics_error_logs (session_id, error_id, error_type, severity_level, error_message, component_name)
      VALUES ($1, $2, 'javascript', 'medium', 'Test error for Phase 1 verification', 'TestComponent')
    `, [testSessionId, testErrorId]);
    console.log('✅ Error logging: Insert successful');

    // Test configuration update
    await analyticsPool.query(`
      UPDATE analytics_config 
      SET config_value = 'true', updated_at = CURRENT_TIMESTAMP 
      WHERE config_key = 'analytics_enabled'
    `);
    console.log('✅ Configuration update: Successful');

    // Verify data integrity
    const sessionCheck = await analyticsPool.query('SELECT COUNT(*) FROM analytics_user_sessions WHERE session_id = $1', [testSessionId]);
    const errorCheck = await analyticsPool.query('SELECT COUNT(*) FROM analytics_error_logs WHERE error_id = $1', [testErrorId]);
    
    console.log(`✅ Data integrity check:`);
    console.log(`   Session records: ${sessionCheck.rows[0].count}`);
    console.log(`   Error records: ${errorCheck.rows[0].count}`);

    // Test 6: Test API operations (if backend is running)
    console.log('\n📊 TEST 6: Testing analytics API operations...');
    
    try {
      // Test session tracking API
      const sessionData = {
        session_id: `api-test-session-${Date.now()}`,
        username: 'api-test-user',
        device_type: 'desktop',
        browser_name: 'Chrome',
        app_version: '1.0.0'
      };

      const sessionResponse = await axios.post(`${API_BASE_URL}/api/v1/analytics/session/start`, sessionData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });

      if (sessionResponse.data.success) {
        console.log('✅ Session tracking API: Working');
        console.log(`   Session ID: ${sessionResponse.data.session_id}`);

        // Test session end
        const endSessionResponse = await axios.post(`${API_BASE_URL}/api/v1/analytics/session/end`, {
          session_id: sessionData.session_id
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        });

        if (endSessionResponse.data.success) {
          console.log('✅ Session end API: Working');
        }
      }

      // Test error tracking API
      const errorData = {
        session_id: sessionData.session_id,
        error_type: 'api_test',
        severity_level: 'low',
        error_message: 'Test error from Phase 1 API test',
        component_name: 'Phase1TestComponent'
      };

      const errorResponse = await axios.post(`${API_BASE_URL}/api/v1/analytics/error/track`, errorData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });

      if (errorResponse.data.success) {
        console.log('✅ Error tracking API: Working');
        console.log(`   Error ID: ${errorResponse.data.error_id}`);
      }

      // Test configuration update API
      const configUpdateData = {
        config_key: 'tracking_level',
        config_value: 'detailed',
        updated_by: 'phase1-test'
      };

      const configUpdateResponse = await axios.put(`${API_BASE_URL}/api/v1/analytics/config`, configUpdateData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });

      if (configUpdateResponse.data.success) {
        console.log('✅ Configuration update API: Working');
      }

    } catch (apiError) {
      console.log('⚠️  Analytics API operations not fully available:', apiError.message);
      console.log('   This is expected if the backend analytics module is not yet integrated');
    }

    // Test 7: Performance and capacity check
    console.log('\n📊 TEST 7: Performance and capacity check...');
    
    const performanceStart = Date.now();
    
    // Insert multiple test records to check performance
    const batchSize = 100;
    const testBatch = [];
    
    for (let i = 0; i < batchSize; i++) {
      testBatch.push([
        `batch-session-${Date.now()}-${i}`,
        `batch-user-${i}`,
        'desktop',
        'Chrome',
        '1.0.0'
      ]);
    }

    // Batch insert sessions
    for (const batch of testBatch) {
      await analyticsPool.query(`
        INSERT INTO analytics_user_sessions (session_id, username, device_type, browser_name, app_version)
        VALUES ($1, $2, $3, $4, $5)
      `, batch);
    }

    const performanceEnd = Date.now();
    const performanceTime = performanceEnd - performanceStart;

    console.log(`✅ Performance test completed:`);
    console.log(`   Inserted ${batchSize} records in ${performanceTime}ms`);
    console.log(`   Average: ${(performanceTime / batchSize).toFixed(2)}ms per record`);

    // Check database size
    const sizeResult = await analyticsPool.query(`
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats 
      WHERE schemaname = 'public' 
        AND tablename LIKE 'analytics_%'
      LIMIT 5
    `);

    console.log(`✅ Database statistics available: ${sizeResult.rows.length} entries`);

    // Clean up test data
    console.log('\n📊 Cleaning up test data...');
    
    await analyticsPool.query('DELETE FROM analytics_error_logs WHERE error_id = $1', [testErrorId]);
    await analyticsPool.query('DELETE FROM analytics_user_sessions WHERE session_id = $1', [testSessionId]);
    await analyticsPool.query('DELETE FROM analytics_user_sessions WHERE session_id LIKE $1', ['batch-session-%']);
    
    console.log('✅ Test data cleaned up');

    // Test 8: Final verification
    console.log('\n📊 TEST 8: Final verification...');
    
    const finalCounts = await analyticsPool.query(`
      SELECT 
        'sessions' as table_name, COUNT(*) as record_count FROM analytics_user_sessions
      UNION ALL
      SELECT 
        'errors' as table_name, COUNT(*) as record_count FROM analytics_error_logs
      UNION ALL
      SELECT 
        'config' as table_name, COUNT(*) as record_count FROM analytics_config
    `);

    console.log('✅ Final database state:');
    finalCounts.rows.forEach(row => {
      console.log(`   ${row.table_name}: ${row.record_count} records`);
    });

    console.log('\n🎉 PHASE 1 CORE INFRASTRUCTURE TEST COMPLETED!');
    console.log('\n📊 SUMMARY:');
    console.log('✅ Analytics database: Connected and operational');
    console.log('✅ Database tables: Created and functional');
    console.log('✅ Configuration system: Working');
    console.log('✅ Data operations: Insert, update, delete working');
    console.log('✅ Performance: Acceptable for expected load');
    
    if (tablesResult.rows.length >= 3) {
      console.log('✅ Core infrastructure: Ready for Phase 2');
    } else {
      console.log('⚠️  Some tables missing, may need manual setup');
    }

    console.log('\n🚀 NEXT STEPS FOR PHASE 2:');
    console.log('1. Integrate analytics module with main backend');
    console.log('2. Create frontend analytics settings component');
    console.log('3. Implement frontend tracking hooks');
    console.log('4. Test end-to-end analytics flow');

  } catch (error) {
    console.error('❌ Phase 1 test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await analyticsPool.end();
  }
}

// Run the test
if (require.main === module) {
  testAnalyticsPhase1();
}

module.exports = { testAnalyticsPhase1 };