import { useState } from "react";
import FilterPanel from "@/components/FilterPanel";
import GraphVisualization from "@/components/GraphVisualization";
import Legend from "@/components/Legend";
import ZoomControls from "@/components/ZoomControls";
import { Filters, VisualSettings } from "@/types/trade";

export default function Home() {
  const [filters, setFilters] = useState<Filters>({
    currency: "ETH",
    instrumentType: "perp",
    instrumentName: "ETH-PERP",
    fromTimestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
    toTimestamp: Date.now(),
    pageSize: 100,
    page: 1,
    txStatus: "settled"
  });

  const [visualSettings, setVisualSettings] = useState<VisualSettings>({
    nodeSizeScale: 10,
    forceStrength: 30,
    showLabels: true,
    showTooltips: true
  });

  const handleFilterChange = (newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleVisualSettingsChange = (newSettings: Partial<VisualSettings>) => {
    setVisualSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <div className="flex flex-col h-screen bg-background text-gray-100">
      {/* Header */}
      <header className="bg-surface py-4 px-6 shadow-md">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Lyra Finance Trade Visualization</h1>
          <div className="flex items-center space-x-4">
            <span id="connectionStatus" className="text-sm bg-surfaceLight px-3 py-1 rounded-full">
              Connected
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Controls */}
        <FilterPanel 
          filters={filters} 
          visualSettings={visualSettings}
          onFilterChange={handleFilterChange}
          onVisualSettingsChange={handleVisualSettingsChange}
        />

        {/* Main Graph Area */}
        <main className="flex-1 overflow-hidden flex flex-col relative">
          <GraphVisualization 
            filters={filters} 
            visualSettings={visualSettings}
            onFilterChange={handleFilterChange}
          />
          
          {/* Legend */}
          <Legend />
          
          {/* Zoom Controls */}
          <ZoomControls />
        </main>
      </div>
    </div>
  );
}
