/**
 * Debug Member Lookup Data
 * Check what members are actually available in the database
 */

const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
};

console.log('=== MEMBER LOOKUP DATA DEBUG ===');

async function debugMemberLookup() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('\n--- STEP 1: CHECK MEMBER_MASTER TABLE ---');
    
    // Check total members
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM member_master');
    console.log(`✅ Total members in database: ${totalResult.rows[0].count}`);
    
    // Check active members
    const activeResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM member_master 
      WHERE isactive = '1' OR isactive IS NULL
    `);
    console.log(`✅ Active members: ${activeResult.rows[0].count}`);
    
    console.log('\n--- STEP 2: SEARCH FOR SPECIFIC MEMBER 610015819 ---');
    
    // Search for the specific member we're testing
    const specificMemberResult = await pool.query(`
      SELECT 
        mbno,
        CONCAT(prefix, ' ', f_name, ' ', COALESCE(m_name, ''), ' ', COALESCE(l_name, '')) as full_name,
        f_name,
        l_name,
        present_address,
        isactive,
        memb_date
      FROM member_master 
      WHERE mbno = $1
    `, ['610015819']);
    
    if (specificMemberResult.rows.length > 0) {
      const member = specificMemberResult.rows[0];
      console.log('✅ Member 610015819 found:');
      console.log(`   Name: ${member.full_name}`);
      console.log(`   First Name: ${member.f_name}`);
      console.log(`   Last Name: ${member.l_name}`);
      console.log(`   Address: ${member.present_address}`);
      console.log(`   Active: ${member.isactive}`);
      console.log(`   Member Date: ${member.memb_date}`);
    } else {
      console.log('❌ Member 610015819 NOT FOUND in database');
    }
    
    console.log('\n--- STEP 3: FIND MEMBERS WITH SIMILAR NUMBERS ---');
    
    // Search for members with similar numbers
    const similarResult = await pool.query(`
      SELECT 
        mbno,
        CONCAT(prefix, ' ', f_name, ' ', COALESCE(m_name, ''), ' ', COALESCE(l_name, '')) as full_name,
        isactive
      FROM member_master 
      WHERE mbno::text LIKE '61001%'
      ORDER BY mbno
      LIMIT 10
    `);
    
    console.log(`Found ${similarResult.rows.length} members with numbers starting with 61001:`);
    similarResult.rows.forEach(member => {
      console.log(`   ${member.mbno}: ${member.full_name} (Active: ${member.isactive})`);
    });
    
    console.log('\n--- STEP 4: FIND MEMBERS WITH ACCOUNTS ---');
    
    // Find members who have accounts (for passbook printing)
    const membersWithAccountsResult = await pool.query(`
      SELECT DISTINCT 
        m.mbno,
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as full_name,
        m.isactive,
        COUNT(f.account_number) as account_count
      FROM member_master m
      INNER JOIN fdmaster f ON m.mbno = f.mbno
      WHERE m.isactive = '1' OR m.isactive IS NULL
      GROUP BY m.mbno, m.prefix, m.f_name, m.m_name, m.l_name, m.isactive
      ORDER BY m.mbno
      LIMIT 20
    `);
    
    console.log(`\nFound ${membersWithAccountsResult.rows.length} members with accounts:`);
    membersWithAccountsResult.rows.forEach((member, index) => {
      console.log(`   ${index + 1}. ${member.mbno}: ${member.full_name} (${member.account_count} accounts)`);
    });
    
    console.log('\n--- STEP 5: CHECK MEMBER LOOKUP SEARCH PATTERNS ---');
    
    // Test different search patterns that member lookup might use
    const searchPatterns = [
      { pattern: 'MAHESH', description: 'Search by first name' },
      { pattern: 'AGRAWAL', description: 'Search by last name' },
      { pattern: 'MAHESH KUMAR', description: 'Search by first + middle name' },
      { pattern: '%MAHESH%', description: 'Wildcard search for MAHESH' }
    ];
    
    for (const search of searchPatterns) {
      const searchResult = await pool.query(`
        SELECT 
          mbno,
          CONCAT(prefix, ' ', f_name, ' ', COALESCE(m_name, ''), ' ', COALESCE(l_name, '')) as full_name,
          isactive
        FROM member_master 
        WHERE (
          f_name ILIKE $1 OR 
          l_name ILIKE $1 OR 
          CONCAT(f_name, ' ', COALESCE(m_name, ''), ' ', COALESCE(l_name, '')) ILIKE $1
        )
        AND (isactive = '1' OR isactive IS NULL)
        LIMIT 5
      `, [search.pattern]);
      
      console.log(`\n${search.description} (${search.pattern}):`);
      if (searchResult.rows.length > 0) {
        searchResult.rows.forEach(member => {
          console.log(`   ✅ ${member.mbno}: ${member.full_name}`);
        });
      } else {
        console.log(`   ❌ No results found`);
      }
    }
    
    console.log('\n--- STEP 6: RECOMMENDED TEST MEMBERS ---');
    
    if (membersWithAccountsResult.rows.length > 0) {
      console.log('\n🎯 USE THESE MEMBERS FOR TESTING (THEY HAVE ACCOUNTS):');
      console.log('');
      membersWithAccountsResult.rows.slice(0, 5).forEach((member, index) => {
        console.log(`${index + 1}. Member Number: ${member.mbno}`);
        console.log(`   Name: ${member.full_name}`);
        console.log(`   Accounts: ${member.account_count}`);
        console.log(`   Status: Active (${member.isactive})`);
        console.log('');
      });
      
      console.log('🔍 FOR MEMBER LOOKUP TESTING:');
      const firstMember = membersWithAccountsResult.rows[0];
      const nameParts = firstMember.full_name.split(' ');
      console.log(`- Search for: "${nameParts[1]}" (first name)`);
      console.log(`- Search for: "${nameParts[nameParts.length - 1]}" (last name)`);
      console.log(`- Or directly enter: ${firstMember.mbno}`);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the debug
debugMemberLookup().catch(console.error);