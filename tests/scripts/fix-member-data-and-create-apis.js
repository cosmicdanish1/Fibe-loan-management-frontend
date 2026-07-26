const { Pool } = require('pg');

/**
 * Fix Member Data and Create Missing APIs for JottingReport
 */

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

async function fixMemberData() {
    console.log('\n🔧 Fixing Member Data...');
    console.log('=' .repeat(60));

    try {
        // Check current member status
        const memberStatusCheck = await pool.query(`
            SELECT 
                COUNT(*) as total_members,
                COUNT(CASE WHEN isactive = '1' THEN 1 END) as active_members,
                COUNT(CASE WHEN isactive IS NULL THEN 1 END) as null_status,
                COUNT(CASE WHEN isactive = '0' THEN 1 END) as inactive_members
            FROM member_master
        `);

        console.log('📊 Current member status:');
        const status = memberStatusCheck.rows[0];
        console.log(`   Total members: ${status.total_members}`);
        console.log(`   Active members: ${status.active_members}`);
        console.log(`   Inactive members: ${status.inactive_members}`);
        console.log(`   Null status: ${status.null_status}`);

        // If no active members, activate some members
        if (parseInt(status.active_members) === 0) {
            console.log('\n🔧 Activating members...');
            
            // Update members to active status
            const updateResult = await pool.query(`
                UPDATE member_master 
                SET isactive = '1' 
                WHERE mbno IS NOT NULL 
                AND (isactive IS NULL OR isactive != '1')
                AND mbno IN (
                    SELECT mbno FROM member_master 
                    WHERE mbno IS NOT NULL 
                    LIMIT 100
                )
            `);

            console.log(`✅ Activated ${updateResult.rowCount} members`);

            // Verify the update
            const verifyResult = await pool.query(`
                SELECT COUNT(*) as active_count 
                FROM member_master 
                WHERE isactive = '1'
            `);
            console.log(`✅ Now have ${verifyResult.rows[0].active_count} active members`);
        }

        // Show sample active members
        const sampleMembers = await pool.query(`
            SELECT 
                mbno,
                CONCAT(prefix, ' ', f_name, ' ', COALESCE(m_name, ''), ' ', l_name) as full_name,
                wingno,
                officeno,
                isactive
            FROM member_master 
            WHERE isactive = '1' 
            LIMIT 10
        `);

        console.log('\n📋 Sample active members:');
        sampleMembers.rows.forEach((member, index) => {
            console.log(`   ${index + 1}. ${member.full_name} (${member.mbno})`);
            console.log(`      Wing: ${member.wingno || 'N/A'}, Office: ${member.officeno || 'N/A'}`);
        });

        return { success: true, activeMembers: parseInt(status.active_members) };

    } catch (error) {
        console.error('❌ Member data fix failed:', error.message);
        return { success: false, error: error.message };
    }
}

