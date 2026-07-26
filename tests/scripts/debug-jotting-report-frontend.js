const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function debugJottingReportFrontend() {
    console.log('🔍 DEBUGGING JOTTING REPORT FRONTEND ISSUE');
    console.log('=' .repeat(60));
    
    try {
        // Test 1: Check if backend is accessible from frontend perspective
        console.log('\n1. Testing Backend Accessibility...');
        
        // Test the exact endpoints the frontend is calling
        const endpoints = [
            '/jotting-report/head-masters',
            '/jotting-report/wings', 
            '/jotting-report/offices'
        ];
        
        for (const endpoint of endpoints) {
            try {
                console.log(`\nTesting: ${BASE_URL}${endpoint}`);
                const response = await axios.get(`${BASE_URL}${endpoint}`);
                
                console.log('✅ Response received');
                console.log('- Status:', response.status);
                console.log('- Content-Type:', response.headers['content-type']);
                console.log('- Data structure:', typeof response.data);
                console.log('- Has data property:', !!response.data?.data);
                console.log('- Data array length:', response.data?.data?.length || 0);
                
                if (response.data?.data && response.data.data.length > 0) {
                    console.log('- Sample data:', response.data.data[0]);
                } else {
                    console.log('❌ No data in response');
                }
                
            } catch (error) {
                console.log('❌ API call failed:', error.response?.status, error.response?.data || error.message);
            }
        }
        
        // Test 2: Check CORS headers
        console.log('\n2. Checking CORS Headers...');
        try {
            const response = await axios.get(`${BASE_URL}/jotting-report/head-masters`);
            console.log('CORS Headers:');
            console.log('- Access-Control-Allow-Origin:', response.headers['access-control-allow-origin']);
            console.log('- Access-Control-Allow-Methods:', response.headers['access-control-allow-methods']);
            console.log('- Access-Control-Allow-Headers:', response.headers['access-control-allow-headers']);
        } catch (error) {
            console.log('❌ CORS check failed:', error.message);
        }
        
        // Test 3: Simulate exact frontend API service call
        console.log('\n3. Simulating Frontend API Service Call...');
        
        // Check if the frontend's apiService is using the correct base URL
        console.log('Expected frontend API calls:');
        console.log('- apiService.get("/jotting-report/head-masters")');
        console.log('- This should resolve to:', `${BASE_URL}/jotting-report/head-masters`);
        
        // Test 4: Check if frontend is running
        console.log('\n4. Checking Frontend Status...');
        try {
            // Try to access frontend (usually runs on port 3000)
            const frontendResponse = await axios.get('http://localhost:3000', { timeout: 2000 });
            console.log('✅ Frontend is running on port 3000');
        } catch (error) {
            console.log('⚠️ Frontend might not be running on port 3000:', error.message);
        }
        
        // Test 5: Check network connectivity
        console.log('\n5. Network Connectivity Test...');
        try {
            const networkTest = await axios.get('http://localhost:3001/api/v1/jotting-report/head-masters', {
                timeout: 5000,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Network connectivity is working');
            console.log('✅ Backend is responding correctly');
        } catch (error) {
            console.log('❌ Network connectivity issue:', error.message);
        }
        
        // Test 6: Generate debugging instructions
        console.log('\n' + '=' .repeat(60));
        console.log('🔧 DEBUGGING INSTRUCTIONS FOR FRONTEND');
        console.log('=' .repeat(60));
        
        console.log('\n📋 Steps to debug in browser:');
        console.log('1. Open JottingReport in browser');
        console.log('2. Open Developer Tools (F12)');
        console.log('3. Go to Console tab');
        console.log('4. Look for these debug messages:');
        console.log('   - "[DEBUG] headsResponse:" - Should show API response');
        console.log('   - "[DEBUG] Processed heads: X records" - Should show processed data');
        console.log('   - Any error messages');
        
        console.log('\n📋 Steps to debug Network tab:');
        console.log('1. Go to Network tab in Developer Tools');
        console.log('2. Refresh the JottingReport page');
        console.log('3. Look for these API calls:');
        console.log('   - GET /api/v1/jotting-report/head-masters');
        console.log('   - GET /api/v1/jotting-report/wings');
        console.log('   - GET /api/v1/jotting-report/offices');
        console.log('4. Check if they return 200 OK with data');
        
        console.log('\n📋 Common Issues to Check:');
        console.log('1. Frontend not running - Start with "npm start" in Frontend folder');
        console.log('2. Backend not running - Check if port 3001 is accessible');
        console.log('3. API base URL wrong - Check apiService configuration');
        console.log('4. CORS issues - Check if backend allows frontend origin');
        console.log('5. Network issues - Check if localhost:3001 is accessible from browser');
        
        console.log('\n📋 Quick Fixes to Try:');
        console.log('1. Restart frontend: cd Frontend && npm start');
        console.log('2. Restart backend: cd backend && npm run start:dev');
        console.log('3. Clear browser cache and reload');
        console.log('4. Check if antivirus/firewall is blocking connections');
        
        console.log('\n🎯 Expected Working State:');
        console.log('- Backend running on http://localhost:3001');
        console.log('- Frontend running on http://localhost:3000');
        console.log('- API calls returning 200 OK with data');
        console.log('- Dropdowns populated with options');
        
    } catch (error) {
        console.error('❌ Debug test failed:', error.message);
    }
}

debugJottingReportFrontend();