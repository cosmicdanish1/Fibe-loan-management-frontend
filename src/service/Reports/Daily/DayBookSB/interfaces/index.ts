export interface DayBookSavingProps {
  date?: Date;
  onCrystalReport?: () => void;
  onScreen?: () => void;
  onPrint?: () => void;
  totalPages?: number;
}

export interface UseDayBookSBReturnType {
  // Add any future state or methods that the hook might return
  formatDate: (date: Date) => string;
}
