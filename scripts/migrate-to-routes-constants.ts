/**
 * Auto-migration script to update files to use ROUTES constants
 * 
 * This script will:
 * 1. Add import statement for ROUTES
 * 2. Replace hardcoded route strings with ROUTES.CONSTANT_NAME
 * 
 * Run with: ts-node scripts/migrate-to-routes-constants.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Map of route strings to their constant names
const ROUTE_TO_CONSTANT_MAP: Record<string, string> = {
    '/loan-application': 'ROUTES.LOAN_APPLICATION',
    '/change-loan-surety': 'ROUTES.CHANGE_LOAN_SURETY',
    '/interest-calculation-posting': 'ROUTES.INTEREST_CALCULATION_POSTING',
    '/day-end': 'ROUTES.DAY_END',
    '/interest-calculation': 'ROUTES.INTEREST_CALCULATION',
    '/deposit-loan-slab': 'ROUTES.DEPOSIT_LOAN_SLAB',
    '/head-addition-modification': 'ROUTES.HEAD_ADDITION_MODIFICATION',
    '/head-opening-balance': 'ROUTES.HEAD_OPENING_BALANCE',
    '/user-management': 'ROUTES.USER_MANAGEMENT',
    '/role-management': 'ROUTES.ROLE_MANAGEMENT',
    '/change-password': 'ROUTES.CHANGE_PASSWORD',
    '/logout-user': 'ROUTES.LOGOUT_USER',
    '/financial-year/transfer-entries': 'ROUTES.FINANCIAL_YEAR_TRANSFER_ENTRIES',
    '/financial-year/closing': 'ROUTES.FINANCIAL_YEAR_CLOSING',
    '/financial-year/balance-transfer': 'ROUTES.FINANCIAL_YEAR_BALANCE_TRANSFER',
    '/financial-year/pl-process': 'ROUTES.FINANCIAL_YEAR_PL_PROCESS',
    '/modify-business-rules': 'ROUTES.MODIFY_BUSINESS_RULES',
    '/demand-print-order': 'ROUTES.DEMAND_PRINT_ORDER',
    '/certificate/parameter-setting': 'ROUTES.CERTIFICATE_PARAMETER_SETTING',
    '/certificate/fd-printing': 'ROUTES.CERTIFICATE_FD_PRINTING',
    '/certificate/share-printing': 'ROUTES.CERTIFICATE_SHARE_PRINTING',
    '/certificate/passbook-parameter': 'ROUTES.CERTIFICATE_PASSBOOK_PARAMETER',
    '/masters/member': 'ROUTES.MEMBER_MASTER',
    '/masters/signature-scanning': 'ROUTES.SIGNATURE_SCANNING',
    '/masters/rd-account/opening': 'ROUTES.RD_ACCOUNT_OPENING',
    '/masters/rd-account/pass': 'ROUTES.RD_ACCOUNT_PASS',
    '/masters/saving-account-opening': 'ROUTES.SAVING_ACCOUNT_OPENING',
    '/masters/wing-office': 'ROUTES.WING_OFFICE_MASTER',
    '/masters/modify-fd-account': 'ROUTES.MODIFY_FD_ACCOUNT',
    '/masters/modify-member-balance': 'ROUTES.MODIFY_MEMBER_BALANCE',
    '/masters/cast-category': 'ROUTES.CAST_CATEGORY',
    '/masters/designation': 'ROUTES.DESIGNATION_MASTER',
    '/masters/data-entry/fd-rd-sb': 'ROUTES.FD_RD_SB_ENTRY',
    '/masters/data-entry/loan': 'ROUTES.LOAN_ENTRY',
    '/transaction/receipt-payment/payment-voucher-creation': 'ROUTES.PAYMENT_VOUCHER_CREATION',
    '/transaction/receipt-payment/voucher-payment': 'ROUTES.VOUCHER_PAYMENT',
    '/transaction/receipt-payment/receipt': 'ROUTES.RECEIPT',
    '/transaction/receipt-payment/dividend-payment': 'ROUTES.DIVIDEND_PAYMENT',
    '/transaction/fixed-deposit/receipt': 'ROUTES.FD_RECEIPT',
    '/transaction/fixed-deposit/interest-voucher-posting': 'ROUTES.FD_INTEREST_VOUCHER_POSTING',
    '/transaction/fixed-deposit/withdrawal-interest-payment': 'ROUTES.FD_WITHDRAWAL_INTEREST_PAYMENT',
    '/transaction/saving': 'ROUTES.SAVING',
    '/transaction/journal-transfer': 'ROUTES.JOURNAL_TRANSFER',
    '/transaction/loan-payment': 'ROUTES.LOAN_PAYMENT',
    '/transaction/compulsory-deposit': 'ROUTES.COMPULSORY_DEPOSIT',
    '/transaction/member-balance-transfer': 'ROUTES.MEMBER_BALANCE_TRANSFER',
    '/transaction/pass-transactions': 'ROUTES.PASS_TRANSACTIONS',
    '/transaction/demand-recovery/import-demand-list': 'ROUTES.IMPORT_DEMAND_LIST',
    '/transaction/demand-recovery/generate': 'ROUTES.GENERATE_DEMAND',
    '/transaction/demand-recovery/updation-ledger-posting': 'ROUTES.UPDATION_LEDGER_POSTING',
    '/transaction/demand-recovery/print-members-demand-list': 'ROUTES.PRINT_MEMBERS_DEMAND_LIST',
    '/transaction/demand-recovery/change-member-office': 'ROUTES.CHANGE_MEMBER_OFFICE',
    '/transaction/demand-recovery/modify-short-recovery': 'ROUTES.MODIFY_SHORT_RECOVERY',
    '/reports/member-ledger': 'ROUTES.MEMBER_LEDGER_REPORT',
    '/reports/general-ledger': 'ROUTES.GENERAL_LEDGER',
    '/reports/member-detail-ledger': 'ROUTES.MEMBER_DETAIL_LEDGER',
    '/reports/jotting-report': 'ROUTES.JOTTING_REPORT',
    '/reports/account-balance': 'ROUTES.ACCOUNT_BALANCE',
    '/reports/surety-register': 'ROUTES.SURETY_REGISTER',
    '/reports/deposit-due-date-register': 'ROUTES.DEPOSIT_DUE_DATE_REGISTER',
    '/reports/adhoc-reports': 'ROUTES.ADHOC_REPORTS',
    '/reports/pass-book-printing': 'ROUTES.PASS_BOOK_PRINTING',
    '/reports/daily/cash-book-receiptwise': 'ROUTES.CASH_BOOK_RECEIPTWISE',
    '/reports/daily/cash-book': 'ROUTES.CASH_BOOK',
    '/reports/daily/day-book': 'ROUTES.DAY_BOOK',
    '/reports/daily/day-book-sb': 'ROUTES.DAY_BOOK_SB',
    '/reports/daily/consolidation': 'ROUTES.CONSOLIDATION_DAILY_ACCOUNT',
    '/reports/monthly/cash-book-monthly': 'ROUTES.CASH_BOOK_MONTHLY',
    '/reports/monthly/detail-ledger': 'ROUTES.DETAIL_LEDGER',
    '/reports/monthly/bank-detail-ledger': 'ROUTES.BANK_DETAIL_LEDGER',
    '/reports/monthly/defaulter-list': 'ROUTES.DEFAULTER_LIST',
    '/reports/monthly/new-loan-disbursed': 'ROUTES.NEW_LOAN_DISBURSED',
    '/reports/monthly/member-loan-ledger': 'ROUTES.MEMBER_LOAN_LEDGER',
    '/reports/monthly/print-vouchers/receipt-payment': 'ROUTES.RECEIPT_PAYMENT_VOUCHER',
    '/reports/monthly/print-vouchers/journal-transfer': 'ROUTES.JOURNAL_TRANSFER_VOUCHER',
    '/reports/yearly/pl-balance-sheet': 'ROUTES.PL_BALANCE_SHEET',
    '/reports/yearly/voters-withdrawal-list': 'ROUTES.VOTERS_WITHDRAWAL_LIST',
    '/reports/yearly/dividend-report': 'ROUTES.DIVIDEND_REPORT',
    '/reports/yearly/dividend-paid': 'ROUTES.DIVIDEND_PAID',
    '/reports/yearly/interest-list': 'ROUTES.INTEREST_LIST',
    '/reports/yearly/dividend-warrant': 'ROUTES.DIVIDEND_WARRANT',
    '/reports/yearly/customized-trial-balance/define-trial-balance': 'ROUTES.DEFINE_TRIAL_BALANCE',
    '/reports/yearly/customized-trial-balance/open-trial-balance': 'ROUTES.OPEN_TRIAL_BALANCE',
    '/reports/yearly/customized-trial-balance/define-balance-sheet': 'ROUTES.DEFINE_BALANCE_SHEET',
    '/reports/yearly/customized-trial-balance/open-balance-sheet': 'ROUTES.OPEN_BALANCE_SHEET',
    '/reports/yearly/customized-trial-balance/define-pl': 'ROUTES.DEFINE_PL',
    '/reports/yearly/customized-trial-balance/open-pl': 'ROUTES.OPEN_PL',
    '/reports/member-statement/member-statement': 'ROUTES.MEMBER_STATEMENT',
    '/reports/member-statement/saving-statement': 'ROUTES.SAVING_STATEMENT',
    '/reports/member-statement/rd-statement': 'ROUTES.RD_STATEMENT',
    '/reports/member-statement/fd-statement': 'ROUTES.FD_STATEMENT',
    '/reports/member-statement/rd-statement-new': 'ROUTES.RD_STATEMENT_NEW',
    '/reports/member-statement/fd-statement-new': 'ROUTES.FD_STATEMENT_NEW',
    '/reports/member-statement/new-share-certificate': 'ROUTES.NEW_SHARE_CERTIFICATE',
    '/reports/member-statement/interest-certificate': 'ROUTES.INTEREST_CERTIFICATE',
    '/reports/member-statement/loan-nil-certificate': 'ROUTES.LOAN_NIL_CERTIFICATE',
    '/reports/account-reports/account-closing-register': 'ROUTES.ACCOUNT_CLOSING_REGISTER',
    '/reports/account-reports/fixed-deposit-certificate': 'ROUTES.FIXED_DEPOSIT_CERTIFICATE',
    '/reports/account-reports/share-certificate': 'ROUTES.SHARE_CERTIFICATE',
    '/reports/account-reports/recurring-details': 'ROUTES.RECURRING_DETAILS',
    '/reports/account-reports/recovery-details': 'ROUTES.RECOVERY_DETAILS',
    '/reports/account-reports/loan-contributions-register': 'ROUTES.LOAN_CONTRIBUTIONS_REGISTER',
    '/reports/account-reports/lien-account-information': 'ROUTES.LIEN_ACCOUNT_INFORMATION',
    '/utility/premature-information/rd': 'ROUTES.PREMATURE_INFORMATION_RD',
    '/utility/premature-information/sb': 'ROUTES.PREMATURE_INFORMATION_SB',
    '/utility/calculator': 'ROUTES.CALCULATOR',
    '/utility/find': 'ROUTES.FIND',
    '/utility/member-balance': 'ROUTES.MEMBER_BALANCE',
    '/utility/emi-chart': 'ROUTES.EMI_CHART',
    '/utility/database-backup': 'ROUTES.DATABASE_BACKUP',
    '/utility/update-saving-interest': 'ROUTES.UPDATE_SAVING_INTEREST',
    '/utility/interest-receivable-received-statement': 'ROUTES.INTEREST_RECEIVABLE_RECEIVED_STATEMENT',
    '/help/about': 'ROUTES.ABOUT',
    '/help/contents': 'ROUTES.CONTENTS',
    '/exit/option1': 'ROUTES.EXIT_OPTION1',
    '/settings': 'ROUTES.SETTINGS',
};

function migrateFile(filePath: string, importPath: string): void {
    console.log(`\n📝 Migrating ${path.basename(filePath)}...`);

    let content = fs.readFileSync(filePath, 'utf-8');
    let changesMade = 0;

    // Check if ROUTES is already imported
    const hasImport = content.includes("from '../config/routes'") ||
        content.includes('from "../config/routes"') ||
        content.includes("from '../../config/routes'") ||
        content.includes('from "../../config/routes"');

    // Add import if not present
    if (!hasImport) {
        const importStatement = `import { ROUTES } from '${importPath}';\n`;
        // Find the last import statement
        const lastImportMatch = content.match(/import .* from .*;/g);
        if (lastImportMatch) {
            const lastImport = lastImportMatch[lastImportMatch.length - 1];
            content = content.replace(lastImport, lastImport + '\n' + importStatement);
            console.log('  ✓ Added ROUTES import');
        }
    }

    // Replace route strings with constants
    for (const [route, constant] of Object.entries(ROUTE_TO_CONSTANT_MAP)) {
        // Match patterns like: '/route', "/route", route: '/route', path="/route", ['/route']:
        const patterns = [
            new RegExp(`'${route.replace(/\//g, '\\/')}'`, 'g'),
            new RegExp(`"${route.replace(/\//g, '\\/')}"`, 'g'),
        ];

        for (const pattern of patterns) {
            if (pattern.test(content)) {
                content = content.replace(pattern, constant);
                changesMade++;
            }
        }
    }

    if (changesMade > 0) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`  ✓ Replaced ${changesMade} route strings with constants`);
    } else {
        console.log('  ℹ No changes needed');
    }
}

console.log('🚀 Starting migration to ROUTES constants...\n');
console.log('This will update:');
console.log('  - Navbar.tsx');
console.log('  - main.ts');
console.log('  - App.tsx');
console.log('\n' + '='.repeat(60));

// Migrate files
const projectRoot = path.join(__dirname, '..');

try {
    migrateFile(
        path.join(projectRoot, 'src/components/navigation/Navbar.tsx'),
        '../../config/routes'
    );

    migrateFile(
        path.join(projectRoot, 'src/main/main.ts'),
        '../config/routes'
    );

    migrateFile(
        path.join(projectRoot, 'src/renderer/App.tsx'),
        '../config/routes'
    );

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Migration complete!');
    console.log('\n📋 Next steps:');
    console.log('  1. Review the changes');
    console.log('  2. Run: npm run validate-routes');
    console.log('  3. Test the application');
    console.log('  4. Commit the changes\n');

} catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
}
