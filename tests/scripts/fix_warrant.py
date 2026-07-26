import re

# Read the file
file_path = r'f:\company\main project\backend\src\modules\report\report.service.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the problematic SQL lines
old_pattern = r"          `ROUND\(\(COALESCE\(a\.cur_shareamt, 0\) \* \$\{dividendRate\}\) / 100, 2\) as dividendAmount`,\s*`'CHQ' \|\| LPAD\(ROW_NUMBER\(\) OVER \(ORDER BY m\.mbno\)::TEXT, 6, '0'\) as chequeNo`,\s*'\\\\State Bank of India\\\\' as bankName',\s*'CURRENT_DATE as issueDate'"

new_content = "          `ROUND((COALESCE(a.cur_shareamt, 0) * ${dividendRate}) / 100, 2) as dividendAmount`"

# Replace
content = re.sub(old_pattern, new_content, content, flags=re.MULTILINE | re.DOTALL)

# Also need to update the data mapping to add cheque details in JS
old_map = r"      return \{\s*data: results\.map\(row => \(\{\s*memberNo: row\.memberno,\s*memberName: row\.membername,\s*address: row\.address\?\.trim\(\) \|\| '',\s*wing: row\.wing,\s*office: row\.office,\s*designation: row\.designation,\s*basicPay: parseFloat\(row\.basicpay \|\| '0'\),\s*shareAmount: parseFloat\(row\.shareamount \|\| '0'\),\s*dividendAmount: parseFloat\(row\.dividendamount \|\| '0'\),\s*chequeNo: row\.chequeno,\s*bankName: row\.bankname,\s*issueDate: row\.issuedate\s*\}\)\),"

new_map = """      // Generate warrant metadata
      const currentDate = new Date().toISOString().split('T')[0];

      return {
        data: results.map((row, index) => ({
          memberNo: row.memberno,
          memberName: row.membername,
          address: row.address?.trim() || '',
          wing: row.wing,
          office: row.office,
          designation: row.designation,
          basicPay: parseFloat(row.basicpay || '0'),
          shareAmount: parseFloat(row.shareamount || '0'),
          dividendAmount: parseFloat(row.dividendamount || '0'),
          chequeNo: `CHQ${String(index + 1).padStart(6, '0')}`,
          bankName: 'State Bank of India',
          issueDate: currentDate
        })),"""

content = re.sub(old_map, new_map, content, flags=re.MULTILINE | re.DOTALL)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("File fixed successfully!")
