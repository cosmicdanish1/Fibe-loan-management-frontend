// types/depositLoanSlab.d.ts

/**
 * Global type definitions for Deposit/Loan Slab Management System
 * Provides type definitions accessible throughout the application
 */

declare module 'DepositLoanSlab' {
  // Re-export all types from the module
  export * from '../service/Administration/DepositLoanSlab/type/depositSlab.types';
  export * from '../service/Administration/DepositLoanSlab/interface/depositSlab.interface';
  
  // Global type aliases for common use
  export type SlabFormData = import('../service/Administration/DepositLoanSlab/type/depositSlab.types').DepositLoanSlabData;
  export type SlabValidationErrors = import('../service/Administration/DepositLoanSlab/type/depositSlab.types').ValidationErrors;
  export type SlabUnitType = import('../service/Administration/DepositLoanSlab/type/depositSlab.types').UnitType;
  export type SlabValidationState = import('../service/Administration/DepositLoanSlab/type/depositSlab.types').ValidationState;
  export type SlabSaveState = import('../service/Administration/DepositLoanSlab/type/depositSlab.types').SaveState;
}

// Extend global Window interface if needed for slab-specific functionality
declare global {
  interface Window {
    // Add any slab-specific window properties if needed
    depositLoanSlabConfig?: {
      apiBaseUrl?: string;
      validationMode?: 'strict' | 'lenient';
      autoSave?: boolean;
    };
  }
}

// Module augmentation for existing types if needed
declare module '../interface/common' {
  interface ActionHandlers {
    onSlabSave?: () => void;
    onSlabReset?: () => void;
    onSlabValidate?: () => void;
  }
}
