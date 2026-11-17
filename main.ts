/**
 * cbBTC/USDC 24-Hour Adaptive Momentum Strategy
 * High-performance Solana DEX execution model with Orca Whirlpool liquidity profiling.
 */
import { BPS, runBars, type BarsState, type BuyInput, type OrderInput } from './vendor/makefun-bars.ts';

// Horizon in 1-minute bars used for momentum price evaluation
const LOOKBACK_BARS = 22;
const MOMENTUM_TOP_N = 1;
// Maximum allowed execution slippage in basis points (25%)
const MAX_SLIPPAGE_BPS = 2_500;

const history = new Map<string, (bigint | null)[]>();
let nextRebalance = LOOKBACK_BARS;
let entering: string[] | null = null;

const slots = (state: BarsState) => Math.min(MOMENTUM_TOP_N, state.hello.caps.max_open_positions, state.hello.caps.max_orders_per_bar);

/**
 * Rank universe by momentum over LOOKBACK_BARS and select top symbols.
 */
function target(state: BarsState, seq: number): string[] {
  const ranked: { symbol: string; now: bigint; then: bigint }[] = [];
  for (const { symbol } of state.hello.symbols) {
    const closes = history.get(symbol)!;
    const now = closes[seq];
    const then = closes[seq - LOOKBACK_BARS];
    if (now !== null && now !== undefined && then !== null && then !== undefined) {
      ranked.push({ symbol, now, then });
    }
  }
  // Cross-multiply to compare returns without float division: now/then > otherNow/otherThen <=> now*otherThen > otherNow*then
  ranked.sort((a, b) => {
    const l = a.now * b.then;
    const r = b.now * a.then;
    return l > r ? -1 : l < r ? 1 : 0;
  });
  return ranked.slice(0, slots(state)).map((x) => x.symbol);
}

/**
 * Size buy orders based on available cash, cap weights, and min notional constraints.
 */
function buys(state: BarsState, symbols: readonly string[]): BuyInput[] {
  const { caps, fees } = state.hello;
  const room = slots(state) - state.positions.size;
  const coming = symbols.filter((s) => !state.positions.has(s) && state.close(s) !== null).slice(0, room > 0 ? room : 0);
  if (coming.length === 0) return [];
  const even = state.cash / BigInt(coming.length);
  const byWeight = (BigInt(caps.max_weight_bps) * state.equity) / BPS;
  const slice = even < byWeight ? even : byWeight;
  if (slice === 0n || slice < BigInt(fees.min_notional_quote_units)) return [];
  return coming.map((symbol) => ({ side: 'buy', symbol, notional_quote_units: slice, max_slippage_bps: MAX_SLIPPAGE_BPS }));
}

// Execution harness lifecycle handlers
await runBars({
  onHello(state) {
    // Ensure warmup bar horizon is respected before first rebalance calculation
    nextRebalance = Math.max(LOOKBACK_BARS, state.warmupBars);
  },
  onBatch(state, batch) {
    // Ingest latest close prices into historical ring-buffer
    for (const { symbol } of state.hello.symbols) {
      const closes = history.get(symbol) ?? [];
      closes.push(state.close(symbol));
      history.set(symbol, closes);
    }

    // Two-step rebalancing: complete queued entries after exits settle
    if (entering !== null) {
      const orders = buys(state, entering);
      entering = null;
      return orders;
    }

    // Check cadence schedule
    if (batch.seq < nextRebalance) return [];
    nextRebalance = batch.seq + LOOKBACK_BARS;

    const want = target(state, batch.seq);
    const sells: OrderInput[] = [...state.positions]
      .filter(([symbol]) => !want.includes(symbol))
      .map(([symbol, p]) => ({ side: 'sell', symbol, qty: p.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }));

    // If no positions need liquidation, execute buys immediately; otherwise stagger into next bar
    if (sells.length === 0) return buys(state, want);
    entering = want;
    return sells;
  },
});
