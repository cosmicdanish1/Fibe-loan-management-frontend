import { useState } from "react";
import type { PassbookParameters } from "../interface/types";

export const usePassbookParameters = () => {
  const [parameters, setParameters] = useState<PassbookParameters>({
    bankPassbookSettings: {
      formatName: "",
      accountType: "Saving Bank - SE",
    },
    pageSetting: {
      bankFormat: "",
      totalPages: 0,
      linesPerPage: 0,
      lineStartNumber: 0,
      incrementLevel: 0,
    },
    detailPageSetting: {
      bankFormat: "",
      fields: [{ name: "", row: 0, col: 0, visible: false }],
    },
    firstPageSetting: {
      formatForBank: "",
      fields: [
        { name: "", row: 0, col: 0, displayNameFlag: false, visibleFlag: false },
      ],
    },
  });

  const updateParameters = (section: keyof PassbookParameters, data: any) => {
    setParameters((prev) => ({ ...prev, [section]: data }));
  };

  return { parameters, updateParameters };
};
