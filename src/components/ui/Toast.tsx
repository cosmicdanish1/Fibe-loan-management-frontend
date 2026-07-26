import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi';

export interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info';
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({
    message,
    type = 'info',
    isVisible,
    onClose,
    duration = 3000
}) => {
    useEffect(() => {
        if (isVisible && duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    const colors = {
        success: 'bg-green-50 text-green-800 border-green-200',
        error: 'bg-red-50 text-red-800 border-red-200',
        info: 'bg-blue-50 text-blue-800 border-blue-200'
    };

    const icons = {
        success: <FiCheckCircle className="w-5 h-5 text-green-500" />,
        error: <FiAlertCircle className="w-5 h-5 text-red-500" />,
        info: <FiInfo className="w-5 h-5 text-blue-500" />
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -20, x: 20 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, y: -20, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-lg shadow-lg border ${colors[type]} min-w-[300px] max-w-md`}
                >
                    <div className="flex-shrink-0 mr-3">
                        {icons[type]}
                    </div>
                    <div className="flex-1 mr-2 text-sm font-medium">
                        {message}
                    </div>
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 ml-auto inline-flex text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                        <FiX className="w-4 h-4" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Toast;
