// Filter settings
export interface Filters {
  currency: string;
  instrumentType: string;
  instrumentName: string;
  fromTimestamp: number;
  toTimestamp: number;
  pageSize: number;
  page: number;
  txStatus: string;
}

// Visualization settings
export interface VisualSettings {
  nodeSizeScale: number;
  forceStrength: number;
  showLabels: boolean;
  showTooltips: boolean;
}

// Trade API types
export interface Trade {
  trade_id: string;
  instrument_name: string;
  timestamp: number;
  trade_price: string;
  trade_amount: string;
  mark_price: string;
  index_price: string;
  direction: string;
  quote_id: string | null;
  wallet: string;
  subaccount_id: number;
  tx_status: string;
  tx_hash: string;
  trade_fee: string;
  expected_rebate: string;
  liquidity_role: string;
  realized_pnl: string;
  realized_pnl_excl_fees: string;
}

export interface Pagination {
  num_pages: number;
  count: number;
}

export interface TradeData {
  trades: Trade[];
  pagination: Pagination;
}

// Graph visualization types
export interface WalletNode {
  id: string;
  totalAmount: number;
  tradeCount: number;
  buyCount: number;
  sellCount: number;
}

export interface GraphNode extends WalletNode {
  type: 'buyer' | 'seller' | 'mixed';
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  size?: number; // Added for compatibility with existing code using d.size
}

export interface GraphLink {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  amount: number;
  price: number;
  timestamp: number;
}
