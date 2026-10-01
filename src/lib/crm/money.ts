export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "AED", symbol: "AED ", name: "UAE Dirham" },
];

export function money(n: number, currency = "USD", opts: { compact?: boolean; cents?: boolean } = {}) {
  const c = CURRENCIES.find((x) => x.code === currency);
  const symbol = c?.symbol ?? currency + " ";
  const abs = Math.abs(n);
  const body = opts.compact && abs >= 1000
    ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(abs)
    : abs.toLocaleString("en-US", { minimumFractionDigits: opts.cents ? 2 : 0, maximumFractionDigits: opts.cents ? 2 : abs % 1 === 0 ? 0 : 2 });
  return `${n < 0 ? "−" : ""}${symbol}${body}`;
}

export function hours(minutes: number) {
  const h = Math.floor(minutes / 60), m = Math.round(minutes % 60);
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}
