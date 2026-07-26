const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function debugMemberDetailLedgerAPI() {
  console.log('=== DEBUGGING MEMBER DETAIL LEDGER API ===\n');
  
  // Test the specific member that's showing "No records found"
  const testMembers = [
    { memberNo: '610026281', name: 'SANJAY KUMAR VARMA' },
    { memberNo: '610016572', name: 'SINGH DALBIR' },
    { memberNo: '1001', name: 'Member1001 Kumar Singh' },
    { memberNo: '30029381', name: 'Unknown' } // This was in the logs
  ];
  
  for (const member of testMembers) {
    console.log(`\n🧪 Testing Member: ${member.memberNo} - ${member.name}`);
    console.log('='.repeat(60));
    
    try {
      // Test the exact API call that the frontend is making
      const response = await axios.get(`${BASE_URL}/member-ledger/detail-report`, {
        params: {
          memberNumber: member.memberNo,
          fromDate: '2016-11-01',
          toDate: '2025-12-28',
          outputType: 'screen'
        }
      });
      
      console.log(`✅ Status: ${response.status}`);
      console.log(`📊 Response structure:`, Object.keys(response.data));
      
      if (response.data.success) {
        console.log(`🎯 Success: ${response.data.success}`);
        console.log(`📝 Message: ${response.data.message}`);
        
        if (response.data.data) {
          const data = response.data.data;
          console.log(`👤 Member Name: ${data.memberName || 'N/A'}`);
          console.log(`📋 Entries: ${data.entries?.length || 0}`);
          console.log(`💰 Total Debits: ${data.totalDebits || 0}`);
          console.log(`💰 Total Credits: ${data.totalCredits || 0}`);
          
          if (data.entries && data.entries.length > 0) {
            console.log(`\n📄 Sample entries (first 3):`);
            data.entries.slice(0, 3).forEach((entry, index) => {
              console.log(`  ${index + 1}. Date: ${entry.date}`);
              console.log(`     Head: ${entry.accountHead}`);
              console.log(`     Particulars: ${entry.particulars}`);
              console.log(`     Voucher: ${entry.voucherNo}`);
              console.log(`     Debit: ${entry.debit}, Credit: ${entry.credit}`);
              console.log('');
            });
          } else {
            console.log(`⚠️  No entries found in response`);
            
            // Let's check if there's data in the database for this member
            console.log(`\n🔍 Checking database directly for member ${member.memberNo}...`);
            
            try {
              const { Pool } = require('pg');
              const pool = new Pool({
                user: 'postgres',
                host: 'localhost',
                database: 'EMP_Espat_Society',
                password: 'Test@1212',
                port: 5432,
              });
              
              const client = await pool.connect();
              
              // Check if member exists
              const memberCheck = await client.query(`
                SELECT mbno, f_name, m_name, l_name 
                FROM member_master 
                WHERE mbno = $1
              `, [member.memberNo]);
              
              if (memberCheck.rows.length > 0) {
                const memberData = memberCheck.rows[0];
                console.log(`   ✅ Member exists: ${memberData.f_name} ${memberData.m_name || ''} ${memberData.l_name || ''}`);
                
                // Check ledger entries
                const ledgerCheck = await client.query(`
                  SELECT COUNT(*) as total_count,
                         COUNT(CASE WHEN trans_date BETWEEN '2016-11-01' AND '2025-12-28' THEN 1 END) as period_count
                  FROM ledger 
                  WHERE mbno = $1
                `, [member.memberNo]);
                
                const counts = ledgerCheck.rows[0];
                console.log(`   📊 Total ledger entries: ${counts.total_count}`);
                console.log(`   📊 Entries in period: ${counts.period_count}`);
                
                if (counts.period_count > 0) {
                  // Get sample entries
                  const sampleEntries = await client.query(`
                    SELECT l.trans_date, l.code, h.head_name, l.narration, l.trans_amt, l.trans_type
                    FROM ledger l
                    LEFT JOIN headmaster h ON l.code = h.code
                    WHERE l.mbno = $1 
                      AND l.trans_date BETWEEN '2016-11-01' AND '2025-12-28'
                    ORDER BY l.trans_date DESC
                    LIMIT 3
                  `, [member.memberNo]);
                  
                  console.log(`   📄 Sample database entries:`);
                  sampleEntries.rows.forEach((entry, index) => {
                    console.log(`     ${index + 1}. ${entry.trans_date} - ${entry.head_name || entry.code} - ${entry.trans_type} ${entry.trans_amt}`);
                  });
                }
              } else {
                console.log(`   ❌ Member not found in database`);
              }
              
              client.release();
              await pool.end();
              
            } catch (dbError) {
              console.log(`   ❌ Database check failed: ${dbError.message}`);
            }
          }
        } else {
          console.log(`❌ No data field in response`);
        }
      } else {
        console.log(`❌ Success: false`);
        console.log(`📝 Message: ${response.data.message || 'No message'}`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.response?.status || 'Network'} - ${error.response?.data?.message || error.message}`);
      if (error.response?.data) {
        console.log(`📄 Error details:`, error.response.data);
      }
    }
  }
  
  console.log('\n\n🔍 ANALYSIS AND RECOMMENDATIONS:');
  console.log('================================');
  console.log('1. Check if the API is returning the correct data structure');
  console.log('2. Verify that the member numbers are in the correct format');
  console.log('3. Check if the date range is causing issues');
  console.log('4. Verify that the frontend is processing the response correctly');
  console.log('');
  console.log('💡 If API returns data but frontend shows "No records found":');
  console.log('   - Check frontend response processing logic');
  console.log('   - Verify data.entries array structure');
  console.log('   - Check for case sensitivity in field names');
}

debugMemberDetailLedgerAPI().catch(console.error);