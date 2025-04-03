import React, { useState, useEffect } from 'react';

export function ColorLegend() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Listen for resize events
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return (
    <div className={`absolute bg-black/80 border border-primary shadow-lg z-50 ${
      isMobile 
        ? 'bottom-16 right-2 left-2 p-2 rounded-sm' 
        : 'top-4 right-4 p-3 rounded-sm'
    }`}>
      <h3 className="text-[10px] md:text-xs uppercase tracking-wider text-foreground/80 mb-1 md:mb-2 text-center">Buy/Sell Ratio</h3>
      <div className="flex items-center mb-1">
        <div className={`h-4 md:h-6 bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 rounded-sm ${
          isMobile ? 'w-full' : 'w-48'
        }`}></div>
      </div>
      <div className="flex justify-between text-[9px] md:text-xs text-foreground/60">
        <span>100% Sell</span>
        <span>50/50</span>
        <span>100% Buy</span>
      </div>
    </div>
  );
}