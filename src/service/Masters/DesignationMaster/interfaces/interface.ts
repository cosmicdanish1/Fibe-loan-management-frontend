export interface DesignationData {
  code: string;
  name: string;
  level: string;
}

export interface DesignationHookReturn {
  formData: DesignationData;
  designations: DesignationData[];
  isExisting: boolean;
  handleChange: (field: keyof DesignationData, value: string) => void;
  editDesignation: (d: DesignationData) => void;
  deleteDesignation: (code: string) => void;
  handleSave: () => void;
  handleCancel: () => void;
  handleExit: () => void;
}
