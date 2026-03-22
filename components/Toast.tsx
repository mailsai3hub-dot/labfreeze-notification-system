import React, { useEffect } from 'react';
import { ICONS } from '../constants';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  lang: 'ar' | 'en';
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, lang }) => {
  const isAr = lang === 'ar';
  
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    error: 'bg-rose-50 border-rose-100 text-rose-800',
    info: 'bg-blue-50 border-blue-100 text-blue-800'
  };

  const icons = {
    success: <ICONS.CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <ICONS.AlertTriangle className="w-5 h-5 text-rose-500" />,
    info: <ICONS.Bell className="w-5 h-5 text-blue-500" />
  };

  return (
    <div className={`fixed top-6 ${isAr ? 'left-6' : 'right-6'} z-[100] animate-in slide-in-from-top-4 duration-300`}>
      <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border ${bgColors[type]} min-w-[300px]`}>
        <div className="shrink-0">{icons[type]}</div>
        <p className="font-bold text-sm">{message}</p>
        <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity ml-auto">
          <ICONS.X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;