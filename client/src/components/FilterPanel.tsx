import { useEffect, useState } from "react";
import { Filters, VisualSettings } from "@/types/trade";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn, queryClient } from "@/lib/queryClient";

interface FilterPanelProps {
  filters: Filters;
  visualSettings: VisualSettings;
  onFilterChange: (filters: Partial<Filters>) => void;
  onVisualSettingsChange: (settings: Partial<VisualSettings>) => void;
}

// Define API response interface
interface CurrencyInfo {
  currency: string;
  instrument_types: string[];
  protocol_asset_addresses: {
    perp: string | null;
    option: string | null;
    spot: string | null;
    underlying_erc20: string | null;
  };
  managers: {
    address: string;
    margin_type: string;
  }[];
  spot_price: string;
  spot_price_24h: string;
}

export default function FilterPanel({
  filters,
  visualSettings,
  onFilterChange,
  onVisualSettingsChange,
}: FilterPanelProps) {
  // State for available options from API
  const [instrumentTypes, setInstrumentTypes] = useState<string[]>([]);
  const [instrumentNames, setInstrumentNames] = useState<string[]>([]);

  // Fetch currencies from API
  const { data: currencies, isLoading: isLoadingCurrencies } = useQuery({
    queryKey: ["/api/currencies"],
    queryFn: getQueryFn<CurrencyInfo[]>({ on401: "throw" }),
  });

  // Format date for datetime-local input with seconds granularity
  const formatDateForInput = (timestamp: number) => {
    const date = new Date(timestamp);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 19); // Include seconds (HH:MM:SS)
  };

  // Update instrument types based on the selected currency
  useEffect(() => {
    if (currencies && currencies.length > 0) {
      // If a currency is selected, find its available instrument types
      if (filters.currency) {
        const selectedCurrency = currencies.find(
          (c) => c.currency === filters.currency,
        );
        if (selectedCurrency) {
          const availableTypes = selectedCurrency.instrument_types;
          setInstrumentTypes(availableTypes);
          
          // Automatically select the first available instrument type
          if (availableTypes.length > 0 && (!filters.instrumentType || filters.instrumentType === "")) {
            onFilterChange({
              instrumentType: availableTypes[0]
            });
          }
        }
      }
    }
  }, [currencies, filters.currency, filters.instrumentType, onFilterChange]);

  // When instrument type changes, generate potential instrument names
  useEffect(() => {
    if (filters.currency && filters.instrumentType) {
      // Generate common instrument names based on the selected currency and instrument type
      // For example: ETH + PERP = ETH-PERP
      if (filters.instrumentType === "perp") {
        setInstrumentNames([`${filters.currency}-PERP`]);
      } else if (filters.instrumentType === "option") {
        // Generate common option patterns (this is a simplified example)
        const now = new Date();
        const nextFriday = new Date(now);
        nextFriday.setDate(now.getDate() + ((5 - now.getDay()) % 7));

        const month = (nextFriday.getMonth() + 1).toString().padStart(2, "0");
        const day = nextFriday.getDate().toString().padStart(2, "0");
        const dateStr = `${month}${day}`;

        // Generate a few common strike prices
        const baseNames = [
          `${filters.currency}-${dateStr}-C-1000`,
          `${filters.currency}-${dateStr}-P-1000`,
        ];
        setInstrumentNames(baseNames);
      } else {
        setInstrumentNames([]);
      }
    } else {
      setInstrumentNames([]);
    }
  }, [filters.currency, filters.instrumentType]);

  // Update date inputs when filters change or component mounts
  useEffect(() => {
    // Set end time to current timestamp
    const toDate = formatDateForInput(filters.toTimestamp);
    const toEl = document.getElementById("toTimestamp") as HTMLInputElement;
    if (toEl) toEl.value = toDate;
    
    // Initialize the hidden input with the from timestamp
    const hiddenFromEl = document.getElementById("hiddenFromTimestamp") as HTMLInputElement;
    if (hiddenFromEl) {
      hiddenFromEl.value = filters.fromTimestamp.toString();
    }
    
    // Find which button should be active based on the time difference
    const daysDiff = Math.round((filters.toTimestamp - filters.fromTimestamp) / (24 * 60 * 60 * 1000));
    
    // Reset all buttons first
    for (let i = 1; i <= 7; i++) {
      document.getElementById(`day-${i}`)?.setAttribute('data-state', 'inactive');
    }
    
    // Set the appropriate button active (capped at 7)
    const activeDays = Math.min(Math.max(daysDiff, 1), 7);
    document.getElementById(`day-${activeDays}`)?.setAttribute('data-state', 'active');
    
    // Update the lookback display
    const lookbackDisplayEl = document.getElementById('lookbackDisplay');
    if (lookbackDisplayEl) {
      lookbackDisplayEl.textContent = `${activeDays} day${activeDays > 1 ? 's' : ''} ago`;
    }
  }, [filters.fromTimestamp, filters.toTimestamp]);
  
  // Add event listener to update from time when end time changes
  useEffect(() => {
    const toEl = document.getElementById("toTimestamp") as HTMLInputElement;
    
    const handleEndTimeChange = () => {
      if (!toEl.value) return;
      
      // Get the current selected days from the active button
      let selectedDays = 1; // Default to 1 day
      for (let i = 1; i <= 7; i++) {
        if (document.getElementById(`day-${i}`)?.getAttribute('data-state') === 'active') {
          selectedDays = i;
          break;
        }
      }
      
      // Calculate new from time based on selected end time and days
      const endTime = new Date(toEl.value).getTime();
      const fromTime = endTime - (selectedDays * 24 * 60 * 60 * 1000);
      
      // Update hidden from timestamp
      const hiddenFromEl = document.getElementById('hiddenFromTimestamp') as HTMLInputElement;
      if (hiddenFromEl) {
        hiddenFromEl.value = fromTime.toString();
      }
    };
    
    // Add event listener
    if (toEl) {
      toEl.addEventListener('change', handleEndTimeChange);
    }
    
    // Cleanup function
    return () => {
      if (toEl) {
        toEl.removeEventListener('change', handleEndTimeChange);
      }
    };
  }, []); // Empty dependency array so it only runs once on mount

  const handleApplyFilters = () => {
    // Get the end time from the input
    const toEl = document.getElementById("toTimestamp") as HTMLInputElement;
    // Get the hidden from timestamp value
    const hiddenFromEl = document.getElementById("hiddenFromTimestamp") as HTMLInputElement;

    // If end time is not provided, set it to now
    let toTimestamp = Date.now();
    if (toEl?.value) {
      toTimestamp = new Date(toEl.value).getTime();
    } else {
      // Set the input value to current time
      toEl.value = formatDateForInput(toTimestamp);
    }

    // Get from timestamp from hidden input or calculate based on selected range
    let fromTimestamp = Date.now() - 24 * 60 * 60 * 1000; // Default to 24 hours ago
    if (hiddenFromEl?.value) {
      fromTimestamp = parseInt(hiddenFromEl.value);
    }

    // Get the currently active days button (for logging purposes only)
    let activeDays = 1;
    for (let i = 1; i <= 7; i++) {
      if (document.getElementById(`day-${i}`)?.getAttribute('data-state') === 'active') {
        activeDays = i;
        break;
      }
    }
    
    // Validate time range
    const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    
    // Enforce maximum time range of 1 week for all selections
    if (toTimestamp - fromTimestamp > oneWeek) {
      alert(`Time range cannot exceed 7 days due to API constraints. Please adjust your selection.`);
      return;
    }
    
    // Ensure from date is before to date
    if (fromTimestamp >= toTimestamp) {
      alert("The calculated start time must be earlier than the end time");
      return;
    }

    const newFilters: Partial<Filters> = {
      fromTimestamp,
      toTimestamp,
      pageSize: 500, // Keep pageSize at 500 for API compatibility
    };

    onFilterChange(newFilters);
  };

  return (
    <aside className="w-80 bg-black p-5 overflow-y-auto flex-shrink-0 border-r border-primary">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold uppercase text-primary mb-3 tracking-widest">
            FILTER PARAMETERS
          </h2>
          <div className="space-y-4">
            {/* Currency Filter */}
            <div>
              <Label className="block text-xs uppercase tracking-wider text-foreground mb-1">
                CURRENCY
              </Label>
              <Select
                value={filters.currency}
                onValueChange={(value) => {
                  // Find the available instrument types for this currency
                  if (currencies) {
                    const selectedCurrency = currencies.find(c => c.currency === value);
                    if (selectedCurrency && selectedCurrency.instrument_types.length > 0) {
                      // Set both currency and a valid instrument type in one update
                      onFilterChange({
                        currency: value,
                        instrumentType: selectedCurrency.instrument_types[0]
                      });
                      return;
                    }
                  }
                  
                  // Fallback if currency info not available yet
                  onFilterChange({
                    currency: value,
                    instrumentType: "perp", // Default to perp as a safe value
                  });
                }}
              >
                <SelectTrigger className="w-full bg-black border border-primary text-foreground">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent className="bg-black border border-primary text-foreground">
                  {isLoadingCurrencies ? (
                    <SelectItem
                      value="loading"
                      disabled
                      className="text-secondary"
                    >
                      Loading currencies...
                    </SelectItem>
                  ) : currencies && currencies.length > 0 ? (
                    [...currencies]
                      .sort((a, b) => a.currency.localeCompare(b.currency))
                      .map((currency) => (
                        <SelectItem
                          key={currency.currency}
                          value={currency.currency}
                          className="text-secondary"
                        >
                          {currency.currency}
                        </SelectItem>
                      ))
                  ) : (
                    <SelectItem
                      value="no-data"
                      disabled
                      className="text-secondary"
                    >
                      No currencies available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Instrument Type */}
            <div>
              <Label className="block text-xs uppercase tracking-wider text-foreground mb-1">
                CONTRACT TYPE
              </Label>
              <Select
                value={filters.instrumentType}
                onValueChange={(value) =>
                  onFilterChange({
                    instrumentType: value,
                  })
                }
                disabled={!filters.currency} // Disable until currency is selected
              >
                <SelectTrigger className="w-full bg-black border border-primary text-foreground">
                  <SelectValue placeholder="Select contract type" />
                </SelectTrigger>
                <SelectContent className="bg-black border border-primary text-foreground">
                  {!filters.currency ? (
                    <SelectItem
                      value="placeholder"
                      disabled
                      className="text-secondary"
                    >
                      Select currency first
                    </SelectItem>
                  ) : instrumentTypes.length > 0 ? (
                    [...instrumentTypes]
                      .sort((a, b) => a.localeCompare(b))
                      .map((type) => (
                        <SelectItem
                          key={type}
                          value={type}
                          className="text-secondary"
                        >
                          {type.toUpperCase()}
                        </SelectItem>
                      ))
                  ) : (
                    <SelectItem
                      value="placeholder"
                      disabled
                      className="text-secondary"
                    >
                      No contract types available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Instrument name section removed as requested */}

            {/* Time Range */}
            <div>
              <Label className="block text-xs uppercase tracking-wider text-foreground mb-1">
                TIME RANGE
              </Label>
              
              {/* End Time */}
              <div className="mb-3">
                <Label className="block text-xs uppercase text-foreground/70 mb-1">
                  END TIME
                </Label>
                <Input
                  type="datetime-local"
                  id="toTimestamp"
                  step="1" // Add seconds granularity
                  className="w-full bg-black border border-primary text-foreground"
                />
              </div>
              
              {/* Time Range Selection */}
              <div className="bg-black/50 border border-primary/50 p-3 rounded-sm">
                <Label className="block text-xs uppercase text-foreground/70 mb-2">
                  LOOKBACK PERIOD (DAYS)
                </Label>
                
                <div className="grid grid-cols-7 gap-1 mb-3">
                  {/* Generate buttons for 1-7 days */}
                  {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                    <Button
                      key={days}
                      type="button"
                      variant="outline"
                      size="sm"
                      id={`day-${days}`}
                      className="text-xs py-1 px-0 h-8 bg-black border-primary text-primary data-[state=active]:bg-primary data-[state=active]:text-white"
                      data-state={days === 1 ? "active" : "inactive"}
                      onClick={(e) => {
                        // Reset all buttons
                        for (let i = 1; i <= 7; i++) {
                          document.getElementById(`day-${i}`)?.setAttribute('data-state', 'inactive');
                        }
                        
                        // Set current button active
                        document.getElementById(`day-${days}`)?.setAttribute('data-state', 'active');
                        
                        // Get the current end time or use now
                        const toEl = document.getElementById("toTimestamp") as HTMLInputElement;
                        let toTimestamp = Date.now();
                        
                        if (toEl?.value) {
                          toTimestamp = new Date(toEl.value).getTime();
                        } else {
                          // If no end time set, default to now
                          toEl.value = formatDateForInput(toTimestamp);
                        }
                        
                        // Calculate from date based on selected days
                        const fromTimestamp = toTimestamp - (days * 24 * 60 * 60 * 1000);
                        
                        // Store in hidden input
                        const hiddenFromEl = document.getElementById('hiddenFromTimestamp') as HTMLInputElement;
                        if (hiddenFromEl) {
                          hiddenFromEl.value = fromTimestamp.toString();
                        }
                        
                        // Update lookback display
                        const lookbackDisplayEl = document.getElementById('lookbackDisplay');
                        if (lookbackDisplayEl) {
                          lookbackDisplayEl.textContent = `${days} day${days > 1 ? 's' : ''} ago`;
                        }
                      }}
                    >
                      {days}
                    </Button>
                  ))}
                </div>
                
                {/* Visual indicator of selected lookback */}
                <div className="flex justify-between items-center bg-black/30 p-2 border border-primary/30 rounded-sm">
                  <span className="text-xs text-foreground/70 uppercase">FROM:</span>
                  <span id="lookbackDisplay" className="text-xs text-primary font-mono">1 day ago</span>
                </div>
                
                {/* Hidden input to store fromTimestamp */}
                <input 
                  type="hidden" 
                  id="hiddenFromTimestamp" 
                  value={Date.now() - 24 * 60 * 60 * 1000} // Default to 1 day ago
                />
                
                <div className="text-xs text-primary/70 italic mt-2">
                  Note: Maximum time range is 7 days due to API constraints
                </div>
              </div>
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
          <h2 className="text-lg font-bold uppercase text-secondary mb-3 tracking-widest">
            Visual Parameters
          </h2>
          <div className="space-y-4">
            {/* Node Size Scale */}
            <div>
              <Label className="block text-xs uppercase tracking-wider text-foreground mb-1">
                NODE SIZE SCALE
              </Label>
              <Input
                type="range"
                min="1"
                max="20"
                value={visualSettings.nodeSizeScale}
                onChange={(e) =>
                  onVisualSettingsChange({
                    nodeSizeScale: parseInt(e.target.value),
                  })
                }
                className="w-full accent-secondary bg-black border border-primary/30"
              />
              <div className="flex justify-between text-xs text-primary/70 mt-1">
                <span>MIN</span>
                <span>MAX</span>
              </div>
            </div>

            {/* Force Strength */}
            <div>
              <Label className="block text-xs uppercase tracking-wider text-foreground mb-1">
                FORCE STRENGTH
              </Label>
              <Input
                type="range"
                min="1"
                max="100"
                value={visualSettings.forceStrength}
                onChange={(e) =>
                  onVisualSettingsChange({
                    forceStrength: parseInt(e.target.value),
                  })
                }
                className="w-full accent-secondary bg-black border border-primary/30"
              />
              <div className="flex justify-between text-xs text-primary/70 mt-1">
                <span>WEAK</span>
                <span>STRONG</span>
              </div>
            </div>

            {/* Show Labels */}
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-foreground">
                WALLET LABELS
              </Label>
              <Switch
                checked={visualSettings.showLabels}
                onCheckedChange={(checked) =>
                  onVisualSettingsChange({ showLabels: checked })
                }
                className="data-[state=checked]:bg-secondary border-primary"
              />
            </div>

            {/* Show Tooltips */}
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-foreground">
                DATA TOOLTIPS
              </Label>
              <Switch
                checked={visualSettings.showTooltips}
                onCheckedChange={(checked) =>
                  onVisualSettingsChange({ showTooltips: checked })
                }
                className="data-[state=checked]:bg-secondary border-primary"
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
