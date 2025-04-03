export default function Legend() {
  return (
    <div className="absolute bottom-24 right-6 bg-surface border border-gray-700 rounded-md p-3 shadow-lg">
      <div className="text-sm font-medium mb-2">Legend</div>
      <div className="space-y-2">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
          <span className="text-xs">Buy</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
          <span className="text-xs">Sell</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
          <span className="text-xs">Mixed</span>
        </div>
        <div className="mt-3 pt-2 border-t border-gray-700">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-white mr-2"></div>
            <span className="text-xs">Size = Trade Volume</span>
          </div>
        </div>
      </div>
    </div>
  );
}
