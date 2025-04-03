import { Filters, TradeData } from "@/types/trade";

export interface FetchProgress {
  currentPage: number;
  totalPages: number;
  percentage: number;
}

export async function fetchTradeHistory(
  filters: Filters, 
  onProgress?: (progress: FetchProgress) => void
): Promise<TradeData> {
  try {
    // Ensure the time range is not more than 24 hours
    const fromTimestamp = filters.fromTimestamp;
    const toTimestamp = filters.toTimestamp;
    const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    if ((toTimestamp - fromTimestamp) > oneDay) {
      throw new Error('Time range cannot exceed 24 hours');
    }

    // Fetch first page to get total count
    const initialResponse = await fetch('/api/trade-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filters: {
          ...filters,
          page: 1 // Always start with page 1 regardless of filters.page
        }
      })
    });

    if (!initialResponse.ok) {
      const errorData = await initialResponse.json().catch(() => null);
      throw new Error(errorData?.message || `API returned ${initialResponse.status}: ${initialResponse.statusText}`);
    }

    const initialData: TradeData = await initialResponse.json();
    
    // Report progress for first page
    if (onProgress && initialData.pagination) {
      onProgress({
        currentPage: 1,
        totalPages: initialData.pagination.num_pages,
        percentage: initialData.pagination.num_pages <= 1 ? 100 : (1 / initialData.pagination.num_pages) * 100
      });
    }
    
    // If only one page or empty, return immediately
    if (!initialData.pagination || initialData.pagination.num_pages <= 1) {
      return initialData;
    }

    // Calculate total pages to fetch
    const totalPages = initialData.pagination.num_pages;
    let currentPage = 1;
    
    // Fetch all remaining pages in parallel with maximum batch size
    const fetchBatchSize = 3; // Adjust based on API limits
    const allTrades = [...initialData.trades];
    
    // Process pages in batches to avoid overwhelming the server
    for (let page = 2; page <= totalPages; page += fetchBatchSize) {
      const batch = [];
      
      // Create batch of page fetch promises
      for (let batchPage = page; batchPage < page + fetchBatchSize && batchPage <= totalPages; batchPage++) {
        batch.push(
          fetch('/api/trade-history', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              filters: {
                ...filters,
                page: batchPage // Use specific page number for each batch request
              }
            })
          }).then(response => {
            if (!response.ok) {
              throw new Error(`Failed to fetch page ${batchPage}`);
            }
            return response.json();
          }).then((data: TradeData) => {
            currentPage++;
            
            if (onProgress) {
              onProgress({
                currentPage,
                totalPages,
                percentage: (currentPage / totalPages) * 100
              });
            }
            
            return data.trades || [];
          })
        );
      }
      
      // Wait for batch to complete and collect trades
      const batchResults = await Promise.all(batch);
      batchResults.forEach(trades => {
        allTrades.push(...trades);
      });
    }
    
    // Return combined result
    return {
      trades: allTrades,
      pagination: initialData.pagination
    };
  } catch (error) {
    console.error('Error fetching trade data:', error);
    throw error;
  }
}
