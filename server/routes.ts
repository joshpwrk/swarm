import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(app: Express): Promise<Server> {
  // API endpoint to get all available currencies
  app.get('/api/currencies', async (_req: Request, res: Response) => {
    try {
      const response = await fetch('https://api.lyra.finance/public/get_all_currencies', {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', errorText);
        return res.status(response.status).json({ 
          message: `Lyra API error: ${response.statusText}` 
        });
      }
      
      const data = await response.json();
      return res.json(data.result);
    } catch (error) {
      console.error('Server error fetching currencies:', error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  });

  // Trade history endpoint
  app.post('/api/trade-history', async (req: Request, res: Response) => {
    try {
      const { filters } = req.body;
      
      // Validate required fields before making the API call
      if (!filters.currency) {
        return res.status(400).json({ message: 'Currency is required' });
      }
      
      if (!filters.instrumentType) {
        // Return empty data instead of error when instrumentType is missing
        return res.json({ trades: [], pagination: { num_pages: 0, count: 0 } });
      }
      
      // Construct the request payload
      const payload = {
        currency: filters.currency,
        from_timestamp: filters.fromTimestamp,
        to_timestamp: filters.toTimestamp,
        instrument_name: null, // Always set to null as requested
        instrument_type: filters.instrumentType,
        page: filters.page || 1,
        page_size: filters.pageSize || 500,
        trade_id: null,
        tx_hash: null,
        tx_status: filters.txStatus || 'settled'
      };
      
      console.log('Requesting trade history with:', JSON.stringify(payload));
      
      const response = await fetch('https://api.lyra.finance/public/get_trade_history', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', errorText);
        
        // Try to parse the error response for a more detailed message
        try {
          const errorJson = JSON.parse(errorText);
          const errorMessage = errorJson.error || errorJson.message || `Lyra API error: ${response.statusText}`;
          return res.status(response.status).json({ message: errorMessage });
        } catch {
          // If we can't parse the error, return the status text
          return res.status(response.status).json({ 
            message: `Lyra API error: ${response.statusText}` 
          });
        }
      }
      
      const data = await response.json();
      return res.json(data.result);
    } catch (error) {
      console.error('Server error fetching trade history:', error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
