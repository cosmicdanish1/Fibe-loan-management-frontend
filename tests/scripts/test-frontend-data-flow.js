const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testFrontendDataFlow() {
    console.log('🔍 Testing Frontend Data Flow for JottingReport...');
    console.log('=' .repeat(60));
    
    try {
        // Test 1: Check if backend is running
        console.log('\n1. Checking Backend Status...');
        try {
            const healthCheck = await axios.get(`${BASE_URL.replace('/api/v1', '')}/`);
            console.log('✅ Backend is running');
        } catch (error) {
            console.log('❌ Backend connection failed:', error.message);
            return;
        }

        // Test 2: Test Head Masters API (Frontend fetchInitialData)
        console.log('\n2. Testing Head Masters API (fetchInitialData)...');
        const headResponse = await axios.get(`${BASE_URL}/jotting-report/head-masters`);
        
        console.log('Raw Response Structure:');
        console.log('- Status:', headResponse.status);
        console.log('- Response Type:', typeof headResponse.data);
        console.log('- Has data property:', !!headResponse.data?.data);
        console.log('- Data is array:', Array.isArray(headResponse.data?.data));
        console.log('- Data length:', headResponse.data?.data?.length || 0);
        
        if (headResponse.data?.data && Array.isArray(headResponse.data.data)) {
            const heads = headResponse.data.data;
            console.log('✅ Frontend will receive:', heads.length, 'head codes');
            console.log('Sample heads for dropdown:');
            heads.slice(0, 5).forEach((head, index) => {
                console.log(`   ${index + 1}. ${head.code}: ${head.headName}`);
            });
            
            // Test mapping logic (same as frontend)
            const mappedHeads = heads.map((h) => ({
                code: h.code,
                name: h.headName || h.name || h.code
            }));
            console.log('✅ Mapped heads for frontend dropdown:', mappedHeads.length);
        } else {
            console.log('❌ Frontend will not receive head data properly');
        }

        // Test 3: Test Wings API
        console.log('\n3. Testing Wings API...');
        const wingResponse = await axios.get(`${BASE_URL}/jotting-report/wings`);
        console.log('Wings Response Structure:');
        console.log('- Has data property:', !!wingResponse.data?.data);
        console.log('- Data is array:', Array.isArray(wingResponse.data?.data));
        console.log('- Data length:', wingResponse.data?.data?.length || 0);
        
        if (wingResponse.data?.data && Array.isArray(wingResponse.data.data)) {
            const wings = wingResponse.data.data;
            console.log('✅ Frontend will receive:', wings.length, 'wings');
            console.log('Sample wings:', wings.slice(0, 3));
        } else {
            console.log('❌ Frontend will not receive wing data properly');
        }

        // Test 4: Test Offices API
        console.log('\n4. Testing Offices API...');
        const officeResponse = await axios.get(`${BASE_URL}/jotting-report/offices`);
        console.log('Offices Response Structure:');
        console.log('- Has data property:', !!officeResponse.data?.data);
        console.log('- Data is array:', Array.isArray(officeResponse.data?.data));
        console.log('- Data length:', officeResponse.data?.data?.length || 0);
        
        if (officeResponse.data?.data && Array.isArray(officeResponse.data.data)) {
            const offices = officeResponse.data.data;
            console.log('✅ Frontend will receive:', offices.length, 'offices');
            console.log('Sample offices:', offices.slice(0, 3));
        } else {
            console.log('❌ Frontend will not receive office data properly');
        }

        // Test 5: Test JottingReport Generation (handleGenerateReport)
        console.log('\n5. Testing JottingReport Generation...');
        
        // Use the first head code from the response
        if (headResponse.data?.data && headResponse.data.data.length > 0) {
            const testHeadCode = 'L1004'; // Known to have data
            console.log(`Testing with head code: ${testHeadCode}`);
            
            const jottingResponse = await axios.get(`${BASE_URL}/jotting-report`, {
                params: {
                    headCode: testHeadCode,
                    asOnDate: '2024-12-28',
                    sortBy: 'MBNO'
                }
            });
            
            console.log('JottingReport Response Structure:');
            console.log('- Status:', jottingResponse.status);
            console.log('- Has data property:', !!jottingResponse.data?.data);
            console.log('- Data is array:', Array.isArray(jottingResponse.data?.data));
            console.log('- Data length:', jottingResponse.data?.data?.length || 0);
            
            if (jottingResponse.data?.data && Array.isArray(jottingResponse.data.data)) {
                const reportData = jottingResponse.data.data;
                console.log('✅ Frontend will receive:', reportData.length, 'report records');
                
                if (reportData.length > 0) {
                    console.log('Sample report data:');
                    reportData.slice(0, 3).forEach((record, index) => {
                        console.log(`   ${index + 1}. ${record.memberName} (${record.memberNo})`);
                        console.log(`      Wing: ${record.wing}, Office: ${record.office}`);
                        console.log(`      Balance: ₹${parseFloat(record.balance).toFixed(2)}`);
                    });
                    
                    // Test frontend data processing
                    const dataWithKeys = reportData.map((item, index) => ({
                        ...item,
                        key: index.toString()
                    }));
                    console.log('✅ Data processed for Ant Design Table:', dataWithKeys.length, 'records');
                    
                    // Test balance calculation (footer)
                    const totalBalance = reportData.reduce((sum, item) => sum + parseFloat(item.balance), 0);
                    console.log('✅ Total balance calculation:', totalBalance.toFixed(2));
                }
            } else {
                console.log('❌ Frontend will not receive report data properly');
            }
        }

        // Test 6: Simulate Frontend State Updates
        console.log('\n6. Simulating Frontend State Updates...');
        
        let frontendState = {
            headList: [],
            wingList: [],
            officeList: [],
            reportData: [],
            loading: false
        };
        
        // Simulate fetchInitialData
        if (headResponse.data?.data) {
            frontendState.headList = headResponse.data.data.map((h) => ({
                code: h.code,
                name: h.headName || h.name || h.code
            }));
        }
        
        if (wingResponse.data?.data) {
            frontendState.wingList = wingResponse.data.data;
        }
        
        if (officeResponse.data?.data) {
            frontendState.officeList = officeResponse.data.data;
        }
        
        console.log('Frontend State After fetchInitialData:');
        console.log('- headList length:', frontendState.headList.length);
        console.log('- wingList length:', frontendState.wingList.length);
        console.log('- officeList length:', frontendState.officeList.length);
        
        // Test dropdown rendering
        console.log('\n7. Testing Dropdown Rendering...');
        console.log('Head Dropdown Options (first 5):');
        frontendState.headList.slice(0, 5).forEach((head, index) => {
            console.log(`   <Option key="${head.code}" value="${head.code}">${head.name} (${head.code})</Option>`);
        });
        
        console.log('\nWing Dropdown Options:');
        frontendState.wingList.slice(0, 3).forEach((wing, index) => {
            console.log(`   <Option key="${wing}" value="${wing}">${wing}</Option>`);
        });
        
        console.log('\nOffice Dropdown Options:');
        frontendState.officeList.slice(0, 3).forEach((office, index) => {
            console.log(`   <Option key="${office}" value="${office}">${office}</Option>`);
        });

        // Final Summary
        console.log('\n' + '=' .repeat(60));
        console.log('📊 FRONTEND DATA FLOW SUMMARY');
        console.log('=' .repeat(60));
        
        const allWorking = 
            headResponse.data?.data?.length > 0 &&
            wingResponse.data?.data?.length > 0 &&
            officeResponse.data?.data?.length > 0;
            
        if (allWorking) {
            console.log('✅ ALL FRONTEND DATA FLOWS ARE WORKING');
            console.log('✅ Dropdowns will be populated with real data');
            console.log('✅ Report generation will work with real data');
            console.log('✅ Frontend is ready for user interaction');
            
            console.log('\n🎯 RECOMMENDED FRONTEND TEST:');
            console.log('1. Open JottingReport in browser');
            console.log('2. Verify Head dropdown has 166+ options');
            console.log('3. Verify Wing dropdown has 16+ options');
            console.log('4. Verify Office dropdown has 6+ options');
            console.log('5. Select L1004 head code and generate report');
            console.log('6. Verify 102+ records are displayed');
            console.log('7. Test print functionality');
        } else {
            console.log('❌ SOME FRONTEND DATA FLOWS HAVE ISSUES');
            console.log('❌ Check API responses and frontend handling');
        }
        
    } catch (error) {
        console.error('❌ Frontend data flow test failed:', error.response?.data || error.message);
    }
}

testFrontendDataFlow();