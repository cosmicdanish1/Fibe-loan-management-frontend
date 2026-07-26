const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function fixEMITestData() {
  console.log('📊 Fixing EMI Test Data\n');
  console.log('=' .repeat(50));

  try {
    // Test 1: Check the loan_master table structure
    console.log('\n1. Checking loan_master table structure...');
    
    const tableStructureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'loan_master' 
        AND column_name IN ('loantype', 'loancaseno', 'mbno', 'loan_amt', 'rate')
      ORDER BY ordinal_position
    `;
    
    const structure = await pool.query(tableStructureQuery);
    console.log('\n   📊 Table Structure:');
    structure.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Test 2: Check existing data patterns
    console.log('\n2. Checking existing data patterns...');
    
    const dataPatternQuery = `
      SELECT 
        mbno,
        loancaseno,
        loantype,
        loan_amt,
        rate,
        no_of_instal,
        instal_amt,
        balance
      FROM loan_master 
      WHERE mbno IN ('610017770', '610028942', '610027514')
      ORDER BY mbno, loancaseno
      LIMIT 10
    `;
    
    const existingData = await pool.query(dataPatternQuery);
    console.log('\n   📊 Existing Data Sample:');
    existingData.rows.forEach(row => {
      console.log(`   ${row.mbno}: ${row.loancaseno} | Type: ${row.loantype} | Amount: ${row.loan_amt}`);
    });

    // Test 3: Insert proper test loans with correct data types
    console.log('\n3. Inserting test loans with correct data types...');
    
    // First, let's create some test loans with proper numeric loan case numbers
    const testLoans = [
      {
        mbno: '610017770',
        loancaseno: 20250001,
        loantype: 1, // Assuming 1=RLN, 2=ELN, 3=ALN based on common patterns
        loan_amt: '250000.00',
        rate: '10.50',
        no_of_instal: 60,
        instal_amt: '5372.00',
        balance: '180000.00',
        purpose: 'Home Renovation'
      },
      {
        mbno: '610017770',
        loancaseno: 20250002,
        loantype: 3, // ALN
        loan_amt: '50000.00',
        rate: '12.00',
        no_of_instal: 24,
        instal_amt: '2354.00',
        balance: '35000.00',
        purpose: 'Personal Emergency'
      },
      {
        mbno: '610028942',
        loancaseno: 20250003,
        loantype: 2, // ELN
        loan_amt: '75000.00',
        rate: '15.00',
        no_of_instal: 36,
        instal_amt: '2598.00',
        balance: '60000.00',
        purpose: 'Medical Emergency'
      }
    ];

    for (const loan of testLoans) {
      try {
        const insertLoanQuery = `
          INSERT INTO loan_master (
            mbno, loancaseno, loantype, loan_amt, rate, 
            no_of_instal, instal_amt, balance, purpose
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (loancaseno) DO UPDATE SET
            loantype = EXCLUDED.loantype,
            loan_amt = EXCLUDED.loan_amt,
            rate = EXCLUDED.rate,
            no_of_instal = EXCLUDED.no_of_instal,
            instal_amt = EXCLUDED.instal_amt,
            balance = EXCLUDED.balance,
            purpose = EXCLUDED.purpose
        `;
        
        await pool.query(insertLoanQuery, [
          loan.mbno, loan.loancaseno, loan.loantype, loan.loan_amt, loan.rate,
          loan.no_of_instal, loan.instal_amt, loan.balance, loan.purpose
        ]);
        
        console.log(`   ✅ Added/Updated loan: ${loan.loancaseno} for member ${loan.mbno}`);
      } catch (error) {
        console.log(`   ⚠️  Error with loan ${loan.loancaseno}: ${error.message}`);
      }
    }

    // Test 4: Generate EMI demands for the test loans
    console.log('\n4. Generating EMI demands...');
    
    const testMembers = ['610017770', '610028942'];
    
    for (const memberNo of testMembers) {
      // Get loans for this member
      const memberLoansQuery = `
        SELECT loancaseno, loantype, instal_amt, rate, balance
        FROM loan_master 
        WHERE mbno = $1 AND loancaseno >= 20250000
      `;
      
      const memberLoans = await pool.query(memberLoansQuery, [memberNo]);
      
      for (const loan of memberLoans.rows) {
        // Generate demands for 2024 and 2025
        for (let year = 2024; year <= 2025; year++) {
          for (let month = 1; month <= 12; month++) {
            try {
              // Determine loan type string for demand columns
              let loanTypeStr = 'rln';
              if (loan.loantype == 2) loanTypeStr = 'eln';
              if (loan.loantype == 3) loanTypeStr = 'aln';
              
              const insertDemandQuery = `
                INSERT INTO demand_master (
                  demand_for_year, demand_for_month, mbno, loancaseno,
                  ${loanTypeStr}_installment_amount, ${loanTypeStr}_interest, ${loanTypeStr}_amount,
                  demand_posted, dmnd_gnrt_date, officeno, dmnd_srno
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, 'Y', CURRENT_DATE, 1,
                  (SELECT COALESCE(MAX(dmnd_srno), 0) + 1 FROM demand_master)
                )
                ON CONFLICT DO NOTHING
              `;
              
              const installmentAmount = parseFloat(loan.instal_amt || 0);
              const interestAmount = installmentAmount * parseFloat(loan.rate || 0) / 100 / 12;
              const principalAmount = installmentAmount - interestAmount;
              
              await pool.query(insertDemandQuery, [
                year, month, memberNo, loan.loancaseno,
                installmentAmount, interestAmount, principalAmount
              ]);
              
              // Mark some demands as paid (simulate payment history)
              if (year === 2024 && month <= 8) {
                const updatePaidQuery = `
                  UPDATE demand_master 
                  SET receipt_vchr_no = 'RCP' || $1 || LPAD($2::text, 2, '0') || LPAD($3::text, 3, '0')
                  WHERE mbno = $4 AND demand_for_year = $1 AND demand_for_month = $2 
                    AND loancaseno = $5 AND receipt_vchr_no IS NULL
                `;
                
                await pool.query(updatePaidQuery, [
                  year, month, Math.floor(Math.random() * 1000), memberNo, loan.loancaseno
                ]);
              }
            } catch (error) {
              // Ignore conflicts, continue with next
            }
          }
        }
      }
      
      console.log(`   ✅ Generated EMI demands for member: ${memberNo}`);
    }

    // Test 5: Verify the populated data
    console.log('\n5. Verifying populated data...');
    
    const verifyQuery = `
      SELECT 
        lm.mbno,
        lm.loancaseno,
        lm.loantype,
        lm.loan_amt,
        lm.rate,
        lm.no_of_instal,
        lm.instal_amt,
        lm.balance,
        lm.purpose,
        COUNT(dm.dmnd_srno) as demand_count,
        COUNT(CASE WHEN dm.receipt_vchr_no IS NOT NULL THEN 1 END) as paid_count
      FROM loan_master lm
      LEFT JOIN demand_master dm ON lm.mbno = dm.mbno AND lm.loancaseno::text = dm.loancaseno
      WHERE lm.mbno IN ('610017770', '610028942') AND lm.loancaseno >= 20250000
      GROUP BY lm.mbno, lm.loancaseno, lm.loantype, lm.loan_amt, lm.rate, 
               lm.no_of_instal, lm.instal_amt, lm.balance, lm.purpose
      ORDER BY lm.mbno, lm.loancaseno
    `;
    
    const verifyResult = await pool.query(verifyQuery);
    
    console.log('\n   📊 Test Loan Data Summary:');
    verifyResult.rows.forEach(loan => {
      const loanTypeMap = { 1: 'RLN', 2: 'ELN', 3: 'ALN' };
      console.log(`   Member ${loan.mbno}:`);
      console.log(`     - Loan: ${loan.loancaseno} (${loanTypeMap[loan.loantype] || loan.loantype})`);
      console.log(`     - Amount: ₹${parseFloat(loan.loan_amt || 0).toLocaleString('en-IN')}`);
      console.log(`     - Rate: ${loan.rate}%`);
      console.log(`     - EMI: ₹${parseFloat(loan.instal_amt || 0).toLocaleString('en-IN')}`);
      console.log(`     - Balance: ₹${parseFloat(loan.balance || 0).toLocaleString('en-IN')}`);
      console.log(`     - Demands: ${loan.demand_count}, Paid: ${loan.paid_count}`);
      console.log(`     - Purpose: ${loan.purpose || 'N/A'}`);
    });

    console.log('\n' + '=' .repeat(50));
    console.log('🎯 EMI Test Data Fixed and Populated!');
    console.log('✅ Test loans added with correct data types');
    console.log('✅ EMI demands generated');
    console.log('✅ Payment history simulated');
    console.log('\n🚀 Ready for EMI Chart testing!');

  } catch (error) {
    console.error('❌ Error fixing EMI test data:', error.message);
  } finally {
    await pool.end();
  }
}

fixEMITestData().catch(console.error);