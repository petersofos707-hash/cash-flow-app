export interface MarketPriceQuote {
  symbol: string;
  exchange: string;
  currency: string;
  priceCents: number;
  asOf: string;
}

export interface MarketPriceProvider {
  getQuote(symbol: string, exchange: string): Promise<MarketPriceQuote>;
}

export class ManualMarketPriceProvider implements MarketPriceProvider {
  async getQuote(): Promise<MarketPriceQuote> {
    throw new Error("Automatic market prices are not configured. Update the holding manually.");
  }
}
