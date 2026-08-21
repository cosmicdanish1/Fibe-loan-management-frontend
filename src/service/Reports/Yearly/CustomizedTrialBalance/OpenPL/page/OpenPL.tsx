import React, { useState, useEffect } from 'react';
import { Select, Card, Row, Col, DatePicker, Button, Table, Typography, Space, Tag, Divider, Empty } from 'antd';
import {
  SearchOutlined,
  PrinterOutlined,
  ReloadOutlined,
  CalendarOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { apiService } from '../../../../../../services/api';

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: title, detail, buttons: ['OK'], defaultId: 0 });
  }
};

const { Option } = Select;
const { Text, Title } = Typography;

interface Schedule {
  id: number;
  schedule_name: string;
  template_name: string;
  created_at: string;
}

interface LineItem {
  particulars: string;
  codeFrom: string;
  codeTo: string;
  current: {
    receipts: number;
    payments: number;
    balance: number;
  };
  progressive: {
    receipts: number;
    payments: number;
    balance: number;
  };
}

const OpenPL: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs());
  const [financialYearStart, setFinancialYearStart] = useState<Dayjs | null>(dayjs().startOf('year').month(3).date(1));

  const [loading, setLoading] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [data, setData] = useState<LineItem[]>([]);
  const [grandTotals, setGrandTotals] = useState<any>(null);
  const [societyInfo, setSocietyInfo] = useState<{ name: string; address: string } | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await apiService.getAllReportSchedules('PL');
      if (response.success && Array.isArray(response.data)) {
        setSchedules(response.data);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      await showDialog('error', 'Error', 'Failed to load schedules');
    }
  };

  const handleSearch = async () => {
    if (!selectedSchedule || !fromDate || !toDate || !financialYearStart) {
      await showDialog('error', 'Error', 'Please select all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.executeReportSchedule(
        selectedSchedule,
        fromDate.format('YYYY-MM-DD'),
        toDate.format('YYYY-MM-DD'),
        financialYearStart.format('YYYY-MM-DD')
      );

      if (response.success && response.data && response.data.lineItems) {
        setData(response.data.lineItems);
        setGrandTotals(response.data.grandTotals);
        setSocietyInfo({
          name: response.data.societyName,
          address: response.data.societyAddress
        });
        await showDialog('info', 'Success', 'Report loaded successfully');
      } else {
        setData([]);
        setGrandTotals(null);
        await showDialog('warning', 'Warning', response.error || 'No data found for this report');
      }
    } catch (error) {
      console.error('Error executing report:', error);
      await showDialog('error', 'Error', 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const columns = [
    {
      title: 'Particulars',
      dataIndex: 'particulars',
      key: 'particulars',
      width: 250,
      fixed: (isPrinting ? undefined : 'left') as any,
      render: (text: string) => (
        <Text strong className="text-slate-700 fz-label">{text}</Text>
      )
    },
    {
      title: 'Range',
      key: 'codeRange',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: LineItem) => (
        <Tag color="green" className="rounded-full border-none px-2 fz-caption m-0 text-emerald-700 bg-emerald-50">
          {record.codeFrom} - {record.codeTo}
        </Tag>
      )
    },
    {
      title: <span className={isPrinting ? "" : "text-emerald-700"}>Current Period</span>,
      children: [
        {
          title: 'Debit',
          dataIndex: ['current', 'receipts'],
          key: 'currReceipts',
          width: 120,
          align: 'right' as const,
          render: (val: number) => <span className="fz-caption">{formatCurrency(val)}</span>
        },
        {
          title: 'Credit',
          dataIndex: ['current', 'payments'],
          key: 'currPayments',
          width: 120,
          align: 'right' as const,
          render: (val: number) => <span className="fz-caption">{formatCurrency(val)}</span>
        },
        {
          title: 'Balance',
          dataIndex: ['current', 'balance'],
          key: 'currBalance',
          width: 130,
          align: 'right' as const,
          render: (val: number) => (
            <div className={`font-bold fz-caption ${val < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
              {formatCurrency(val)}
            </div>
          )
        },
      ]
    },
    {
      title: <span className={isPrinting ? "" : "text-emerald-800"}>Progressive (YTD)</span>,
      children: [
        {
          title: 'Debit Total',
          dataIndex: ['progressive', 'receipts'],
          key: 'progReceipts',
          width: 120,
          align: 'right' as const,
          render: (val: number) => <span className="fz-caption">{formatCurrency(val)}</span>
        },
        {
          title: 'Credit Total',
          dataIndex: ['progressive', 'payments'],
          key: 'progPayments',
          width: 120,
          align: 'right' as const,
          render: (val: number) => <span className="fz-caption">{formatCurrency(val)}</span>
        },
        {
          title: 'Balance',
          dataIndex: ['progressive', 'balance'],
          key: 'progBalance',
          width: 130,
          align: 'right' as const,
          render: (val: number) => (
            <div className={`font-bold fz-caption ${val < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {formatCurrency(val)}
            </div>
          )
        },
      ]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col overflow-auto bg-[#f8fafc] p-6">
      <div className="bg-gradient-to-r from-slate-900 to-slate-900 px-3 py-1.5 flex items-center shrink-0 shadow-lg border-b border-white/5 no-print">
        <h1 className="fz-caption font-black text-white tracking-tight uppercase">Profit & Loss Account</h1>
      </div>
      <style>{`
        @media print { 
          @page { size: portrait; margin: 10mm; }
          body { background: white !important; }
          .no-print { display: none !important; } 
          .print-header { display: block !important; text-align: center; margin-bottom: 20px; }
          .ant-table { font-size: 9px !important; }
          .ant-table-cell { padding: 4px 4px !important; }
          .ant-card { border: none !important; box-shadow: none !important; }
          .p-6 { padding: 0 !important; }
          .ant-table-summary { background-color: #f8fafc !important; font-weight: bold; }
        }
        .print-header { display: none; }
        .ant-table-thead > tr > th {
          background-color: #f0f7f4 !important;
          font-weight: 600 !important;
        }
        .ant-table-summary {
          background-color: #f8fafc !important;
        }
      `}</style>

      <div className="max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 no-print">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-emerald-200 shadow-lg">
              <FileTextOutlined className="text-white fz-heading" />
            </div>
            <div>
              <Title level={3} style={{ margin: 0 }}>Profit & Loss Account</Title>
              <Text type="secondary">Consolidated income and expenditure report</Text>
            </div>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchSchedules}>Refresh Schedules</Button>
            {data.length > 0 && (
              <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 border-none shadow-emerald-200 shadow-md">
                Print Report
              </Button>
            )}
          </Space>
        </div>

        {/* Filters Card */}
        <Card className="mb-6 shadow-sm border-none rounded-2xl no-print">
          <Row gutter={[24, 24]} align="bottom">
            <Col xs={24} md={8}>
              <div className="space-y-1">
                <Text strong className="text-slate-600 fz-label">P & L SCHEDULE</Text>
                <Select
                  value={selectedSchedule}
                  onChange={setSelectedSchedule}
                  placeholder="Choose a P&L schedule..."
                  className="w-full h-10"
                  showSearch
                  optionFilterProp="children"
                >
                  {schedules.map(s => (
                    <Option key={s.id} value={s.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{s.schedule_name}</span>
                        <span className="fz-caption text-slate-400">{s.template_name}</span>
                      </div>
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
            <Col xs={24} sm={8} md={4}>
              <div className="space-y-1">
                <Text strong className="text-slate-600 fz-label">FROM DATE</Text>
                <DatePicker
                  value={fromDate}
                  onChange={setFromDate}
                  className="w-full h-10 rounded-lg"
                  format="DD-MMM-YYYY"
                  suffixIcon={<CalendarOutlined className="text-emerald-400" />}
                />
              </div>
            </Col>
            <Col xs={24} sm={8} md={4}>
              <div className="space-y-1">
                <Text strong className="text-slate-600 fz-label">TO DATE</Text>
                <DatePicker
                  value={toDate}
                  onChange={setToDate}
                  className="w-full h-10 rounded-lg"
                  format="DD-MMM-YYYY"
                  suffixIcon={<CalendarOutlined className="text-emerald-400" />}
                />
              </div>
            </Col>
            <Col xs={24} sm={8} md={4}>
              <div className="space-y-1">
                <Text strong className="text-slate-600 fz-label">FY STARTING</Text>
                <DatePicker
                  value={financialYearStart}
                  onChange={setFinancialYearStart}
                  className="w-full h-10 rounded-lg"
                  format="DD-MMM-YYYY"
                />
              </div>
            </Col>
            <Col xs={24} md={4}>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
                loading={loading}
                block
                className="h-10 fz-body font-semibold bg-emerald-600 hover:bg-emerald-700 border-none rounded-lg shadow-emerald-100 shadow-lg"
              >
                Execute
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Report Section */}
        {data.length > 0 ? (
          <Card
            className={`border-none ${isPrinting ? "" : "shadow-xl rounded-2xl overflow-hidden mb-10"}`}
            styles={{ body: { padding: 0 } }}
          >
            {/* Print Only Header */}
            <div className="print-header">
              <h1 className="fz-heading font-bold uppercase">{societyInfo?.name}</h1>
              <p className="fz-label">{societyInfo?.address}</p>
              <div className="border-b-2 border-slate-800 my-2"></div>
              <h2 className="fz-heading font-bold">Profit & Loss Account</h2>
              <p className="fz-body">
                Period: {fromDate?.format('DD-MMM-YYYY')} to {toDate?.format('DD-MMM-YYYY')} |
                FY Start: {financialYearStart?.format('DD-MMM-YYYY')}
              </p>
            </div>

            <Table
              dataSource={data}
              columns={columns}
              rowKey="particulars"
              pagination={false}
              size="small"
              bordered={isPrinting}
              loading={loading}
              scroll={isPrinting ? undefined : { x: 1000 }}
              className="custom-table"
              summary={() => (
                grandTotals && (
                  <Table.Summary fixed={isPrinting ? false : "bottom"}>
                    <Table.Summary.Row className="bg-slate-50">
                      <Table.Summary.Cell index={0} className="font-bold text-emerald-900 fz-label">
                        GRAND TOTAL
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}></Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right" className="font-bold text-slate-600 fz-caption">
                        {formatCurrency(grandTotals.currentReceipts)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="right" className="font-bold text-slate-600 fz-caption">
                        {formatCurrency(grandTotals.currentPayments)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4} align="right" className={`font-black fz-caption ${grandTotals.currentBalance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatCurrency(grandTotals.currentBalance)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5} align="right" className="font-bold text-slate-600 fz-caption">
                        {formatCurrency(grandTotals.progressiveReceipts)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6} align="right" className="font-bold text-slate-600 fz-caption">
                        {formatCurrency(grandTotals.progressivePayments)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7} align="right" className={`font-black fz-caption ${grandTotals.progressiveBalance < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {formatCurrency(grandTotals.progressiveBalance)}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )
              )}
            />

            {/* Print Footer */}
            <div className="print-header p-10 mt-10">
              <Row justify="space-between">
                <Col span={6} className="text-center">
                  <Divider className="border-slate-800" />
                  <Text strong>Prepared By</Text>
                </Col>
                <Col span={6} className="text-center">
                  <Divider className="border-slate-800" />
                  <Text strong>Checked By</Text>
                </Col>
                <Col span={6} className="text-center">
                  <Divider className="border-slate-800" />
                  <Text strong>Manager / Secretary</Text>
                </Col>
              </Row>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl shadow-sm border border-slate-100">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div className="space-y-2">
                  <p className="text-slate-500 font-medium">No P&L Data Available</p>
                  <p className="text-slate-400 fz-label">Select a schedule and execution parameters to visualize your profit and loss account</p>
                </div>
              }
            >
              {!selectedSchedule && <Tag color="warning" className="rounded-full">Schedule Required</Tag>}
            </Empty>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpenPL;
