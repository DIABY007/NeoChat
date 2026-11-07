'use client';

import { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoSrc: string;
}

export default function VideoModal({ isOpen, onClose, videoSrc }: VideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    onClose();
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClose]);

  // Auto-play when opened
  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10 animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === overlayRef.current) handleClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal container */}
      <div className="relative w-full max-w-4xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute -top-12 right-0 sm:-top-4 sm:-right-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all duration-200 hover:scale-110 hover:rotate-90"
          aria-label="Fermer la vidéo"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Video wrapper with glow effect */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-orange-500/20 ring-1 ring-white/10">
          {/* Glow border */}
          <div className="absolute -inset-[1px] bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 rounded-2xl opacity-50 blur-sm" />
          
          <div className="relative bg-black rounded-2xl overflow-hidden">
            <video
              ref={videoRef}
              src={videoSrc}
              controls
              playsInline
              preload="metadata"
              className="w-full aspect-video object-contain"
            >
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          </div>
        </div>

        {/* Caption under video */}
        <p className="text-center text-white/60 text-sm mt-4">
          Appuyez sur <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-white/80 text-xs font-mono">Esc</kbd> ou cliquez en dehors pour fermer
        </p>
      </div>
    </div>
  );
}
