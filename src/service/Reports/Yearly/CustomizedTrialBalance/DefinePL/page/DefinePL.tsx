import React, { useState, useEffect } from 'react';
import { Input, Button, Card, Typography, Table, Checkbox, Select, Row, Col, Space } from 'antd';
import { SettingOutlined, PlusOutlined, SaveOutlined, FileAddOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiService } from '../../../../../../services/api';
import { usePageToolbarActions } from '../../../../../../utils/pageToolbarActions';

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: title, detail, buttons: ['OK'], defaultId: 0 });
  }
};

const { Text, Title } = Typography;
const { Option } = Select;

interface PLItem {
  key: string;
  srNo: number;
  particulars: string;
  rangeFrom: string;
  rangeTo: string;
  selected: boolean;
}

const DefinePL: React.FC = () => {
  const [scheduleName, setScheduleName] = useState<string>('');
  const [templateName, setTemplateName] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);

  const [tableData, setTableData] = useState<PLItem[]>(() => {
    return Array.from({ length: 20 }, (_, index) => ({
      key: `${index + 1}`,
      srNo: index + 1,
      particulars: '',
      rangeFrom: '',
      rangeTo: '',
      selected: false
    }));
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await apiService.getAllReportSchedules('PL');
      if (response.success) {
        setSchedules(response.data);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const loadScheduleDetails = async (id: number) => {
    setLoading(true);
    try {
      const response = await apiService.getReportScheduleDetails(id);
      if (response.success && response.data) {
        const schedule = response.data;
        setScheduleName(schedule.schedule_name);
        setTemplateName(schedule.template_name);

        const details = schedule.details || [];
        const newTableData = Array.from({ length: Math.max(20, details.length + 5) }, (_, index) => {
          const detail = details[index];
          return {
            key: `${index + 1}`,
            srNo: index + 1,
            particulars: detail ? detail.particulars : '',
            rangeFrom: detail ? detail.code_from : '',
            rangeTo: detail ? detail.code_to : '',
            selected: false
          };
        });
        setTableData(newTableData);
        setSelectedScheduleId(id);
        await showDialog('info', 'Success', `Loaded schedule: ${schedule.schedule_name}`);
      }
    } catch (error) {
      console.error('Error loading schedule details:', error);
      await showDialog('error', 'Error', 'Failed to load schedule details');
    } finally {
      setLoading(false);
    }
  };

  const handleRowSelect = (key: string, checked: boolean) => {
    setTableData(prev =>
      prev.map(item =>
        item.key === key ? { ...item, selected: checked } : item
      )
    );
  };

  const addNewRow = () => {
    const newRow: PLItem = {
      key: Date.now().toString(),
      srNo: tableData.length + 1,
      particulars: '',
      rangeFrom: '',
      rangeTo: '',
      selected: false
    };
    setTableData(prev => [...prev, newRow]);
  };

  const removeRow = (key: string) => {
    setTableData(prev => {
      const filtered = prev.filter(item => item.key !== key);
      return filtered.map((item, index) => ({ ...item, srNo: index + 1 }));
    });
  };

  const updateTableData = (key: string, field: keyof PLItem, value: any) => {
    setTableData(prev =>
      prev.map(item =>
        item.key === key ? { ...item, [field]: value } : item
      )
    );
  };

  const handleReset = () => {
    setScheduleName('');
    setTemplateName('');
    setSelectedScheduleId(null);

    const resetData = Array.from({ length: 20 }, (_, index) => ({
      key: `${index + 1}`,
      srNo: index + 1,
      particulars: '',
      rangeFrom: '',
      rangeTo: '',
      selected: false
    }));

    setTableData(resetData);
    showDialog('info', 'Info', 'Form reset');
  };

  const handleSave = async () => {
    if (!scheduleName || !templateName) {
      await showDialog('error', 'Error', 'Please enter Schedule Name and Template Name');
      return;
    }

    const validRows = tableData.filter(row =>
      row.particulars.trim() && row.rangeFrom.trim() && row.rangeTo.trim()
    );

    if (validRows.length === 0) {
      await showDialog('error', 'Error', 'Please add at least one valid row with Particulars and Range');
      return;
    }

    setSaving(true);
    try {
      const details = validRows.map(row => ({
        particulars: row.particulars,
        code_from: row.rangeFrom,
        code_to: row.rangeTo
      }));

      const response = await apiService.createReportSchedule(
        scheduleName,
        templateName,
        details,
        'PL',
        selectedScheduleId || undefined
      );

      if (response.success) {
        await showDialog('info', 'Success', `P&L Schedule saved successfully! ${validRows.length} line items added.`);
        fetchSchedules();
      } else {
        await showDialog('error', 'Error', 'Failed to save schedule.');
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      await showDialog('error', 'Error', 'Failed to save schedule.');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<PLItem> = [
    {
      title: '',
      dataIndex: 'selected',
      key: 'selected',
      width: 40,
      render: (_, record) => (
        <Checkbox
          checked={record.selected}
          onChange={(e) => handleRowSelect(record.key, e.target.checked)}
        />
      ),
    },
    {
      title: 'Sr.No',
      dataIndex: 'srNo',
      key: 'srNo',
      width: 60,
      align: 'center',
    },
    {
      title: 'Particulars (Income / Expense Head)',
      dataIndex: 'particulars',
      key: 'particulars',
      render: (text, record) => (
        <Input
          value={text}
          onChange={(e) => updateTableData(record.key, 'particulars', e.target.value)}
          className="hover:bg-slate-50 transition-colors"
          placeholder="e.g. Interest on Loans"
          size="small"
        />
      ),
    },
    {
      title: 'Range (GL Codes)',
      children: [
        {
          title: 'From Code',
          dataIndex: 'rangeFrom',
          key: 'rangeFrom',
          width: 120,
          render: (text, record) => (
            <Input
              value={text}
              onChange={(e) => updateTableData(record.key, 'rangeFrom', e.target.value)}
              className="hover:bg-slate-50 transition-colors"
              placeholder="I1001"
              size="small"
            />
          ),
        },
        {
          title: 'To Code',
          dataIndex: 'rangeTo',
          key: 'rangeTo',
          width: 120,
          render: (text, record) => (
            <Input
              value={text}
              onChange={(e) => updateTableData(record.key, 'rangeTo', e.target.value)}
              className="hover:bg-slate-50 transition-colors"
              placeholder="I1999"
              size="small"
            />
          ),
        },
      ],
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Button
          type="text"
          danger
          size="small"
          onClick={() => removeRow(record.key)}
          icon={<PlusOutlined rotate={45} />}
        />
      ),
    },
  ];

  usePageToolbarActions({
    onSave: handleSave,
    saveLabel: 'Save Definition',
    saveEnabled: !saving,
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 p-6">
      <div className="bg-gradient-to-r from-slate-900 to-slate-900 px-3 py-1.5 flex items-center shrink-0 shadow-lg border-b border-white/5">
        <h1 className="fz-caption font-black text-white tracking-tight uppercase">P & L Account Definition</h1>
      </div>
      <div className="max-w-5xl mx-auto w-full">
        {/* Professional Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600 rounded-lg shadow-lg">
              <FileAddOutlined className="text-white fz-heading" />
            </div>
            <div>
              <Title level={3} style={{ margin: 0 }}>P & L Account Definition</Title>
              <Text type="secondary">Map Profit & Loss heads to ledger code ranges</Text>
            </div>
          </div>
          <Space>
            <Button onClick={handleReset}>Clear All</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              className="bg-emerald-600 border-none shadow-md hover:bg-emerald-700 font-bold"
            >
              Save Definition
            </Button>
          </Space>
        </div>

        {/* Control Panel */}
        <Card className="mb-6 shadow-sm border-t-4 border-emerald-600 rounded-xl">
          <Row gutter={[24, 16]}>
            <Col xs={24} md={12}>
              <Text strong className="block mb-1 text-slate-500 fz-caption uppercase tracking-wider">LOAD EXISTING SCHEDULE</Text>
              <Select
                showSearch
                className="w-full"
                placeholder="Search to edit existing schedule..."
                optionFilterProp="children"
                onChange={loadScheduleDetails}
                value={selectedScheduleId as any}
                loading={loading}
              >
                {schedules.map(s => (
                  <Option key={s.id} value={s.id}>{s.schedule_name}</Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} md={6}>
              <Text strong className="block mb-1 text-slate-500 fz-caption uppercase tracking-wider text-emerald-700">NEW SCHEDULE NAME</Text>
              <Input
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                placeholder="e.g. Income Schedule"
              />
            </Col>
            <Col xs={24} md={6}>
              <Text strong className="block mb-1 text-slate-500 fz-caption uppercase tracking-wider">TEMPLATE NAME</Text>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Standard Version"
              />
            </Col>
          </Row>
        </Card>

        {/* Configuration Table */}
        <Card className="shadow-lg border-none rounded-xl overflow-hidden p-0">
          <div className="p-4 bg-white border-b border-slate-100 flex justify-between items-center">
            <Text strong className="text-slate-700">Line Items Configuration</Text>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={addNewRow}
              size="small"
              className="border-emerald-400 text-emerald-600 hover:text-emerald-700"
            >
              Add New Line
            </Button>
          </div>
          <Table
            dataSource={tableData}
            columns={columns}
            pagination={false}
            size="small"
            scroll={{ y: 500 }}
            className="border-none"
            rowClassName={() => 'hover:bg-emerald-50/30 transition-colors'}
          />
        </Card>
      </div>
    </div>
  );
};

export default DefinePL;
