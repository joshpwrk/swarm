import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Button } from "@/components/ui/button";
import { Filters, VisualSettings, TradeData, GraphNode, GraphLink, WalletNode } from "@/types/trade";
import { fetchTradeHistory } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface GraphVisualizationProps {
  filters: Filters;
  visualSettings: VisualSettings;
  onFilterChange: (filters: Partial<Filters>) => void;
}

export default function GraphVisualization({ 
  filters, 
  visualSettings, 
  onFilterChange 
}: GraphVisualizationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [tradeData, setTradeData] = useState<TradeData | null>(null);
  const [graph, setGraph] = useState<{ nodes: GraphNode[], links: GraphLink[] }>({
    nodes: [],
    links: []
  });
  const [stats, setStats] = useState({
    nodeCount: 0,
    edgeCount: 0,
    totalVolume: 0
  });
  
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const svgGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  // Fetch trade data when filters change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setEmpty(false);
      
      try {
        const data = await fetchTradeHistory(filters);
        setTradeData(data);
        
        if (!data.trades || data.trades.length === 0) {
          setEmpty(true);
        } else {
          processTradeData(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch trade data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [filters]);

  // Process trade data to create graph structure
  const processTradeData = (data: TradeData) => {
    // Group trades by wallet address
    const walletMap = new Map<string, WalletNode>();
    const tradeLinks = new Map<string, Partial<GraphLink>>();
    
    // Process all trades to identify unique wallets and trades
    data.trades.forEach(trade => {
      // Track wallet stats
      if (!walletMap.has(trade.wallet)) {
        walletMap.set(trade.wallet, {
          id: trade.wallet,
          totalAmount: 0,
          tradeCount: 0,
          buyCount: 0,
          sellCount: 0
        });
      }
      
      const wallet = walletMap.get(trade.wallet)!;
      wallet.tradeCount++;
      wallet.totalAmount += parseFloat(trade.trade_amount);
      
      if (trade.direction === 'buy') {
        wallet.buyCount++;
      } else {
        wallet.sellCount++;
      }
      
      // Track trade links
      if (!tradeLinks.has(trade.trade_id)) {
        tradeLinks.set(trade.trade_id, {
          id: trade.trade_id,
          source: null,
          target: null,
          amount: parseFloat(trade.trade_amount),
          price: parseFloat(trade.trade_price),
          timestamp: trade.timestamp
        });
      }
      
      const link = tradeLinks.get(trade.trade_id)!;
      if (trade.direction === 'buy') {
        link.target = trade.wallet;
      } else {
        link.source = trade.wallet;
      }
    });
    
    // Convert Maps to arrays for D3
    const nodes = Array.from(walletMap.values()).map(wallet => ({
      id: wallet.id,
      size: wallet.totalAmount,
      tradeCount: wallet.tradeCount,
      buyCount: wallet.buyCount,
      sellCount: wallet.sellCount,
      type: wallet.buyCount > wallet.sellCount ? 'buyer' : wallet.sellCount > wallet.buyCount ? 'seller' : 'mixed'
    }));
    
    // Filter out incomplete links (without source or target)
    const links = Array.from(tradeLinks.values())
      .filter(link => link.source && link.target)
      .map(link => ({
        id: link.id!,
        source: link.source as string,
        target: link.target as string,
        amount: link.amount!,
        price: link.price!,
        timestamp: link.timestamp!
      }));
    
    setGraph({ nodes, links });
    
    // Calculate stats
    const totalVolume = nodes.reduce((sum, node) => sum + node.size, 0) / 2; // Divide by 2 as each trade is counted twice
    
    setStats({
      nodeCount: nodes.length,
      edgeCount: links.length,
      totalVolume
    });
  };

  // Initialize or update visualization when graph data or visual settings change
  useEffect(() => {
    if (!svgRef.current || loading || error || empty || graph.nodes.length === 0) return;
    
    if (!svgGroupRef.current) {
      initializeVisualization();
    } else {
      updateVisualization();
    }
  }, [graph, visualSettings, loading, error, empty]);

  // Initialize D3 visualization
  const initializeVisualization = () => {
    if (!svgRef.current) return;
    
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    // Clear any existing content
    d3.select(svgRef.current).selectAll("*").remove();
    
    const svg = d3.select(svgRef.current);
    
    // Add zoom functionality
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        svgGroupRef.current?.attr("transform", event.transform);
      });
    
    svg.call(zoom);
    
    // Create main group for everything
    const g = svg.append("g").attr("class", "everything");
    svgGroupRef.current = g;
    
    // Create groups for links and nodes
    const linksGroup = g.append("g").attr("class", "links");
    const nodesGroup = g.append("g").attr("class", "nodes");
    
    // Create simulation
    simulationRef.current = d3.forceSimulation<GraphNode>(graph.nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(graph.links)
        .id(d => d.id)
        .distance(100))
      .force("charge", d3.forceManyBody().strength(-visualSettings.forceStrength * 10))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide<GraphNode>().radius(d => Math.max(3, Math.sqrt(d.size) * visualSettings.nodeSizeScale / 10) + 5).iterations(2));
    
    // Draw links
    const links = linksGroup
      .selectAll("line")
      .data(graph.links)
      .enter()
      .append("line")
      .attr("stroke", "#4B5563")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", d => Math.max(1, Math.sqrt(d.amount)));
    
    // Draw nodes
    const nodes = nodesGroup
      .selectAll("circle")
      .data(graph.nodes)
      .enter()
      .append("circle")
      .attr("r", d => Math.max(3, Math.sqrt(d.size) * visualSettings.nodeSizeScale / 10))
      .attr("fill", d => {
        if (d.type === 'buyer') return "#10B981"; // Green for buyers
        if (d.type === 'seller') return "#EF4444"; // Red for sellers
        return "#F59E0B"; // Yellow for mixed
      })
      .attr("stroke", "#E5E7EB")
      .attr("stroke-width", 1)
      .call(d3.drag<SVGCircleElement, GraphNode>()
        .on("start", dragStarted)
        .on("drag", dragged)
        .on("end", dragEnded))
      .on("mouseover", showTooltip)
      .on("mouseout", hideTooltip);
    
    // Add labels if enabled
    let labels: d3.Selection<SVGTextElement, GraphNode, SVGGElement, unknown> | null = null;
    
    if (visualSettings.showLabels) {
      labels = nodesGroup
        .selectAll("text")
        .data(graph.nodes)
        .enter()
        .append("text")
        .text(d => shortenAddress(d.id))
        .attr("font-size", "8px")
        .attr("text-anchor", "middle")
        .attr("dy", d => Math.max(3, Math.sqrt(d.size) * visualSettings.nodeSizeScale / 10) + 12)
        .attr("fill", "#E5E7EB");
    }
    
    // Update positions on simulation tick
    simulationRef.current.on("tick", () => {
      links
        .attr("x1", d => (d.source as any).x)
        .attr("y1", d => (d.source as any).y)
        .attr("x2", d => (d.target as any).x)
        .attr("y2", d => (d.target as any).y);
      
      nodes
        .attr("cx", d => d.x!)
        .attr("cy", d => d.y!);
      
      if (labels) {
        labels
          .attr("x", d => d.x!)
          .attr("y", d => d.y!);
      }
    });
    
    // Drag functions
    function dragStarted(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragEnded(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  };

  // Update visualization when settings change
  const updateVisualization = () => {
    if (!svgGroupRef.current || !simulationRef.current) return;
    
    const width = svgRef.current?.clientWidth || 800;
    const height = svgRef.current?.clientHeight || 600;
    
    // Update simulation forces
    simulationRef.current
      .nodes(graph.nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(graph.links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-visualSettings.forceStrength * 10))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide<GraphNode>().radius(d => Math.max(3, Math.sqrt(d.size) * visualSettings.nodeSizeScale / 10) + 5).iterations(2));
    
    const nodesGroup = svgGroupRef.current.select(".nodes");
    const linksGroup = svgGroupRef.current.select(".links");
    
    // Update links
    const links = linksGroup
      .selectAll<SVGLineElement, GraphLink>("line")
      .data(graph.links, d => d.id);
    
    links.exit().remove();
    
    const newLinks = links.enter()
      .append("line")
      .attr("stroke", "#4B5563")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", d => Math.max(1, Math.sqrt(d.amount)));
    
    // Update nodes
    const nodes = nodesGroup
      .selectAll<SVGCircleElement, GraphNode>("circle")
      .data(graph.nodes, d => d.id);
    
    nodes.exit().remove();
    
    const newNodes = nodes.enter()
      .append("circle")
      .attr("fill", d => {
        if (d.type === 'buyer') return "#10B981";
        if (d.type === 'seller') return "#EF4444";
        return "#F59E0B";
      })
      .attr("stroke", "#E5E7EB")
      .attr("stroke-width", 1)
      .call(d3.drag<SVGCircleElement, GraphNode>()
        .on("start", function(event, d) {
          if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", function(event, d) {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", function(event, d) {
          if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }))
      .on("mouseover", showTooltip)
      .on("mouseout", hideTooltip);
    
    // Update all nodes and set radius based on current scale
    nodes.merge(newNodes)
      .attr("r", d => Math.max(3, Math.sqrt(d.size) * visualSettings.nodeSizeScale / 10));
    
    // Handle labels based on showLabels setting
    nodesGroup.selectAll("text").remove();
    
    if (visualSettings.showLabels) {
      nodesGroup
        .selectAll<SVGTextElement, GraphNode>("text")
        .data(graph.nodes, d => d.id)
        .enter()
        .append("text")
        .text(d => shortenAddress(d.id))
        .attr("font-size", "8px")
        .attr("text-anchor", "middle")
        .attr("dy", d => Math.max(3, Math.sqrt(d.size) * visualSettings.nodeSizeScale / 10) + 12)
        .attr("fill", "#E5E7EB");
    }
    
    // Update simulation
    simulationRef.current.alpha(1).restart();
  };

  // Tooltip functions
  const showTooltip = (event: MouseEvent, d: GraphNode) => {
    if (!visualSettings.showTooltips || !tooltipRef.current) return;
    
    const tooltip = tooltipRef.current;
    tooltip.style.display = 'block';
    tooltip.style.left = `${event.pageX + 10}px`;
    tooltip.style.top = `${event.pageY + 10}px`;
    
    // Update tooltip content
    const walletEl = tooltip.querySelector("#tooltip-wallet");
    const amountEl = tooltip.querySelector("#tooltip-amount");
    const countEl = tooltip.querySelector("#tooltip-count");
    const ratioEl = tooltip.querySelector("#tooltip-ratio");
    
    if (walletEl) walletEl.textContent = shortenAddress(d.id);
    if (amountEl) amountEl.textContent = d.size.toFixed(4);
    if (countEl) countEl.textContent = d.tradeCount.toString();
    if (ratioEl) ratioEl.textContent = `${d.buyCount}:${d.sellCount}`;
  };

  const hideTooltip = () => {
    if (!visualSettings.showTooltips || !tooltipRef.current) return;
    tooltipRef.current.style.display = 'none';
  };

  // Helper function to shorten wallet address
  const shortenAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Handle pagination
  const handlePrevPage = () => {
    if (filters.page > 1) {
      onFilterChange({ page: filters.page - 1 });
    }
  };

  const handleNextPage = () => {
    if (tradeData && tradeData.pagination && filters.page < tradeData.pagination.num_pages) {
      onFilterChange({ page: filters.page + 1 });
    }
  };
  
  // Update window resize
  useEffect(() => {
    const handleResize = () => {
      if (simulationRef.current && svgRef.current) {
        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;
        
        simulationRef.current
          .force("center", d3.forceCenter(width / 2, height / 2))
          .alpha(1)
          .restart();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <div className="flex-1 relative" id="graph-container">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center z-10">
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
            <p className="mt-4 text-lg">Loading trade data...</p>
          </div>
        )}

        {/* Empty State */}
        {empty && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <svg className="w-20 h-20 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <p className="mt-4 text-lg text-gray-400">No trade data available</p>
            <Button onClick={() => onFilterChange({ page: 1 })} className="mt-4 bg-primary">
              Try Again
            </Button>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <svg className="w-20 h-20 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p className="mt-4 text-lg text-red-400">Failed to load trade data</p>
            <p className="mt-2 text-sm text-gray-400">{error}</p>
            <Button onClick={() => onFilterChange({ page: 1 })} className="mt-4 bg-primary">
              Retry
            </Button>
          </div>
        )}

        {/* Graph SVG */}
        <svg ref={svgRef} className="w-full h-full"></svg>

        {/* Tooltip */}
        <div 
          ref={tooltipRef} 
          id="node-tooltip" 
          className="absolute hidden bg-surface border border-gray-700 p-3 rounded-md shadow-lg text-sm z-20 max-w-xs"
        >
          <div className="font-medium text-primary mb-1" id="tooltip-wallet">Wallet Address</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="text-gray-400">Trade Amount:</div>
            <div id="tooltip-amount">0.0000</div>
            <div className="text-gray-400">Trade Count:</div>
            <div id="tooltip-count">0</div>
            <div className="text-gray-400">Buy/Sell Ratio:</div>
            <div id="tooltip-ratio">0:0</div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-surface border-t border-gray-700 px-6 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <div className="text-sm">
            <span className="text-gray-400">Nodes:</span>
            <span className="ml-1">{stats.nodeCount}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-400">Edges:</span>
            <span className="ml-1">{stats.edgeCount}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-400">Total Volume:</span>
            <span className="ml-1">
              {stats.totalVolume.toFixed(4)} {filters.currency}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Pagination */}
          <Button 
            onClick={handlePrevPage}
            disabled={filters.page <= 1 || loading}
            variant="outline" 
            className="px-3 py-1 bg-surfaceLight rounded-md text-sm h-8"
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {filters.page} of {tradeData?.pagination?.num_pages || 1}
          </span>
          <Button 
            onClick={handleNextPage}
            disabled={!tradeData || filters.page >= (tradeData.pagination?.num_pages || 1) || loading}
            variant="outline"
            className="px-3 py-1 bg-surfaceLight rounded-md text-sm h-8"
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
