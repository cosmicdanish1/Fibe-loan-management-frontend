const { Pool } = require('pg');
const axios = require('axios');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function testRecurringDetailsComprehensive() {
  console.log('🧪 Testing Recurring Details - Comprehensive Analysis\n');
  
  try {
    // 1. Check database connection
    console.log('1️⃣ Testing Database Connection...');
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    // 2. Check fdmaster table structure and data
    console.log('\n2️⃣ Analyzing fdmaster Table...');
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'fdmaster' 
      ORDER BY ordinal_position
    `);
    console.log('📋 fdmaster Table Structure:');
    tableInfo.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // 3. Check total records in fdmaster
    const totalRecords = await client.query('SELECT COUNT(*) as count FROM fdmaster');
    console.log(`\n📊 Total records in fdmaster: ${totalRecords.rows[0].count}`);
    
    // 4. Check RD accounts specifically
    console.log('\n3️⃣ Checking RD (Recurring Deposit) Accounts...');
    const rdAccounts = await client.query(`
      SELECT COUNT(*) as count 
      FROM fdmaster 
      WHERE fdrdflag = 'R'
    `);
    console.log(`📊 Total RD accounts: ${rdAccounts.rows[0].count}`);
    
    // 5. Check RD accounts with different statuses
    const rdByStatus = await client.query(`
      SELECT status, COUNT(*) as count 
      FROM fdmaster 
      WHERE fdrdflag = 'R' 
      GROUP BY status
      ORDER BY status
    `);
    console.log('📊 RD accounts by status:');
    rdByStatus.rows.forEach(row => {
      const statusText = row.status === '0' ? 'Active' : row.status === '1' ? 'Closed' : 'Unknown';
      console.log(`   Status ${row.status} (${statusText}): ${row.count} accounts`);
    });
    
    // 6. Get sample RD data
    console.log('\n4️⃣ Sample RD Account Data...');
    const sampleRD = await client.query(`
      SELECT 
        f.mbno,
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.l_name, '')) as member_name,
        f.account_number,
        f.certno,
        f.fdamount,
        f.rate,
        f.depperiod,
        f.depdate,
        f.matdate,
        f.matamount,
        f.status,
        f.fdrdflag
      FROM fdmaster f
      INNER JOIN member_master m ON f.mbno = m.mbno
      WHERE f.fdrdflag = 'R' 
        AND f.status != '1'
      ORDER BY f.depdate DESC
      LIMIT 5
    `);
    
    if (sampleRD.rows.length > 0) {
      console.log('✅ Sample RD accounts found:');
      sampleRD.rows.forEach((rd, index) => {
        console.log(`   ${index + 1}. Member ${rd.mbno} (${rd.member_name})`);
        console.log(`      Account: ${rd.account_number}, Amount: ₹${rd.fdamount}`);
        console.log(`      Rate: ${rd.rate}%, Period: ${rd.depperiod} months`);
        console.log(`      Status: ${rd.status === '0' ? 'Active' : 'Closed'}`);
        console.log('');
      });
    } else {
      console.log('❌ No active RD accounts found');
      
      // 7. Create sample RD data if none exists
      console.log('\n5️⃣ Creating Sample RD Data...');
      
      // First, get some member numbers
      const members = await client.query(`
        SELECT mbno, f_name, l_name 
        FROM member_master 
        WHERE isactive = 'Y' OR isactive = '1'
        ORDER BY mbno 
        LIMIT 5
      `);
      
      if (members.rows.length > 0) {
        console.log('📋 Creating RD accounts for members:');
        
        for (let i = 0; i < Math.min(3, members.rows.length); i++) {
          const member = members.rows[i];
          const accountNumber = 700000 + parseInt(member.mbno.toString().slice(-4));
          const monthlyAmount = 1000 + (i * 500); // ₹1000, ₹1500, ₹2000
          const rate = 7.5 + (i * 0.5); // 7.5%, 8.0%, 8.5%
          const tenure = 12 + (i * 12); // 12, 24, 36 months
          const openDate = new Date();
          openDate.setMonth(openDate.getMonth() - (i * 3)); // Stagger dates
          const maturityDate = new Date(openDate);
          maturityDate.setMonth(maturityDate.getMonth() + tenure);
          
          // Calculate maturity amount (simplified)
          const maturityAmount = monthlyAmount * tenure * (1 + (rate / 100) * (tenure / 12));
          
          const insertQuery = `
            INSERT INTO fdmaster (
              mbno, account_number, certno, fdamount, rate, depperiod,
              depdate, matdate, matamount, status, fdrdflag, nominee,
              nrelation, minbal, prefix, f_name, l_name
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            ON CONFLICT (account_number) DO NOTHING
          `;
          
          try {
            await client.query(insertQuery, [
              member.mbno,
              accountNumber,
              `RD-${accountNumber}`,
              monthlyAmount,
              rate,
              tenure,
              openDate,
              maturityDate,
              Math.round(maturityAmount),
              '0', // Active status
              'R', // Recurring Deposit flag
              'NOMINEE NAME',
              'SPOUSE',
              500, // Minimum balance
              'Mr',
              member.f_name,
              member.l_name
            ]);
            
            console.log(`   ✅ Created RD account ${accountNumber} for member ${member.mbno}`);
            console.log(`      Monthly: ₹${monthlyAmount}, Rate: ${rate}%, Tenure: ${tenure} months`);
          } catch (insertError) {
            console.log(`   ⚠️ Could not create RD for member ${member.mbno}: ${insertError.message}`);
          }
        }
      }
    }
    
    // 8. Test API endpoint
    console.log('\n6️⃣ Testing Backend API...');
    
    // Get a member with RD account
    const testMember = await client.query(`
      SELECT DISTINCT f.mbno
      FROM fdmaster f
      WHERE f.fdrdflag = 'R' 
        AND f.status != '1'
      ORDER BY f.mbno
      LIMIT 1
    `);
    
    if (testMember.rows.length > 0) {
      const memberNo = testMember.rows[0].mbno;
      console.log(`🧪 Testing API with member: ${memberNo}`);
      
      try {
        const response = await axios.get('http://localhost:3001/api/v1/report/recurring-details', {
          params: {
            memberNo: memberNo.toString(),
            outputType: 'screen'
          },
          timeout: 5000
        });
        
        if (response.data && response.data.success) {
          console.log('✅ API Test Successful!');
          const data = response.data.data;
          if (Array.isArray(data) && data.length > 0) {
            console.log('📋 API Response Data:');
            data.forEach((rd, index) => {
              console.log(`   ${index + 1}. Account: ${rd.accountNo}`);
              console.log(`      Member: ${rd.memberName}`);
              console.log(`      Monthly Amount: ₹${rd.monthlyAmount}`);
              console.log(`      Interest Rate: ${rd.interestRate}%`);
              console.log(`      Tenure: ${rd.tenure} months`);
              console.log(`      Status: ${rd.status}`);
              console.log('');
            });
          } else {
            console.log('⚠️ API returned empty data array');
          }
        } else {
          console.log('❌ API returned unsuccessful response');
          console.log('Response:', response.data);
        }
      } catch (apiError) {
        if (apiError.code === 'ECONNREFUSED') {
          console.log('❌ Backend server not running. Start with: npm run start:dev');
        } else {
          console.log('❌ API Test Failed:', apiError.message);
          if (apiError.response && apiError.response.data) {
            console.log('   Error details:', apiError.response.data);
          }
        }
      }
    } else {
      console.log('❌ No RD accounts available for API testing');
    }
    
    // 9. Data type verification
    console.log('\n7️⃣ Verifying Data Types...');
    const dataTypes = await client.query(`
      SELECT 
        f.fdamount,
        f.rate,
        f.matamount,
        f.minbal,
        pg_typeof(f.fdamount) as fdamount_type,
        pg_typeof(f.rate) as rate_type,
        pg_typeof(f.matamount) as matamount_type,
        pg_typeof(f.minbal) as minbal_type
      FROM fdmaster f
      WHERE f.fdrdflag = 'R' 
        AND f.status != '1'
      LIMIT 1
    `);
    
    if (dataTypes.rows.length > 0) {
      const row = dataTypes.rows[0];
      console.log('📊 Data Types Verification:');
      console.log(`   fdamount: ${row.fdamount_type} (value: ${row.fdamount})`);
      console.log(`   rate: ${row.rate_type} (value: ${row.rate})`);
      console.log(`   matamount: ${row.matamount_type} (value: ${row.matamount})`);
      console.log(`   minbal: ${row.minbal_type} (value: ${row.minbal})`);
      
      // Check if amounts are proper numeric types
      const isNumericType = (type) => type.includes('numeric') || type.includes('money') || type.includes('double');
      const allNumeric = [row.fdamount_type, row.rate_type, row.matamount_type, row.minbal_type]
        .every(isNumericType);
      
      if (allNumeric) {
        console.log('✅ All amount fields use proper numeric types');
      } else {
        console.log('⚠️ Some amount fields may need data type conversion');
      }
    }
    
    client.release();
    
    // 10. Frontend testing instructions
    console.log('\n8️⃣ Frontend Testing Instructions...');
    console.log('🎯 TO TEST IN UI:');
    console.log('1. Navigate to: Reports → Account Reports → Recurring Details');
    
    if (sampleRD.rows.length > 0 || testMember.rows.length > 0) {
      const testMemberNo = sampleRD.rows.length > 0 ? sampleRD.rows[0].mbno : testMember.rows[0].mbno;
      console.log(`2. Enter Member Number: ${testMemberNo}`);
      console.log('3. Click "GENERATE" button');
      console.log('4. Verify RD account details display in table');
      console.log('5. Check print functionality');
    } else {
      console.log('2. Enter any member number with RD accounts');
      console.log('3. If no data found, sample data has been created');
    }
    
    console.log('\n✅ RECURRING DETAILS ANALYSIS COMPLETE!');
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
  } finally {
    await pool.end();
  }
}

testRecurringDetailsComprehensive();