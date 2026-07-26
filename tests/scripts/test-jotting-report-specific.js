const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testSpecificJottingReport() {
    console.log('🧪 Testing JottingReport with specific parameters...');
    
    try {
        // Test 1: Get Head Masters
        console.log('\n1. Getting Head Masters...');
        const headResponse = await axios.get(`${BASE_URL}/jotting-report/head-masters`);
        console.log(`✅ Found ${headResponse.data.length} head codes`);
        
        if (headResponse.data.length > 0) {
            const firstHead = headResponse.data[0];
            console.log(`   First head: ${firstHead.code} - ${firstHead.headName}`);
            
            // Test 2: Get Wings
            console.log('\n2. Getting Wings...');
            const wingResponse = await axios.get(`${BASE_URL}/jotting-report/wings`);
            console.log(`✅ Found ${wingResponse.data.length} wings`);
            if (wingResponse.data.length > 0) {
                console.log(`   First wing: ${wingResponse.data[0]}`);
            }
            
            // Test 3: Get Offices
            console.log('\n3. Getting Offices...');
            const officeResponse = await axios.get(`${BASE_URL}/jotting-report/offices`);
            console.log(`✅ Found ${officeResponse.data.length} offices`);
            if (officeResponse.data.length > 0) {
                console.log(`   First office: ${officeResponse.data[0]}`);
            }
            
            // Test 4: Generate JottingReport with first head code
            console.log(`\n4. Generating JottingReport for head code: ${firstHead.code}...`);
            const jottingResponse = await axios.get(`${BASE_URL}/jotting-report`, {
                params: {
                    headCode: firstHead.code,
                    asOnDate: '2024-12-28',
                    sortBy: 'MBNO'
                }
            });
            
            console.log(`✅ JottingReport generated with ${jottingResponse.data.length} records`);
            
            if (jottingResponse.data.length > 0) {
                console.log('\n📊 Sample JottingReport records:');
                jottingResponse.data.slice(0, 5).forEach((record, index) => {
                    console.log(`   ${index + 1}. ${record.memberName} (${record.memberNo})`);
                    console.log(`      Wing: ${record.wing}, Office: ${record.office}`);
                    console.log(`      Balance: ₹${parseFloat(record.balance).toFixed(2)}`);
                });
                
                const totalBalance = jottingResponse.data.reduce((sum, record) => sum + parseFloat(record.balance), 0);
                console.log(`\n💰 Total Balance: ₹${totalBalance.toFixed(2)}`);
                console.log(`👥 Total Members: ${jottingResponse.data.length}`);
            } else {
                console.log('⚠️ No records found for this head code');
            }
            
            // Test 5: Try with a different head code that might have data
            if (headResponse.data.length > 1) {
                const secondHead = headResponse.data.find(h => h.code === 'L1004') || headResponse.data[1];
                console.log(`\n5. Testing with head code: ${secondHead.code}...`);
                
                const jottingResponse2 = await axios.get(`${BASE_URL}/jotting-report`, {
                    params: {
                        headCode: secondHead.code,
                        asOnDate: '2024-12-28',
                        sortBy: 'MBNO'
                    }
                });
                
                console.log(`✅ JottingReport for ${secondHead.code}: ${jottingResponse2.data.length} records`);
                
                if (jottingResponse2.data.length > 0) {
                    const totalBalance2 = jottingResponse2.data.reduce((sum, record) => sum + parseFloat(record.balance), 0);
                    console.log(`💰 Total Balance for ${secondHead.code}: ₹${totalBalance2.toFixed(2)}`);
                }
            }
            
        } else {
            console.log('❌ No head codes found');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testSpecificJottingReport();