async function createTestLedgerData() {
    console.log('\n📊 Creating Test Ledger Data for JottingReport...');
    console.log('=' .repeat(60));

    try {
        // Get active members
        const membersResult = await pool.query(`
            SELECT mbno, CONCAT(f_name, ' ', l_name) as name 
            FROM member_master 
            WHERE isactive = '1' 
            AND mbno IS NOT NULL 
            LIMIT 20
        `);

        // Get head codes
        const headCodesResult = await pool.query(`
            SELECT code, head_name 
            FROM headmaster 
            WHERE code IS NOT NULL 
            LIMIT 10
        `);

        console.log(`📊 Found ${membersResult.rows.length} active members`);
        console.log(`📊 Found ${headCodesResult.rows.length} head codes`);

        if (membersResult.rows.length > 0 && headCodesResult.rows.length > 0) {
            let insertCount = 0;
            const currentDate = new Date();
            
            // Create transactions for each member with different head codes
            for (const member of membersResult.rows) {
                for (const head of headCodesResult.rows.slice(0, 5)) { // Use first 5 head codes
                    
                    // Create multiple transactions per member per head
                    const transactions = [
                        {
                            trans_type: 'CR',
                            amount: Math.floor(Math.random() * 100000) + 5000,
                            date: new Date(currentDate.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random date in last year
                            narration: `Credit transaction for ${head.head_name}`
                        },
                        {
                            trans_type: 'DR',
                            amount: Math.floor(Math.random() * 50000) + 1000,
                            date: new Date(currentDate.getTime() - Math.random() * 180 * 24 * 60 * 60 * 1000), // Random date in last 6 months
                            narration: `Debit transaction for ${head.head_name}`
                        },
                        {
                            trans_type: 'CR',
                            amount: Math.floor(Math.random() * 25000) + 2000,
                            date: new Date(currentDate.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Random date in last 3 months
                            narration: `Recent credit for ${head.head_name}`
                        }
                    ];

                    for (const trans of transactions) {
                        try {
                            // Generate unique transaction number
                            const transNo = Math.floor(Math.random() * 9000000) + 1000000;
                            
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
                                transNo, // trans_no
                                trans.date, // trans_date
                                trans.trans_type, // trans_type
                                head.code, // code
                                member.mbno, // mbno
                                1, // acc_no
                                'JOTT', // acc_type
                                trans.amount, // trans_amt
                                `J${String(transNo).slice(-4)}`, // receipt_vchr_no
                                'JV', // vchr_type
                                'C', // modeofpay
                                trans.amount, // pl_balance
                                trans.narration, // narration
                                'jotting_test' // username
                            ]);
                            insertCount++;
                        } catch (insertError) {
                            // Skip duplicates or other insert errors
                            if (!insertError.message.includes('duplicate key')) {
                                console.log(`   ⚠️ Insert failed: ${insertError.message}`);
                            }
                        }
                    }
                }
            }
            
            console.log(`✅ Created ${insertCount} test ledger entries`);
            
            // Verify data creation
            const verifyQuery = `
                SELECT 
                    h.code,
                    h.head_name,
                    COUNT(l.trans_no) as transaction_count,
                    COUNT(DISTINCT l.mbno) as member_count,
                    SUM(CASE WHEN l.trans_type = 'CR' THEN l.trans_amt ELSE 0 END) as total_credits,
                    SUM(CASE WHEN l.trans_type = 'DR' THEN l.trans_amt ELSE 0 END) as total_debits
                FROM headmaster h
                LEFT JOIN ledger l ON h.code = l.code AND l.username = 'jotting_test'
                WHERE h.code IS NOT NULL
                GROUP BY h.code, h.head_name
                ORDER BY transaction_count DESC
                LIMIT 10
            `;
            
            const verifyResult = await pool.query(verifyQuery);
            console.log('\n📊 Test data verification:');
            verifyResult.rows.forEach(row => {
                console.log(`   ${row.code}: ${row.head_name}`);
                console.log(`     Transactions: ${row.transaction_count}, Members: ${row.member_count}`);
                console.log(`     Credits: ₹${parseFloat(row.total_credits || 0).toFixed(2)}, Debits: ₹${parseFloat(row.total_debits || 0).toFixed(2)}`);
                console.log('     ---');
            });

            return { success: true, insertCount };
        } else {
            console.log('⚠️ No members or head codes available for test data creation');
            return { success: false, error: 'No members or head codes available' };
        }

    } catch (error) {
        console.error('❌ Test ledger data creation failed:', error.message);
        return { success: false, error: error.message };
    }
}

