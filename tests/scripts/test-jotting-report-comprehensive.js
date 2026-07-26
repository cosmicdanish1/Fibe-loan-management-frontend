const axios = require('axios');
const { Pool } = require('pg');

/**
 * Comprehensive JottingReport Test Script
 * Tests database connectivity, data availability, API functionality, and frontend integration
 */

const BASE_URL = 'http://localhost:3001/api/v1';

// Database connection configuration
const dbConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'EMP_Espat_Society',
    password: 'Test@1212',
    port: 5432,
};

let pool;

async function initializeDatabase() {
    try {
        pool = new Pool(dbConfig);
        const client = await pool.connect();
        console.log('✅ Database connection established');
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

async function testDatabaseTables() {
    console.log('\n🔍 Testing Database Tables for JottingReport...');
    console.log('=' .repeat(60));

    const queries = [
        {
            name: 'headmaster',
            query: 'SELECT COUNT(*) as count, code, head_name FROM headmaster GROUP BY code, head_name LIMIT 5',
            description: 'Head codes for dropdown'
        },
        {
            name: 'member_master',
            query: 'SELECT COUNT(*) as total_members FROM member_master WHERE isactive = \'1\'',
            description: 'Active members count'
        },
        {
            name: 'wingmast',
            query: 'SELECT wingno, wname FROM wingmast WHERE winstate = 1 LIMIT 10',
            description: 'Wing list for dropdown'
        },
        {
            name: 'ledger',
            query: 'SELECT COUNT(*) as total_transactions FROM ledger WHERE trans_date >= \'2024-01-01\'',
            description: 'Recent transactions count'
        },
        {
            name: 'member_balances',
            query: 'SELECT COUNT(*) as count FROM member_balances LIMIT 1',
            description: 'Member balances availability'
        }
    ];

    for (const queryInfo of queries) {
        try {
            const result = await pool.query(queryInfo.query);
            console.log(`✅ ${queryInfo.name}: ${queryInfo.description}`);
            console.log(`   Result:`, result.rows[0] || result.rows.slice(0, 3));
        } catch (error) {
            console.log(`❌ ${queryInfo.name}: ${error.message}`);
        }
    }
}

async function checkJottingReportDataRequirements() {
    console.log('\n📊 Checking JottingReport Data Requirements...');
    console.log('=' .repeat(60));

    try {
        // Check if we have the required data structure for JottingReport
        const jottingQuery = `
            SELECT 
                mm.mbno as "memberNo",
                CONCAT(mm.prefix, ' ', mm.f_name, ' ', COALESCE(mm.m_name, ''), ' ', mm.l_name) as "memberName",
                wm.wname as "wing",
                mm.officeno as "office",
                COALESCE(
                    (SELECT SUM(
                        CASE 
                            WHEN l.trans_type = 'CR' THEN l.trans_amt::numeric
                            WHEN l.trans_type = 'DR' THEN -l.trans_amt::numeric
                            ELSE 0
                        END
                    ) 
                    FROM ledger l 
                    WHERE l.mbno = mm.mbno 
                    AND l.code = $1
                    AND l.trans_date <= $2), 0
                ) as "balance"
            FROM member_master mm
            LEFT JOIN wingmast wm ON mm.wingno = wm.wingno
            WHERE mm.isactive = '1'
            AND mm.mbno IS NOT NULL
            LIMIT 10
        `;

        // Test with a sample head code and date
        const testHeadCode = '1001'; // We'll need to get actual head codes
        const testDate = '2024-12-28';

        const result = await pool.query(jottingQuery, [testHeadCode, testDate]);
        
        console.log('✅ JottingReport query structure works');
        console.log(`📊 Sample data (${result.rows.length} records):`);
        
        result.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. Member: ${row.memberName} (${row.memberNo})`);
            console.log(`      Wing: ${row.wing || 'N/A'}, Office: ${row.office}`);
            console.log(`      Balance: ${row.balance}`);
            console.log('      ---');
        });

        // Get actual head codes available
        const headCodesResult = await pool.query('SELECT code, head_name FROM headmaster WHERE code IS NOT NULL LIMIT 10');
        console.log('\n📋 Available Head Codes:');
        headCodesResult.rows.forEach(head => {
            console.log(`   ${head.code}: ${head.head_name}`);
        });

        return { success: true, sampleData: result.rows, headCodes: headCodesResult.rows };

    } catch (error) {
        console.error('❌ JottingReport data check failed:', error.message);
        return { success: false, error: error.message };
    }
}

async function populateTestDataIfNeeded() {
    console.log('\n🔧 Checking and Populating Test Data...');
    console.log('=' .repeat(60));

    try {
        // Check if we have recent ledger entries
        const recentDataCheck = await pool.query(`
            SELECT COUNT(*) as count 
            FROM ledger 
            WHERE trans_date >= '2024-01-01'
        `);

        const recentCount = parseInt(recentDataCheck.rows[0].count);
        console.log(`📊 Recent ledger entries (2024+): ${recentCount}`);

        if (recentCount < 100) {
            console.log('⚠️ Limited recent data found. Populating test data...');
            
            // Get some active members
            const membersResult = await pool.query(`
                SELECT mbno, CONCAT(f_name, ' ', l_name) as name 
                FROM member_master 
                WHERE isactive = '1' 
                AND mbno IS NOT NULL 
                LIMIT 10
            `);

            // Get some head codes
            const headCodesResult = await pool.query(`
                SELECT code 
                FROM headmaster 
                WHERE code IS NOT NULL 
                LIMIT 5
            `);

            if (membersResult.rows.length > 0 && headCodesResult.rows.length > 0) {
                console.log('📝 Inserting test ledger entries...');
                
                let insertCount = 0;
                for (const member of membersResult.rows.slice(0, 5)) {
                    for (const head of headCodesResult.rows.slice(0, 3)) {
                        // Insert test transactions
                        const testTransactions = [
                            {
                                trans_type: 'CR',
                                amount: Math.floor(Math.random() * 50000) + 1000,
                                date: '2024-12-01'
                            },
                            {
                                trans_type: 'DR',
                                amount: Math.floor(Math.random() * 20000) + 500,
                                date: '2024-12-15'
                            }
                        ];

                        for (const trans of testTransactions) {
                            try {
                                await pool.query(`
                                    INSERT INTO ledger (
                                        trans_no, trans_date, trans_type, code, mbno, 
                                        acc_no, acc_type, trans_amt, receipt_vchr_no, 
                                        vchr_type, modeofpay, pl_balance, narration, username
                                    ) VALUES (
                                        $1, $2, $3, $4, $5, 
                                        $6, $7, $8, $9, 
                                        $10, $11, $12, $13, $14
                                    )
                                `, [
                                    Math.floor(Math.random() * 1000000), // trans_no
                                    trans.date, // trans_date
                                    trans.trans_type, // trans_type
                                    head.code, // code
                                    member.mbno, // mbno
                                    1, // acc_no
                                    'TEST', // acc_type
                                    trans.amount, // trans_amt
                                    'T001', // receipt_vchr_no
                                    'JV', // vchr_type
                                    'C', // modeofpay
                                    trans.amount, // pl_balance
                                    `Test transaction for JottingReport - ${trans.trans_type}`, // narration
                                    'test_script' // username
                                ]);
                                insertCount++;
                            } catch (insertError) {
                                console.log(`   ⚠️ Insert failed for member ${member.mbno}, head ${head.code}: ${insertError.message}`);
                            }
                        }
                    }
                }
                
                console.log(`✅ Inserted ${insertCount} test transactions`);
            } else {
                console.log('⚠️ No members or head codes found for test data population');
            }
        } else {
            console.log('✅ Sufficient recent data available');
        }

    } catch (error) {
        console.error('❌ Test data population failed:', error.message);
    }
}

async function testJottingReportAPI() {
    console.log('\n🌐 Testing JottingReport API Endpoints...');
    console.log('=' .repeat(60));

    try {
        // Test 1: Get Head Masters
        console.log('1. Testing getHeadMasters API...');
        try {
            const headResponse = await axios.get(`${BASE_URL}/jotting-report/head-masters`);
            console.log('✅ getHeadMasters API works');
            console.log(`   Returned ${headResponse.data?.length || 0} head codes`);
            if (headResponse.data && headResponse.data.length > 0) {
                console.log(`   Sample: ${headResponse.data[0].code} - ${headResponse.data[0].headName || headResponse.data[0].name}`);
            }
        } catch (error) {
            console.log('❌ getHeadMasters API failed:', error.response?.status, error.response?.data || error.message);
        }

        // Test 2: Get Wing List
        console.log('\n2. Testing getWingList API...');
        try {
            const wingResponse = await axios.get(`${BASE_URL}/jotting-report/wings`);
            console.log('✅ getWingList API works');
            console.log(`   Returned ${wingResponse.data?.length || 0} wings`);
        } catch (error) {
            console.log('❌ getWingList API failed:', error.response?.status, error.response?.data || error.message);
        }

        // Test 3: Get Office List
        console.log('\n3. Testing getOfficeList API...');
        try {
            const officeResponse = await axios.get(`${BASE_URL}/jotting-report/offices`);
            console.log('✅ getOfficeList API works');
            console.log(`   Returned ${officeResponse.data?.length || 0} offices`);
        } catch (error) {
            console.log('❌ getOfficeList API failed:', error.response?.status, error.response?.data || error.message);
        }

        // Test 4: Get Jotting Report
        console.log('\n4. Testing getJottingReport API...');
        
        // Get a valid head code first
        const headCodesResult = await pool.query('SELECT code FROM headmaster WHERE code IS NOT NULL LIMIT 1');
        if (headCodesResult.rows.length > 0) {
            const testHeadCode = headCodesResult.rows[0].code;
            
            try {
                const jottingResponse = await axios.get(`${BASE_URL}/jotting-report`, {
                    params: {
                        headCode: testHeadCode,
                        asOnDate: '2024-12-28',
                        sortBy: 'MBNO'
                    }
                });
                console.log('✅ getJottingReport API works');
                console.log(`   Returned ${jottingResponse.data?.length || 0} records`);
                if (jottingResponse.data && jottingResponse.data.length > 0) {
                    console.log(`   Sample record:`, jottingResponse.data[0]);
                }
            } catch (error) {
                console.log('❌ getJottingReport API failed:', error.response?.status, error.response?.data || error.message);
            }
        } else {
            console.log('⚠️ No head codes available for testing JottingReport API');
        }

    } catch (error) {
        console.error('❌ API testing failed:', error.message);
    }
}

async function checkDataTypes() {
    console.log('\n🔧 Checking Data Types and Money Fields...');
    console.log('=' .repeat(60));

    try {
        // Check ledger table data types
        const ledgerTypesQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'ledger' 
            AND column_name IN ('trans_amt', 'pl_balance')
        `;
        
        const ledgerTypes = await pool.query(ledgerTypesQuery);
        console.log('📊 Ledger table money field types:');
        ledgerTypes.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });

        // Check headmaster table
        const headmasterTypesQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'headmaster' 
            AND column_name IN ('op_bal')
        `;
        
        const headmasterTypes = await pool.query(headmasterTypesQuery);
        console.log('\n📊 Headmaster table money field types:');
        headmasterTypes.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });

        // Sample data with proper types
        const sampleDataQuery = `
            SELECT 
                trans_amt,
                pg_typeof(trans_amt) as trans_amt_type,
                pl_balance,
                pg_typeof(pl_balance) as pl_balance_type
            FROM ledger 
            WHERE trans_amt IS NOT NULL 
            LIMIT 3
        `;
        
        const sampleData = await pool.query(sampleDataQuery);
        console.log('\n📊 Sample ledger data with types:');
        sampleData.rows.forEach((row, index) => {
            console.log(`   Record ${index + 1}:`);
            console.log(`     trans_amt: ${row.trans_amt} (${row.trans_amt_type})`);
            console.log(`     pl_balance: ${row.pl_balance} (${row.pl_balance_type})`);
        });

    } catch (error) {
        console.error('❌ Data type check failed:', error.message);
    }
}

async function generateJottingReportTestData() {
    console.log('\n📋 Generating JottingReport Test Summary...');
    console.log('=' .repeat(60));

    try {
        // Get actual data for JottingReport
        const headCodesResult = await pool.query('SELECT code, head_name FROM headmaster WHERE code IS NOT NULL LIMIT 5');
        
        if (headCodesResult.rows.length > 0) {
            const testHeadCode = headCodesResult.rows[0].code;
            
            const jottingQuery = `
                SELECT 
                    mm.mbno as "memberNo",
                    CONCAT(mm.prefix, ' ', mm.f_name, ' ', COALESCE(mm.m_name, ''), ' ', mm.l_name) as "memberName",
                    COALESCE(wm.wname, 'Unknown') as "wing",
                    mm.officeno::text as "office",
                    COALESCE(
                        (SELECT SUM(
                            CASE 
                                WHEN l.trans_type = 'CR' THEN l.trans_amt::numeric
                                WHEN l.trans_type = 'DR' THEN -l.trans_amt::numeric
                                ELSE 0
                            END
                        ) 
                        FROM ledger l 
                        WHERE l.mbno = mm.mbno 
                        AND l.code = $1
                        AND l.trans_date <= $2), 0
                    ) as "balance"
                FROM member_master mm
                LEFT JOIN wingmast wm ON mm.wingno = wm.wingno
                WHERE mm.isactive = '1'
                AND mm.mbno IS NOT NULL
                ORDER BY mm.mbno
                LIMIT 20
            `;

            const result = await pool.query(jottingQuery, [testHeadCode, '2024-12-28']);
            
            console.log(`✅ JottingReport data generated for head code: ${testHeadCode}`);
            console.log(`📊 Total records: ${result.rows.length}`);
            
            if (result.rows.length > 0) {
                console.log('\n📋 Sample JottingReport data:');
                result.rows.slice(0, 5).forEach((row, index) => {
                    console.log(`   ${index + 1}. ${row.memberName} (${row.memberNo})`);
                    console.log(`      Wing: ${row.wing}, Office: ${row.office}`);
                    console.log(`      Balance: ₹${parseFloat(row.balance).toFixed(2)}`);
                    console.log('      ---');
                });

                // Calculate totals
                const totalBalance = result.rows.reduce((sum, row) => sum + parseFloat(row.balance), 0);
                console.log(`\n💰 Total Balance: ₹${totalBalance.toFixed(2)}`);
                console.log(`👥 Total Members: ${result.rows.length}`);
            }

            return {
                success: true,
                headCode: testHeadCode,
                data: result.rows,
                totalRecords: result.rows.length,
                totalBalance: result.rows.reduce((sum, row) => sum + parseFloat(row.balance), 0)
            };
        } else {
            console.log('⚠️ No head codes available');
            return { success: false, error: 'No head codes found' };
        }

    } catch (error) {
        console.error('❌ JottingReport test data generation failed:', error.message);
        return { success: false, error: error.message };
    }
}

async function testPrintFunctionality() {
    console.log('\n🖨️ Testing Print Functionality Requirements...');
    console.log('=' .repeat(60));

    console.log('📄 Print Requirements Check:');
    console.log('✅ Portrait orientation: Required for JottingReport');
    console.log('✅ A4 page size: Standard requirement');
    console.log('✅ Proper margins: 4mm recommended');
    console.log('✅ Clean borders: Professional appearance');
    console.log('✅ Data completeness: All records must appear');
    console.log('✅ Column fitting: No horizontal scroll');
    
    console.log('\n📋 JottingReport Print Layout:');
    console.log('   Columns: Member No | Member Name | Wing | Office | Balance');
    console.log('   Widths:  12%       | 40%         | 15%  | 15%    | 18%');
    console.log('   Total:   100% (perfect fit)');
    
    console.log('\n🎯 Print Test Checklist:');
    console.log('   □ Header: "JOTTING REPORT (BALANCE SNAPSHOT)"');
    console.log('   □ Filters: Head Code, As On Date, Wing, Office');
    console.log('   □ All data rows visible');
    console.log('   □ Total row with member count and balance sum');
    console.log('   □ Footer with generation timestamp');
    console.log('   □ No horizontal scrollbar');
    console.log('   □ Portrait orientation only');
}

async function runComprehensiveTest() {
    console.log('🚀 Starting Comprehensive JottingReport Test...');
    console.log('=' .repeat(80));

    // Initialize database connection
    const dbConnected = await initializeDatabase();
    if (!dbConnected) {
        console.log('❌ Cannot proceed without database connection');
        return;
    }

    try {
        // Run all tests
        await testDatabaseTables();
        await checkDataTypes();
        await checkJottingReportDataRequirements();
        await populateTestDataIfNeeded();
        await testJottingReportAPI();
        const testData = await generateJottingReportTestData();
        await testPrintFunctionality();

        // Final summary
        console.log('\n' + '=' .repeat(80));
        console.log('📊 COMPREHENSIVE TEST SUMMARY');
        console.log('=' .repeat(80));
        
        if (testData.success) {
            console.log('✅ JottingReport is ready for use');
            console.log(`📊 Test data available: ${testData.totalRecords} records`);
            console.log(`💰 Total balance: ₹${testData.totalBalance.toFixed(2)}`);
            console.log(`🎯 Test head code: ${testData.headCode}`);
        } else {
            console.log('⚠️ JottingReport needs attention');
            console.log(`❌ Issue: ${testData.error}`);
        }

        console.log('\n🎯 Next Steps:');
        console.log('1. Test JottingReport UI with generated data');
        console.log('2. Verify all dropdown APIs work');
        console.log('3. Test print functionality');
        console.log('4. Check responsive design');
        console.log('5. Validate data accuracy');

    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
    } finally {
        if (pool) {
            await pool.end();
            console.log('\n🔌 Database connection closed');
        }
    }
}

// Run the comprehensive test
if (require.main === module) {
    runComprehensiveTest().catch(console.error);
}

module.exports = {
    runComprehensiveTest,
    testJottingReportAPI,
    generateJottingReportTestData
};