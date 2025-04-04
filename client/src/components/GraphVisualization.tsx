import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Filters, VisualSettings, TradeData, GraphNode, GraphLink, WalletNode } from "@/types/trade";
import { fetchTradeHistory, FetchProgress } from "@/lib/api";
import { Loader2, Clock } from "lucide-react";
import { ColorLegend } from "@/components/ColorLegend";

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
  const [loadingProgress, setLoadingProgress] = useState<FetchProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [tradeData, setTradeData] = useState<TradeData | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [graph, setGraph] = useState<{ nodes: GraphNode[], links: GraphLink[] }>({
    nodes: [],
    links: []
  });
  const [stats, setStats] = useState({
    nodeCount: 0,
    edgeCount: 0,
    totalVolume: 0,
    totalNotionalVolume: 0
  });
  
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const infoPanelRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const svgGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  // Fetch trade data when filters change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setEmpty(false);
      setLoadingProgress(null);
      
      try {
        // Track progress during fetching
        const handleProgress = (progress: FetchProgress) => {
          setLoadingProgress(progress);
        };
        
        const data = await fetchTradeHistory(filters, handleProgress);
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
        setLoadingProgress(null);
      }
    };
    
    fetchData();
  }, [filters]);

  // Process trade data to create graph structure
  const processTradeData = (data: TradeData) => {
    // Group trades by wallet address
    const walletMap = new Map<string, WalletNode>();
    const tradeLinks = new Map<string, Partial<GraphLink>>();
    
    // Get SVG dimensions for initial random positions
    const width = svgRef.current?.clientWidth || 800;
    const height = svgRef.current?.clientHeight || 600;
    
    // Process all trades to identify unique wallets and trades
    data.trades.forEach(trade => {
      // Track wallet stats
      if (!walletMap.has(trade.wallet)) {
        walletMap.set(trade.wallet, {
          id: trade.wallet,
          totalAmount: 0,
          totalNotionalVolume: 0, // Add new property for notional volume
          tradeCount: 0,
          buyCount: 0,
          sellCount: 0,
          subaccountIds: [], // Initialize empty array for subaccount IDs
          // Add initial random position for better spread on refresh
          x: Math.random() * width,
          y: Math.random() * height
        });
      }
      
      const wallet = walletMap.get(trade.wallet)!;
      wallet.tradeCount++;
      
      // Calculate the notional value (trade_amount * index_price)
      const tradeAmount = parseFloat(trade.trade_amount);
      const indexPrice = parseFloat(trade.index_price);
      
      // Update both metrics
      wallet.totalAmount += tradeAmount;
      wallet.totalNotionalVolume += tradeAmount * indexPrice;
      
      // Add subaccount_id to the list if it's not already included
      if (!wallet.subaccountIds.includes(trade.subaccount_id)) {
        wallet.subaccountIds.push(trade.subaccount_id);
      }
      
      if (trade.direction === 'buy') {
        wallet.buyCount++;
      } else {
        wallet.sellCount++;
      }
      
      // Track trade links
      if (!tradeLinks.has(trade.trade_id)) {
        tradeLinks.set(trade.trade_id, {
          id: trade.trade_id,
          source: undefined,
          target: undefined,
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
    
    // Find the wallet with the highest notional volume for scaling
    let maxNotionalVolume = 0;
    walletMap.forEach(wallet => {
      if (wallet.totalNotionalVolume > maxNotionalVolume) {
        maxNotionalVolume = wallet.totalNotionalVolume;
      }
    });
    
    // Convert Maps to arrays for D3, scaling sizes relative to max notional volume
    const nodes = Array.from(walletMap.values()).map(wallet => {
      // Calculate normalized size based on notional volume (trade_amount * index_price)
      const normalizedSize = maxNotionalVolume > 0 
        ? (wallet.totalNotionalVolume / maxNotionalVolume) 
        : 1;
        
      return {
        id: wallet.id,
        totalAmount: wallet.totalAmount,
        totalNotionalVolume: wallet.totalNotionalVolume,
        maxAmount: maxNotionalVolume, // Store for reference
        size: wallet.totalNotionalVolume, // Update size to use notional volume
        normalizedSize: normalizedSize, // Add normalized size for scaling (0-1)
        tradeCount: wallet.tradeCount,
        buyCount: wallet.buyCount,
        sellCount: wallet.sellCount,
        subaccountIds: wallet.subaccountIds, // Include the subaccount IDs
        type: wallet.buyCount > wallet.sellCount ? 'buyer' : wallet.sellCount > wallet.buyCount ? 'seller' : 'mixed'
      } as GraphNode;
    });
    
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
    const totalTokenVolume = nodes.reduce((sum, node) => sum + node.totalAmount, 0) / 2; // Divide by 2 as each trade is counted twice
    const totalNotionalVolume = nodes.reduce((sum, node) => sum + node.totalNotionalVolume, 0) / 2; // Divide by 2 as each trade is counted twice
    
    setStats({
      nodeCount: nodes.length,
      edgeCount: links.length,
      totalVolume: totalTokenVolume,
      totalNotionalVolume: totalNotionalVolume
    });
  };

  // Initialize or update visualization when graph data or visual settings change
  useEffect(() => {
    if (!svgRef.current || loading || error || empty || graph.nodes.length === 0) return;
    
    // Always fully reinitialize when graph data changes to avoid stacking nodes
    if (!svgGroupRef.current || graph.nodes.length > 0) {
      // Clear existing simulation
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      
      // Clear existing SVG content
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll("*").remove();
      }
      
      // Reset references
      svgGroupRef.current = null;
      
      // Reinitialize visualization
      initializeVisualization();
    } else {
      updateVisualization();
    }
    
    // Cleanup function to properly handle stopping the simulation when unmounting
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [graph, visualSettings, loading, error, empty]);

  // Initialize D3 visualization
  const initializeVisualization = () => {
    if (!svgRef.current) return;
    
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    // Clear any existing content
    d3.select(svgRef.current).selectAll("*").remove();
    
    const svg = d3.select(svgRef.current);
    
    // Clear selected node state when clicking on background
    svg.on("click", () => {
      clearNodeSelection();
    });
    
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
    
    // Adjust scale factor for viewport size (smaller for mobile)
    const isSmallViewport = width < 768;
    const scaleFactor = isSmallViewport ? 0.6 : 1.0;
    
    // Adjust parameters for mobile
    const linkDistance = isSmallViewport ? 60 : 100;
    const chargeStrength = isSmallViewport 
      ? -visualSettings.forceStrength * 5 // Less repulsion on mobile
      : -visualSettings.forceStrength * 10;
    
    // Create simulation with viewport-adjusted parameters
    simulationRef.current = d3.forceSimulation<GraphNode>(graph.nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(graph.links)
        .id(d => d.id)
        .distance(linkDistance))
      .force("charge", d3.forceManyBody().strength(chargeStrength))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide<GraphNode>().radius(d => {
        // Match the collision radius to the visual radius + a small buffer
        // Scale down sizes for mobile
        const maxSize = (isSmallViewport ? 30 : 50) * (visualSettings.nodeSizeScale / 10) * scaleFactor;
        return Math.max(3, d.normalizedSize! * maxSize) + 5;
      }).iterations(2));
    
    // Draw links
    const links = linksGroup
      .selectAll("line")
      .data(graph.links)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke-width", d => Math.max(1, Math.sqrt(d.amount) * (visualSettings.edgeThicknessScale / 10)));
    
    // Draw nodes
    const nodes = nodesGroup
      .selectAll("circle")
      .data(graph.nodes)
      .enter()
      .append("circle")
      .attr("r", d => {
        // Use viewport-aware maximum size for the largest node
        // Minimum size of 3 for visibility of small nodes
        const maxSize = (isSmallViewport ? 30 : 50) * (visualSettings.nodeSizeScale / 10) * scaleFactor;
        return Math.max(3, d.normalizedSize! * maxSize);
      })
      .attr("class", "node")
      .attr("fill", d => calculateNodeColor(d.buyCount, d.sellCount))
      .call(d3.drag<SVGCircleElement, GraphNode>()
        .on("start", dragStarted)
        .on("drag", dragged)
        .on("end", dragEnded))
      .on("mouseover", showTooltip)
      .on("mouseout", hideTooltip)
      .on("click", (event, d) => {
        event.stopPropagation(); // Prevent click event from propagating to background
        handleNodeClick(event, d);
      });
    
    // Add labels if enabled
    let labels: d3.Selection<SVGTextElement, GraphNode, SVGGElement, unknown> | null = null;
    
    if (visualSettings.showLabels) {
      labels = nodesGroup
        .selectAll("text")
        .data(graph.nodes)
        .enter()
        .append("text")
        .text(d => shortenAddress(d.id))
        .attr("font-size", isSmallViewport ? "6px" : "8px")
        .attr("text-anchor", "middle")
        .attr("dy", d => {
          // Use viewport-aware sizing for label positioning
          const maxSize = (isSmallViewport ? 30 : 50) * (visualSettings.nodeSizeScale / 10) * scaleFactor;
          return Math.max(3, d.normalizedSize! * maxSize) + (isSmallViewport ? 8 : 12);
        })
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
    
    // Adjust scale factor for viewport size (smaller for mobile)
    const isSmallViewport = width < 768;
    const scaleFactor = isSmallViewport ? 0.6 : 1.0;
    
    // Adjust parameters for mobile
    const linkDistance = isSmallViewport ? 60 : 100;
    const chargeStrength = isSmallViewport 
      ? -visualSettings.forceStrength * 5 // Less repulsion on mobile
      : -visualSettings.forceStrength * 10;
    
    // Update simulation forces
    simulationRef.current
      .nodes(graph.nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(graph.links).id(d => d.id).distance(linkDistance))
      .force("charge", d3.forceManyBody().strength(chargeStrength))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide<GraphNode>().radius(d => {
        // Match the collision radius to the visual radius + a small buffer
        // Scale down sizes for mobile
        const maxSize = (isSmallViewport ? 30 : 50) * (visualSettings.nodeSizeScale / 10) * scaleFactor;
        return Math.max(3, d.normalizedSize! * maxSize) + 5;
      }).iterations(2));
    
    const nodesGroup = svgGroupRef.current.select(".nodes");
    const linksGroup = svgGroupRef.current.select(".links");
    
    // Update links
    const links = linksGroup
      .selectAll<SVGLineElement, GraphLink>("line")
      .data(graph.links, d => d.id);
    
    links.exit().remove();
    
    const newLinks = links.enter()
      .append("line")
      .attr("stroke", "hsl(220, 100%, 40%)")
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", d => Math.max(1, Math.sqrt(d.amount) * (visualSettings.edgeThicknessScale / 10)))
      .attr("stroke-linecap", "round");
    
    // Update nodes
    const nodes = nodesGroup
      .selectAll<SVGCircleElement, GraphNode>("circle")
      .data(graph.nodes, d => d.id);
    
    nodes.exit().remove();
    
    const newNodes = nodes.enter()
      .append("circle")
      .attr("class", "node")
      .attr("fill", d => calculateNodeColor(d.buyCount, d.sellCount))
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
      .on("mouseout", hideTooltip)
      .on("click", (event, d) => {
        event.stopPropagation(); // Prevent click event from propagating to background
        handleNodeClick(event, d);
      });
    
    // Update all nodes (radius and color)
    nodes.merge(newNodes)
      .attr("r", d => {
        // Use same viewport-aware sizing as in initialization
        const maxSize = (isSmallViewport ? 30 : 50) * (visualSettings.nodeSizeScale / 10) * scaleFactor;
        return Math.max(3, d.normalizedSize! * maxSize);
      })
      .attr("fill", d => calculateNodeColor(d.buyCount, d.sellCount));
    
    // Handle labels based on showLabels setting
    nodesGroup.selectAll("text").remove();
    
    if (visualSettings.showLabels) {
      nodesGroup
        .selectAll<SVGTextElement, GraphNode>("text")
        .data(graph.nodes, d => d.id)
        .enter()
        .append("text")
        .text(d => shortenAddress(d.id))
        .attr("font-size", isSmallViewport ? "6px" : "8px")
        .attr("text-anchor", "middle")
        .attr("dy", d => {
          // Use viewport-aware sizing for label positioning
          const maxSize = (isSmallViewport ? 30 : 50) * (visualSettings.nodeSizeScale / 10) * scaleFactor;
          return Math.max(3, d.normalizedSize! * maxSize) + (isSmallViewport ? 8 : 12);
        })
        .attr("fill", "#E5E7EB");
    }
    
    // Update simulation
    simulationRef.current.alpha(1).restart();
  };

  // Check if the device is mobile
  const [isMobile, setIsMobile] = useState(false);
  
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
  
  // Track mouse position globally
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (tooltipRef.current && tooltipRef.current.style.display === 'block') {
        // Different offset values for mobile vs desktop
        if (isMobile) {
          // For mobile devices, position the tooltip a bit higher and with more horizontal offset
          // to prevent finger from covering it
          tooltipRef.current.style.left = `${e.clientX + 30}px`;
          tooltipRef.current.style.top = `${e.clientY - 80}px`;
        } else {
          // Standard offset for desktop
          tooltipRef.current.style.left = `${e.clientX + 20}px`;
          tooltipRef.current.style.top = `${e.clientY - 20}px`;
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isMobile]);
  
  // Tooltip functions
  // Function to copy wallet address to clipboard
  const copyWalletToClipboard = (walletAddress: string) => {
    navigator.clipboard.writeText(walletAddress)
      .then(() => {
        // Show a brief "copied" indicator (could be enhanced with a toast notification)
        console.log('Wallet address copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy wallet address: ', err);
      });
  };

  // Handle node selection
  const handleNodeClick = (event: MouseEvent, node: GraphNode) => {
    event.stopPropagation(); // Prevent event bubbling
    
    // If the same node is clicked again, do nothing (maintain selection)
    if (selectedNodeId === node.id) return;
    
    // Update selected node state
    setSelectedNode(node);
    setSelectedNodeId(node.id);
    
    // Update node visualization to highlight selected node
    if (svgGroupRef.current) {
      // Reset all nodes to normal color
      svgGroupRef.current.selectAll<SVGCircleElement, GraphNode>("circle.node")
        .attr("stroke", "#E5E7EB")
        .attr("stroke-width", 1);
      
      // Highlight the selected node
      svgGroupRef.current.selectAll<SVGCircleElement, GraphNode>("circle.node")
        .filter(d => d.id === node.id)
        .attr("stroke", "#FFFFFF")
        .attr("stroke-width", 3);
    }
    
    // Hide the hover tooltip when a node is selected
    if (tooltipRef.current) {
      tooltipRef.current.style.display = 'none';
    }
    
    // Update info panel content
    updateInfoPanelContent(node);
  };
  
  // Clear node selection
  const clearNodeSelection = () => {
    setSelectedNode(null);
    setSelectedNodeId(null);
    
    // Reset all node styles
    if (svgGroupRef.current) {
      svgGroupRef.current.selectAll<SVGCircleElement, GraphNode>("circle.node")
        .attr("stroke", "#E5E7EB")
        .attr("stroke-width", 1);
    }
    
    // Hide the info panel
    if (infoPanelRef.current) {
      infoPanelRef.current.style.display = 'none';
    }
  };
  
  // Update info panel content
  const updateInfoPanelContent = (node: GraphNode) => {
    if (!infoPanelRef.current) return;
    
    const panel = infoPanelRef.current;
    
    // Update panel content with node data
    const walletEl = panel.querySelector("#info-wallet");
    const amountEl = panel.querySelector("#info-amount");
    const countEl = panel.querySelector("#info-count");
    const ratioEl = panel.querySelector("#info-ratio");
    const subaccountEl = panel.querySelector("#info-subaccounts");
    
    // Update wallet address text
    if (walletEl) {
      walletEl.textContent = node.id;
    }
    
    // Update the GO TO ACCOUNT button href
    const accountLink = panel.querySelector("a[href^='https://www.derive.xyz/user/']");
    if (accountLink) {
      accountLink.setAttribute('href', `https://www.derive.xyz/user/${node.id}`);
    }
    
    // Calculate buy percentage for the ratio display
    const buyPercentage = node.tradeCount > 0 ? Math.round((node.buyCount / node.tradeCount) * 100) : 0;
    
    if (amountEl) amountEl.textContent = `$${node.totalNotionalVolume.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${node.totalAmount.toFixed(4)} tokens)`;
    if (countEl) countEl.textContent = node.tradeCount.toString();
    if (ratioEl) ratioEl.textContent = `${node.buyCount}:${node.sellCount} (${buyPercentage}% buy)`;
    
    // Add subaccount IDs list
    if (subaccountEl) {
      subaccountEl.textContent = node.subaccountIds.length > 0 
        ? node.subaccountIds.join(', ') 
        : '0';
    }
    
    // Show the panel
    panel.style.display = 'block';
  };

  // Hover tooltip display
  const showTooltip = (event: MouseEvent, d: GraphNode) => {
    // Don't show tooltip if a node is already selected
    if (selectedNodeId || !visualSettings.showTooltips || !tooltipRef.current) return;
    
    const tooltip = tooltipRef.current;
    
    // Make tooltip visible and set initial position
    tooltip.style.display = 'block';
    tooltip.style.position = 'fixed';
    
    // Different positioning for mobile vs desktop
    if (isMobile) {
      tooltip.style.left = `${event.clientX + 30}px`;
      tooltip.style.top = `${event.clientY - 80}px`;
    } else {
      tooltip.style.left = `${event.clientX + 20}px`;
      tooltip.style.top = `${event.clientY - 20}px`;
    }
    
    // Update tooltip content
    const walletEl = tooltip.querySelector("#tooltip-wallet");
    const amountEl = tooltip.querySelector("#tooltip-amount");
    const countEl = tooltip.querySelector("#tooltip-count");
    const ratioEl = tooltip.querySelector("#tooltip-ratio");
    const subaccountEl = tooltip.querySelector("#tooltip-subaccounts");
    
    // Show shortened wallet address in tooltip
    if (walletEl) walletEl.textContent = shortenAddress(d.id);
    
    if (amountEl) amountEl.textContent = `$${d.totalNotionalVolume.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${d.totalAmount.toFixed(4)} tokens)`;
    if (countEl) countEl.textContent = d.tradeCount.toString();
    
    // Calculate buy percentage for the ratio display
    const buyPercentage = d.tradeCount > 0 ? Math.round((d.buyCount / d.tradeCount) * 100) : 0;
    if (ratioEl) ratioEl.textContent = `${d.buyCount}:${d.sellCount} (${buyPercentage}% buy)`;
    
    // Add subaccount IDs list
    if (subaccountEl) {
      subaccountEl.textContent = d.subaccountIds.length > 0 
        ? d.subaccountIds.join(', ') 
        : '0';
    }
  };

  // Hide hover tooltip
  const hideTooltip = () => {
    // Don't hide tooltip if we have a selected node
    if (selectedNodeId || !visualSettings.showTooltips || !tooltipRef.current) return;
    tooltipRef.current.style.display = 'none';
  };

  // Helper function to shorten wallet address
  const shortenAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Helper function to calculate color based on buy/sell ratio
  const calculateNodeColor = (buyCount: number, sellCount: number) => {
    // If no trades, return neutral color
    if (buyCount === 0 && sellCount === 0) return "hsl(210, 10%, 70%)";
    
    // Calculate ratio - ranges from 0 (all sells) to 100 (all buys)
    const total = buyCount + sellCount;
    const buyRatio = Math.floor((buyCount / total) * 100);
    
    // Create a gradient from red (0, 85%, 60%) to green (142, 76%, 45%)
    // For a clearer visualization, we'll make pure sellers deep red,
    // pure buyers vivid green, and adjust the gradient between them
    
    // For a much stronger visual difference:
    if (buyRatio === 0) {
      return "hsl(0, 100%, 50%)"; // Pure red for 100% sellers
    } else if (buyRatio === 100) {
      return "hsl(142, 100%, 45%)"; // Pure green for 100% buyers
    }
    
    // Use linear interpolation between the two hues for the gradient
    const hue = Math.floor((buyRatio / 100) * (142 - 0) + 0);
    
    // Higher saturation overall for more vivid colors
    // And make extreme values (near 0 or 100) even more saturated
    const saturation = 85 - Math.abs(buyRatio - 50) * 0.1; 
    
    // Adjust lightness to maintain visibility
    // Make colors near 50% slightly lighter to stand out less
    const lightness = 45 + Math.abs(buyRatio - 50) * -0.1;
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // Pagination handlers removed as we now load all pages at once
  
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
        {/* Color Legend Box - only show when data is loaded and visible */}
        {!loading && !empty && !error && <ColorLegend />}
        
        {/* Fixed Info Panel - only visible when a node is selected */}
        <div 
          ref={infoPanelRef}
          id="node-info-panel"
          className="hidden fixed top-0 left-0 right-0 bg-black border-b border-primary p-3 md:p-4 shadow-xl z-50 font-mono"
        >
          <div className="flex flex-col">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center">
                  <div className="font-bold text-primary uppercase tracking-widest text-xs md:text-sm" id="info-wallet-label">
                    DERIVE WALLET
                  </div>
                  <button 
                    onClick={() => selectedNode && copyWalletToClipboard(selectedNode.id)}
                    className="ml-2 p-1 text-primary hover:bg-primary/20 rounded"
                    title="Copy wallet address"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <div className="text-secondary text-[10px] md:text-xs mt-1 mb-2 font-mono" id="info-wallet"></div>
                <div className="grid grid-cols-[auto,1fr] md:grid-cols-[auto,1fr,auto,1fr] gap-x-3 md:gap-x-6 gap-y-1 mt-2">
                  <div className="text-primary/70 uppercase tracking-wider text-[10px] md:text-xs">VOLUME:</div>
                  <div id="info-amount" className="text-secondary text-[10px] md:text-xs">0.0000</div>
                  <div className="text-primary/70 uppercase tracking-wider text-[10px] md:text-xs">TRADES:</div>
                  <div id="info-count" className="text-secondary text-[10px] md:text-xs">0</div>
                  <div className="text-primary/70 uppercase tracking-wider text-[10px] md:text-xs">B/S RATIO:</div>
                  <div id="info-ratio" className="text-secondary text-[10px] md:text-xs">0:0</div>
                  <div className="text-primary/70 uppercase tracking-wider text-[10px] md:text-xs">SUBACCOUNTS:</div>
                  <div id="info-subaccounts" className="text-secondary text-[10px] md:text-xs">0</div>
                </div>
              </div>
              <button 
                onClick={clearNodeSelection}
                className="text-primary hover:bg-primary/20 p-1 rounded"
                title="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Go to Account Button */}
            <div className="mt-3 pt-2 border-t border-primary/30">
              <div className="flex flex-col md:flex-row md:items-center">
                <a 
                  href={selectedNode ? `https://www.derive.xyz/user/${selectedNode.id}` : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 px-4 py-1.5 text-xs uppercase tracking-wider font-bold transition-colors"
                >
                  GO TO ACCOUNT
                </a>
                <div className="text-[9px] md:text-[10px] text-primary/60 mt-1 md:mt-0 md:ml-3 italic font-sans">
                  NOTE: does not work for EOAs. Use <a href="https://derive-cockpit.replit.app" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">derive-cockpit.replit.app</a> via subaccount_ids instead
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-10">
            {!loadingProgress ? (
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
            ) : (
              <div className="flex flex-col items-center w-full max-w-md px-8">
                <Clock className="w-14 h-14 text-primary mb-4" />
                <Progress 
                  value={loadingProgress.percentage} 
                  className="h-2 w-full bg-gray-800"
                />
                <div className="flex justify-between w-full mt-2 text-xs text-primary/70">
                  <span>Page {loadingProgress.currentPage} of {loadingProgress.totalPages}</span>
                  <span>{Math.round(loadingProgress.percentage)}% complete</span>
                </div>
              </div>
            )}
            <p className="mt-6 text-md uppercase tracking-widest text-primary">
              {!loadingProgress ? "REQUESTING TRADE DATA..." : "LOADING ALL PAGES..."}
            </p>
          </div>
        )}

        {/* Empty State */}
        {empty && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <div className="border border-primary/70 p-8 bg-black flex flex-col items-center">
              <svg className="w-20 h-20 text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <p className="mt-6 text-md uppercase tracking-widest text-primary">NO TRADE DATA AVAILABLE</p>
              <Button onClick={() => onFilterChange({})} className="mt-6 bg-primary hover:bg-primary/90 uppercase tracking-widest font-bold">
                RETRY QUERY
              </Button>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <div className="border border-red-500/70 p-8 bg-black flex flex-col items-center max-w-lg">
              <svg className="w-20 h-20 text-red-500/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p className="mt-6 text-md uppercase tracking-widest text-red-500">DATA RETRIEVAL ERROR</p>
              <p className="mt-2 text-xs text-red-200 font-mono text-center">{error}</p>
              
              {/* Additional help text */}
              <p className="mt-4 text-xs text-gray-400 italic text-center">
                If you changed the currency, you may need to select a valid instrument type.
              </p>
              
              <div className="flex space-x-4 mt-6">
                <Button 
                  onClick={() => onFilterChange({})} 
                  className="bg-red-500 hover:bg-red-600 uppercase tracking-widest font-bold"
                >
                  SYSTEM RESET
                </Button>
                <Button 
                  onClick={() => onFilterChange({
                    instrumentType: filters.instrumentType || "perp" // Ensure we have a valid instrument type
                  })} 
                  className="bg-primary hover:bg-primary/90 uppercase tracking-widest font-bold"
                >
                  EXECUTE QUERY
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Graph SVG */}
        <svg ref={svgRef} className="w-full h-full"></svg>

        {/* Tooltip */}
        <div 
          ref={tooltipRef} 
          id="node-tooltip" 
          className="fixed hidden bg-black border border-primary p-2 md:p-3 shadow-xl text-xs z-50 max-w-[320px] md:max-w-md font-mono"
          style={{ pointerEvents: 'none' }} // Ensure tooltip doesn't interfere with mouse events
        >
          <div className="font-bold text-primary mb-1 uppercase tracking-widest text-[10px] md:text-xs" id="tooltip-wallet">Wallet Address</div>
          <div className="grid grid-cols-[auto,1fr] gap-x-2 md:gap-x-3 gap-y-1">
            <div className="text-primary/70 uppercase tracking-wider text-[10px] md:text-xs">VOLUME:</div>
            <div id="tooltip-amount" className="text-secondary text-[10px] md:text-xs">0.0000</div>
            <div className="text-primary/70 uppercase tracking-wider text-[10px] md:text-xs">TRADES:</div>
            <div id="tooltip-count" className="text-secondary text-[10px] md:text-xs">0</div>
            <div className="text-primary/70 uppercase tracking-wider text-[10px] md:text-xs">B/S RATIO:</div>
            <div id="tooltip-ratio" className="text-secondary text-[10px] md:text-xs">0:0</div>
            <div className="text-primary/70 uppercase tracking-wider text-[10px] md:text-xs">SUBACCOUNTS:</div>
            <div id="tooltip-subaccounts" className="text-secondary text-[10px] md:text-xs">0</div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-black border-t border-primary px-3 md:px-6 py-2 md:py-3">
        {/* Mobile Status Bar - 2x2 Grid */}
        <div className="md:hidden grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="text-xs font-mono">
            <span className="text-primary/70 uppercase tracking-wider">NODES:</span>
            <span className="ml-2 text-secondary">{stats.nodeCount}</span>
          </div>
          <div className="text-xs font-mono">
            <span className="text-primary/70 uppercase tracking-wider">EDGES:</span>
            <span className="ml-2 text-secondary">{stats.edgeCount}</span>
          </div>
          <div className="text-xs font-mono">
            <span className="text-primary/70 uppercase tracking-wider">TOKEN:</span>
            <span className="ml-2 text-secondary">
              {stats.totalVolume.toFixed(4)} {filters.currency}
            </span>
          </div>
          <div className="text-xs font-mono">
            <span className="text-primary/70 uppercase tracking-wider">NOTIONAL:</span>
            <span className="ml-2 text-secondary">
              ${stats.totalNotionalVolume ? stats.totalNotionalVolume.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}
            </span>
          </div>
        </div>
        
        {/* Desktop Status Bar - Horizontal */}
        <div className="hidden md:flex items-center space-x-8">
          <div className="text-xs font-mono">
            <span className="text-primary/70 uppercase tracking-wider">NODES:</span>
            <span className="ml-2 text-secondary">{stats.nodeCount}</span>
          </div>
          <div className="text-xs font-mono">
            <span className="text-primary/70 uppercase tracking-wider">EDGES:</span>
            <span className="ml-2 text-secondary">{stats.edgeCount}</span>
          </div>
          <div className="text-xs font-mono">
            <span className="text-primary/70 uppercase tracking-wider">TOKEN VOLUME:</span>
            <span className="ml-2 text-secondary">
              {stats.totalVolume.toFixed(4)} {filters.currency}
            </span>
          </div>
          <div className="text-xs font-mono">
            <span className="text-primary/70 uppercase tracking-wider">NOTIONAL VOLUME:</span>
            <span className="ml-2 text-secondary">
              ${stats.totalNotionalVolume ? stats.totalNotionalVolume.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
