const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function populateEMITestData() {
  console.log('📊 Populating EMI Test Data\n');
  console.log('=' .repeat(50));

  try {
    // Test 1: Update existing loan records with proper loan types
    console.log('\n1. Updating existing loan records...');
    
    const updateLoanTypesQuery = `
      UPDATE loan_master 
      SET loantype = CASE 
        WHEN loancaseno::text LIKE '%588%' THEN 'RLN'
        WHEN loancaseno::text LIKE '%593%' THEN 'ELN'
        WHEN loancaseno::text LIKE '%14078%' THEN 'ALN'
        ELSE 'RLN'
      END
      WHERE mbno = '610017770' AND loantype IS NULL
    `;
    
    const updateResult = await pool.query(updateLoanTypesQuery);
    console.log(`   ✅ Updated ${updateResult.rowCount} loan records with loan types`);

    // Test 2: Insert additional test loans for better testing
    console.log('\n2. Adding additional test loans...');
    
    const testLoans = [
      {
        mbno: '610017770',
        loancaseno: 'LN2025001',
        loantype: 'RLN',
        loan_amt: '250000.00',
        rate: '10.50',
        no_of_instal: 60,
        instal_amt: '5372.00',
        balance: '180000.00',
        purpose: 'Home Renovation',
        payment_date: '2024-01-15'
      },
      {
        mbno: '610017770',
        loancaseno: 'LN2025002',
        loantype: 'ALN',
        loan_amt: '50000.00',
        rate: '12.00',
        no_of_instal: 24,
        instal_amt: '2354.00',
        balance: '35000.00',
        purpose: 'Personal Emergency',
        payment_date: '2024-06-01'
      },
      {
        mbno: '610028942',
        loancaseno: 'LN2025003',
        loantype: 'ELN',
        loan_amt: '75000.00',
        rate: '15.00',
        no_of_instal: 36,
        instal_amt: '2598.00',
        balance: '60000.00',
        purpose: 'Medical Emergency',
        payment_date: '2024-03-01'
      },
      {
        mbno: '610027514',
        loancaseno: 'LN2025004',
        loantype: 'RLN',
        loan_amt: '300000.00',
        rate: '11.00',
        no_of_instal: 84,
        instal_amt: '4892.00',
        balance: '275000.00',
        purpose: 'Vehicle Purchase',
        payment_date: '2024-02-01'
      }
    ];

    for (const loan of testLoans) {
      try {
        const insertLoanQuery = `
          INSERT INTO loan_master (
            mbno, loancaseno, loantype, loan_amt, rate, 
            no_of_instal, instal_amt, balance, purpose, payment_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (loancaseno) DO UPDATE SET
            loantype = EXCLUDED.loantype,
            loan_amt = EXCLUDED.loan_amt,
            rate = EXCLUDED.rate,
            no_of_instal = EXCLUDED.no_of_instal,
            instal_amt = EXCLUDED.instal_amt,
            balance = EXCLUDED.balance,
            purpose = EXCLUDED.purpose,
            payment_date = EXCLUDED.payment_date
        `;
        
        await pool.query(insertLoanQuery, [
          loan.mbno, loan.loancaseno, loan.loantype, loan.loan_amt, loan.rate,
          loan.no_of_instal, loan.instal_amt, loan.balance, loan.purpose, loan.payment_date
        ]);
        
        console.log(`   ✅ Added/Updated loan: ${loan.loancaseno} for member ${loan.mbno}`);
      } catch (error) {
        console.log(`   ⚠️  Error with loan ${loan.loancaseno}: ${error.message}`);
      }
    }

    // Test 3: Generate EMI demands for the new loans
    console.log('\n3. Generating EMI demands for test loans...');
    
    const testMembers = ['610017770', '610028942', '610027514'];
    
    for (const memberNo of testMembers) {
      // Get loans for this member
      const memberLoansQuery = `
        SELECT loancaseno, loantype, instal_amt, rate, balance
        FROM loan_master 
        WHERE mbno = $1 AND instal_amt::numeric > 0
      `;
      
      const memberLoans = await pool.query(memberLoansQuery, [memberNo]);
      
      for (const loan of memberLoans.rows) {
        // Generate demands for 2024 and 2025
        for (let year = 2024; year <= 2025; year++) {
          for (let month = 1; month <= 12; month++) {
            try {
              const insertDemandQuery = `
                INSERT INTO demand_master (
                  demand_for_year, demand_for_month, mbno, loancaseno,
                  rln_installment_amount, rln_interest, rln_amount,
                  eln_installment_amount, eln_interest, eln_amount,
                  aln_installment_amount, aln_interest, aln_amount,
                  demand_posted, dmnd_gnrt_date, officeno, dmnd_srno
                ) VALUES (
                  $1, $2, $3, $4,
                  CASE WHEN $5 = 'RLN' THEN $6::numeric ELSE 0 END,
                  CASE WHEN $5 = 'RLN' THEN ($6::numeric * $7::numeric / 100 / 12) ELSE 0 END,
                  CASE WHEN $5 = 'RLN' THEN $8::numeric ELSE 0 END,
                  CASE WHEN $5 = 'ELN' THEN $6::numeric ELSE 0 END,
                  CASE WHEN $5 = 'ELN' THEN ($6::numeric * $7::numeric / 100 / 12) ELSE 0 END,
                  CASE WHEN $5 = 'ELN' THEN $8::numeric ELSE 0 END,
                  CASE WHEN $5 = 'ALN' THEN $6::numeric ELSE 0 END,
                  CASE WHEN $5 = 'ALN' THEN ($6::numeric * $7::numeric / 100 / 12) ELSE 0 END,
                  CASE WHEN $5 = 'ALN' THEN $8::numeric ELSE 0 END,
                  'Y', CURRENT_DATE, 1,
                  (SELECT COALESCE(MAX(dmnd_srno), 0) + 1 FROM demand_master WHERE mbno = $3)
                )
                ON CONFLICT DO NOTHING
              `;
              
              await pool.query(insertDemandQuery, [
                year, month, memberNo, loan.loancaseno, loan.loantype,
                loan.instal_amt, loan.rate, loan.balance
              ]);
              
              // Mark some demands as paid (simulate payment history)
              if (year === 2024 && month <= 6) {
                const updatePaidQuery = `
                  UPDATE demand_master 
                  SET receipt_vchr_no = 'RCP' || $1 || $2 || LPAD($3::text, 2, '0')
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

    // Test 4: Verify the populated data
    console.log('\n4. Verifying populated data...');
    
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
      LEFT JOIN demand_master dm ON lm.mbno = dm.mbno AND lm.loancaseno = dm.loancaseno
      WHERE lm.mbno IN ('610017770', '610028942', '610027514')
        AND lm.loantype IS NOT NULL
      GROUP BY lm.mbno, lm.loancaseno, lm.loantype, lm.loan_amt, lm.rate, 
               lm.no_of_instal, lm.instal_amt, lm.balance, lm.purpose
      ORDER BY lm.mbno, lm.loancaseno
    `;
    
    const verifyResult = await pool.query(verifyQuery);
    
    console.log('\n   📊 Populated Loan Data Summary:');
    verifyResult.rows.forEach(loan => {
      console.log(`   Member ${loan.mbno}:`);
      console.log(`     - Loan: ${loan.loancaseno} (${loan.loantype})`);
      console.log(`     - Amount: ₹${parseFloat(loan.loan_amt || 0).toLocaleString('en-IN')}`);
      console.log(`     - Rate: ${loan.rate}%`);
      console.log(`     - EMI: ₹${parseFloat(loan.instal_amt || 0).toLocaleString('en-IN')}`);
      console.log(`     - Balance: ₹${parseFloat(loan.balance || 0).toLocaleString('en-IN')}`);
      console.log(`     - Demands: ${loan.demand_count}, Paid: ${loan.paid_count}`);
      console.log(`     - Purpose: ${loan.purpose || 'N/A'}`);
    });

    console.log('\n' + '=' .repeat(50));
    console.log('🎯 EMI Test Data Population Complete!');
    console.log('✅ Loan types updated');
    console.log('✅ Test loans added');
    console.log('✅ EMI demands generated');
    console.log('✅ Payment history simulated');
    console.log('\n🚀 Ready for EMI Chart testing!');

  } catch (error) {
    console.error('❌ Error populating EMI test data:', error.message);
  } finally {
    await pool.end();
  }
}

populateEMITestData().catch(console.error);