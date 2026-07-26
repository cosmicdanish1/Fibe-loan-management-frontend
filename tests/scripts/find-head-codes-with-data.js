const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function findHeadCodesWithData() {
    console.log('🔍 Finding Head Codes with Data for JottingReport...');
    console.log('=' .repeat(60));
    
    try {
        // Get all head codes
        console.log('1. Getting all head codes...');
        const headResponse = await axios.get(`${BASE_URL}/jotting-report/head-masters`);
        
        if (!headResponse.data?.data || !Array.isArray(headResponse.data.data)) {
            console.log('❌ Could not get head codes');
            return;
        }
        
        const heads = headResponse.data.data;
        console.log(`✅ Found ${heads.length} head codes`);
        
        // Test each head code to see which ones have data
        console.log('\n2. Testing head codes for data...');
        const headCodesWithData = [];
        
        // Test a selection of head codes (not all to avoid too many requests)
        const testHeads = heads.slice(0, 20); // Test first 20
        
        for (const head of testHeads) {
            try {
                const jottingResponse = await axios.get(`${BASE_URL}/jotting-report`, {
                    params: {
                        headCode: head.code,
                        asOnDate: '2024-12-28',
                        sortBy: 'MBNO'
                    }
                });
                
                const data = jottingResponse.data?.data || [];
                if (data.length > 0) {
                    // Calculate total balance
                    const totalBalance = data.reduce((sum, record) => sum + parseFloat(record.balance || 0), 0);
                    
                    headCodesWithData.push({
                        code: head.code,
                        name: head.headName,
                        recordCount: data.length,
                        totalBalance: totalBalance,
                        sampleRecord: data[0]
                    });
                    
                    console.log(`✅ ${head.code} (${head.headName}): ${data.length} records, ₹${totalBalance.toFixed(2)}`);
                } else {
                    console.log(`⚪ ${head.code} (${head.headName}): No data`);
                }
            } catch (error) {
                console.log(`❌ ${head.code}: Error - ${error.message}`);
            }
        }
        
        // Test some specific head codes that are likely to have data
        console.log('\n3. Testing specific head codes likely to have data...');
        const specificHeads = ['L1004', 'L1001', 'A1002', 'L1002', 'A1003', 'A1005'];
        
        for (const headCode of specificHeads) {
            const head = heads.find(h => h.code === headCode);
            if (!head) {
                console.log(`⚠️ ${headCode}: Not found in head list`);
                continue;
            }
            
            try {
                const jottingResponse = await axios.get(`${BASE_URL}/jotting-report`, {
                    params: {
                        headCode: headCode,
                        asOnDate: '2024-12-28',
                        sortBy: 'MBNO'
                    }
                });
                
                const data = jottingResponse.data?.data || [];
                if (data.length > 0) {
                    const totalBalance = data.reduce((sum, record) => sum + parseFloat(record.balance || 0), 0);
                    
                    const existingIndex = headCodesWithData.findIndex(h => h.code === headCode);
                    if (existingIndex === -1) {
                        headCodesWithData.push({
                            code: headCode,
                            name: head.headName,
                            recordCount: data.length,
                            totalBalance: totalBalance,
                            sampleRecord: data[0]
                        });
                    }
                    
                    console.log(`✅ ${headCode} (${head.headName}): ${data.length} records, ₹${totalBalance.toFixed(2)}`);
                } else {
                    console.log(`⚪ ${headCode} (${head.headName}): No data`);
                }
            } catch (error) {
                console.log(`❌ ${headCode}: Error - ${error.message}`);
            }
        }
        
        // Sort by record count (descending)
        headCodesWithData.sort((a, b) => b.recordCount - a.recordCount);
        
        console.log('\n' + '=' .repeat(60));
        console.log('📊 HEAD CODES WITH DATA (Sorted by Record Count)');
        console.log('=' .repeat(60));
        
        if (headCodesWithData.length === 0) {
            console.log('❌ No head codes found with data');
            console.log('💡 Try checking with different dates or verify database has transaction data');
            return;
        }
        
        headCodesWithData.forEach((head, index) => {
            console.log(`\n${index + 1}. ${head.code} - ${head.name}`);
            console.log(`   📊 Records: ${head.recordCount}`);
            console.log(`   💰 Total Balance: ₹${head.totalBalance.toFixed(2)}`);
            console.log(`   👤 Sample Member: ${head.sampleRecord.memberName} (${head.sampleRecord.memberNo})`);
            console.log(`   🏢 Sample Wing: ${head.sampleRecord.wing}`);
        });
        
        console.log('\n' + '=' .repeat(60));
        console.log('🎯 RECOMMENDED HEAD CODES FOR UI TESTING');
        console.log('=' .repeat(60));
        
        const topHeads = headCodesWithData.slice(0, 5);
        topHeads.forEach((head, index) => {
            console.log(`${index + 1}. ${head.code} (${head.name})`);
            console.log(`   - ${head.recordCount} records available`);
            console.log(`   - Total balance: ₹${head.totalBalance.toFixed(2)}`);
        });
        
        if (topHeads.length > 0) {
            const bestHead = topHeads[0];
            console.log('\n🏆 BEST HEAD CODE FOR TESTING:');
            console.log(`Code: ${bestHead.code}`);
            console.log(`Name: ${bestHead.name}`);
            console.log(`Records: ${bestHead.recordCount}`);
            console.log(`Balance: ₹${bestHead.totalBalance.toFixed(2)}`);
            
            console.log('\n📋 HOW TO TEST IN UI:');
            console.log('1. Open JottingReport in browser');
            console.log(`2. Select Head Code: ${bestHead.code} (${bestHead.name})`);
            console.log('3. Set As On Date: 28-Dec-2024');
            console.log('4. Click Generate Report');
            console.log(`5. You should see ${bestHead.recordCount} records`);
            console.log('6. Test print functionality');
        }
        
    } catch (error) {
        console.error('❌ Error finding head codes with data:', error.message);
    }
}

findHeadCodesWithData();