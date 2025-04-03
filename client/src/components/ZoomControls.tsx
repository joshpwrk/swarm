import { useRef } from "react";
import { RefreshCw } from "lucide-react";

export default function ZoomControls() {
  const handleZoomIn = () => {
    const event = new CustomEvent('zoom', { detail: { type: 'zoom-in' } });
    document.dispatchEvent(event);
  };

  const handleZoomOut = () => {
    const event = new CustomEvent('zoom', { detail: { type: 'zoom-out' } });
    document.dispatchEvent(event);
  };

  const handleZoomReset = () => {
    const event = new CustomEvent('zoom', { detail: { type: 'zoom-reset' } });
    document.dispatchEvent(event);
  };

  return (
    <div className="absolute bottom-6 right-6 bg-surface border border-gray-700 rounded-md p-1 shadow-lg">
      <div className="flex">
        <button 
          onClick={handleZoomIn}
          className="text-lg w-8 h-8 flex items-center justify-center hover:bg-surfaceLight rounded-md"
        >
          +
        </button>
        <button 
          onClick={handleZoomOut}
          className="text-lg w-8 h-8 flex items-center justify-center hover:bg-surfaceLight rounded-md"
        >
          -
        </button>
        <button 
          onClick={handleZoomReset}
          className="text-sm w-8 h-8 flex items-center justify-center hover:bg-surfaceLight rounded-md"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
