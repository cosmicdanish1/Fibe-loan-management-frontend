const { Pool } = require('pg');

const dbConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'EMP_Espat_Society',
    password: 'Test@1212',
    port: 5432,
};

async function checkJournalData() {
    const pool = new Pool(dbConfig);
    
    try {
        console.log('Checking J001 voucher data...');
        
        const result = await pool.query(`
            SELECT 
                receipt_vchr_no, 
                trans_type, 
                trans_amt, 
                code, 
                mbno, 
                narration,
                trans_no
            FROM ledger 
            WHERE receipt_vchr_no = 'J001' 
            ORDER BY trans_no
        `);
        
        console.log('Found entries:', result.rows.length);
        result.rows.forEach((row, index) => {
            console.log(`${index + 1}. Trans No: ${row.trans_no}`);
            console.log(`   Type: ${row.trans_type}`);
            console.log(`   Amount: ${row.trans_amt} (type: ${typeof row.trans_amt})`);
            console.log(`   Code: ${row.code}`);
            console.log(`   Member: ${row.mbno}`);
            console.log(`   Narration: ${row.narration}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkJournalData();