export interface TradePlatform {
  id: string;
  name: string;
  url: (mint: string, bondingCurve?: string | null) => string;
  color: string;
  hoverBg: string;
}

export const TRADE_PLATFORMS: TradePlatform[] = [
  {
    id: "pumpfun",
    name: "PumpFun",
    url: (mint) => `https://pump.fun/coin/${encodeURIComponent(mint)}`,
    color: "text-pump-green",
    hoverBg: "hover:bg-pump-green/[0.06]",
  },
{
    id: "axiom",
    name: "Axiom",
    url: (mint, bondingCurve) => `https://axiom.trade/meme/${encodeURIComponent(bondingCurve || mint)}`,
    color: "text-pump-cyan",
    hoverBg: "hover:bg-pump-cyan/[0.06]",
  },
  {
    id: "padre",
    name: "Padre",
    url: (mint, bondingCurve) => `https://trade.padre.gg/trade/solana/${encodeURIComponent(bondingCurve || mint)}`,
    color: "text-pump-pink",
    hoverBg: "hover:bg-pump-pink/[0.06]",
  },
];
