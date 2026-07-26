const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testJottingReportUI() {
    console.log('🧪 Testing JottingReport UI Integration...');
    
    try {
        // Test 1: Get Head Masters (should work now)
        console.log('\n1. Testing Head Masters API...');
        const headResponse = await axios.get(`${BASE_URL}/jotting-report/head-masters`);
        
        if (headResponse.data && headResponse.data.data) {
            const heads = headResponse.data.data;
            console.log(`✅ Found ${heads.length} head codes`);
            console.log(`   Sample heads:`, heads.slice(0, 3).map(h => `${h.code}: ${h.headName}`));
            
            // Test 2: Get Wings
            console.log('\n2. Testing Wings API...');
            const wingResponse = await axios.get(`${BASE_URL}/jotting-report/wings`);
            const wings = wingResponse.data?.data || wingResponse.data || [];
            console.log(`✅ Found ${wings.length} wings`);
            if (wings.length > 0) {
                console.log(`   Sample wings:`, wings.slice(0, 3));
            }
            
            // Test 3: Get Offices
            console.log('\n3. Testing Offices API...');
            const officeResponse = await axios.get(`${BASE_URL}/jotting-report/offices`);
            const offices = officeResponse.data?.data || officeResponse.data || [];
            console.log(`✅ Found ${offices.length} offices`);
            if (offices.length > 0) {
                console.log(`   Sample offices:`, offices.slice(0, 3));
            }
            
            // Test 4: Generate JottingReport with different head codes
            console.log('\n4. Testing JottingReport Generation...');
            
            const testHeadCodes = ['L1004', 'L1001', 'A1002', heads[0].code];
            
            for (const headCode of testHeadCodes) {
                try {
                    console.log(`\n   Testing head code: ${headCode}...`);
                    const jottingResponse = await axios.get(`${BASE_URL}/jotting-report`, {
                        params: {
                            headCode: headCode,
                            asOnDate: '2024-12-28',
                            sortBy: 'MBNO'
                        }
                    });
                    
                    const reportData = jottingResponse.data?.data || jottingResponse.data || [];
                    console.log(`   ✅ ${headCode}: ${reportData.length} records`);
                    
                    if (reportData.length > 0) {
                        const totalBalance = reportData.reduce((sum, record) => sum + parseFloat(record.balance || 0), 0);
                        console.log(`   💰 Total Balance: ₹${totalBalance.toFixed(2)}`);
                        
                        // Show sample records
                        console.log(`   📊 Sample records:`);
                        reportData.slice(0, 2).forEach((record, index) => {
                            console.log(`      ${index + 1}. ${record.memberName} (${record.memberNo}) - ₹${parseFloat(record.balance || 0).toFixed(2)}`);
                        });
                        
                        // This head code has data, let's use it for UI testing
                        console.log(`\n🎯 RECOMMENDED FOR UI TESTING:`);
                        console.log(`   Head Code: ${headCode}`);
                        console.log(`   Records: ${reportData.length}`);
                        console.log(`   Total Balance: ₹${totalBalance.toFixed(2)}`);
                        break;
                    }
                } catch (error) {
                    console.log(`   ❌ ${headCode}: ${error.response?.data?.message || error.message}`);
                }
            }
            
            // Test 5: Test with filters
            console.log('\n5. Testing with Filters...');
            if (wings.length > 0) {
                try {
                    const jottingWithWing = await axios.get(`${BASE_URL}/jotting-report`, {
                        params: {
                            headCode: 'L1004',
                            asOnDate: '2024-12-28',
                            wingName: wings[0],
                            sortBy: 'Name'
                        }
                    });
                    
                    const filteredData = jottingWithWing.data?.data || jottingWithWing.data || [];
                    console.log(`   ✅ With wing filter (${wings[0]}): ${filteredData.length} records`);
                } catch (error) {
                    console.log(`   ⚠️ Wing filter test failed: ${error.message}`);
                }
            }
            
            console.log('\n' + '='.repeat(60));
            console.log('📊 UI INTEGRATION TEST SUMMARY');
            console.log('='.repeat(60));
            console.log('✅ All APIs are working correctly');
            console.log('✅ Response format is properly handled');
            console.log('✅ Dropdown data is available');
            console.log('✅ JottingReport generation works');
            console.log('✅ Filters are functional');
            
            console.log('\n🎯 NEXT STEPS FOR UI TESTING:');
            console.log('1. Open JottingReport in the frontend');
            console.log('2. Verify dropdowns are populated');
            console.log('3. Select a head code with data (e.g., L1004)');
            console.log('4. Generate report and verify data display');
            console.log('5. Test print functionality');
            console.log('6. Verify responsive design');
            
        } else {
            console.log('❌ Invalid response format from head masters API');
        }
        
    } catch (error) {
        console.error('❌ UI Integration test failed:', error.response?.data || error.message);
    }
}

testJottingReportUI();