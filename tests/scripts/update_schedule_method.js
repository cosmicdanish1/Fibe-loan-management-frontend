const fs = require('fs');

const filePath = 'f:\\\\company\\\\main project\\\\backend\\\\src\\\\modules\\\\report\\\\report.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the executeReportSchedule method
const methodStart = content.indexOf('async executeReportSchedule(dto: ExecuteReportScheduleDto) {');
const methodEnd = content.indexOf('}\n\n  async getAllReportSchedules()');

if (methodStart === -1 || methodEnd === -1) {
    console.log('Method not found!');
    process.exit(1);
}

const newMethod = `async executeReportSchedule(dto: ExecuteReportScheduleDto) {
    const { scheduleId, fromDate, toDate, financialYearStart } = dto;

    try {
      // Fetch schedule details
      const details = await this.scheduleDetailRepository.find({
        where: { schedule_id: scheduleId },
        order: { id: 'ASC' }
      });

      if (details.length === 0) {
        throw new Error('No schedule details found for this schedule ID');
      }

      // Calculate totals for each line (Current vs Progressive)
      const lineItems = await Promise.all(
        details.map(async (detail) => {
          // Current Period: Receipts (CR) and Payments (DR)
          const currentResult = await this.ledgerRepository
            .createQueryBuilder('l')
            .select([
              'SUM(CASE WHEN l.trans_type = \\'CR\\' THEN l.trans_amt ELSE 0 END)', 'currentReceipts',
              'SUM(CASE WHEN l.trans_type = \\'DR\\' THEN l.trans_amt ELSE 0 END)', 'currentPayments'
            ])
            .where('l.code >= :codeFrom', { codeFrom: detail.code_from })
            .andWhere('l.code <= :codeTo', { codeTo: detail.code_to })
            .andWhere('l.trans_date >= :fromDate', { fromDate })
            .andWhere('l.trans_date <= :toDate', { toDate })
            .getRawOne();

          // Progressive (YTD): From financial year start to current toDate
          const progressiveResult = await this.ledgerRepository
            .createQueryBuilder('l')
            .select([
              'SUM(CASE WHEN l.trans_type = \\'CR\\' THEN l.trans_amt ELSE 0 END)', 'progressiveReceipts',
              'SUM(CASE WHEN l.trans_type = \\'DR\\' THEN l.trans_amt ELSE 0 END)', 'progressivePayments'
            ])
            .where('l.code >= :codeFrom', { codeFrom: detail.code_from })
            .andWhere('l.code <= :codeTo', { codeTo: detail.code_to })
            .andWhere('l.trans_date >= :financialYearStart', { financialYearStart })
            .andWhere('l.trans_date <= :toDate', { toDate })
            .getRawOne();

          // Calculate balances
          const currentReceipts = parseFloat(currentResult?.currentReceipts || '0');
          const currentPayments = parseFloat(currentResult?.currentPayments || '0');
          const currentBalance = currentReceipts - currentPayments;

          const progressiveReceipts = parseFloat(progressiveResult?.progressiveReceipts || '0');
          const progressivePayments = parseFloat(progressiveResult?.progressivePayments || '0');
          const progressiveBalance = progressiveReceipts - progressivePayments;

          return {
            particulars: detail.particulars,
            codeFrom: detail.code_from,
            codeTo: detail.code_to,
            current: {
              receipts: currentReceipts,
              payments: currentPayments,
              balance: currentBalance
            },
            progressive: {
              receipts: progressiveReceipts,
              payments: progressivePayments,
              balance: progressiveBalance
            }
          };
        })
      );

      // Calculate grand totals
      const grandTotals = lineItems.reduce(
        (totals, item) => ({
          currentReceipts: totals.currentReceipts + item.current.receipts,
          currentPayments: totals.currentPayments + item.current.payments,
          currentBalance: totals.currentBalance + item.current.balance,
          progressiveReceipts: totals.progressiveReceipts + item.progressive.receipts,
          progressivePayments: totals.progressivePayments + item.progressive.payments,
          progressiveBalance: totals.progressiveBalance + item.progressive.balance
        }),
        {
          currentReceipts: 0,
          currentPayments: 0,
          currentBalance: 0,
          progressiveReceipts: 0,
          progressivePayments: 0,
          progressiveBalance: 0
        }
      );

      return {
        scheduleId,
        fromDate,
        toDate,
        financialYearStart,
        lineItems,
        grandTotals
      };
    } catch (error) {
      console.error('Error executing report schedule:', error);
      throw error;
    }
  }`;

// Replace the method
content = content.substring(0, methodStart) + newMethod + content.substring(methodEnd);

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('Enhanced executeReportSchedule method successfully!');
