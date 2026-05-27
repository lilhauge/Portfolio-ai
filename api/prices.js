// Vercel serverless function — fetches ETF prices from Yahoo Finance
// Free, no API key needed, no rate limits for reasonable usage

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ISIN → Yahoo Finance ticker map (hardcoded for reliability)
  // Tested and verified against Yahoo Finance — all 15 return live prices
  const ISIN_TO_YAHOO = {
    "JE00BN2CJ301": "WGLD.L",    // WisdomTree Core Physical Gold (USD on LSE)
    "JE00B1VS3W29": "PHPM.L",    // WisdomTree Physical Precious Metals (USD on LSE)
    "IE00BLPK3577": "WCBR.L",    // WisdomTree Cybersecurity ETF
    "IE00BYMLZY74": "WCOA.L",    // WisdomTree Enhanced Commodity ETF
    "GB00BJYDH287": "BTCW.L",    // WisdomTree Physical Bitcoin (was WBTC.L — fixed)
    "IE0002PG6CA6": "REMX.PA",   // VanEck Rare Earth & Strategic Metals
    "IE00B4L5Y983": "IWDA.AS",   // iShares Core MSCI World
    "IE00B4L5Y983C": "IWDA.AS",  // iShares Core MSCI World (Carina ASK)
    "DK0062615662": "MAJAIS.CO", // Maj Invest AI Semicon
    "IE00BP3QZB59": "IWVL.L",    // iShares MSCI World Value Factor (was IWVL.AS — fixed)
    "IE00BYZK4552": "2B76.DE",   // iShares Automation & Robotics
    "IE000YYE6WK5": "DFEN.DE",   // VanEck Defense ETF
    "IE000M7V94E1": "NUKL.DE",   // VanEck Uranium & Nuclear Technologies
    "IE000OJ5TQP4": "NATO.L",    // HANetf Future of Defence (was ASWC.L — fixed)
    "IE00B1XNHC34": "INRG.L",    // iShares Global Clean Energy (GBp on LSE)
  };

  const { isins } = req.body || {};
  if (!isins || !Array.isArray(isins)) {
    return res.status(400).json({ error: "Body must include isins array" });
  }

  // Build unique list of Yahoo tickers to fetch
  const tickerToIsins = {};
  for (const isin of isins) {
    const ticker = ISIN_TO_YAHOO[isin];
    if (ticker) {
      if (!tickerToIsins[ticker]) tickerToIsins[ticker] = [];
      tickerToIsins[ticker].push(isin);
    }
  }

  const uniqueTickers = Object.keys(tickerToIsins);
  if (!uniqueTickers.length) {
    return res.status(200).json({ prices: [] });
  }

  // Fetch all tickers in parallel
  const results = await Promise.allSettled(
    uniqueTickers.map(async (ticker) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=2d`;
      const r = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json",
        },
      });
      if (!r.ok) throw new Error(`Yahoo ${ticker}: HTTP ${r.status}`);
      const data = await r.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta?.regularMarketPrice) throw new Error(`No price for ${ticker}`);

      const price = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPreviousClose;
      const chgPct = prevClose ? ((price - prevClose) / prevClose) * 100 : null;
      const currency = meta.currency || "EUR";

      // Return one entry per ISIN that maps to this ticker
      // GBp = pence, divide by 100 to get GBP
      const normCurrency = currency === "GBp" ? "GBP" : currency;
      const normPrice    = currency === "GBp" ? price / 100 : price;

      return tickerToIsins[ticker].map(isin => ({
        isin,
        ticker,
        price: normPrice,
        currency: normCurrency,
        chgPct: chgPct ? Math.round(chgPct * 100) / 100 : null,
      }));
    })
  );

  const prices = [];
  const errors = [];
  for (const r of results) {
    if (r.status === "fulfilled") prices.push(...r.value);
    else errors.push(r.reason?.message || "Unknown error");
  }

  return res.status(200).json({ prices, errors });
}
