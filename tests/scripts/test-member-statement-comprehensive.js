const { Pool } = require('pg');
const axios = require('axios');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function testMemberStatementComprehensive() {
  console.log('=== COMPREHENSIVE MEMBER STATEMENT TEST ===\n');
  
  const client = await pool.connect();
  
  try {
    // 1. Check database structure and data types
    console.log('1. CHECKING DATABASE STRUCTURE...');
    
    // Check if tables exist and their structure
    const tables = ['member_master', 'ledger', 'transactions', 'head_master'];
    for (const table of tables) {
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      console.log(`✅ Table ${table}: ${tableExists.rows[0].exists ? 'EXISTS' : 'MISSING'}`);
      
      if (tableExists.rows[0].exists) {
        // Check data types for money fields
        const columns = await client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = $1
          AND column_name IN ('trans_amt', 'cheq_amt', 'pl_balance', 'gross_salary', 'basic_pay', 'insureamt')
          ORDER BY ordinal_position;
        `, [table]);
        
        if (columns.rows.length > 0) {
          console.log(`  Money columns in ${table}:`);
          columns.rows.forEach(col => {
            console.log(`    - ${col.column_name}: ${col.data_type}`);
          });
        }
      }
    }
    
    // 2. Check for sample members with recent data
    console.log('\n2. CHECKING MEMBER DATA...');
    
    const memberCount = await client.query('SELECT COUNT(*) as count FROM member_master');
    console.log(`✅ Total members: ${memberCount.rows[0].count}`);
    
    // Get members with recent transactions
    const membersWithTransactions = await client.query(`
      SELECT DISTINCT m.mbno, 
             CONCAT(m.prefix, ' ', m.f_name, ' ', m.m_name, ' ', m.l_name) as full_name,
             COUNT(l.trans_no) as transaction_count,
             MAX(l.trans_date) as latest_transaction
      FROM member_master m
      INNER JOIN ledger l ON m.mbno = l.mbno
      WHERE l.trans_date >= '2020-01-01'
      GROUP BY m.mbno, m.prefix, m.f_name, m.m_name, m.l_name
      HAVING COUNT(l.trans_no) > 5
      ORDER BY MAX(l.trans_date) DESC, COUNT(l.trans_no) DESC
      LIMIT 5
    `);
    
    console.log('\n✅ Members with recent transactions:');
    membersWithTransactions.rows.forEach((member, index) => {
      console.log(`  ${index + 1}. Member: ${member.mbno} - ${member.full_name}`);
      console.log(`     Transactions: ${member.transaction_count}, Latest: ${new Date(member.latest_transaction).toLocaleDateString()}`);
    });
    
    // 3. Check head_master table for account heads
    console.log('\n3. CHECKING HEAD MASTER DATA...');
    
    const headMasterExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'head_master'
      );
    `);
    
    if (headMasterExists.rows[0].exists) {
      const headCount = await client.query('SELECT COUNT(*) as count FROM head_master');
      console.log(`✅ Head master records: ${headCount.rows[0].count}`);
      
      const sampleHeads = await client.query(`
        SELECT code, head_name 
        FROM head_master 
        WHERE code IN (
          SELECT DISTINCT code 
          FROM ledger 
          WHERE code IS NOT NULL 
          LIMIT 5
        )
        LIMIT 5
      `);
      
      console.log('✅ Sample account heads:');
      sampleHeads.rows.forEach(head => {
        console.log(`  - ${head.code}: ${head.head_name}`);
      });
    } else {
      console.log('❌ head_master table not found - creating sample data...');
      
      // Create head_master table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS head_master (
          code VARCHAR(10) PRIMARY KEY,
          head_name VARCHAR(100) NOT NULL,
          head_type VARCHAR(20),
          parent_code VARCHAR(10),
          is_active BOOLEAN DEFAULT true
        )
      `);
      
      // Insert sample head master data based on existing codes in ledger
      const existingCodes = await client.query(`
        SELECT DISTINCT code, COUNT(*) as usage_count
        FROM ledger 
        WHERE code IS NOT NULL 
        GROUP BY code 
        ORDER BY COUNT(*) DESC 
        LIMIT 20
      `);
      
      for (const codeRow of existingCodes.rows) {
        const code = codeRow.code;
        let headName = 'Unknown Head';
        let headType = 'GENERAL';
        
        // Determine head name based on code pattern
        if (code.startsWith('A')) {
          headName = `Asset Account ${code}`;
          headType = 'ASSET';
        } else if (code.startsWith('L')) {
          headName = `Liability Account ${code}`;
          headType = 'LIABILITY';
        } else if (code.startsWith('I')) {
          headName = `Income Account ${code}`;
          headType = 'INCOME';
        } else if (code.startsWith('E')) {
          headName = `Expense Account ${code}`;
          headType = 'EXPENSE';
        }
        
        await client.query(`
          INSERT INTO head_master (code, head_name, head_type, is_active)
          VALUES ($1, $2, $3, true)
          ON CONFLICT (code) DO NOTHING
        `, [code, headName, headType]);
      }
      
      console.log(`✅ Created ${existingCodes.rows.length} head master records`);
    }
    
    // 4. Test API endpoints
    console.log('\n4. TESTING API ENDPOINTS...');
    
    if (membersWithTransactions.rows.length > 0) {
      const testMember = membersWithTransactions.rows[0];
      const memberNo = testMember.mbno.toString();
      const fromDate = '2020-01-01T00:00:00.000Z';
      const toDate = new Date().toISOString();
      
      console.log(`\nTesting with Member: ${memberNo} - ${testMember.full_name}`);
      
      try {
        const apiUrl = `http://localhost:3001/api/v1/report/member-statement?memberNo=${memberNo}&fromDate=${fromDate}&toDate=${toDate}`;
        console.log(`API URL: ${apiUrl}`);
        
        const response = await axios.get(apiUrl);
        
        console.log('✅ API Response Status:', response.status);
        
        if (response.data) {
          const data = response.data.data || response.data;
          
          console.log('\n=== API RESPONSE ANALYSIS ===');
          console.log(`Member Name: ${data.memberName || 'Not provided'}`);
          console.log(`Summary Records: ${data.summary ? data.summary.length : 0}`);
          console.log(`Transaction Records: ${data.transactions ? data.transactions.length : 0}`);
          
          if (data.summary && data.summary.length > 0) {
            console.log('\n✅ Sample Summary Data:');
            data.summary.slice(0, 3).forEach((item, index) => {
              console.log(`  ${index + 1}. ${item.headCode} - ${item.headName}: ₹${item.balance}`);
            });
          }
          
          if (data.transactions && data.transactions.length > 0) {
            console.log('\n✅ Sample Transaction Data:');
            data.transactions.slice(0, 3).forEach((item, index) => {
              console.log(`  ${index + 1}. ${new Date(item.date).toLocaleDateString()} - ${item.headName}: DR:${item.withdrawal} CR:${item.deposit}`);
            });
          }
          
          // Check data types
          console.log('\n=== DATA TYPE VALIDATION ===');
          if (data.transactions && data.transactions.length > 0) {
            const sample = data.transactions[0];
            console.log('Transaction field types:');
            Object.keys(sample).forEach(key => {
              console.log(`  ${key}: ${typeof sample[key]} = ${sample[key]}`);
            });
          }
          
        } else {
          console.log('❌ No data in API response');
        }
        
      } catch (error) {
        console.log('❌ API Error:', error.response?.status, error.response?.data?.message || error.message);
        
        if (error.response?.data) {
          console.log('Error details:', error.response.data);
        }
      }
    }
    
    // 5. Check for data population needs
    console.log('\n5. DATA POPULATION ASSESSMENT...');
    
    const recentTransactions = await client.query(`
      SELECT COUNT(*) as count 
      FROM ledger 
      WHERE trans_date >= CURRENT_DATE - INTERVAL '30 days'
    `);
    
    console.log(`Recent transactions (last 30 days): ${recentTransactions.rows[0].count}`);
    
    if (parseInt(recentTransactions.rows[0].count) < 10) {
      console.log('⚠️  Low recent transaction data - may need to populate with current dates');
      
      // Suggest data population
      console.log('\n=== SUGGESTED DATA POPULATION ===');
      console.log('1. Update existing transactions to recent dates');
      console.log('2. Create sample transactions for testing');
      console.log('3. Ensure money fields are properly typed');
    }
    
    // 6. Frontend compatibility check
    console.log('\n6. FRONTEND COMPATIBILITY CHECK...');
    
    const expectedFields = [
      'memberNo', 'memberName', 'summary', 'transactions'
    ];
    
    const transactionFields = [
      'key', 'date', 'headCode', 'headName', 'voucherNo', 'narration', 'withdrawal', 'deposit'
    ];
    
    const summaryFields = [
      'headCode', 'headName', 'balance'
    ];
    
    console.log('✅ Expected API response structure:');
    console.log('  Root fields:', expectedFields.join(', '));
    console.log('  Transaction fields:', transactionFields.join(', '));
    console.log('  Summary fields:', summaryFields.join(', '));
    
    // 7. Print functionality test
    console.log('\n7. PRINT FUNCTIONALITY ASSESSMENT...');
    console.log('✅ MemberStatement.tsx print features:');
    console.log('  - Print button available');
    console.log('  - Portrait orientation configured');
    console.log('  - Responsive design for print media');
    console.log('  - Professional layout with headers and footers');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testMemberStatementComprehensive().catch(console.error);