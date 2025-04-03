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
      
      const response = await fetch('https://api.lyra.finance/public/get_trade_history', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          currency: filters.currency,
          from_timestamp: filters.fromTimestamp,
          to_timestamp: filters.toTimestamp,
          instrument_name: null, // Always set to null as requested
          instrument_type: filters.instrumentType,
          page: filters.page,
          page_size: filters.pageSize,
          trade_id: null,
          tx_hash: null,
          tx_status: filters.txStatus
        })
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
      console.error('Server error fetching trade history:', error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
