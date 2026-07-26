/**
 * Debug Script: Member Lookup Issues
 * 
 * This script investigates the member lookup problems:
 * 1. Only 50 members showing
 * 2. Duplicate entries appearing
 */

const { Client } = require('pg');
require('dotenv').config({ path: './backend/.env' });

async function debugMemberLookup() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'loan_management'
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // 1. Check total active members
    console.log('\n📊 TOTAL ACTIVE MEMBERS:');
    const totalQuery = `
      SELECT COUNT(*) as total_count
      FROM member_master m
      WHERE m.isactive = 'Y'
    `;
    const totalResult = await client.query(totalQuery);
    console.log(`Total active members: ${totalResult.rows[0].total_count}`);

    // 2. Check for duplicates in member_master
    console.log('\n🔍 CHECKING FOR DUPLICATES IN MEMBER_MASTER:');
    const duplicateQuery = `
      SELECT mbno, COUNT(*) as count
      FROM member_master
      WHERE isactive = 'Y'
      GROUP BY mbno
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10
    `;
    const duplicateResult = await client.query(duplicateQuery);
    if (duplicateResult.rows.length > 0) {
      console.log('❌ Found duplicate member numbers:');
      duplicateResult.rows.forEach(row => {
        console.log(`  Member ${row.mbno}: ${row.count} records`);
      });
    } else {
      console.log('✅ No duplicate member numbers found');
    }

    // 3. Check division_master for potential JOIN issues
    console.log('\n🏢 CHECKING DIVISION_MASTER:');
    const divisionQuery = `
      SELECT COUNT(*) as total_divisions,
             COUNT(DISTINCT officeno || '-' || wingno) as unique_office_wing_combinations
      FROM division_master
    `;
    const divisionResult = await client.query(divisionQuery);
    console.log(`Total division records: ${divisionResult.rows[0].total_divisions}`);
    console.log(`Unique office-wing combinations: ${divisionResult.rows[0].unique_office_wing_combinations}`);

    // 4. Check for members with multiple division matches
    console.log('\n🔗 CHECKING JOIN DUPLICATES:');
    const joinDuplicateQuery = `
      SELECT 
        m.mbno,
        m.officeno,
        m.wingno,
        COUNT(d.name) as division_matches
      FROM member_master m
      LEFT JOIN division_master d ON m.officeno = d.officeno AND m.wingno = d.wingno
      WHERE m.isactive = 'Y'
      GROUP BY m.mbno, m.officeno, m.wingno
      HAVING COUNT(d.name) > 1
      LIMIT 10
    `;
    const joinDuplicateResult = await client.query(joinDuplicateQuery);
    if (joinDuplicateResult.rows.length > 0) {
      console.log('❌ Found members with multiple division matches:');
      joinDuplicateResult.rows.forEach(row => {
        console.log(`  Member ${row.mbno} (Office: ${row.officeno}, Wing: ${row.wingno}): ${row.division_matches} matches`);
      });
    } else {
      console.log('✅ No JOIN duplicates found');
    }

    // 5. Test current lookup query (first 10 results)
    console.log('\n🧪 TESTING CURRENT LOOKUP QUERY (first 10):');
    const currentQuery = `
      SELECT 
        m.mbno as memberNo,
        TRIM(COALESCE(m.f_name, '') || ' ' || COALESCE(m.m_name, '') || ' ' || COALESCE(m.l_name, '')) as memberName,
        m.officeno as officeNo,
        m.wingno as wingNo,
        COALESCE(d.name, 'Unknown Office') as officeName
      FROM member_master m
      LEFT JOIN division_master d ON m.officeno = d.officeno AND m.wingno = d.wingno
      WHERE m.isactive = 'Y'
      ORDER BY TRIM(COALESCE(m.f_name, '') || ' ' || COALESCE(m.m_name, '') || ' ' || COALESCE(m.l_name, ''))
      LIMIT 10
    `;
    const currentResult = await client.query(currentQuery);
    console.log('Current query results:');
    currentResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.memberno} - ${row.membername} (${row.officename})`);
    });

    // 6. Test improved query with DISTINCT
    console.log('\n✨ TESTING IMPROVED QUERY WITH DISTINCT (first 10):');
    const improvedQuery = `
      SELECT DISTINCT
        m.mbno as memberNo,
        TRIM(COALESCE(m.f_name, '') || ' ' || COALESCE(m.m_name, '') || ' ' || COALESCE(m.l_name, '')) as memberName,
        m.officeno as officeNo,
        m.wingno as wingNo,
        COALESCE(d.name, 'Unknown Office') as officeName
      FROM member_master m
      LEFT JOIN division_master d ON m.officeno = d.officeno AND m.wingno = d.wingno
      WHERE m.isactive = 'Y'
      ORDER BY TRIM(COALESCE(m.f_name, '') || ' ' || COALESCE(m.m_name, '') || ' ' || COALESCE(m.l_name, ''))
      LIMIT 10
    `;
    const improvedResult = await client.query(improvedQuery);
    console.log('Improved query results:');
    improvedResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.memberno} - ${row.membername} (${row.officename})`);
    });

    // 7. Count results with different limits
    console.log('\n📈 TESTING DIFFERENT LIMITS:');
    const limits = [50, 100, 200, 500];
    for (const limit of limits) {
      const limitQuery = `
        SELECT COUNT(*) as count
        FROM (
          SELECT DISTINCT m.mbno
          FROM member_master m
          LEFT JOIN division_master d ON m.officeno = d.officeno AND m.wingno = d.wingno
          WHERE m.isactive = 'Y'
          ORDER BY TRIM(COALESCE(m.f_name, '') || ' ' || COALESCE(m.m_name, '') || ' ' || COALESCE(m.l_name, ''))
          LIMIT ${limit}
        ) subquery
      `;
      const limitResult = await client.query(limitQuery);
      console.log(`  LIMIT ${limit}: ${limitResult.rows[0].count} unique members`);
    }

    // 8. Sample of members that might be getting cut off
    console.log('\n📋 SAMPLE OF MEMBERS BEYOND LIMIT 50:');
    const beyondLimitQuery = `
      SELECT DISTINCT
        m.mbno as memberNo,
        TRIM(COALESCE(m.f_name, '') || ' ' || COALESCE(m.m_name, '') || ' ' || COALESCE(m.l_name, '')) as memberName
      FROM member_master m
      WHERE m.isactive = 'Y'
      ORDER BY TRIM(COALESCE(m.f_name, '') || ' ' || COALESCE(m.m_name, '') || ' ' || COALESCE(m.l_name, ''))
      OFFSET 50 LIMIT 10
    `;
    const beyondLimitResult = await client.query(beyondLimitQuery);
    console.log('Members beyond the current 50-limit:');
    beyondLimitResult.rows.forEach((row, index) => {
      console.log(`  ${51 + index}. ${row.memberno} - ${row.membername}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the debug
debugMemberLookup().catch(console.error);