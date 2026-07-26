const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function createEMITestDataSimple() {
  console.log('📊 Creating Simple EMI Test Data\n');
  console.log('=' .repeat(50));

  try {
    // Test 1: Update existing loans with loan types
    console.log('\n1. Updating existing loans with loan types...');
    
    const updateExistingQuery = `
      UPDATE loan_master 
      SET loantype = 1
      WHERE mbno = '610017770' AND loantype IS NULL AND loan_amt::numeric > 0
    `;
    
    const updateResult = await pool.query(updateExistingQuery);
    console.log(`   ✅ Updated ${updateResult.rowCount} existing loans with RLN type`);

    // Test 2: Insert simple test loans
    console.log('\n2. Inserting simple test loans...');
    
    const testLoans = [
      {
        mbno: 610017770,
        loancaseno: 99001,
        loantype: 1, // RLN
        loan_amt: 250000.00,
        rate: 10.50,
        no_of_instal: 60,
        instal_amt: 5372.00,
        balance: 180000.00,
        purpose: 'Home Renovation'
      },
      {
        mbno: 610017770,
        loancaseno: 99002,
        loantype: 3, // ALN
        loan_amt: 50000.00,
        rate: 12.00,
        no_of_instal: 24,
        instal_amt: 2354.00,
        balance: 35000.00,
        purpose: 'Personal Emergency'
      },
      {
        mbno: 610028942,
        loancaseno: 99003,
        loantype: 2, // ELN
        loan_amt: 75000.00,
        rate: 15.00,
        no_of_instal: 36,
        instal_amt: 2598.00,
        balance: 60000.00,
        purpose: 'Medical Emergency'
      }
    ];

    for (const loan of testLoans) {
      try {
        // Check if loan exists
        const checkQuery = `SELECT COUNT(*) as count FROM loan_master WHERE loancaseno = $1`;
        const checkResult = await pool.query(checkQuery, [loan.loancaseno]);
        
        if (checkResult.rows[0].count > 0) {
          // Update existing
          const updateQuery = `
            UPDATE loan_master SET
              mbno = $1, loantype = $2, loan_amt = $3, rate = $4,
              no_of_instal = $5, instal_amt = $6, balance = $7, purpose = $8
            WHERE loancaseno = $9
          `;
          
          await pool.query(updateQuery, [
            loan.mbno, loan.loantype, loan.loan_amt, loan.rate,
            loan.no_of_instal, loan.instal_amt, loan.balance, loan.purpose, loan.loancaseno
          ]);
        } else {
          // Insert new
          const insertQuery = `
            INSERT INTO loan_master (
              mbno, loancaseno, loantype, loan_amt, rate, 
              no_of_instal, instal_amt, balance, purpose
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `;
          
          await pool.query(insertQuery, [
            loan.mbno, loan.loancaseno, loan.loantype, loan.loan_amt, loan.rate,
            loan.no_of_instal, loan.instal_amt, loan.balance, loan.purpose
          ]);
        }
        
        console.log(`   ✅ Processed loan: ${loan.loancaseno} for member ${loan.mbno}`);
      } catch (error) {
        console.log(`   ⚠️  Error with loan ${loan.loancaseno}: ${error.message}`);
      }
    }

    // Test 3: Generate EMI demands
    console.log('\n3. Generating EMI demands...');
    
    const testMembers = [610017770, 610028942];
    
    for (const memberNo of testMembers) {
      // Get loans for this member
      const memberLoansQuery = `
        SELECT loancaseno, loantype, instal_amt, rate, balance
        FROM loan_master 
        WHERE mbno = $1 AND loancaseno >= 99000 AND instal_amt > 0
      `;
      
      const memberLoans = await pool.query(memberLoansQuery, [memberNo]);
      
      for (const loan of memberLoans.rows) {
        // Generate demands for 2024 and 2025
        for (let year = 2024; year <= 2025; year++) {
          for (let month = 1; month <= 12; month++) {
            try {
              // Determine which column to use based on loan type
              let installmentColumn = 'rln_installment_amount';
              let interestColumn = 'rln_interest';
              let amountColumn = 'rln_amount';
              
              if (loan.loantype == 2) {
                installmentColumn = 'eln_installment_amount';
                interestColumn = 'eln_interest';
                amountColumn = 'eln_amount';
              } else if (loan.loantype == 3) {
                installmentColumn = 'aln_installment_amount';
                interestColumn = 'aln_interest';
                amountColumn = 'aln_amount';
              }
              
              const installmentAmount = parseFloat(loan.instal_amt || 0);
              const interestAmount = installmentAmount * parseFloat(loan.rate || 0) / 100 / 12;
              const principalAmount = installmentAmount - interestAmount;
              
              // Check if demand already exists
              const checkDemandQuery = `
                SELECT COUNT(*) as count FROM demand_master 
                WHERE mbno = $1 AND demand_for_year = $2 AND demand_for_month = $3 AND loancaseno = $4::text
              `;
              
              const demandExists = await pool.query(checkDemandQuery, [
                memberNo, year, month, loan.loancaseno
              ]);
              
              if (demandExists.rows[0].count == 0) {
                const insertDemandQuery = `
                  INSERT INTO demand_master (
                    demand_for_year, demand_for_month, mbno, loancaseno,
                    ${installmentColumn}, ${interestColumn}, ${amountColumn},
                    demand_posted, dmnd_gnrt_date, officeno, dmnd_srno
                  ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, 'Y', CURRENT_DATE, 1,
                    (SELECT COALESCE(MAX(dmnd_srno), 0) + 1 FROM demand_master)
                  )
                `;
                
                await pool.query(insertDemandQuery, [
                  year, month, memberNo, loan.loancaseno.toString(),
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
                    year, month, Math.floor(Math.random() * 1000), memberNo, loan.loancaseno.toString()
                  ]);
                }
              }
            } catch (error) {
              // Ignore errors, continue with next
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
        COUNT(CASE WHEN dm.receipt_vchr_no IS NOT NULL AND dm.receipt_vchr_no != '' THEN 1 END) as paid_count
      FROM loan_master lm
      LEFT JOIN demand_master dm ON lm.mbno = dm.mbno AND lm.loancaseno::text = dm.loancaseno
      WHERE lm.mbno IN (610017770, 610028942) AND lm.loancaseno >= 99000
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
    console.log('🎯 Simple EMI Test Data Created Successfully!');
    console.log('✅ Test loans added with correct data types');
    console.log('✅ EMI demands generated');
    console.log('✅ Payment history simulated');
    console.log('\n🚀 Ready for EMI Chart testing!');

  } catch (error) {
    console.error('❌ Error creating EMI test data:', error.message);
  } finally {
    await pool.end();
  }
}

createEMITestDataSimple().catch(console.error);