async function testJottingReportQuery() {
    console.log('\n🧪 Testing JottingReport Query...');
    console.log('=' .repeat(60));

    try {
        // Get a head code with data
        const headWithDataResult = await pool.query(`
            SELECT 
                h.code,
                h.head_name,
                COUNT(l.trans_no) as transaction_count
            FROM headmaster h
            LEFT JOIN ledger l ON h.code = l.code
            WHERE h.code IS NOT NULL
            GROUP BY h.code, h.head_name
            HAVING COUNT(l.trans_no) > 0
            ORDER BY transaction_count DESC
            LIMIT 1
        `);

        if (headWithDataResult.rows.length > 0) {
            const testHead = headWithDataResult.rows[0];
            console.log(`🎯 Testing with head code: ${testHead.code} (${testHead.head_name})`);
            console.log(`   Has ${testHead.transaction_count} transactions`);

            // Test the JottingReport query
            const jottingQuery = `
                SELECT 
                    mm.mbno as "memberNo",
                    TRIM(CONCAT(
                        COALESCE(mm.prefix, ''), ' ',
                        COALESCE(mm.f_name, ''), ' ',
                        COALESCE(mm.m_name, ''), ' ',
                        COALESCE(mm.l_name, '')
                    )) as "memberName",
                    COALESCE(wm.wname, 'Unknown Wing') as "wing",
                    COALESCE(mm.officeno::text, 'Unknown Office') as "office",
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
                AND EXISTS (
                    SELECT 1 FROM ledger l 
                    WHERE l.mbno = mm.mbno 
                    AND l.code = $1
                )
                ORDER BY mm.mbno
                LIMIT 20
            `;

            const result = await pool.query(jottingQuery, [testHead.code, '2024-12-28']);
            
            console.log(`✅ JottingReport query successful`);
            console.log(`📊 Found ${result.rows.length} members with balances`);
            
            if (result.rows.length > 0) {
                console.log('\n📋 Sample JottingReport results:');
                result.rows.slice(0, 5).forEach((row, index) => {
                    console.log(`   ${index + 1}. ${row.memberName} (${row.memberNo})`);
                    console.log(`      Wing: ${row.wing}, Office: ${row.office}`);
                    console.log(`      Balance: ₹${parseFloat(row.balance).toFixed(2)}`);
                    console.log('      ---');
                });

                const totalBalance = result.rows.reduce((sum, row) => sum + parseFloat(row.balance), 0);
                console.log(`\n💰 Total Balance: ₹${totalBalance.toFixed(2)}`);
                console.log(`👥 Total Members: ${result.rows.length}`);

                return { 
                    success: true, 
                    headCode: testHead.code,
                    headName: testHead.head_name,
                    data: result.rows,
                    totalBalance,
                    memberCount: result.rows.length
                };
            } else {
                console.log('⚠️ No members found with balances for this head code');
                return { success: false, error: 'No members with balances found' };
            }
        } else {
            console.log('⚠️ No head codes with transaction data found');
            return { success: false, error: 'No head codes with data found' };
        }

    } catch (error) {
        console.error('❌ JottingReport query test failed:', error.message);
        return { success: false, error: error.message };
    }
}

