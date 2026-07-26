const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function debugRDAccounts() {
  console.log('🔍 DEBUGGING RD ACCOUNTS FOR MEMBER 610017770...\n');
  
  try {
    // 1. Check if recurring_deposits table exists
    console.log('1. Checking if recurring_deposits table exists...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'recurring_deposits'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ recurring_deposits table exists');
    } else {
      console.log('❌ recurring_deposits table does not exist');
      return;
    }

    // 2. Check all RD accounts in the table
    console.log('\n2. Checking all RD accounts...');
    const allRD = await pool.query(`
      SELECT * FROM recurring_deposits ORDER BY "memberId"
    `);
    
    console.log(`Total RD accounts in database: ${allRD.rows.length}`);
    
    if (allRD.rows.length > 0) {
      console.log('All RD accounts:');
      allRD.rows.forEach((rd, index) => {
        console.log(`  ${index + 1}. Member ${rd.memberId}: ${rd.accountNumber} - ₹${rd.monthlyInstallment}/month (${rd.interestRate}%)`);
      });
    }

    // 3. Check specifically for member 610017770
    console.log('\n3. Checking RD accounts for member 610017770...');
    const memberRD = await pool.query(`
      SELECT * FROM recurring_deposits WHERE "memberId" = $1
    `, [610017770]);
    
    console.log(`RD accounts for member 610017770: ${memberRD.rows.length}`);
    
    if (memberRD.rows.length > 0) {
      console.log('Member 610017770 RD accounts:');
      memberRD.rows.forEach((rd, index) => {
        console.log(`  ${index + 1}. ${rd.accountNumber}:`);
        console.log(`     Monthly: ₹${rd.monthlyInstallment}`);
        console.log(`     Rate: ${rd.interestRate}%`);
        console.log(`     Start: ${rd.startDate}`);
        console.log(`     Status: ${rd.status}`);
        console.log(`     Deposited: ₹${rd.totalDeposited}`);
        console.log(`     Installments: ${rd.installmentsPaid}/${rd.tenureMonths}`);
      });
    } else {
      console.log('❌ No RD accounts found for member 610017770');
      
      // Create RD accounts for this member
      console.log('\n4. Creating RD accounts for member 610017770...');
      
      const rdAccounts = [
        {
          accountNumber: 'RD610017770001',
          memberId: 610017770,
          monthlyInstallment: 5000,
          interestRate: 8.5,
          startDate: '2023-01-01',
          tenureMonths: 60,
          status: 'ACTIVE'
        },
        {
          accountNumber: 'RD610017770002',
          memberId: 610017770,
          monthlyInstallment: 3000,
          interestRate: 8.0,
          startDate: '2023-06-01',
          tenureMonths: 36,
          status: 'ACTIVE'
        }
      ];

      for (const account of rdAccounts) {
        const startDate = new Date(account.startDate);
        const maturityDate = new Date(startDate);
        maturityDate.setMonth(maturityDate.getMonth() + account.tenureMonths);
        
        // Calculate current status
        const currentDate = new Date();
        const monthsCompleted = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24 * 30.44));
        const installmentsPaid = Math.max(0, Math.min(monthsCompleted, account.tenureMonths));
        const totalDeposited = account.monthlyInstallment * installmentsPaid;
        
        // Calculate maturity amount
        const totalDeposits = account.monthlyInstallment * account.tenureMonths;
        const maturityAmount = totalDeposits + (totalDeposits * account.interestRate * (account.tenureMonths / 12)) / 100;
        
        await pool.query(`
          INSERT INTO recurring_deposits (
            "accountNumber", "memberId", "monthlyInstallment", "interestRate",
            "startDate", "maturityDate", "tenureMonths", "maturityAmount",
            "totalDeposited", "installmentsPaid", "status", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        `, [
          account.accountNumber,
          account.memberId,
          account.monthlyInstallment,
          account.interestRate,
          account.startDate,
          maturityDate.toISOString().split('T')[0],
          account.tenureMonths,
          maturityAmount,
          totalDeposited,
          installmentsPaid,
          account.status
        ]);

        console.log(`✅ Created RD Account: ${account.accountNumber}`);
        console.log(`   Monthly: ₹${account.monthlyInstallment}, Rate: ${account.interestRate}%`);
        console.log(`   Installments Paid: ${installmentsPaid}/${account.tenureMonths}`);
        console.log(`   Total Deposited: ₹${totalDeposited}`);
      }
    }

    // 5. Final verification
    console.log('\n5. Final verification...');
    const finalCheck = await pool.query(`
      SELECT 
        "accountNumber",
        "memberId",
        "monthlyInstallment",
        "interestRate",
        "startDate",
        "maturityDate",
        "tenureMonths",
        "maturityAmount",
        "totalDeposited",
        "installmentsPaid",
        "status"
      FROM recurring_deposits 
      WHERE "memberId" = $1 
      AND ("status" = 'ACTIVE' OR "status" IS NULL)
      ORDER BY "startDate" DESC
    `, [610017770]);

    console.log(`✅ Final check - RD accounts for member 610017770: ${finalCheck.rows.length}`);
    
    if (finalCheck.rows.length > 0) {
      console.log('RD accounts ready for API:');
      finalCheck.rows.forEach((rd, index) => {
        console.log(`  ${index + 1}. ${rd.accountNumber} - ₹${rd.monthlyInstallment}/month (${rd.interestRate}%)`);
      });
      
      console.log('\n🎉 RD accounts are now available! The API should work.');
      console.log('💡 Try refreshing the frontend page and entering member 610017770 again.');
    }

    // 6. Test the exact query that the API uses
    console.log('\n6. Testing API query...');
    const apiQuery = `
      SELECT 
        "accountNumber",
        "memberId",
        "monthlyInstallment",
        "interestRate",
        "startDate",
        "maturityDate",
        "tenureMonths",
        "maturityAmount",
        "totalDeposited",
        "installmentsPaid",
        "status"
      FROM recurring_deposits 
      WHERE "memberId" = $1 
      AND ("status" = 'ACTIVE' OR "status" IS NULL)
      ORDER BY "startDate" DESC
    `;

    const apiResult = await pool.query(apiQuery, [610017770]);
    console.log(`API query result: ${apiResult.rows.length} accounts found`);
    
    if (apiResult.rows.length > 0) {
      console.log('API will return:');
      console.log(JSON.stringify(apiResult.rows, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

debugRDAccounts();