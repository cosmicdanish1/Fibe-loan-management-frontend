import React from 'react';
import { ReportShell } from '../../../../components/reports/views/ReportShell';
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
  else window.location.hash = report.route; // browser / non-Electron fallback: navigate in place
};

const ReportPro: React.FC = () => (
  <ReportShell
    className="report-pro-page"
    title="Legacy report workspace"
    desc="One place for the recovery, member, FRS and migration outputs currently maintained as separate Excel and CSV files."
    footerLeft="Report Pro"
    footerRight="8 report families · 3 windows available now"
  >
    <div style={{ display: 'grid', gap: 'var(--aw-gap)', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {REPORTS.map((report) => {
        const available = report.status === 'available';
        return (
          <section key={report.title} className="aw-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <span className="aw-card-icon">{report.icon}</span>
              {available
                ? <CheckCircle2 size={16} style={{ color: 'var(--aw-success)' }} />
                : <CircleDashed size={16} style={{ color: 'var(--aw-warning)' }} />}
            </div>
            <h2 className="aw-card-title">{report.title}</h2>
            <p className="aw-meta" style={{ flex: 1 }}>{report.description}</p>
            <button
              type="button"
              onClick={() => openReport(report)}
              disabled={!available}
              className="aw-btn aw-btn-secondary"
              style={{ alignSelf: 'flex-start' }}
            >
              {available ? 'Open report window' : 'Dedicated endpoint pending'}
              {available && <ArrowRight size={13} />}
            </button>
          </section>
        );
      })}
    </div>

    <p className="aw-meta">
      Available cards open the existing report windows. Pending cards are intentionally visible so the missing direct-output capabilities are tracked instead of being hidden behind manual Excel work.
    </p>
  </ReportShell>
);

export default ReportPro;
