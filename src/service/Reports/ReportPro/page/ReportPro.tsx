import React from 'react';
import { FileSpreadsheet, Users, Phone, BadgeIndianRupee, Database, ArrowRight, CheckCircle2, CircleDashed } from 'lucide-react';

type ReportCard = {
  title: string;
  description: string;
  action?: string;
  route?: string;
  status: 'available' | 'endpoint-needed';
  icon: React.ReactNode;
};

const REPORTS: ReportCard[] = [
  {
    title: 'Recovery and deduction output',
    description: 'Monthly recovery details with loan, deposit, interest and FRS components.',
    action: 'RECOVERY_DETAILS',
    route: '/reports/account-reports/recovery-details',
    status: 'available',
    icon: <BadgeIndianRupee size={18} />,
  },
  {
    title: 'Non-recovery and defaulters',
    description: 'Members with unpaid or outstanding recovery amounts.',
    action: 'DEFAULTER_LIST',
    route: '/reports/monthly/defaulter-list',
    status: 'available',
    icon: <FileSpreadsheet size={18} />,
  },
  {
    title: 'AGM and voters member list',
    description: 'Branch-wise member lists with member numbers, personal numbers and contact details.',
    action: 'VOTERS_WITHDRAWL_LIST',
    route: '/reports/yearly/members/voters-withdrawal-list',
    status: 'available',
    icon: <Users size={18} />,
  },
  {
    title: 'Contact and address gaps',
    description: 'Missing phone, address, FRS and personal-number records prepared for correction.',
    status: 'endpoint-needed',
    icon: <Phone size={18} />,
  },
  {
    title: 'FRS calculation',
    description: 'FRS period calculations and member-level FRS balances.',
    status: 'endpoint-needed',
    icon: <BadgeIndianRupee size={18} />,
  },
  {
    title: 'Recovery summaries',
    description: 'Agency and period-level recovery totals matching the legacy summary CSV files.',
    status: 'endpoint-needed',
    icon: <FileSpreadsheet size={18} />,
  },
  {
    title: 'Data migration snapshot',
    description: 'Member balances across shares, deposits, loans and FRS for migration review.',
    status: 'endpoint-needed',
    icon: <Database size={18} />,
  },
  {
    title: 'Legacy CSV and XLSX export',
    description: 'Generate the standardized files directly from application data without manual copy-paste.',
    status: 'endpoint-needed',
    icon: <FileSpreadsheet size={18} />,
  },
];

const openReport = (report: ReportCard) => {
  if (!report.route) return;
  const electronApi = (window as any).electronAPI;
  if (electronApi?.openNewWindow) electronApi.openNewWindow(report.route);
};

const ReportPro: React.FC = () => (
  <div className="min-h-screen bg-slate-50 px-6 py-5 text-slate-900">
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">Report Pro</p>
          <h1 className="text-2xl font-black tracking-tight">Legacy report workspace</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            One place for the recovery, member, FRS and migration outputs currently maintained as separate Excel and CSV files.
          </p>
        </div>
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-right text-xs text-indigo-800">
          <div className="font-bold">8 report families</div>
          <div className="mt-0.5 text-indigo-600">3 windows available now</div>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((report) => {
          const available = report.status === 'available';
          return (
            <section key={report.title} className="flex min-h-[178px] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${available ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                  {report.icon}
                </div>
                {available ? <CheckCircle2 size={16} className="text-emerald-600" /> : <CircleDashed size={16} className="text-amber-500" />}
              </div>
              <h2 className="mt-4 text-sm font-bold">{report.title}</h2>
              <p className="mt-1 flex-1 text-xs leading-5 text-slate-500">{report.description}</p>
              <button
                type="button"
                onClick={() => openReport(report)}
                disabled={!available}
                className={`mt-4 inline-flex items-center gap-1 self-start text-xs font-bold ${available ? 'text-indigo-700 hover:text-indigo-900' : 'cursor-not-allowed text-slate-400'}`}
              >
                {available ? 'Open report window' : 'Dedicated endpoint pending'}
                {available && <ArrowRight size={13} />}
              </button>
            </section>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Available cards open the existing report windows. Pending cards are intentionally visible so the missing direct-output capabilities are tracked instead of being hidden behind manual Excel work.
      </p>
    </div>
  </div>
);

export default ReportPro;
