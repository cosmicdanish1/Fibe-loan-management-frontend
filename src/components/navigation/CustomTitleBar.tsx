import React from 'react';
import { X, Minus, Square } from 'lucide-react';

interface CustomTitleBarProps {
  title?: string;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  showControls?: boolean;
}

const CustomTitleBar: React.FC<CustomTitleBarProps> = ({
  title = 'Application',
  onClose,
  onMinimize,
  onMaximize,
  showControls = true
}) => {
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      // Default close behavior
      window.close();
    }
  };

  const handleMinimize = () => {
    if (onMinimize) {
      onMinimize();
    } else {
      // Default minimize behavior - would need IPC for Electron
      console.log('Minimize clicked');
    }
  };

  const handleMaximize = () => {
    if (onMaximize) {
      onMaximize();
    } else {
      // Default maximize behavior - would need IPC for Electron
      console.log('Maximize clicked');
    }
  };

  return (
    <div 
      className="flex items-center justify-between bg-gray-100 border-b border-gray-200 px-4 py-2 select-none"
      style={{ 
        WebkitAppRegion: 'drag',
        height: '32px'
      } as React.CSSProperties}
    >
      {/* Title */}
      <div className="flex items-center">
        <h1 className="text-sm font-medium text-gray-700 truncate">
          {title}
        </h1>
      </div>

      {/* Window Controls */}
      {showControls && (
        <div 
          className="flex items-center space-x-1"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* Minimize Button */}
          <button
            onClick={handleMinimize}
            className="p-1 rounded hover:bg-gray-200 transition-colors duration-150"
            title="Minimize"
          >
            <Minus size={14} className="text-gray-600" />
          </button>

          {/* Maximize Button */}
          <button
            onClick={handleMaximize}
            className="p-1 rounded hover:bg-gray-200 transition-colors duration-150"
            title="Maximize"
          >
            <Square size={14} className="text-gray-600" />
          </button>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-red-500 hover:text-white transition-colors duration-150"
            title="Close"
          >
            <X size={14} className="text-gray-600 hover:text-white" />
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomTitleBar;
