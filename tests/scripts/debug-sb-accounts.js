const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function debugSBAccounts() {
  console.log('🔍 DEBUGGING SB ACCOUNTS ISSUE\n');
  
  try {
    const client = await pool.connect();
    
    // Check if SB accounts exist for member 610017770
    console.log('1. Checking SB accounts in database...');
    const sbQuery = `
      SELECT 
        "accountNumber",
        "memberId",
        "interestRate",
        "currentBalance",
        "openingDate",
        "status"
      FROM savings_accounts 
      WHERE "memberId" = $1
    `;
    
    const sbResult = await client.query(sbQuery, [610017770]);
    console.log(`Found ${sbResult.rows.length} SB accounts for member 610017770:`);
    sbResult.rows.forEach(account => {
      console.log(`   ${account.accountNumber}: ₹${account.currentBalance} @ ${account.interestRate}% (${account.status})`);
    });
    
    // Check the exact query that the API uses
    console.log('\n2. Testing API query format...');
    const apiQuery = `
      SELECT 
        "accountNumber",
        "memberId",
        "interestRate",
        "currentBalance",
        "openingDate",
        "minimumBalance",
        "status",
        "lastTransactionDate"
      FROM savings_accounts 
      WHERE "memberId" = $1 
      AND ("status" = 'ACTIVE' OR "status" IS NULL)
      ORDER BY "openingDate" DESC
    `;
    
    const apiResult = await client.query(apiQuery, [610017770]);
    console.log(`API query returned ${apiResult.rows.length} accounts:`);
    apiResult.rows.forEach(account => {
      console.log(`   ${account.accountNumber}: ₹${account.currentBalance} @ ${account.interestRate}%`);
    });
    
    // Check if backend server is running
    console.log('\n3. Testing backend API endpoint...');
    try {
      const fetch = require('node-fetch');
      const response = await fetch('http://localhost:3001/api/v1/utilities/search/sb-accounts?memberNo=610017770');
      const data = await response.json();
      console.log('API Response:', JSON.stringify(data, null, 2));
    } catch (apiError) {
      console.log('❌ Backend API not accessible:', apiError.message);
      console.log('   Make sure backend server is running on port 3001');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await pool.end();
  }
}

debugSBAccounts();