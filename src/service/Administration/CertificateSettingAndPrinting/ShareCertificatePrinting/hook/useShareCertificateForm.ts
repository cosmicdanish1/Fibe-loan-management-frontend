import { useState } from "react";
import type { ShareCertificateForm } from "../interface/types";

export const useShareCertificateForm = () => {
  const [form, setForm] = useState<ShareCertificateForm>({
    memberNo: "",
    transactionDate: "",
    certificateDate: "",
    shareAmount: 0,
    shareValue: 0,
    noOfShares: 0,
    certificateNo: "",
    distFromNo: "",
    distUptoNo: "",
  });

  const updateField = (field: keyof ShareCertificateForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      memberNo: "",
      transactionDate: "",
      certificateDate: "",
      shareAmount: 0,
      shareValue: 0,
      noOfShares: 0,
      certificateNo: "",
      distFromNo: "",
      distUptoNo: "",
    });
  };

  return { form, updateField, resetForm };
};
