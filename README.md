# btc-trading-bot

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/nh0cksh0ck02/btc-trading-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/nh0cksh0ck02/btc-trading-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

An algorithmic trading strategy engineered for the `btc-race-24h-20261117-0603` competition on make.fun.

## Overview

- **Strategy**: Lookback momentum cross-multiplication with staged rebalance execution
- **Instrument**: cbBTC / USDC pairs
- **Engine**: Solana Orca DEX liquidity profile via makefun-bars harness

## Technical Specifications

### Momentum Lookback Window
- **Horizon**: 22 bars (1-minute intervals).
- **Metric Formulation**: Uses cross-multiplication on fixed-point prices (`now * then_other > now_other * then`) to eliminate floating-point precision loss in integer math runtimes.
- **Cadence**: Evaluated strictly at periodic intervals matching the lookback horizon or after warmup bar ingestion.

### Orca Whirlpool Execution & Slippage
- **Tolerance**: Configured to 2,500 bps (25.0%) to prevent fill rejection across volatile concentrated liquidity ticks.
- **Concentrated Liquidity Dynamic**: Accommodates tick spacing and depth transitions typical of Solana automated market makers.
- **Order Timing**: Two-phase rebalance model where pending exits execute before entry orders to maintain margin and liquidity constraints.

### Risk Controls & Portfolio Sizing
- **Max Positions**: Restricted to top-1 ranked asset (`MOMENTUM_TOP_N = 1`).
- **Exposure Cap**: Sized according to exchange-level caps (`max_weight_bps`) and available cash.
- **Min Notional Filter**: Drops sub-minimal quote amounts to prevent spam order penalties.
