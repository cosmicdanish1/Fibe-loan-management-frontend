const axios = require('axios');

async function findBackend() {
  console.log('🔍 Searching for running backend...\n');
  
  // Common ports to check
  const ports = [3000, 3001, 5000, 8000, 8080, 4000, 9000];
  
  // Common API paths to test
  const apiPaths = [
    '/api/v1/health',
    '/api/health', 
    '/health',
    '/api/v1/members/lookup',
    '/api/members/lookup',
    '/members/lookup',
    '/api/v1/report/account-closing',
    '/api/report/account-closing',
    '/report/account-closing'
  ];
  
  for (const port of ports) {
    console.log(`🔍 Checking port ${port}...`);
    
    for (const path of apiPaths) {
      try {
        const url = `http://localhost:${port}${path}`;
        const response = await axios.get(url, { 
          timeout: 1000,
          params: path.includes('members') ? { search: 'test' } : 
                 path.includes('account-closing') ? { month: 12, year: 2024 } : {}
        });
        
        console.log(`✅ FOUND BACKEND!`);
        console.log(`   Port: ${port}`);
        console.log(`   Path: ${path}`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
        
        // Test a few more endpoints to confirm
        console.log(`\n🧪 Testing more endpoints on port ${port}...`);
        
        const testEndpoints = [
          '/api/v1/members/lookup',
          '/api/v1/report/account-closing',
          '/api/v1/report/deposit-maturity',
          '/api/v1/report/fd-certificate'
        ];
        
        for (const endpoint of testEndpoints) {
          try {
            const testUrl = `http://localhost:${port}${endpoint}`;
            const testParams = endpoint.includes('members') ? { search: 'test' } :
                             endpoint.includes('fd-certificate') ? { memberNo: '1001' } :
                             { month: 12, year: 2024 };
            
            const testResponse = await axios.get(testUrl, { 
              timeout: 2000,
              params: testParams
            });
            console.log(`   ✅ ${endpoint} - Status: ${testResponse.status}`);
          } catch (error) {
            console.log(`   ❌ ${endpoint} - Error: ${error.response?.status || error.message}`);
          }
        }
        
        return { port, basePath: path.replace(/\/[^\/]*$/, '') };
        
      } catch (error) {
        // Silently continue to next path/port
      }
    }
  }
  
  console.log('❌ No backend found on common ports');
  console.log('\n💡 Suggestions:');
  console.log('1. Make sure the backend is running');
  console.log('2. Check if there\'s a port conflict (something else using port 3000)');
  console.log('3. Try starting the backend on a different port');
  console.log('4. Check the backend logs for startup errors');
  
  return null;
}

findBackend().then(result => {
  if (result) {
    console.log(`\n🎉 Backend found at http://localhost:${result.port}${result.basePath}`);
    console.log(`\nUpdate your test scripts to use:`);
    console.log(`const BASE_URL = 'http://localhost:${result.port}';`);
  }
});