const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function debugMemberLedgerAPI() {
  const client = await pool.connect();
  
  try {
    console.log('=== DEBUGGING MEMBER LEDGER API ===\n');
    
    const memberNo = '610031566';
    const fromDate = '2020-01-01';
    const toDate = '2025-12-28';
    
    console.log(`Testing with parameters:`);
    console.log(`- memberNo: ${memberNo}`);
    console.log(`- fromDate: ${fromDate}`);
    console.log(`- toDate: ${toDate}\n`);
    
    // 1. Check if ledger table exists
    console.log('1. Checking if ledger table exists...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ledger'
      );
    `);
    console.log(`Ledger table exists: ${tableCheck.rows[0].exists}\n`);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ LEDGER TABLE DOES NOT EXIST!');
      
      // Check what tables do exist
      console.log('\nAvailable tables:');
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);
      tables.rows.forEach(row => console.log(`- ${row.table_name}`));
      return;
    }
    
    // 2. Check ledger table structure
    console.log('2. Checking ledger table structure...');
    const structure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'ledger'
      ORDER BY ordinal_position;
    `);
    
    console.log('Ledger table columns:');
    structure.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    console.log();
    
    // 3. Check if member exists in any member table
    console.log('3. Checking if member exists...');
    
    // Try different possible member tables
    const memberTables = ['member_master', 'membermaster', 'members'];
    let memberExists = false;
    
    for (const table of memberTables) {
      try {
        const memberCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [table]);
        
        if (memberCheck.rows[0].exists) {
          console.log(`Found member table: ${table}`);
          
          // Check if member exists in this table
          const memberQuery = await client.query(`
            SELECT * FROM ${table} 
            WHERE mbno = $1 OR member_no = $1 OR memberNo = $1
            LIMIT 1;
          `, [memberNo]);
          
          if (memberQuery.rows.length > 0) {
            console.log(`✅ Member ${memberNo} found in ${table}:`, memberQuery.rows[0]);
            memberExists = true;
            break;
          }
        }
      } catch (error) {
        // Table doesn't exist or query failed, continue
      }
    }
    
    if (!memberExists) {
      console.log(`❌ Member ${memberNo} not found in any member table\n`);
    }
    
    // 4. Check ledger data for this member
    console.log('4. Checking ledger data...');
    
    try {
      const ledgerQuery = `
        SELECT 
          l.trans_date as "transDate",
          l.trans_type as "transType",
          l.code as "code",
          l.trans_amt as "transAmt",
          l.narration as "narration",
          l.vchr_no as "voucherNo",
          l.trans_time as "transTime"
        FROM ledger l
        WHERE l.mbno = $1
        AND l.trans_date >= $2::date
        AND l.trans_date <= $3::date
        ORDER BY l.trans_date ASC, l.trans_time ASC
        LIMIT 5;
      `;
      
      const ledgerResult = await client.query(ledgerQuery, [memberNo, fromDate, toDate]);
      
      console.log(`Found ${ledgerResult.rows.length} ledger entries for member ${memberNo}`);
      if (ledgerResult.rows.length > 0) {
        console.log('Sample entries:');
        ledgerResult.rows.forEach((row, index) => {
          console.log(`${index + 1}. Date: ${row.transDate}, Type: ${row.transType}, Amount: ${row.transAmt}`);
        });
      }
      
    } catch (error) {
      console.log(`❌ Error querying ledger: ${error.message}`);
      
      // Try to understand the ledger table structure better
      console.log('\nTrying to get sample ledger data...');
      try {
        const sampleData = await client.query('SELECT * FROM ledger LIMIT 3');
        console.log('Sample ledger data:');
        sampleData.rows.forEach((row, index) => {
          console.log(`${index + 1}.`, row);
        });
      } catch (sampleError) {
        console.log(`❌ Error getting sample data: ${sampleError.message}`);
      }
    }
    
    // 5. Check for any ledger entries at all
    console.log('\n5. Checking total ledger entries...');
    try {
      const totalCount = await client.query('SELECT COUNT(*) as count FROM ledger');
      console.log(`Total ledger entries: ${totalCount.rows[0].count}`);
      
      if (totalCount.rows[0].count > 0) {
        // Get unique member numbers
        const uniqueMembers = await client.query(`
          SELECT DISTINCT mbno 
          FROM ledger 
          WHERE mbno IS NOT NULL 
          ORDER BY mbno 
          LIMIT 10
        `);
        console.log('Sample member numbers in ledger:');
        uniqueMembers.rows.forEach(row => console.log(`- ${row.mbno}`));
      }
    } catch (error) {
      console.log(`❌ Error counting ledger entries: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

debugMemberLedgerAPI().catch(console.error);