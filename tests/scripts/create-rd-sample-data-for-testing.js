const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function createRDSampleData() {
  console.log('🏦 Creating RD Sample Data for Testing...\n');

  try {
    // First, check existing members
    console.log('1. Checking existing members...');
    const membersResult = await pool.query(`
      SELECT mbno, f_name, m_name, l_name, basic_pay, dept_name 
      FROM member_master 
      WHERE mbno IS NOT NULL 
      ORDER BY mbno 
      LIMIT 10
    `);
    
    console.log('✅ Found members:', membersResult.rows.length);
    membersResult.rows.forEach(member => {
      const fullName = `${member.f_name || ''} ${member.m_name || ''} ${member.l_name || ''}`.trim();
      console.log(`   Member ${member.mbno}: ${fullName}`);
    });

    if (membersResult.rows.length === 0) {
      console.log('❌ No members found. Creating sample members first...');
      
      // Create sample members
      await pool.query(`
        INSERT INTO member_master (mbno, f_name, m_name, l_name, basic_pay, dept_name, officeno, isactive)
        VALUES 
        (610017770, 'RAJESH', 'KUMAR', 'SHARMA', 45000, 'HEAD OFFICE', 1, 'Y'),
        (610017771, 'PRIYA', '', 'SINGH', 38000, 'BRANCH OFFICE', 2, 'Y'),
        (610017772, 'AMIT', '', 'PATEL', 52000, 'REGIONAL OFFICE', 3, 'Y'),
        (610017773, 'SUNITA', '', 'DEVI', 41000, 'HEAD OFFICE', 1, 'Y'),
        (610017774, 'VIKASH', '', 'GUPTA', 47000, 'BRANCH OFFICE', 2, 'Y')
        ON CONFLICT (mbno) DO NOTHING
      `);
      console.log('✅ Sample members created');
    }

    // Clear existing RD data for clean testing
    console.log('\n2. Clearing existing RD data...');
    await pool.query('DELETE FROM rd_installments');
    await pool.query('DELETE FROM recurring_deposits');
    console.log('✅ Existing RD data cleared');

    // Create sample RD accounts
    console.log('\n3. Creating sample RD accounts...');
    
    const rdAccounts = [
      {
        accountNumber: 'RD001001',
        memberId: 610017770,
        monthlyInstallment: 5000,
        interestRate: 8.5,
        startDate: '2023-01-01',
        tenureMonths: 60,
        status: 'ACTIVE'
      },
      {
        accountNumber: 'RD001002',
        memberId: 610017770,
        monthlyInstallment: 3000,
        interestRate: 8.0,
        startDate: '2023-06-01',
        tenureMonths: 36,
        status: 'ACTIVE'
      },
      {
        accountNumber: 'RD002001',
        memberId: 610017771,
        monthlyInstallment: 2000,
        interestRate: 7.5,
        startDate: '2022-12-01',
        tenureMonths: 48,
        status: 'ACTIVE'
      },
      {
        accountNumber: 'RD003001',
        memberId: 610017772,
        monthlyInstallment: 10000,
        interestRate: 9.0,
        startDate: '2023-03-01',
        tenureMonths: 24,
        status: 'ACTIVE'
      },
      {
        accountNumber: 'RD004001',
        memberId: 610017773,
        monthlyInstallment: 1500,
        interestRate: 7.0,
        startDate: '2023-09-01',
        tenureMonths: 60,
        status: 'ACTIVE'
      }
    ];

    for (const account of rdAccounts) {
      const startDate = new Date(account.startDate);
      const maturityDate = new Date(startDate);
      maturityDate.setMonth(maturityDate.getMonth() + account.tenureMonths);
      
      // Calculate maturity amount (simple calculation)
      const totalDeposits = account.monthlyInstallment * account.tenureMonths;
      const maturityAmount = totalDeposits + (totalDeposits * account.interestRate * (account.tenureMonths / 12)) / 100;
      
      // Calculate current status
      const currentDate = new Date();
      const monthsCompleted = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24 * 30.44));
      const installmentsPaid = Math.max(0, Math.min(monthsCompleted, account.tenureMonths));
      const totalDeposited = account.monthlyInstallment * installmentsPaid;
      
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

      console.log(`✅ Created RD Account: ${account.accountNumber} for Member ${account.memberId}`);
      console.log(`   Monthly: ₹${account.monthlyInstallment}, Rate: ${account.interestRate}%, Tenure: ${account.tenureMonths}m`);
      console.log(`   Installments Paid: ${installmentsPaid}/${account.tenureMonths}, Deposited: ₹${totalDeposited}`);
    }

    // Verify the data
    console.log('\n4. Verifying created data...');
    const rdResult = await pool.query(`
      SELECT rd.*, 
             CONCAT(mm.f_name, ' ', COALESCE(mm.m_name, ''), ' ', mm.l_name) as member_name
      FROM recurring_deposits rd
      JOIN member_master mm ON rd."memberId" = mm.mbno
      ORDER BY rd."accountNumber"
    `);

    console.log('✅ RD Accounts created:', rdResult.rows.length);
    rdResult.rows.forEach(rd => {
      console.log(`   ${rd.accountNumber}: ${rd.member_name} - ₹${rd.monthlyInstallment}/month (${rd.interestRate}%)`);
    });

    console.log('\n🎉 RD Sample Data Creation Complete!');
    console.log('\n📋 Test Data Summary:');
    console.log('   ✅ 5 RD accounts created');
    console.log('   ✅ Multiple members with different scenarios');
    console.log('   ✅ Various installment amounts and rates');
    console.log('   ✅ Different start dates for testing calculations');
    
    console.log('\n🧪 Ready for Testing:');
    console.log('   • Member 610017770: 2 RD accounts (₹5000/m, ₹3000/m)');
    console.log('   • Member 610017771: 1 RD account (₹2000/m)');
    console.log('   • Member 610017772: 1 RD account (₹10000/m)');
    console.log('   • Member 610017773: 1 RD account (₹1500/m)');

  } catch (error) {
    console.error('❌ Error creating RD sample data:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
createRDSampleData();