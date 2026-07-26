# Fixed Deposit Certificate - UI Testing Guide

## 🎯 **QUICK TEST INSTRUCTIONS**

### **Step 1: Navigate to Fixed Deposit Certificate**
1. Open the application
2. Go to: **Reports → Account Reports → Fixed Deposit Certificate**

### **Step 2: Test with Sample Data**
Enter the following test data:
```
Member Number: 610025808
Certificate Number: FD0009 (optional)
Certificate Type: Original
```

### **Step 3: Generate Certificate**
1. Click **"GENERATE"** button
2. Certificate should load within 2-3 seconds

### **Step 4: Verify Certificate Data**
The certificate should display:
- ✅ **Member**: Mr NIRMALENDU DEY
- ✅ **Account Number**: 500009
- ✅ **Certificate Number**: FD0009
- ✅ **Deposit Amount**: ₹2,50,000
- ✅ **Interest Rate**: 8.30%
- ✅ **Tenure**: 12 months
- ✅ **Maturity Amount**: ₹2,68,750
- ✅ **Nominee**: Not Specified

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
Member Number: 610016111
Expected: PRAMOD KUMAR, ₹1,00,000 @ 7.7%
```

### **Test Case 2: Certificate Number Filter**
```
Member Number: 610016572
Certificate Number: FD0005
Expected: ₹1,50,000 @ 7.9%
```

### **Test Case 3: Member Lookup**
1. Click **search button** next to Member Number
2. Member lookup window should open
3. Select any member from the list
4. Member number should auto-populate

### **Test Case 4: Certificate Types**
Test all certificate types:
- Original
- Duplicate  
- Triplicate

---

## ✅ **EXPECTED RESULTS**

### **Certificate Layout Should Include:**
- Organization header: "EMPLOYEE COOPERATIVE CREDIT SOCIETY LTD."
- Certificate title: "FIXED DEPOSIT CERTIFICATE"
- Certificate number and type
- Member details and account information
- Deposit amount, rate, and tenure
- Maturity date and amount
- Nominee information
- Signature sections for depositor and authorized signatory
- Terms and conditions footer

### **Print Functionality Should:**
- Open in new window
- Display portrait orientation
- Show professional banking layout
- Include all certificate details
- Be ready for printing/PDF export

---

## 🚨 **TROUBLESHOOTING**

### **Issue: "No Fixed Deposit found"**
**Solution**: Try these member numbers:
- 610025808 (₹2,50,000)
- 610016111 (₹1,00,000)
- 610016572 (₹1,50,000)
- 610023712 (₹50,000)
- 610024232 (₹2,00,000)

### **Issue: Member lookup not working**
**Solution**: Member lookup only works in Electron app, not web browser

### **Issue: Print window blocked**
**Solution**: Allow popups for this site in browser settings

### **Issue: Certificate not loading**
**Solution**: 
1. Check if backend is running on port 3001
2. Verify member has active FD account
3. Check browser console for errors

---

## 🎉 **SUCCESS CRITERIA**

The Fixed Deposit Certificate is working correctly if:
- ✅ Certificate generates within 3 seconds
- ✅ All member and account details display correctly
- ✅ Amounts are formatted with proper currency symbols
- ✅ Print window opens with professional layout
- ✅ Portrait orientation is enforced
- ✅ All signature sections and terms are included

---

## 📞 **SUPPORT**

If you encounter any issues:
1. Check the browser console for error messages
2. Verify backend server is running
3. Ensure member has active Fixed Deposit account
4. Try different member numbers from the test cases above

**Database Query to Check FD Accounts:**
```sql
SELECT mbno, account_number, certno, fdamount, rate, status 
FROM fdmaster 
WHERE fdrdflag = 'F' AND status != '1' 
ORDER BY mbno;
```