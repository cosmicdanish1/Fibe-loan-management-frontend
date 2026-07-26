const http = require('http');

console.log('🔍 Testing Frontend-Backend Connection...\n');

function testBackend() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log('✅ Backend is running!');
          console.log('📊 Response:', JSON.stringify(jsonData, null, 2));
          resolve(jsonData);
        } catch (e) {
          console.log('⚠️  Backend responded but with invalid JSON');
          console.log('Response:', data);
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ Backend Connection Failed!');
      console.error('Error:', err.message);
      console.log('\n💡 Make sure backend is running:');
      console.log('   cd backend');
      console.log('   npm run start:dev');
      reject(err);
    });

    req.on('timeout', () => {
      console.error('❌ Connection Timeout!');
      req.destroy();
      reject(new Error('Connection timeout'));
    });

    req.end();
  });
}

async function runTest() {
  console.log('Testing: http://localhost:3000/api/v1/health\n');
  
  try {
    await testBackend();
    console.log('\n✅ CONNECTION TEST PASSED');
    console.log('✅ Frontend can communicate with Backend');
    console.log('\n📝 Next Steps:');
    console.log('   1. Start Frontend: cd Frontend && npm run dev');
    console.log('   2. Open: http://localhost:5177');
    console.log('   3. Check browser console for any errors');
    process.exit(0);
  } catch (error) {
    console.log('\n❌ CONNECTION TEST FAILED');
    console.log('\n📝 Troubleshooting Steps:');
    console.log('   1. Check if PostgreSQL is running');
    console.log('   2. Verify backend/.env configuration');
    console.log('   3. Start backend: cd backend && npm run start:dev');
    console.log('   4. Run this test again');
    process.exit(1);
  }
}

runTest();
