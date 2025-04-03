import { useState } from "react";
import FilterPanel from "@/components/FilterPanel";
import GraphVisualization from "@/components/GraphVisualization";
import { Filters, VisualSettings } from "@/types/trade";

export default function Home() {
  const [filters, setFilters] = useState<Filters>({
    currency: "ETH",
    instrumentType: "perp",
    instrumentName: "ETH-PERP",
    fromTimestamp: Date.now() - 24 * 60 * 60 * 1000, // 24 hours ago
    toTimestamp: Date.now(),
    pageSize: 500, // Hardcoded to 500 results per page
    page: 1, // Page is kept for API compatibility but not used for pagination UI
    txStatus: "settled",
  });

  const [visualSettings, setVisualSettings] = useState<VisualSettings>({
    nodeSizeScale: 10,
    forceStrength: 30,
    showLabels: true,
    showTooltips: true,
  });

  const handleFilterChange = (newFilters: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleVisualSettingsChange = (newSettings: Partial<VisualSettings>) => {
    setVisualSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-black py-4 px-6 border-b border-primary">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-wider uppercase text-primary">
            LYRA FINANCE // TRADE ANALYSIS
          </h1>
          <div className="flex items-center space-x-4">
            <span
              id="connectionStatus"
              className="text-xs bg-black px-3 py-1 border border-primary text-primary uppercase"
            >
              SYSTEM ACTIVE
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
        </main>
      </div>
    </div>
  );
}
