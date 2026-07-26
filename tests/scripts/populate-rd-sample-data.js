const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

console.log('🔄 Populating RD Sample Data for Testing...');
console.log('='.repeat(50));

async function cleanupExistingData() {
  console.log('🧹 Cleaning up existing test data...');
  
  try {
    // Delete existing test RD data
    await pool.query(`DELETE FROM rd_installments WHERE "recurringDepositId" IN (SELECT id FROM recurring_deposits WHERE "accountNumber" LIKE 'RD%')`);
    await pool.query(`DELETE FROM recurring_deposits WHERE "accountNumber" LIKE 'RD%'`);
    
    console.log('   ✅ Cleaned up existing test data');
  } catch (error) {
    console.log('   ⚠️  Cleanup error (might be expected):', error.message);
  }
}

async function createRDSampleData() {
  console.log('\n📝 Creating comprehensive RD sample data...');
  
  try {
    // Get real members from the database
    const membersResult = await pool.query(`
      SELECT mbno, f_name, l_name, basic_pay, officeno
      FROM member_master 
      WHERE mbno IS NOT NULL 
      AND f_name IS NOT NULL 
      AND basic_pay > 0
      ORDER BY mbno
      LIMIT 10
    `);
    
    if (membersResult.rows.length === 0) {
      console.log('   ❌ No valid members found');
      return;
    }
    
    console.log(`   Found ${membersResult.rows.length} valid members`);
    
    // Create RD accounts for each member
    for (let i = 0; i < membersResult.rows.length; i++) {
      const member = membersResult.rows[i];
      const accountNumber = `RD${String(member.mbno).padStart(8, '0')}`;
      
      // Vary the RD parameters
      const monthlyInstallment = 500 + (i * 250); // 500, 750, 1000, etc.
      const interestRate = 7.5 + (i * 0.5); // 7.5%, 8%, 8.5%, etc.
      const tenureMonths = 12 + (i * 6); // 12, 18, 24, etc.
      
      // Set start date in the past (6 months to 2 years ago)
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - (6 + i * 3));
      
      const maturityDate = new Date(startDate);
      maturityDate.setMonth(maturityDate.getMonth() + tenureMonths);
      
      // Calculate expected amounts
      const totalDeposited = monthlyInstallment * tenureMonths;
      const maturityAmount = Math.round(totalDeposited * (1 + (interestRate / 100) * (tenureMonths / 12)));
      
      // Calculate how many installments should be paid by now
      const currentDate = new Date();
      const monthsElapsed = Math.floor((currentDate - startDate) / (30 * 24 * 60 * 60 * 1000));
      const installmentsPaid = Math.min(monthsElapsed, tenureMonths);
      const actualDeposited = installmentsPaid * monthlyInstallment;
      
      try {
        // Insert RD account
        const rdResult = await pool.query(`
          INSERT INTO recurring_deposits (
            "accountNumber", "memberId", "monthlyInstallment", "interestRate", 
            "startDate", "maturityDate", "tenureMonths", "maturityAmount", 
            "totalDeposited", "interestAccrued", "installmentsPaid", 
            "installmentsMissed", "status", "nextDueDate", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
          RETURNING id
        `, [
          accountNumber, 
          member.mbno, 
          monthlyInstallment, 
          interestRate,
          startDate, 
          maturityDate, 
          tenureMonths, 
          maturityAmount,
          actualDeposited, 
          0, // interestAccrued - will calculate later
          installmentsPaid, 
          0, // installmentsMissed
          installmentsPaid < tenureMonths ? 'ACTIVE' : 'MATURED',
          installmentsPaid < tenureMonths ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
        ]);
        
        const rdId = rdResult.rows[0].id;
        
        console.log(`   ✅ Created RD ${accountNumber} for ${member.f_name} ${member.l_name || ''}`);
        console.log(`      Monthly: ₹${monthlyInstallment}, Rate: ${interestRate}%, Tenure: ${tenureMonths} months`);
        console.log(`      Installments Paid: ${installmentsPaid}/${tenureMonths}`);
        
        // Create installment records
        for (let j = 1; j <= installmentsPaid; j++) {
          const dueDate = new Date(startDate);
          dueDate.setMonth(dueDate.getMonth() + j - 1);
          
          const paidDate = new Date(dueDate);
          paidDate.setDate(paidDate.getDate() + Math.floor(Math.random() * 5)); // Random 0-5 day delay
          
          await pool.query(`
            INSERT INTO rd_installments (
              "recurringDepositId", "installmentNumber", "amount", "dueDate", 
              "paidDate", "paidAmount", "status", "paymentMode", "receiptNumber", "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          `, [
            rdId, 
            j, 
            monthlyInstallment, 
            dueDate, 
            paidDate, 
            monthlyInstallment, 
            'PAID', 
            'CASH', 
            `RCP${accountNumber}${String(j).padStart(3, '0')}`
          ]);
        }
        
        // Create pending installments
        for (let j = installmentsPaid + 1; j <= Math.min(installmentsPaid + 3, tenureMonths); j++) {
          const dueDate = new Date(startDate);
          dueDate.setMonth(dueDate.getMonth() + j - 1);
          
          await pool.query(`
            INSERT INTO rd_installments (
              "recurringDepositId", "installmentNumber", "amount", "dueDate", 
              "status", "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          `, [
            rdId, 
            j, 
            monthlyInstallment, 
            dueDate, 
            dueDate < currentDate ? 'OVERDUE' : 'PENDING'
          ]);
        }
        
      } catch (error) {
        console.log(`   ❌ Error creating RD for member ${member.mbno}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('   ❌ Error creating RD sample data:', error.message);
  }
}

async function verifyData() {
  console.log('\n🔍 Verifying created data...');
  
  try {
    // Check RD accounts with member details
    const rdData = await pool.query(`
      SELECT 
        rd."accountNumber",
        rd."memberId",
        m.f_name || ' ' || COALESCE(m.l_name, '') as member_name,
        rd."monthlyInstallment",
        rd."interestRate",
        rd."tenureMonths",
        rd."installmentsPaid",
        rd.status,
        rd."startDate"
      FROM recurring_deposits rd
      LEFT JOIN member_master m ON rd."memberId" = m.mbno
      WHERE rd."accountNumber" LIKE 'RD%'
      ORDER BY rd."accountNumber"
    `);
    
    console.log(`   📊 Created ${rdData.rows.length} RD accounts:`);
    
    rdData.rows.forEach((account, index) => {
      console.log(`   ${index + 1}. ${account.accountNumber}`);
      console.log(`      Member: ${account.member_name} (${account.memberId})`);
      console.log(`      Monthly: ₹${account.monthlyInstallment}, Rate: ${account.interestRate}%`);
      console.log(`      Progress: ${account.installmentsPaid}/${account.tenureMonths} installments`);
      console.log(`      Status: ${account.status}`);
      console.log(`      Started: ${new Date(account.startDate).toLocaleDateString()}`);
      console.log('');
    });
    
    // Check installments
    const installmentData = await pool.query(`
      SELECT 
        COUNT(*) as total_installments,
        COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_installments,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_installments,
        COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END) as overdue_installments,
        SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END) as total_collected
      FROM rd_installments ri
      JOIN recurring_deposits rd ON ri."recurringDepositId" = rd.id
      WHERE rd."accountNumber" LIKE 'RD%'
    `);
    
    const stats = installmentData.rows[0];
    console.log('   📈 Installment Statistics:');
    console.log(`      Total Installments: ${stats.total_installments}`);
    console.log(`      Paid: ${stats.paid_installments}`);
    console.log(`      Pending: ${stats.pending_installments}`);
    console.log(`      Overdue: ${stats.overdue_installments}`);
    console.log(`      Total Collected: ₹${parseFloat(stats.total_collected || 0).toFixed(2)}`);
    
  } catch (error) {
    console.error('   ❌ Error verifying data:', error.message);
  }
}

async function generateTestInstructions() {
  console.log('\n📋 UI Testing Instructions:');
  console.log('='.repeat(50));
  
  try {
    // Get sample accounts for testing
    const testAccounts = await pool.query(`
      SELECT 
        rd."accountNumber",
        rd."memberId",
        m.f_name || ' ' || COALESCE(m.l_name, '') as member_name,
        rd."monthlyInstallment",
        rd."interestRate",
        rd."installmentsPaid",
        rd."tenureMonths",
        rd."startDate"
      FROM recurring_deposits rd
      LEFT JOIN member_master m ON rd."memberId" = m.mbno
      WHERE rd."accountNumber" LIKE 'RD%'
      AND rd.status = 'ACTIVE'
      ORDER BY rd."installmentsPaid" DESC
      LIMIT 3
    `);
    
    console.log('🎯 Test Cases for UI:');
    console.log('');
    
    testAccounts.rows.forEach((account, index) => {
      const startDate = new Date(account.startDate);
      const currentDate = new Date();
      const monthsCompleted = Math.floor((currentDate - startDate) / (30 * 24 * 60 * 60 * 1000));
      const totalDeposited = account.monthlyInstallment * account.installmentsPaid;
      const prematureRate = account.interestRate - 1.0; // 1% penalty
      const timeInYears = monthsCompleted / 12;
      const interestEarned = (totalDeposited * prematureRate * timeInYears) / 100;
      const totalAmount = totalDeposited + interestEarned;
      
      console.log(`Test Case ${index + 1}:`);
      console.log(`   Member Number: ${account.memberId}`);
      console.log(`   Member Name: ${account.member_name}`);
      console.log(`   Account Number: ${account.accountNumber}`);
      console.log(`   Expected Results:`);
      console.log(`     Duration: ${monthsCompleted} months`);
      console.log(`     Total Deposited: ₹${totalDeposited.toFixed(2)}`);
      console.log(`     Premature Rate: ${prematureRate.toFixed(2)}%`);
      console.log(`     Interest Earned: ₹${interestEarned.toFixed(2)}`);
      console.log(`     Total Amount: ₹${totalAmount.toFixed(2)}`);
      console.log('');
    });
    
    console.log('📝 Steps to Test:');
    console.log('1. Open the Premature Information RD page');
    console.log('2. Click "Search Member" and enter one of the member numbers above');
    console.log('3. Select the corresponding RD account from the dropdown');
    console.log('4. Click "Calculate" button');
    console.log('5. Verify the calculated values match the expected results');
    console.log('6. Check that the UI is responsive and displays properly');
    
  } catch (error) {
    console.error('❌ Error generating test instructions:', error.message);
  }
}

async function main() {
  try {
    // Test database connection
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();
    
    // Run the data population process
    await cleanupExistingData();
    await createRDSampleData();
    await verifyData();
    await generateTestInstructions();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ RD Sample Data Population Complete!');
    console.log('The PrematureInformationRD component is now ready for testing.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch(console.error);