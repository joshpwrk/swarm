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
    <aside className="w-80 bg-surface p-5 overflow-y-auto flex-shrink-0 border-r border-gray-700">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-medium mb-3">Filters</h2>
          <div className="space-y-4">
            {/* Currency Filter */}
            <div>
              <Label className="block text-sm font-medium mb-1">Currency</Label>
              <Select 
                value={filters.currency} 
                onValueChange={(value) => onFilterChange({ currency: value })}
              >
                <SelectTrigger className="w-full bg-surfaceLight border border-gray-700 rounded-md">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Instrument Type */}
            <div>
              <Label className="block text-sm font-medium mb-1">Instrument Type</Label>
              <Select 
                value={filters.instrumentType} 
                onValueChange={(value) => onFilterChange({ instrumentType: value })}
              >
                <SelectTrigger className="w-full bg-surfaceLight border border-gray-700 rounded-md">
                  <SelectValue placeholder="Select instrument type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="perp">PERP</SelectItem>
                  <SelectItem value="option">Option</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Instrument Name */}
            <div>
              <Label className="block text-sm font-medium mb-1">Instrument Name</Label>
              <Select 
                value={filters.instrumentName} 
                onValueChange={(value) => onFilterChange({ instrumentName: value })}
              >
                <SelectTrigger className="w-full bg-surfaceLight border border-gray-700 rounded-md">
                  <SelectValue placeholder="Select instrument name" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ETH-PERP">ETH-PERP</SelectItem>
                  <SelectItem value="BTC-PERP">BTC-PERP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Range */}
            <div>
              <Label className="block text-sm font-medium mb-1">Time Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="block text-xs mb-1">From</Label>
                  <Input 
                    type="datetime-local" 
                    id="fromTimestamp" 
                    className="w-full bg-surfaceLight border border-gray-700 rounded-md"
                  />
                </div>
                <div>
                  <Label className="block text-xs mb-1">To</Label>
                  <Input 
                    type="datetime-local" 
                    id="toTimestamp" 
                    className="w-full bg-surfaceLight border border-gray-700 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* Page Size */}
            <div>
              <Label className="block text-sm font-medium mb-1">Results Per Page</Label>
              <Select 
                value={filters.pageSize.toString()} 
                onValueChange={(value) => onFilterChange({ pageSize: parseInt(value) })}
              >
                <SelectTrigger className="w-full bg-surfaceLight border border-gray-700 rounded-md">
                  <SelectValue placeholder="Select page size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Apply Button */}
            <Button 
              className="w-full bg-secondary hover:bg-secondary/80"
              onClick={handleApplyFilters}
            >
              Apply Filters
            </Button>
          </div>
        </div>

        <Separator className="bg-gray-700" />

        {/* Visualization Settings */}
        <div>
          <h2 className="text-lg font-medium mb-3">Visualization Settings</h2>
          <div className="space-y-4">
            {/* Node Size Scale */}
            <div>
              <Label className="block text-sm font-medium mb-1">Node Size Scale</Label>
              <Input 
                type="range" 
                min="1" 
                max="20" 
                value={visualSettings.nodeSizeScale} 
                onChange={(e) => onVisualSettingsChange({ nodeSizeScale: parseInt(e.target.value) })}
                className="w-full accent-primary bg-surfaceLight"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Small</span>
                <span>Large</span>
              </div>
            </div>

            {/* Force Strength */}
            <div>
              <Label className="block text-sm font-medium mb-1">Force Strength</Label>
              <Input 
                type="range" 
                min="1" 
                max="100" 
                value={visualSettings.forceStrength} 
                onChange={(e) => onVisualSettingsChange({ forceStrength: parseInt(e.target.value) })}
                className="w-full accent-primary bg-surfaceLight"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Weak</span>
                <span>Strong</span>
              </div>
            </div>

            {/* Show Labels */}
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Show Wallet Labels</Label>
              <Switch 
                checked={visualSettings.showLabels} 
                onCheckedChange={(checked) => onVisualSettingsChange({ showLabels: checked })}
              />
            </div>

            {/* Show Tooltips */}
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Show Tooltips</Label>
              <Switch 
                checked={visualSettings.showTooltips} 
                onCheckedChange={(checked) => onVisualSettingsChange({ showTooltips: checked })}
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
