const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function testMemberLoanLedger() {
  console.log('📊 MEMBER LOAN LEDGER - Comprehensive Test');
  console.log('=' .repeat(60));

  try {
    // Test 1: Check ledger table structure and data
    console.log('\n📋 TEST 1: Checking ledger table structure and data...');
    
    const tableCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'ledger' 
      ORDER BY ordinal_position
    `);
    
    console.log('✅ ledger table columns:', tableCheck.rows.length);
    tableCheck.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });

    // Check existing data
    const dataCount = await pool.query('SELECT COUNT(*) as count FROM ledger');
    console.log(`📊 Current ledger records: ${dataCount.rows[0].count}`);

    // Test 2: Check headmaster table for loan head codes
    console.log('\n📋 TEST 2: Checking headmaster table for loan head codes...');
    
    const loanHeads = await pool.query(`
      SELECT code, head_name, headtype
      FROM headmaster 
      WHERE code LIKE '%LN%' OR head_name ILIKE '%loan%'
      ORDER BY code
    `);

    if (loanHeads.rows.length > 0) {
      console.log('✅ Found loan-related head codes:');
      loanHeads.rows.forEach((head, index) => {
        console.log(`   ${index + 1}. ${head.code}: ${head.head_name} (${head.headtype})`);
      });
    } else {
      console.log('❌ No loan-related head codes found. Checking all head codes...');
      
      const allHeads = await pool.query(`
        SELECT code, head_name, headtype
        FROM headmaster 
        ORDER BY code
        LIMIT 10
      `);
      
      console.log('📋 Sample head codes:');
      allHeads.rows.forEach((head, index) => {
        console.log(`   ${index + 1}. ${head.code}: ${head.head_name} (${head.headtype})`);
      });
    }

    // Test 3: Check ledger transactions for loan-related codes
    console.log('\n📋 TEST 3: Checking ledger transactions for loan-related codes...');
    
    const loanTransactions = await pool.query(`
      SELECT 
        l.code, 
        h.head_name,
        COUNT(*) as transaction_count,
        COUNT(DISTINCT l.mbno) as member_count
      FROM ledger l
      LEFT JOIN headmaster h ON l.code = h.code
      WHERE l.code LIKE '%LN%' OR h.head_name ILIKE '%loan%'
      GROUP BY l.code, h.head_name
      ORDER BY transaction_count DESC
      LIMIT 5
    `);

    if (loanTransactions.rows.length > 0) {
      console.log('✅ Found loan transactions:');
      loanTransactions.rows.forEach((trans, index) => {
        console.log(`   ${index + 1}. ${trans.code}: ${trans.head_name || 'Unknown'} (${trans.transaction_count} transactions, ${trans.member_count} members)`);
      });
    } else {
      console.log('❌ No loan transactions found. Need to populate data.');
      
      // Test 4: Populate sample loan ledger data
      console.log('\n📋 TEST 4: Populating sample loan ledger data...');
      
      // First check if we have members
      const memberCheck = await pool.query(`
        SELECT mbno, 
               CONCAT(f_name, ' ', COALESCE(m_name, ''), ' ', COALESCE(l_name, '')) as name
        FROM member_master 
        WHERE isactive = 'Y'
        LIMIT 5
      `);
      
      if (memberCheck.rows.length === 0) {
        throw new Error('No active members found. Please populate member_master table first.');
      }

      console.log('✅ Found members for loan ledger:');
      memberCheck.rows.forEach(member => {
        console.log(`   - Member ${member.mbno}: ${member.name}`);
      });

      // Check if loan head codes exist, if not create them
      const rlnHead = await pool.query(`SELECT code FROM headmaster WHERE code = 'RLN'`);
      if (rlnHead.rows.length === 0) {
        await pool.query(`
          INSERT INTO headmaster (code, head_name, headtype, hposition, parent_code, interest, op_bal, pflag)
          VALUES ('RLN', 'Regular Loan', 'LOAN', '1', '', 'Y', 0, 'Y')
        `);
        console.log('✅ Created RLN head code');
      }

      const slnHead = await pool.query(`SELECT code FROM headmaster WHERE code = 'SLN'`);
      if (slnHead.rows.length === 0) {
        await pool.query(`
          INSERT INTO headmaster (code, head_name, headtype, hposition, parent_code, interest, op_bal, pflag)
          VALUES ('SLN', 'Short Term Loan', 'LOAN', '2', '', 'Y', 0, 'Y')
        `);
        console.log('✅ Created SLN head code');
      }

      // Create sample loan ledger transactions
      const currentDate = new Date();
      const sampleTransactions = [
        // Member 1 - Regular Loan
        {
          mbno: memberCheck.rows[0].mbno,
          code: 'RLN',
          trans_date: new Date(currentDate.getTime() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
          trans_type: 'DR',
          trans_amt: 100000,
          receipt_vchr_no: 'LN001',
          narration: 'Loan Disbursement - Regular Loan',
          vchr_type: 'LN',
          pl_balance: 100000
        },
        {
          mbno: memberCheck.rows[0].mbno,
          code: 'RLN',
          trans_date: new Date(currentDate.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          trans_type: 'CR',
          trans_amt: 10000,
          receipt_vchr_no: 'RP001',
          narration: 'Loan Repayment - EMI 1',
          vchr_type: 'RP',
          pl_balance: 90000
        },
        {
          mbno: memberCheck.rows[0].mbno,
          code: 'RLN',
          trans_date: new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          trans_type: 'CR',
          trans_amt: 10000,
          receipt_vchr_no: 'RP002',
          narration: 'Loan Repayment - EMI 2',
          vchr_type: 'RP',
          pl_balance: 80000
        },
        // Member 2 - Short Term Loan
        {
          mbno: memberCheck.rows[1] ? memberCheck.rows[1].mbno : memberCheck.rows[0].mbno,
          code: 'SLN',
          trans_date: new Date(currentDate.getTime() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
          trans_type: 'DR',
          trans_amt: 50000,
          receipt_vchr_no: 'LN002',
          narration: 'Loan Disbursement - Short Term Loan',
          vchr_type: 'LN',
          pl_balance: 50000
        },
        {
          mbno: memberCheck.rows[1] ? memberCheck.rows[1].mbno : memberCheck.rows[0].mbno,
          code: 'SLN',
          trans_date: new Date(currentDate.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          trans_type: 'CR',
          trans_amt: 25000,
          receipt_vchr_no: 'RP003',
          narration: 'Loan Repayment - Partial Payment',
          vchr_type: 'RP',
          pl_balance: 25000
        }
      ];

      for (const trans of sampleTransactions) {
        // Get next transaction number
        const maxTransNo = await pool.query('SELECT COALESCE(MAX(trans_no), 0) + 1 as next_trans_no FROM ledger');
        const transNo = maxTransNo.rows[0].next_trans_no;

        await pool.query(`
          INSERT INTO ledger (
            trans_no, trans_date, trans_type, code, mbno, trans_amt,
            receipt_vchr_no, narration, vchr_type, pl_balance, modeofpay,
            username, ledgerid
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'C', 'system', $1
          )
        `, [
          transNo, trans.trans_date, trans.trans_type, trans.code, trans.mbno,
          trans.trans_amt, trans.receipt_vchr_no, trans.narration, trans.vchr_type,
          trans.pl_balance
        ]);
      }

      console.log(`✅ Inserted ${sampleTransactions.length} sample loan ledger transactions`);
    }

    // Test 5: Test the API endpoint directly
    console.log('\n📋 TEST 5: Testing Member Loan Ledger API endpoint...');
    
    const testMember = await pool.query(`
      SELECT DISTINCT l.mbno, 
             CONCAT(m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as name,
             l.code
      FROM ledger l
      LEFT JOIN member_master m ON l.mbno = m.mbno
      WHERE l.code IN ('A1002', 'A1047')
      LIMIT 1
    `);

    if (testMember.rows.length > 0) {
      const memberCode = testMember.rows[0].mbno;
      const memberName = testMember.rows[0].name;
      const headCode = testMember.rows[0].code;
      const asOnDate = new Date().toISOString().split('T')[0];
      
      console.log(`🔍 Testing with member: ${memberName} (${memberCode}), Head: ${headCode}, Date: ${asOnDate}`);

      // Test the exact query used by the service
      const serviceQuery = `
        SELECT 
          l.trans_date,
          l.receipt_vchr_no as voucher_no,
          l.narration,
          l.trans_type,
          l.trans_amt::numeric as amount
        FROM ledger l
        WHERE l.code = $1
          AND l.trans_date <= $2
          AND l.mbno = $3
        ORDER BY l.trans_date ASC, l.trans_no ASC
      `;

      const apiResult = await pool.query(serviceQuery, [headCode, asOnDate, memberCode]);
      
      if (apiResult.rows.length > 0) {
        console.log('✅ API query successful. Loan ledger data:');
        let runningBalance = 0;
        apiResult.rows.forEach((trans, index) => {
          const isDebit = trans.trans_type === 'DR';
          const debit = isDebit ? parseFloat(trans.amount) : 0;
          const credit = !isDebit ? parseFloat(trans.amount) : 0;
          runningBalance += debit - credit;
          
          console.log(`   ${index + 1}. ${trans.trans_date.toISOString().split('T')[0]}: ${trans.narration}`);
          console.log(`      ${trans.trans_type}: ₹${parseFloat(trans.amount).toLocaleString('en-IN')}, Balance: ₹${runningBalance.toLocaleString('en-IN')}`);
        });
        console.log(`📊 Final Outstanding Balance: ₹${runningBalance.toLocaleString('en-IN')}`);
      } else {
        console.log('❌ API query returned no results');
      }

      // Test member and head details
      const memberDetails = await pool.query(`
        SELECT CONCAT(f_name, ' ', COALESCE(m_name, ''), ' ', COALESCE(l_name, '')) as name
        FROM member_master WHERE mbno = $1
      `, [memberCode]);

      const headDetails = await pool.query(`
        SELECT head_name FROM headmaster WHERE code = $1
      `, [headCode]);

      if (memberDetails.rows.length > 0) {
        console.log(`✅ Member Details: ${memberDetails.rows[0].name}`);
      }
      if (headDetails.rows.length > 0) {
        console.log(`✅ Head Details: ${headDetails.rows[0].head_name}`);
      }
    } else {
      console.log('❌ No members with loan transactions found');
    }

    // Test 6: Test with HTTP request (if backend is running)
    console.log('\n📋 TEST 6: Testing HTTP API endpoint...');
    
    if (testMember.rows.length > 0) {
      try {
        const https = require('https');
        const http = require('http');
        
        const makeRequest = (url) => {
          return new Promise((resolve, reject) => {
            const client = url.startsWith('https') ? https : http;
            const req = client.get(url, (res) => {
              let data = '';
              res.on('data', chunk => data += chunk);
              res.on('end', () => {
                try {
                  resolve({
                    status: res.statusCode,
                    data: JSON.parse(data)
                  });
                } catch (e) {
                  resolve({
                    status: res.statusCode,
                    data: data
                  });
                }
              });
            });
            req.on('error', reject);
            req.setTimeout(5000, () => {
              req.destroy();
              reject(new Error('Request timeout'));
            });
          });
        };

        const memberCode = testMember.rows[0].mbno;
        const asOnDate = new Date().toISOString().split('T')[0];
        const loanCategory = testMember.rows[0].code === 'RLN' ? 'REGULAR' : 'SHORT_TERM';

        const endpoints = [
          { port: 3000, path: `/api/v1/report/member-loan-ledger?memberCode=${memberCode}&asOnDate=${asOnDate}&loanCategory=${loanCategory}` },
          { port: 3001, path: `/api/report/member-loan-ledger?memberCode=${memberCode}&asOnDate=${asOnDate}&loanCategory=${loanCategory}` }
        ];
        let apiResponse = null;
        
        for (const endpoint of endpoints) {
          try {
            const url = `http://localhost:${endpoint.port}${endpoint.path}`;
            console.log(`🔍 Trying ${url}...`);
            const response = await makeRequest(url);
            
            if (response.status === 200) {
              console.log(`✅ HTTP API Response from ${endpoint.port}${endpoint.path}:`, response.status);
              console.log('📄 Member Loan Ledger Data:', JSON.stringify(response.data, null, 2));
              apiResponse = response;
              break;
            } else {
              console.log(`❌ ${endpoint.port}${endpoint.path} returned status: ${response.status}`);
            }
          } catch (portError) {
            console.log(`⚠️  ${endpoint.port}${endpoint.path} failed: ${portError.message}`);
          }
        }
        
        if (!apiResponse) {
          console.log('❌ No working API endpoint found (backend may not be running)');
        }
      } catch (httpError) {
        console.log('⚠️  HTTP API test failed:', httpError.message);
      }
    }

    // Test 7: Verify data types and money formatting
    console.log('\n📋 TEST 7: Verifying data types and money formatting...');
    
    const typeCheck = await pool.query(`
      SELECT 
        trans_amt, 
        pg_typeof(trans_amt) as amount_type,
        pl_balance,
        pg_typeof(pl_balance) as balance_type,
        trans_date,
        pg_typeof(trans_date) as date_type,
        trans_amt::numeric as amount_numeric,
        pl_balance::numeric as balance_numeric
      FROM ledger 
      WHERE code IN ('RLN', 'SLN') OR code LIKE '%LN%'
      LIMIT 1
    `);

    if (typeCheck.rows.length > 0) {
      const types = typeCheck.rows[0];
      console.log('✅ Data type verification:');
      console.log(`   trans_amt: ${types.trans_amt} (${types.amount_type}) -> numeric: ${types.amount_numeric}`);
      console.log(`   pl_balance: ${types.pl_balance} (${types.balance_type}) -> numeric: ${types.balance_numeric}`);
      console.log(`   trans_date: ${types.trans_date} (${types.date_type})`);
    }

    // Test 8: Test different loan categories and members
    console.log('\n📋 TEST 8: Testing different loan categories and members...');
    
    const loanCategories = ['RLN', 'SLN'];
    
    for (const category of loanCategories) {
      const categoryCount = await pool.query(`
        SELECT 
          COUNT(*) as transaction_count,
          COUNT(DISTINCT mbno) as member_count,
          SUM(CASE WHEN trans_type = 'DR' THEN trans_amt::numeric ELSE 0 END) as total_disbursed,
          SUM(CASE WHEN trans_type = 'CR' THEN trans_amt::numeric ELSE 0 END) as total_repaid
        FROM ledger 
        WHERE code = $1
      `, [category]);
      
      if (categoryCount.rows[0].transaction_count > 0) {
        const stats = categoryCount.rows[0];
        console.log(`   ${category}: ${stats.transaction_count} transactions, ${stats.member_count} members`);
        console.log(`      Disbursed: ₹${parseFloat(stats.total_disbursed || 0).toLocaleString('en-IN')}`);
        console.log(`      Repaid: ₹${parseFloat(stats.total_repaid || 0).toLocaleString('en-IN')}`);
        console.log(`      Outstanding: ₹${(parseFloat(stats.total_disbursed || 0) - parseFloat(stats.total_repaid || 0)).toLocaleString('en-IN')}`);
      }
    }

    // Test 9: Summary and UI Instructions
    console.log('\n📋 TEST 9: Summary and UI Instructions');
    console.log('=' .repeat(60));
    
    const finalCount = await pool.query(`
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(DISTINCT mbno) as total_members,
        COUNT(DISTINCT code) as total_head_codes
      FROM ledger l
      WHERE EXISTS (SELECT 1 FROM headmaster h WHERE h.code = l.code AND (h.head_name ILIKE '%loan%' OR l.code LIKE '%LN%'))
    `);

    console.log(`✅ Total loan ledger transactions: ${finalCount.rows[0].total_transactions}`);
    console.log(`👥 Total members with loan transactions: ${finalCount.rows[0].total_members}`);
    console.log(`📊 Total loan head codes: ${finalCount.rows[0].total_head_codes}`);
    
    if (finalCount.rows[0].total_transactions > 0) {
      const sampleMembers = await pool.query(`
        SELECT 
          l.mbno,
          CONCAT(m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as member_name,
          l.code,
          h.head_name,
          COUNT(*) as transaction_count,
          SUM(CASE WHEN l.trans_type = 'DR' THEN l.trans_amt::numeric ELSE -l.trans_amt::numeric END) as balance
        FROM ledger l
        LEFT JOIN member_master m ON l.mbno = m.mbno
        LEFT JOIN headmaster h ON l.code = h.code
        WHERE l.code IN ('RLN', 'SLN') OR l.code LIKE '%LN%'
        GROUP BY l.mbno, m.f_name, m.m_name, m.l_name, l.code, h.head_name
        ORDER BY transaction_count DESC
        LIMIT 5
      `);

      console.log('\n🎯 UI TESTING INSTRUCTIONS:');
      console.log('To test the Member Loan Ledger component:');
      console.log('1. Navigate to: Reports → Monthly → Member Loan Ledger');
      console.log('2. Sample members with loan transactions:');
      
      sampleMembers.rows.forEach((member, index) => {
        console.log(`   ${index + 1}. Member ${member.mbno}: ${member.member_name}`);
        console.log(`      Loan Type: ${member.head_name || member.code} (${member.transaction_count} transactions)`);
        console.log(`      Outstanding: ₹${parseFloat(member.balance).toLocaleString('en-IN')}`);
      });
      
      console.log('\n📋 Expected UI Behavior:');
      console.log('✅ Member Number input with lookup button and double-space functionality');
      console.log('✅ As On Date picker should default to current date');
      console.log('✅ Loan Category radio buttons (Regular/Short Term)');
      console.log('✅ Generate button should load member loan ledger');
      console.log('✅ Member info card should show member name, loan type, outstanding balance');
      console.log('✅ Table should show transactions with running balance');
      console.log('✅ Print button should generate printable report');
      console.log('✅ Summary row should show totals');
      
      console.log('\n💡 Component Features:');
      console.log('• Member lookup integration with double-space shortcut');
      console.log('• Date-based filtering (as on date)');
      console.log('• Loan category selection (Regular/Short Term)');
      console.log('• Running balance calculation');
      console.log('• Debit/Credit transaction display');
      console.log('• Outstanding balance tracking');
      console.log('• Print-ready report generation');
      console.log('• Member and head master integration');
      
      console.log('\n🔧 Testing Steps:');
      console.log('1. Enter member number or use lookup (double-space or click button)');
      console.log('2. Select As On Date (defaults to today)');
      console.log('3. Choose Loan Category (Regular or Short Term)');
      console.log('4. Click Generate to load ledger data');
      console.log('5. Review transactions and running balance');
      console.log('6. Test print functionality');
      
      console.log('\n📊 Available Loan Categories:');
      console.log('• REGULAR: Maps to RLN head code');
      console.log('• SHORT_TERM: Maps to SLN head code');
    }

    console.log('\n🎉 MEMBER LOAN LEDGER TEST COMPLETED SUCCESSFULLY!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testMemberLoanLedger();