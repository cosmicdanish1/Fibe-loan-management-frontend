const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function populateSBAccounts() {
  console.log('🏦 POPULATING SB ACCOUNTS DATA\n');

  try {
    const client = await pool.connect();

    // Create SB accounts based on existing ledger data
    const sbAccountsData = [
      // Member 610017770 - 3 SB accounts
      { 
        memberId: 610017770, 
        accountNumber: 'SB610017770001', 
        interestRate: 4.0, 
        currentBalance: 28238,
        openingDate: '2022-01-01',
        accountCode: 'A1001'
      },
      { 
        memberId: 610017770, 
        accountNumber: 'SB610017770002', 
        interestRate: 4.5, 
        currentBalance: 54800,
        openingDate: '2022-06-01',
        accountCode: 'A1008'
      },
      { 
        memberId: 610017770, 
        accountNumber: 'SB610017770003', 
        interestRate: 4.2, 
        currentBalance: 97867,
        openingDate: '2021-01-01',
        accountCode: 'A1047'
      },
      
      // Member 1001 - 3 SB accounts
      { 
        memberId: 1001, 
        accountNumber: 'SB1001001', 
        interestRate: 4.0, 
        currentBalance: 45034,
        openingDate: '2022-01-01',
        accountCode: 'A001'
      },
      { 
        memberId: 1001, 
        accountNumber: 'SB1001002', 
        interestRate: 4.0, 
        currentBalance: 25000,
        openingDate: '2022-03-01',
        accountCode: 'A1001'
      },
      { 
        memberId: 1001, 
        accountNumber: 'SB1001003', 
        interestRate: 3.8, 
        currentBalance: 13600,
        openingDate: '2022-05-01',
        accountCode: 'A1003'
      },
      
      // Member 1002 - 4 SB accounts
      { 
        memberId: 1002, 
        accountNumber: 'SB1002001', 
        interestRate: 4.0, 
        currentBalance: 5397,
        openingDate: '2022-01-01',
        accountCode: 'A001'
      },
      { 
        memberId: 1002, 
        accountNumber: 'SB1002002', 
        interestRate: 4.0, 
        currentBalance: 15000,
        openingDate: '2022-02-01',
        accountCode: 'A1001'
      },
      { 
        memberId: 1002, 
        accountNumber: 'SB1002003', 
        interestRate: 4.5, 
        currentBalance: 85000,
        openingDate: '2021-12-01',
        accountCode: 'A1002'
      },
      { 
        memberId: 1002, 
        accountNumber: 'SB1002004', 
        interestRate: 3.8, 
        currentBalance: 20400,
        openingDate: '2022-04-01',
        accountCode: 'A1003'
      },
      
      // Member 1003 - 2 SB accounts
      { 
        memberId: 1003, 
        accountNumber: 'SB1003001', 
        interestRate: 4.0, 
        currentBalance: 5000,
        openingDate: '2022-01-01',
        accountCode: 'A1001'
      },
      { 
        memberId: 1003, 
        accountNumber: 'SB1003002', 
        interestRate: 3.8, 
        currentBalance: 27200,
        openingDate: '2022-03-01',
        accountCode: 'A1003'
      }
    ];

    console.log('Creating SB accounts...');
    let created = 0;
    let skipped = 0;

    for (const account of sbAccountsData) {
      try {
        await client.query(`
          INSERT INTO savings_accounts (
            "accountNumber", "memberId", "openingDate", "interestRate", 
            "currentBalance", "lastTransactionDate", "status"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          account.accountNumber,
          account.memberId,
          account.openingDate,
          account.interestRate,
          account.currentBalance,
          new Date(),
          'ACTIVE'
        ]);
        console.log(`✅ Created SB Account: ${account.accountNumber} for Member ${account.memberId} - ₹${account.currentBalance}`);
        created++;
      } catch (insertError) {
        if (insertError.code === '23505') { // Duplicate key error
          console.log(`⚠️ SB Account ${account.accountNumber} already exists`);
          skipped++;
        } else {
          console.log(`❌ Error creating SB Account ${account.accountNumber}:`, insertError.message);
        }
      }
    }

    // Verify created accounts
    console.log('\n📊 VERIFICATION...');
    const verifyQuery = `
      SELECT 
        "accountNumber",
        "memberId",
        "interestRate",
        "currentBalance",
        "openingDate",
        "status"
      FROM savings_accounts 
      WHERE "memberId" IN (610017770, 1001, 1002, 1003)
      ORDER BY "memberId", "accountNumber"
    `;
    
    const sbAccounts = await client.query(verifyQuery);
    console.log(`Found ${sbAccounts.rows.length} SB accounts:`);
    sbAccounts.rows.forEach(sb => {
      console.log(`   Member ${sb.memberId}: ${sb.accountNumber} - ₹${sb.currentBalance} (${sb.interestRate}%)`);
    });

    console.log(`\n✅ Summary: ${created} created, ${skipped} skipped, ${sbAccounts.rows.length} total accounts`);

    client.release();
    console.log('\n🎉 SB ACCOUNTS POPULATION COMPLETED!');

  } catch (error) {
    console.error('❌ Error populating SB accounts:', error);
  } finally {
    await pool.end();
  }
}

// Run the population
populateSBAccounts();