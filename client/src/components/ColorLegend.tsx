import React from 'react';

export function ColorLegend() {
  return (
    <div className="absolute top-4 right-4 bg-black/80 border border-primary p-3 rounded-sm shadow-lg z-50">
      <h3 className="text-xs uppercase tracking-wider text-foreground/80 mb-2">Buy/Sell Ratio</h3>
      <div className="flex items-center mb-1">
        <div className="w-48 h-6 bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 rounded-sm"></div>
      </div>
      <div className="flex justify-between text-xs text-foreground/60">
        <span>100% Sell</span>
        <span>50/50</span>
        <span>100% Buy</span>
      </div>
    </div>
  );
}