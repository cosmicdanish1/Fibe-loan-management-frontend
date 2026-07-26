# Share Certificate - UI Testing Guide

## 🎯 **QUICK TEST INSTRUCTIONS**

### **Step 1: Navigate to Share Certificate**
1. Open the application
2. Go to: **Reports → Account Reports → Share Certificate**

### **Step 2: Test with Sample Data**
Enter the following test data:
```
Member Number: 940025125
Share No From: (leave blank for full range)
Share No To: (leave blank for full range)
Certificate Number: (leave blank for auto-generation)
```

### **Step 3: Generate Certificate**
1. Click **"GENERATE"** button
2. Certificate should load within 2-3 seconds

### **Step 4: Verify Certificate Data**
The certificate should display:
- ✅ **Member**: Mr S.K.SHUKLA Z
- ✅ **Certificate Number**: SC-940025
- ✅ **Total Shares**: 593 shares
- ✅ **Share Range**: 2512501 to 2513093
- ✅ **Face Value**: ₹10 per share
- ✅ **Total Value**: ₹5,930
- ✅ **Share Amount**: ₹5,928
- ✅ **Membership Date**: 09-FEB-1994

### **Step 5: Test Print Functionality**
1. Click **"Print Certificate"** button
2. New print window should open
3. Verify professional certificate layout
4. Check portrait orientation
5. Print or save as PDF

---

## 📋 **ADDITIONAL TEST CASES**

### **Test Case 1: Different Member**
```
Member Number: 610030984
Expected: Mr VK RAI, 593 shares, ₹5,926
```

### **Test Case 2: Share Range Filtering**
```
Member Number: 940025125
Share No From: 2512550
Share No To: 2512600
Expected: 51 shares (filtered range)
```

### **Test Case 3: Member Lookup**
1. Click **search button** next to Member Number
2. Member lookup window should open
3. Select any member from the list
4. Member number should auto-populate

### **Test Case 4: Certificate Number**
```
Member Number: 940025125
Certificate Number: SC-940025
Expected: Same certificate with specified number
```

---

## ✅ **EXPECTED RESULTS**

### **Certificate Layout Should Include:**
- Organization header: "EMPLOYEE COOPERATIVE CREDIT SOCIETY LTD."
- Certificate title: "SHARE CERTIFICATE"
- Certificate number (SC-XXXXXX format)
- Member details and address
- Share ownership information (numbers, range, value)
- Face value per share (₹10)
- Total shares and total value
- Membership date
- Signature sections for member and secretary
- Terms and conditions footer

### **Print Functionality Should:**
- Open in new window
- Display portrait orientation
- Show professional banking layout
- Include all certificate details
- Be ready for printing/PDF export

---

## 🚨 **TROUBLESHOOTING**

### **Issue: "No Share Certificate data found"**
**Solution**: Try these member numbers:
- 940025125 (593 shares, ₹5,928)
- 610030984 (593 shares, ₹5,926)
- 610016234 (584 shares, ₹5,842)
- 610019593 (580 shares, ₹5,803)
- 610029289 (576 shares, ₹5,761)

### **Issue: "Member has no share holdings"**
**Solution**: 
1. Verify member exists in database
2. Check if member has `cur_shareamt > 0` in annualstatement table
3. Use test members listed above

### **Issue: Member lookup not working**
**Solution**: Member lookup only works in Electron app, not web browser

### **Issue: Print window blocked**
**Solution**: Allow popups for this site in browser settings

### **Issue: Certificate not loading**
**Solution**: 
1. Check if backend is running on port 3001
2. Verify member has active share holdings
3. Check browser console for errors

---

## 🎯 **SHARE CALCULATION VERIFICATION**

### **How Share Calculations Work:**
- **Face Value**: Fixed at ₹10 per share
- **Total Shares**: Share Amount ÷ 10 (e.g., ₹5,928 ÷ 10 = 593 shares)
- **Share Range**: Generated using member number modulo calculation
- **Total Value**: Total Shares × Face Value (e.g., 593 × ₹10 = ₹5,930)

### **Example Calculation:**
```
Member: 940025125
Share Amount: ₹5,928
Total Shares: 5,928 ÷ 10 = 593 shares
Share From: (940025125 % 100000) × 100 + 1 = 2512501
Share To: 2512501 + 593 - 1 = 2513093
Total Value: 593 × ₹10 = ₹5,930
```

---

## 📊 **TEST DATA SUMMARY**

| Member No | Name | Shares | Amount | Range |
|-----------|------|--------|--------|-------|
| 940025125 | Mr S.K.SHUKLA Z | 593 | ₹5,928 | 2512501-2513093 |
| 610030984 | Mr VK RAI | 593 | ₹5,926 | 3098401-3098993 |
| 610016234 | Mr UK AGRAWAL | 584 | ₹5,842 | 1623401-1623984 |
| 610019593 | URVELA MESHRAM | 580 | ₹5,803 | 1959301-1959880 |
| 610029289 | Mr MANOHAR LAL | 576 | ₹5,761 | 2928901-2929476 |

---

## ✅ **SUCCESS CRITERIA**

The Share Certificate is working correctly if:
- ✅ Certificate generates within 3 seconds
- ✅ All member and share details display correctly
- ✅ Share calculations are accurate (amount ÷ 10 = shares)
- ✅ Share ranges are properly generated
- ✅ Print window opens with professional layout
- ✅ Portrait orientation is enforced
- ✅ All signature sections and terms are included

---

## 📞 **SUPPORT**

If you encounter any issues:
1. Check the browser console for error messages
2. Verify backend server is running
3. Ensure member has active share holdings
4. Try different member numbers from the test cases above

**Database Query to Check Share Holdings:**
```sql
SELECT m.mbno, 
       CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.l_name, '')) as name,
       a.cur_shareamt,
       (a.cur_shareamt / 10)::integer as total_shares
FROM member_master m
INNER JOIN annualstatement a ON m.mbno = a.accno
WHERE a.cur_shareamt > 0 
  AND (m.isactive = 'Y' OR m.isactive = '1')
ORDER BY a.cur_shareamt DESC;
```