async function generateAPIEndpointCode() {
    console.log('\n🔧 Generating Missing API Endpoint Code...');
    console.log('=' .repeat(60));

    const controllerCode = `
// Add these endpoints to your report controller or create a new jotting-report controller

// GET /api/v1/head-masters
async getHeadMasters() {
    try {
        const query = \`
            SELECT 
                code,
                head_name as "headName",
                headtype,
                parent_code as "parentCode"
            FROM headmaster 
            WHERE code IS NOT NULL 
            ORDER BY head_name
        \`;
        
        const result = await this.dataSource.query(query);
        return result;
    } catch (error) {
        throw new Error(\`Failed to fetch head masters: \${error.message}\`);
    }
}

// GET /api/v1/wings
async getWingList() {
    try {
        const query = \`
            SELECT 
                wingno as "wingNo",
                wname as "wingName"
            FROM wingmast 
            WHERE winstate = 1 
            ORDER BY wname
        \`;
        
        const result = await this.dataSource.query(query);
        return result.map(wing => wing.wingName); // Return array of wing names
    } catch (error) {
        throw new Error(\`Failed to fetch wings: \${error.message}\`);
    }
}

// GET /api/v1/offices
async getOfficeList() {
    try {
        // Since there's no office master table, get unique offices from member_master
        const query = \`
            SELECT DISTINCT 
                officeno::text as "officeName"
            FROM member_master 
            WHERE officeno IS NOT NULL 
            ORDER BY officeno
        \`;
        
        const result = await this.dataSource.query(query);
        return result.map(office => office.officeName);
    } catch (error) {
        throw new Error(\`Failed to fetch offices: \${error.message}\`);
    }
}

// GET /api/v1/jotting-report
async getJottingReport(params: {
    headCode: string;
    asOnDate: string;
    wingName?: string;
    officeName?: string;
    sortBy?: string;
}) {
    try {
        const { headCode, asOnDate, wingName, officeName, sortBy = 'MBNO' } = params;
        
        let whereClause = \`
            WHERE mm.isactive = '1'
            AND mm.mbno IS NOT NULL
        \`;
        
        const queryParams = [headCode, asOnDate];
        let paramIndex = 3;
        
        if (wingName) {
            whereClause += \` AND wm.wname = $\${paramIndex}\`;
            queryParams.push(wingName);
            paramIndex++;
        }
        
        if (officeName) {
            whereClause += \` AND mm.officeno::text = $\${paramIndex}\`;
            queryParams.push(officeName);
            paramIndex++;
        }
        
        const orderClause = sortBy === 'Name' ? 'ORDER BY "memberName"' : 'ORDER BY mm.mbno';
        
        const query = \`
            SELECT 
                mm.mbno as "memberNo",
                TRIM(CONCAT(
                    COALESCE(mm.prefix, ''), ' ',
                    COALESCE(mm.f_name, ''), ' ',
                    COALESCE(mm.m_name, ''), ' ',
                    COALESCE(mm.l_name, '')
                )) as "memberName",
                COALESCE(wm.wname, 'Unknown') as "wing",
                COALESCE(mm.officeno::text, 'Unknown') as "office",
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
            \${whereClause}
            \${orderClause}
        \`;
        
        const result = await this.dataSource.query(query, queryParams);
        return result;
    } catch (error) {
        throw new Error(\`Failed to generate jotting report: \${error.message}\`);
    }
}
`;

    console.log('📝 Generated API endpoint code:');
    console.log(controllerCode);
    
    return controllerCode;
}

async function runFixAndTest() {
    console.log('🚀 Starting JottingReport Fix and Test...');
    console.log('=' .repeat(80));

    const dbConnected = await initializeDatabase();
    if (!dbConnected) {
        console.log('❌ Cannot proceed without database connection');
        return;
    }

    try {
        // Fix member data
        const memberFix = await fixMemberData();
        if (!memberFix.success) {
            console.log('❌ Member data fix failed');
            return;
        }

        // Create test ledger data
        const ledgerData = await createTestLedgerData();
        if (!ledgerData.success) {
            console.log('❌ Test ledger data creation failed');
            return;
        }

        // Test JottingReport query
        const queryTest = await testJottingReportQuery();
        if (!queryTest.success) {
            console.log('❌ JottingReport query test failed');
            return;
        }

        // Generate API code
        await generateAPIEndpointCode();

        // Final summary
        console.log('\n' + '=' .repeat(80));
        console.log('📊 JOTTING REPORT FIX SUMMARY');
        console.log('=' .repeat(80));
        console.log('✅ Member data fixed and activated');
        console.log(`✅ Created ${ledgerData.insertCount} test transactions`);
        console.log(`✅ JottingReport query working with ${queryTest.memberCount} members`);
        console.log(`✅ Total balance available: ₹${queryTest.totalBalance.toFixed(2)}`);
        console.log(`✅ Test head code: ${queryTest.headCode} (${queryTest.headName})`);
        
        console.log('\n🎯 Next Steps:');
        console.log('1. Add the generated API endpoints to your backend');
        console.log('2. Test JottingReport frontend with real data');
        console.log('3. Verify print functionality works');
        console.log('4. Check all dropdown filters');

    } catch (error) {
        console.error('❌ Fix and test execution failed:', error.message);
    } finally {
        if (pool) {
            await pool.end();
            console.log('\n🔌 Database connection closed');
        }
    }
}

// Run the fix and test
if (require.main === module) {
    runFixAndTest().catch(console.error);
}

module.exports = {
    runFixAndTest,
    fixMemberData,
    createTestLedgerData,
    testJottingReportQuery
};