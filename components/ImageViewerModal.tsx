import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ImageViewerImage } from '../types';
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon, ZoomInIcon, ZoomOutIcon, ResetZoomIcon } from './Icons';

interface ImageViewerModalProps {
  images: ImageViewerImage[];
  startIndex?: number;
  onClose: () => void;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ images, startIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const resetTransform = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const changeImage = useCallback((direction: number) => {
    resetTransform();
    setCurrentIndex(prev => {
      const newIndex = prev + direction;
      if (newIndex < 0) return images.length - 1;
      if (newIndex >= images.length) return 0;
      return newIndex;
    });
  }, [images.length, resetTransform]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') changeImage(1);
      if (e.key === 'ArrowLeft') changeImage(-1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, changeImage]);

  useEffect(() => {
    resetTransform();
  }, [currentIndex, resetTransform]);

  const clampOffset = useCallback((offsetToClamp: { x: number; y: number }, currentScale: number) => {
    if (!imageRef.current || !containerRef.current) return offsetToClamp;

    const imageW = imageRef.current.clientWidth;
    const imageH = imageRef.current.clientHeight;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;

    const maxOffsetX = Math.max(0, (imageW * currentScale - containerW) / 2);
    const maxOffsetY = Math.max(0, (imageH * currentScale - containerH) / 2);

    const clampedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetToClamp.x));
    const clampedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, offsetToClamp.y));

    return { x: clampedX, y: clampedY };
  }, []);

  const handleZoom = (direction: 'in' | 'out') => {
      const scaleAmount = 0.5;
      const newScale = direction === 'in' ? scale * (1 + scaleAmount) : scale / (1 + scaleAmount);
      const clampedScale = Math.max(0.5, Math.min(newScale, 5));
      setScale(clampedScale);

      if (clampedScale <= 1) {
        setOffset({ x: 0, y: 0 });
      } else {
        setOffset(prevOffset => clampOffset(prevOffset, clampedScale));
      }
  }
  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleAmount = 0.2;
    const newScale = e.deltaY > 0 ? scale / (1 + scaleAmount) : scale * (1 + scaleAmount);
    const clampedScale = Math.max(0.5, Math.min(newScale, 5));
    setScale(clampedScale);

    if (clampedScale <= 1) {
      setOffset({ x: 0, y: 0 });
    } else {
      setOffset(prevOffset => clampOffset(prevOffset, clampedScale));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      const newOffset = { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y };
      setOffset(clampOffset(newOffset, scale));
    }
  };
  
  const getTouchCoords = (e: React.TouchEvent) => ({ x: e.touches[0].clientX, y: e.touches[0].clientY });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale > 1 && e.touches.length === 1) {
      setIsDragging(true);
      const { x, y } = getTouchCoords(e);
      setDragStart({ x: x - offset.x, y: y - offset.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      e.preventDefault();
      const { x, y } = getTouchCoords(e);
      const newOffset = { x: x - dragStart.x, y: y - dragStart.y };
      setOffset(clampOffset(newOffset, scale));
    }
  };

  const handleUpOrLeave = () => {
    setIsDragging(false);
  };
  
  const handleDoubleClick = () => {
      if (scale > 1) {
          resetTransform();
      } else {
          setScale(2);
      }
  };

  const currentImage = images[currentIndex];
  const imageClasses = `image-viewer-img max-w-full max-h-full object-contain touch-none transition-transform duration-200 ${
    isDragging ? 'is-dragging' : ''
  } ${scale <= 1 ? 'zoomed-out' : 'zoomed-in'}`;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4 animate-scale-in"
      style={{ animationDuration: '200ms' }}
      onClick={onClose}
    >
      {/* Header Controls */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 text-white z-10 bg-gradient-to-b from-black/50 to-transparent">
        <div>
          <h3 className="font-semibold">{currentImage.alt}</h3>
          {images.length > 1 && <p className="text-sm opacity-80">{currentIndex + 1} / {images.length}</p>}
        </div>
        <button onClick={onClose} className="p-2 bg-black/50 rounded-full hover:bg-black/80 transition-colors">
          <CloseIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Main Content */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center"
        onWheel={handleWheel}
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleMouseMove}
        onMouseUp={handleUpOrLeave}
        onMouseLeave={handleUpOrLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleUpOrLeave}
      >
        <img
          ref={imageRef}
          src={currentImage.src}
          alt={currentImage.alt}
          className={imageClasses}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          onTouchStart={handleTouchStart}
        />
      </div>

      {/* Navigation Controls */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); changeImage(-1); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/80 text-white transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeftIcon className="h-8 w-8" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); changeImage(1); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/80 text-white transition-colors"
            aria-label="Next image"
          >
            <ChevronRightIcon className="h-8 w-8" />
          </button>
        </>
      )}
      
      {/* Footer / Zoom Controls */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center p-4 z-10 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex items-center gap-2 p-1.5 bg-black/60 rounded-lg text-white backdrop-blur-sm">
             <button onClick={(e) => { e.stopPropagation(); handleZoom('out') }} className="p-2 hover:bg-white/20 rounded-md transition-colors"><ZoomOutIcon className="h-6 w-6" /></button>
             <button onClick={(e) => { e.stopPropagation(); resetTransform() }} className="p-2 hover:bg-white/20 rounded-md transition-colors"><ResetZoomIcon className="h-6 w-6" /></button>
             <button onClick={(e) => { e.stopPropagation(); handleZoom('in') }} className="p-2 hover:bg-white/20 rounded-md transition-colors"><ZoomInIcon className="h-6 w-6" /></button>
          </div>
      </div>
    </div>
  );
};

export default ImageViewerModal;
