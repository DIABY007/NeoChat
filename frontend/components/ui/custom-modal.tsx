'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function CustomModal({ isOpen, onClose, title, description, children }: CustomModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4" 
      style={{ 
        zIndex: 99999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      {/* Overlay avec flou */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        className="relative z-[10000] w-full max-w-lg max-h-[90vh] rounded-lg shadow-2xl overflow-hidden flex flex-col" 
        style={{ 
          backgroundColor: '#ffffff',
          opacity: 1,
          border: '1px solid #e2e8f0'
        }}
      >
        {/* Header */}
        <div 
          className="flex items-start justify-between p-6 flex-shrink-0"
          style={{ 
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0'
          }}
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {description && (
              <p className="text-sm text-slate-500 mt-1">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 ml-4"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        
        {/* Body */}
        <div 
          className="p-6 overflow-y-auto flex-1"
          style={{ backgroundColor: '#ffffff' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
