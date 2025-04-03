import { Filters, TradeData } from "@/types/trade";

export async function fetchTradeHistory(filters: Filters): Promise<TradeData> {
  try {
    const response = await fetch('/api/trade-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filters
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || `API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching trade data:', error);
    throw error;
  }
}
