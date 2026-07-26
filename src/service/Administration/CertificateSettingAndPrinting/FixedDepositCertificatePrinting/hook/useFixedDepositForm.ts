import { useState } from "react";
import type { FixedDepositForm } from "../interface/types";

export const useFixedDepositForm = () => {
  const [form, setForm] = useState<FixedDepositForm>({
    memberNo: "",
    accountNumber: "",
    depositAmount: 0,
    depositPeriod: "",
    interestRate: 0,
    maturityAmount: 0,
    depositDate: "",
    maturityDate: "",
  });

  const updateField = (field: keyof FixedDepositForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      memberNo: "",
      accountNumber: "",
      depositAmount: 0,
      depositPeriod: "",
      interestRate: 0,
      maturityAmount: 0,
      depositDate: "",
      maturityDate: "",
    });
  };

  return { form, updateField, resetForm };
};
