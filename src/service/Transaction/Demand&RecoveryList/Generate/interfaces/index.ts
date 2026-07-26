// Types and Interfaces
export interface DemandGenerationData {
  month: string;
  year: string;
  divisionRO: string;
  from: string;
  to: string;
}

export interface DemandGenerationState {
  formData: DemandGenerationData;
  dropdowns: {
    month: boolean;
    year: boolean;
    divisionRO: boolean;
    to: boolean;
  };
}

export interface UseDemandGenerationHook {
  state: DemandGenerationState;
  actions: {
    updateField: (field: keyof DemandGenerationData, value: string) => void;
    toggleDropdown: (dropdown: keyof DemandGenerationState['dropdowns']) => void;
    closeDropdown: (dropdown: keyof DemandGenerationState['dropdowns']) => void;
    closeAllDropdowns: () => void;
    resetForm: () => void;
    generateDemand: () => void;
  };
  options: {
    months: string[];
    years: string[];
    divisions: string[];
    destinations: string[];
  };
}
