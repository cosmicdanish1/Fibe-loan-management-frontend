const axios = require('axios');

async function testBackend() {
  console.log('Testing backend connection...');
  
  const ports = [3000, 3001, 5000, 8000];
  
  for (const port of ports) {
    console.log(`\nTesting port ${port}...`);
    
    try {
      // Test the health endpoint
      const healthResponse = await axios.get(`http://localhost:${port}/api/v1/health`, { timeout: 2000 });
      console.log(`✓ Port ${port} - Health endpoint response:`, healthResponse.status, healthResponse.data);
      
      // If health works, test a report endpoint
      try {
        const memberResponse = await axios.get(`http://localhost:${port}/api/v1/members/lookup`, { 
          params: { search: 'test' },
          timeout: 2000 
        });
        console.log(`✓ Port ${port} - Member lookup works:`, memberResponse.status);
        console.log(`✓ BACKEND IS RUNNING ON PORT ${port}`);
        return port;
      } catch (error) {
        console.log(`⚠ Port ${port} - Member lookup failed:`, error.message);
      }
      
    } catch (error) {
      console.log(`✗ Port ${port} - Health endpoint failed:`, error.message);
    }
  }
  
  console.log('\n❌ Backend not found on any common ports');
  return null;
}

testBackend();