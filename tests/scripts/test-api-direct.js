const axios = require('axios');

async function testDirectAPI() {
    try {
        console.log('Testing direct API call...');
        
        const response = await axios.get('http://localhost:3001/api/v1/jotting-report/head-masters');
        
        console.log('Status:', response.status);
        console.log('Headers:', response.headers);
        console.log('Data type:', typeof response.data);
        console.log('Data length:', response.data?.length);
        console.log('Raw data:', JSON.stringify(response.data, null, 2));
        
        if (response.data && response.data.length > 0) {
            console.log('First record:', response.data[0]);
        }
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testDirectAPI();