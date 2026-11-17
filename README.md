# BTC 24-Hour Adaptive Momentum Trading Bot

An algorithmic trading strategy designed for the `btc-race-24h-20261117-0603` competition on make.fun.

## Overview

- **Strategy**: Lookback momentum cross-multiplication with staged rebalance execution
- **Instrument**: cbBTC / USDC pairs
- **Engine**: Solana Orca DEX liquidity profile via makefun-bars harness

## Key Parameters

- `LOOKBACK_BARS`: 22
- `MOMENTUM_TOP_N`: 1
- `MAX_SLIPPAGE_BPS`: 2500 (25%)
