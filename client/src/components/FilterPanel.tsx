import { useEffect } from "react";
import { Filters, VisualSettings } from "@/types/trade";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface FilterPanelProps {
  filters: Filters;
  visualSettings: VisualSettings;
  onFilterChange: (filters: Partial<Filters>) => void;
  onVisualSettingsChange: (settings: Partial<VisualSettings>) => void;
}

export default function FilterPanel({ 
  filters, 
  visualSettings, 
  onFilterChange, 
  onVisualSettingsChange 
}: FilterPanelProps) {
  // Format date for datetime-local input
  const formatDateForInput = (timestamp: number) => {
    const date = new Date(timestamp);
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
      .toISOString()
      .slice(0, 16);
  };

  useEffect(() => {
    // Initialize date inputs when component mounts
    const fromDate = formatDateForInput(filters.fromTimestamp);
    const toDate = formatDateForInput(filters.toTimestamp);
    
    // Set the date input values
    const fromEl = document.getElementById('fromTimestamp') as HTMLInputElement;
    const toEl = document.getElementById('toTimestamp') as HTMLInputElement;
    if (fromEl) fromEl.value = fromDate;
    if (toEl) toEl.value = toDate;
  }, []);

  const handleApplyFilters = () => {
    // Get the values from the form inputs for dates
    const fromEl = document.getElementById('fromTimestamp') as HTMLInputElement;
    const toEl = document.getElementById('toTimestamp') as HTMLInputElement;
    
    const newFilters: Partial<Filters> = {
      page: 1, // Reset to first page when applying new filters
    };
    
    if (fromEl && fromEl.value) {
      newFilters.fromTimestamp = new Date(fromEl.value).getTime();
    }
    
    if (toEl && toEl.value) {
      newFilters.toTimestamp = new Date(toEl.value).getTime();
    }
    
    onFilterChange(newFilters);
  };

  return (
    <aside className="w-80 bg-black p-5 overflow-y-auto flex-shrink-0 border-r border-primary">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold uppercase text-primary mb-3 tracking-widest">FILTER PARAMETERS</h2>
          <div className="space-y-4">
            {/* Currency Filter */}
            <div>
              <Label className="block text-xs uppercase tracking-wider text-foreground mb-1">CURRENCY</Label>
              <Select 
                value={filters.currency} 
                onValueChange={(value) => onFilterChange({ currency: value })}
              >
                <SelectTrigger className="w-full bg-black border border-primary text-foreground">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent className="bg-black border border-primary text-foreground">
                  <SelectItem value="ETH" className="text-secondary">ETH</SelectItem>
                  <SelectItem value="BTC" className="text-secondary">BTC</SelectItem>
                  <SelectItem value="USDC" className="text-secondary">USDC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Instrument Type */}
            <div>
              <Label className="block text-xs uppercase tracking-wider text-foreground mb-1">CONTRACT TYPE</Label>
              <Select 
                value={filters.instrumentType} 
                onValueChange={(value) => onFilterChange({ instrumentType: value })}
              >
                <SelectTrigger className="w-full bg-black border border-primary text-foreground">
                  <SelectValue placeholder="Select contract type" />
                </SelectTrigger>
                <SelectContent className="bg-black border border-primary text-foreground">
                  <SelectItem value="perp" className="text-secondary">PERPETUAL</SelectItem>
                  <SelectItem value="option" className="text-secondary">OPTION</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Instrument Name */}
            <div>
              <Label className="block text-xs uppercase tracking-wider text-foreground mb-1">INSTRUMENT</Label>
              <Select 
                value={filters.instrumentName} 
                onValueChange={(value) => onFilterChange({ instrumentName: value })}
              >
                <SelectTrigger className="w-full bg-black border border-primary text-foreground">
                  <SelectValue placeholder="Select instrument" />
                </SelectTrigger>
                <SelectContent className="bg-black border border-primary text-foreground">
                  <SelectItem value="ETH-PERP" className="text-secondary">ETH-PERP</SelectItem>
                  <SelectItem value="BTC-PERP" className="text-secondary">BTC-PERP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Range */}
            <div>
              <Label className="block text-xs uppercase tracking-wider text-foreground mb-1">TIME RANGE</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="block text-xs uppercase text-foreground/70 mb-1">FROM</Label>
                  <Input 
                    type="datetime-local" 
                    id="fromTimestamp" 
                    className="w-full bg-black border border-primary text-foreground"
                  />
                </div>
                <div>
                  <Label className="block text-xs uppercase text-foreground/70 mb-1">TO</Label>
                  <Input 
                    type="datetime-local" 
                    id="toTimestamp" 
                    className="w-full bg-black border border-primary text-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Page Size */}
            <div>
              <Label className="block text-xs uppercase tracking-wider text-foreground mb-1">RESULTS PER PAGE</Label>
              <Select 
                value={filters.pageSize.toString()} 
                onValueChange={(value) => onFilterChange({ pageSize: parseInt(value) })}
              >
                <SelectTrigger className="w-full bg-black border border-primary text-foreground">
                  <SelectValue placeholder="Select page size" />
                </SelectTrigger>
                <SelectContent className="bg-black border border-primary text-foreground">
                  <SelectItem value="50" className="text-secondary">50</SelectItem>
                  <SelectItem value="100" className="text-secondary">100</SelectItem>
                  <SelectItem value="200" className="text-secondary">200</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Apply Button */}
            <Button 
              className="w-full bg-primary hover:bg-primary/90 uppercase tracking-widest text-white font-bold border-0"
              onClick={handleApplyFilters}
            >
              Execute Query
            </Button>
          </div>
        </div>

        <Separator className="bg-primary/50" />

        {/* Visualization Settings */}
        <div>
          <h2 className="text-lg font-bold uppercase text-secondary mb-3 tracking-widest">Visual Parameters</h2>
          <div className="space-y-4">
            {/* Node Size Scale */}
            <div>
              <Label className="block text-xs uppercase tracking-wider text-foreground mb-1">NODE SIZE SCALE</Label>
              <Input 
                type="range" 
                min="1" 
                max="20" 
                value={visualSettings.nodeSizeScale} 
                onChange={(e) => onVisualSettingsChange({ nodeSizeScale: parseInt(e.target.value) })}
                className="w-full accent-secondary bg-black border border-primary/30"
              />
              <div className="flex justify-between text-xs text-primary/70 mt-1">
                <span>MIN</span>
                <span>MAX</span>
              </div>
            </div>

            {/* Force Strength */}
            <div>
              <Label className="block text-xs uppercase tracking-wider text-foreground mb-1">FORCE STRENGTH</Label>
              <Input 
                type="range" 
                min="1" 
                max="100" 
                value={visualSettings.forceStrength} 
                onChange={(e) => onVisualSettingsChange({ forceStrength: parseInt(e.target.value) })}
                className="w-full accent-secondary bg-black border border-primary/30"
              />
              <div className="flex justify-between text-xs text-primary/70 mt-1">
                <span>WEAK</span>
                <span>STRONG</span>
              </div>
            </div>

            {/* Show Labels */}
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-foreground">WALLET LABELS</Label>
              <Switch 
                checked={visualSettings.showLabels} 
                onCheckedChange={(checked) => onVisualSettingsChange({ showLabels: checked })}
                className="data-[state=checked]:bg-secondary border-primary"
              />
            </div>

            {/* Show Tooltips */}
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-foreground">DATA TOOLTIPS</Label>
              <Switch 
                checked={visualSettings.showTooltips} 
                onCheckedChange={(checked) => onVisualSettingsChange({ showTooltips: checked })}
                className="data-[state=checked]:bg-secondary border-primary"
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
