import React, { useEffect, useState } from 'react';
import { Card, Spin, Statistic, Table, Typography } from 'antd';
import { TrendingUp, Percent, ShieldCheck, PieChart, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiService } from '../../services/api';

const { Title, Text } = Typography;

interface BusinessRules {
    RULE_FUND_INT_RATE: number;
    RULE_DIVIDEND_PCT: number;
    RULE_GRP_INSURANCE_AMT: number;
    RULE_CD_INTEREST_CHART: any;
}

interface Props {
    showFundInterestRate?: boolean;
    showDividendPayout?: boolean;
    showGroupInsurance?: boolean;
    showDepositInterestSlabs?: boolean;
}

const FinancialIndicators: React.FC<Props> = ({
    showFundInterestRate = true,
    showDividendPayout = true,
    showGroupInsurance = true,
    showDepositInterestSlabs = true,
}) => {
    const [loading, setLoading] = useState(true);
    const [rules, setRules] = useState<BusinessRules>({
        RULE_FUND_INT_RATE: 0,
        RULE_DIVIDEND_PCT: 0,
        RULE_GRP_INSURANCE_AMT: 0,
        RULE_CD_INTEREST_CHART: []
    });

    useEffect(() => {
        const fetchRules = async () => {
            try {
                const response = await apiService.getBusinessRules();
                if (response.success && response.data) {
                    const d = response.data;
                    let chart = [];
                    try {
                        if (typeof d.RULE_CD_INTEREST_CHART === 'string') {
                            chart = JSON.parse(d.RULE_CD_INTEREST_CHART);
                        } else {
                            chart = d.RULE_CD_INTEREST_CHART || [];
                        }
                    } catch (e) {
                        console.error("Failed to parse chart", e);
                    }

                    setRules({
                        RULE_FUND_INT_RATE: d.RULE_FUND_INT_RATE || 0,
                        RULE_DIVIDEND_PCT: d.RULE_DIVIDEND_PCT || 0,
                        RULE_GRP_INSURANCE_AMT: d.RULE_GRP_INSURANCE_AMT || 0,
                        RULE_CD_INTEREST_CHART: chart
                    });
                }
            } catch (error) {
                console.error('Failed to fetch financial indicators', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRules();
    }, []);

    if (loading) {
        return <div className="p-4 text-center"><Spin /></div>;
    }

    const chartColumns = [
        { title: 'Monthly Contrib.', dataIndex: 'monthlyContribution', key: 'monthlyContribution', render: (val: number) => `₹ ${val}` },
        { title: 'Yearly Interest', dataIndex: 'yearlyInterest', key: 'yearlyInterest', render: (val: number) => <span className="text-emerald-600 font-bold">₹ {val}</span> },
    ];

    return (
        <div className="w-full max-w-7xl mx-auto mt-8">
            <div className="flex items-center gap-2 mb-4 px-4">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700">
                    <PieChart size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">Financial Governance</h3>
                    <p className="fz-small text-slate-500 font-bold uppercase tracking-widest">Live Fiscal Parameters</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-4">
                {showFundInterestRate && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><TrendingUp size={18} /></div>
                                <span className="fz-small font-black text-slate-400 uppercase tracking-widest">Annual</span>
                            </div>
                            <div className="text-2xl font-black text-slate-800">{rules.RULE_FUND_INT_RATE}%</div>
                            <div className="text-xs text-slate-500 font-medium mt-1">Fund Interest Rate</div>
                        </div>
                    </motion.div>
                )}

                {showDividendPayout && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><Percent size={18} /></div>
                                <span className="fz-small font-black text-slate-400 uppercase tracking-widest">Profit Share</span>
                            </div>
                            <div className="text-2xl font-black text-emerald-700">{rules.RULE_DIVIDEND_PCT}%</div>
                            <div className="text-xs text-slate-500 font-medium mt-1">Dividend Payout</div>
                        </div>
                    </motion.div>
                )}

                {showGroupInsurance && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-rose-50 rounded-xl text-rose-600"><ShieldCheck size={18} /></div>
                                <span className="fz-small font-black text-slate-400 uppercase tracking-widest">Deduction</span>
                            </div>
                            <div className="text-2xl font-black text-slate-800">₹ {rules.RULE_GRP_INSURANCE_AMT}</div>
                            <div className="text-xs text-slate-500 font-medium mt-1">Group Insurance (Yr)</div>
                        </div>
                    </motion.div>
                )}

                {showDepositInterestSlabs && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="md:col-span-1">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600"><Info size={14} /></div>
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">Deposit Interest Slabs</span>
                            </div>
                            <div className="flex-1 overflow-auto max-h-[100px] text-xs">
                                {Array.isArray(rules.RULE_CD_INTEREST_CHART) && rules.RULE_CD_INTEREST_CHART.length > 0 ? (
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="fz-tiny text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                                <th className="pb-1">Monthly</th>
                                                <th className="pb-1 text-right">Interest</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {rules.RULE_CD_INTEREST_CHART.slice(0, 3).map((row: any, i: number) => (
                                                <tr key={i}>
                                                    <td className="py-1 font-medium text-slate-600">₹{row.monthlyContribution}</td>
                                                    <td className="py-1 text-right font-bold text-emerald-600">₹{row.yearlyInterest}</td>
                                                </tr>
                                            ))}
                                            {rules.RULE_CD_INTEREST_CHART.length > 3 && (
                                                <tr>
                                                    <td colSpan={2} className="fz-tiny text-center pt-1 text-slate-400 italic">
                                                        + {rules.RULE_CD_INTEREST_CHART.length - 3} more slabs
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="text-slate-400 italic fz-small">No slabs configured</div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default FinancialIndicators;
