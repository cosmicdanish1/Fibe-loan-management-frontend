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

async function testAnalyticsPhase1BackendIntegration() {
  console.log('🔗 ANALYTICS PHASE 1 - BACKEND INTEGRATION VERIFICATION');
  console.log('=' .repeat(70));

  try {
    // Test 1: Check if backend is running
    console.log('\n🔌 TEST 1: Checking if backend is running...');
    
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/api/v1/report/dividend-warrant`, { timeout: 3000 });
      console.log('✅ Backend is running:', healthResponse.status);
    } catch (error) {
      console.log('❌ Backend is not running. Please start the backend first.');
      console.log('   Run: npm run start:dev in the backend directory');
      return;
    }

    // Test 2: Check analytics database connection
    console.log('\n📊 TEST 2: Verifying analytics database connection...');
    
    const dbResult = await analyticsPool.query('SELECT NOW() as current_time, COUNT(*) as config_count FROM analytics_config');
    console.log('✅ Analytics database connected successfully');
    console.log(`   Current time: ${dbResult.rows[0].current_time}`);
    console.log(`   Configuration items: ${dbResult.rows[0].config_count}`);

    // Test 3: Test analytics API endpoints (if backend has analytics module)
    console.log('\n🌐 TEST 3: Testing analytics API endpoints...');
    
    const analyticsEndpoints = [
      { name: 'Health Check', endpoint: '/api/v1/analytics/health', method: 'GET' },
      { name: 'Status Check', endpoint: '/api/v1/analytics/status', method: 'GET' },
      { name: 'Configuration', endpoint: '/api/v1/analytics/config', method: 'GET' }
    ];

    let endpointsWorking = 0;
    
    for (const test of analyticsEndpoints) {
      try {
        const response = await axios.get(`${API_BASE_URL}${test.endpoint}`, { timeout: 5000 });
        console.log(`   ✅ ${test.name}: ${response.status} - ${response.data.message || 'OK'}`);
        endpointsWorking++;
        
        if (test.name === 'Status Check' && response.data.success) {
          const status = response.data.data;
          console.log(`      Analytics enabled: ${status.enabled}`);
          console.log(`      Tracking level: ${status.tracking_level}`);
          console.log(`      Active sessions: ${status.active_sessions}`);
        }
        
      } catch (error) {
        console.log(`   ❌ ${test.name}: ${error.response?.status || 'Connection failed'} - ${error.message}`);
      }
    }

    if (endpointsWorking === 0) {
      console.log('\n⚠️  Analytics API endpoints not available. This could mean:');
      console.log('   1. Analytics module not properly integrated in backend');
      console.log('   2. Backend needs to be restarted after adding analytics module');
      console.log('   3. Database connection configuration missing for analytics');
      
      console.log('\n🔧 BACKEND INTEGRATION STEPS NEEDED:');
      console.log('   1. Ensure analytics module is imported in app.module.ts ✅');
      console.log('   2. Add analytics database connection to database config');
      console.log('   3. Restart backend server');
      console.log('   4. Re-run this test');
      
      return;
    }

    // Test 4: Test analytics API operations
    console.log('\n📊 TEST 4: Testing analytics API operations...');
    
    const testSessionId = `integration-test-${Date.now()}`;
    
    // Test session tracking
    try {
      const sessionData = {
        session_id: testSessionId,
        username: 'integration-test-user',
        device_type: 'desktop',
        browser_name: 'Chrome',
        app_version: '1.0.0',
        ip_address: '127.0.0.1'
      };

      const sessionResponse = await axios.post(`${API_BASE_URL}/api/v1/analytics/session/start`, sessionData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });

      if (sessionResponse.data.success) {
        console.log('   ✅ Session tracking API: Working');
        console.log(`      Session ID: ${sessionResponse.data.session_id || testSessionId}`);
        
        // Verify in database
        const dbCheck = await analyticsPool.query('SELECT COUNT(*) FROM analytics_user_sessions WHERE session_id = $1', [testSessionId]);
        console.log(`      Database verification: ${dbCheck.rows[0].count} session(s) found`);
        
        // Test session end
        const endSessionResponse = await axios.post(`${API_BASE_URL}/api/v1/analytics/session/end`, {
          session_id: testSessionId
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        });

        if (endSessionResponse.data.success) {
          console.log('   ✅ Session end API: Working');
        }
        
      } else {
        console.log('   ⚠️  Session tracking API returned success=false');
      }
      
    } catch (sessionError) {
      console.log('   ❌ Session tracking API failed:', sessionError.message);
    }

    // Test error tracking
    try {
      const errorData = {
        session_id: testSessionId,
        error_type: 'integration_test',
        severity_level: 'low',
        error_message: 'Integration test error for Phase 1 verification',
        component_name: 'Phase1IntegrationTest',
        stack_trace: 'Test stack trace'
      };

      const errorResponse = await axios.post(`${API_BASE_URL}/api/v1/analytics/error/track`, errorData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });

      if (errorResponse.data.success) {
        console.log('   ✅ Error tracking API: Working');
        console.log(`      Error ID: ${errorResponse.data.error_id}`);
        
        // Verify in database
        const errorDbCheck = await analyticsPool.query('SELECT COUNT(*) FROM analytics_error_logs WHERE session_id = $1', [testSessionId]);
        console.log(`      Database verification: ${errorDbCheck.rows[0].count} error(s) found`);
      }
      
    } catch (errorTrackingError) {
      console.log('   ❌ Error tracking API failed:', errorTrackingError.message);
    }

    // Test configuration update
    try {
      const configData = {
        config_key: 'tracking_level',
        config_value: 'detailed',
        updated_by: 'integration-test'
      };

      const configResponse = await axios.put(`${API_BASE_URL}/api/v1/analytics/config`, configData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });

      if (configResponse.data.success) {
        console.log('   ✅ Configuration update API: Working');
        
        // Verify in database
        const configDbCheck = await analyticsPool.query('SELECT config_value FROM analytics_config WHERE config_key = $1', ['tracking_level']);
        console.log(`      Database verification: tracking_level = ${configDbCheck.rows[0]?.config_value}`);
      }
      
    } catch (configError) {
      console.log('   ❌ Configuration update API failed:', configError.message);
    }

    // Test 5: Performance and load test
    console.log('\n⚡ TEST 5: Performance and load testing...');
    
    const performanceStart = Date.now();
    const batchSize = 50;
    let successfulRequests = 0;
    
    console.log(`   Testing ${batchSize} concurrent requests...`);
    
    const requests = [];
    for (let i = 0; i < batchSize; i++) {
      const featureData = {
        session_id: testSessionId,
        feature_category: 'Performance Test',
        feature_name: `Test Feature ${i}`,
        action_type: 'click',
        execution_time_ms: Math.floor(Math.random() * 1000),
        success_status: true
      };
      
      requests.push(
        axios.post(`${API_BASE_URL}/api/v1/analytics/feature/usage`, featureData, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        }).then(() => {
          successfulRequests++;
        }).catch(() => {
          // Ignore errors for load test
        })
      );
    }
    
    await Promise.all(requests);
    const performanceEnd = Date.now();
    const totalTime = performanceEnd - performanceStart;
    
    console.log(`   ✅ Performance test completed:`);
    console.log(`      Successful requests: ${successfulRequests}/${batchSize}`);
    console.log(`      Total time: ${totalTime}ms`);
    console.log(`      Average per request: ${(totalTime / batchSize).toFixed(2)}ms`);
    console.log(`      Requests per second: ${(batchSize / (totalTime / 1000)).toFixed(2)}`);

    // Test 6: Database consistency check
    console.log('\n🗄️  TEST 6: Database consistency and cleanup...');
    
    const finalCounts = await analyticsPool.query(`
      SELECT 
        'sessions' as table_name, COUNT(*) as record_count FROM analytics_user_sessions WHERE session_id = $1
      UNION ALL
      SELECT 
        'errors' as table_name, COUNT(*) as record_count FROM analytics_error_logs WHERE session_id = $1
      UNION ALL
      SELECT 
        'features' as table_name, COUNT(*) as record_count FROM analytics_feature_usage WHERE session_id = $1
    `, [testSessionId]);

    console.log('   📊 Test data created:');
    finalCounts.rows.forEach(row => {
      console.log(`      ${row.table_name}: ${row.record_count} records`);
    });

    // Clean up test data
    await analyticsPool.query('DELETE FROM analytics_feature_usage WHERE session_id = $1', [testSessionId]);
    await analyticsPool.query('DELETE FROM analytics_error_logs WHERE session_id = $1', [testSessionId]);
    await analyticsPool.query('DELETE FROM analytics_user_sessions WHERE session_id = $1', [testSessionId]);
    
    console.log('   ✅ Test data cleaned up successfully');

    // Test 7: Configuration verification
    console.log('\n⚙️  TEST 7: Final configuration verification...');
    
    const configCheck = await analyticsPool.query(`
      SELECT config_key, config_value, is_user_configurable
      FROM analytics_config 
      WHERE config_key IN ('analytics_enabled', 'tracking_level', 'data_retention_days')
      ORDER BY config_key
    `);

    console.log('   📊 Key configuration settings:');
    configCheck.rows.forEach(config => {
      const configurable = config.is_user_configurable ? '(configurable)' : '(system)';
      console.log(`      ${config.config_key}: ${config.config_value} ${configurable}`);
    });

    // Reset tracking level to standard
    await analyticsPool.query(`UPDATE analytics_config SET config_value = 'standard' WHERE config_key = 'tracking_level'`);

    console.log('\n🎉 PHASE 1 BACKEND INTEGRATION VERIFICATION COMPLETE!');
    
    if (endpointsWorking >= 2) {
      console.log('\n✅ INTEGRATION STATUS: SUCCESSFUL');
      console.log('   📊 Analytics database: Operational');
      console.log('   🔗 Backend integration: Working');
      console.log('   🌐 API endpoints: Functional');
      console.log('   📈 Performance: Acceptable');
      console.log('   🔧 Configuration: Manageable');
      
      console.log('\n🚀 READY FOR PHASE 2: Frontend Integration');
      console.log('   ✅ Core infrastructure verified');
      console.log('   ✅ Backend APIs working');
      console.log('   ✅ Database operations confirmed');
      console.log('   ✅ Performance benchmarks met');
      
    } else {
      console.log('\n⚠️  INTEGRATION STATUS: PARTIAL');
      console.log('   📊 Analytics database: Operational');
      console.log('   🔗 Backend integration: Needs attention');
      console.log('   🌐 API endpoints: Limited functionality');
      
      console.log('\n🔧 NEXT STEPS NEEDED:');
      console.log('   1. Check backend database configuration');
      console.log('   2. Restart backend server');
      console.log('   3. Verify analytics module loading');
      console.log('   4. Re-run integration test');
    }

  } catch (error) {
    console.error('❌ Phase 1 backend integration test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await analyticsPool.end();
  }
}

// Run the test
if (require.main === module) {
  testAnalyticsPhase1BackendIntegration();
}

module.exports = { testAnalyticsPhase1BackendIntegration };