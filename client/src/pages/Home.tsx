import { useState, useEffect } from "react";
import FilterPanel from "@/components/FilterPanel";
import GraphVisualization from "@/components/GraphVisualization";
import { Filters, VisualSettings } from "@/types/trade";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Determine if viewport is mobile
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

  const [filters, setFilters] = useState<Filters>({
    currency: "ETH",
    instrumentType: "option",
    instrumentName: "", // Leave empty as instrument_name will be null in the API
    fromTimestamp: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
    toTimestamp: Date.now(),
    pageSize: 500, // Hardcoded to 500 results per page
    page: 1, // Page is kept for API compatibility but not used for pagination UI
    txStatus: "settled",
  });

  const [visualSettings, setVisualSettings] = useState<VisualSettings>({
    nodeSizeScale: 10,
    forceStrength: 30,
    edgeThicknessScale: 10, // Default value for edge thickness (1-20 range)
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
      <header className="bg-black py-3 md:py-4 px-4 md:px-6 border-b border-primary">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-base md:text-xl font-bold tracking-wider uppercase text-primary">
              DERIVE // SWARM ANALYZER
            </h1>
          </div>
          <div className="flex items-center">
            <span
              id="connectionStatus"
              className="text-[10px] md:text-xs bg-black px-2 md:px-3 py-1 border border-primary text-primary uppercase tracking-wider"
            >
              SYSTEM ACTIVE
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Sidebar Controls (absolute positioned) */}
        {isMobile && (
          <>
            {/* Darkened overlay behind the drawer */}
            <div 
              className={`absolute inset-0 bg-black/70 z-30 transition-opacity duration-300 ${
                sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              onClick={() => setSidebarOpen(false)}
            />
            
            {/* Actual drawer */}
            <div 
              className={`absolute inset-y-0 left-0 z-40 w-[90%] max-w-[320px] transform transition-transform duration-300 ease-in-out ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              <div className="flex flex-col h-full">
                <div className="flex-1 h-full overflow-y-auto bg-black border-r border-primary">
                  {/* Close button in top-right corner */}
                  <div className="absolute top-2 right-2 z-50">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-primary hover:bg-primary/10 p-1.5"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <ChevronLeft size={20} />
                    </Button>
                  </div>
                  
                  <FilterPanel
                    filters={filters}
                    visualSettings={visualSettings}
                    onFilterChange={handleFilterChange}
                    onVisualSettingsChange={handleVisualSettingsChange}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Desktop Sidebar Controls (always visible on desktop) */}
        {!isMobile && (
          <FilterPanel
            filters={filters}
            visualSettings={visualSettings}
            onFilterChange={handleFilterChange}
            onVisualSettingsChange={handleVisualSettingsChange}
          />
        )}

        {/* Main Graph Area */}
        <main className="flex-1 overflow-hidden flex flex-col relative">
          <GraphVisualization
            filters={filters}
            visualSettings={visualSettings}
            onFilterChange={handleFilterChange}
          />
          
          {/* Floating Action Button for Mobile */}
          {isMobile && !sidebarOpen && (
            <div className="absolute bottom-20 right-4 z-20">
              <Button
                className="h-12 px-3 bg-black hover:bg-black/90 border border-primary text-primary uppercase tracking-widest text-xs shadow-lg"
                onClick={() => setSidebarOpen(true)}
              >
                <Settings size={16} className="mr-2" />
                FILTER
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
