import type { LucideIcon } from "lucide-react";

// Common UI component interfaces
export interface MenuItem {
    title: string;
    action?: string;
    shortcut?: string;
    submenu?: MenuItem[];
  }
  
  export interface NavItem {
    id: string;
    title: string;
    items: MenuItem[];
  }
  
  export interface IconNavItem {
    icon: LucideIcon;
    label: string;
    onClick: (() => void) | undefined;
  }
  
  export interface ActionHandlers {
    onSave?: () => void;
    onCancel?: () => void;
    onDelete?: () => void;
    onRefresh?: () => void;
    onPrint?: () => void;
    onFind?: () => void;
    onExit?: () => void;
  }
