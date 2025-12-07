'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { supabase } from '@/lib/supabase';
import { usePriceOracle } from '@/hooks/usePriceOracle';

// Total supply: 1B tokens
const TOTAL_SUPPLY = 1_000_000_000;
// Initial MC in USD (from constants)
const INITIAL_MC_USD = 5000;

interface PriceChartProps {
  token: {
    mint?: string;
    solRaised: number;
    virtualSolInit: number;
    constantK: string;
    createdAt: number;
    name: string;
    symbol: string;
    marketCapUsd?: number;
  };
}

type TimeframeKey = '1m' | '5m' | '15m' | '1h';

const TIMEFRAMES: { key: TimeframeKey; label: string; seconds: number }[] = [
  { key: '1m', label: '1m', seconds: 60 },
  { key: '5m', label: '5m', seconds: 300 },
  { key: '15m', label: '15m', seconds: 900 },
  { key: '1h', label: '1H', seconds: 3600 },
];

interface Trade {
  sol_amount: number;
  token_amount: string;
  block_time: string;
  trade_type: string;
  token_price_sol: string;
}

// Convert token price to Market Cap USD
function priceToMarketCap(tokenPriceSol: number, solPriceUsd: number): number {
  return tokenPriceSol * TOTAL_SUPPLY * solPriceUsd;
}

// Format large numbers (e.g., $3.8K, $16.1K)
function formatMarketCap(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(0)}`;
}

// Format price in USD
function formatPrice(value: number): string {
  if (value < 0.00000001) {
    return `$${value.toExponential(2)}`;
  } else if (value < 0.0001) {
    return `$${value.toFixed(10)}`;
  } else if (value < 1) {
    return `$${value.toFixed(8)}`;
  }
  return `$${value.toFixed(4)}`;
}

export function PriceChart({ token }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [timeframe, setTimeframe] = useState<TimeframeKey>('1m');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayMode, setDisplayMode] = useState<'mcap' | 'price'>('mcap');
  const [currencyMode, setCurrencyMode] = useState<'usd' | 'sol'>('usd');

  // Get SOL price from oracle
  const { solPriceUsd } = usePriceOracle();
  const currentSolPrice = solPriceUsd || 230;

  // Real market cap from props or calculate from initial
  const realMarketCap = token.marketCapUsd || INITIAL_MC_USD;

  // Fetch trades from database
  const fetchTrades = useCallback(async () => {
    if (!token.mint) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_trades')
        .select('sol_amount, token_amount, block_time, trade_type, token_price_sol')
        .eq('token_mint', token.mint)
        .order('block_time', { ascending: true });

      if (error) throw error;
      setTrades(data || []);
    } catch (err) {
      console.error('Failed to fetch trades:', err);
    } finally {
      setLoading(false);
    }
  }, [token.mint]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  // Real-time subscription
  useEffect(() => {
    if (!token.mint) return;

    const channel = supabase
      .channel(`trades-chart-${token.mint}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_trades',
          filter: `token_mint=eq.${token.mint}`,
        },
        (payload) => {
          const newTrade = payload.new as Trade;
          setTrades(prev => [...prev, newTrade]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [token.mint]);

  // Aggregate trades into candles
  const aggregateToCandles = useCallback((trades: Trade[], intervalSeconds: number, solPrice: number) => {
    if (trades.length === 0) return [];

    const candles: Map<number, { open: number; high: number; low: number; close: number; volume: number }> = new Map();

    trades.forEach(trade => {
      const timestamp = Math.floor(new Date(trade.block_time).getTime() / 1000);
      const candleTime = Math.floor(timestamp / intervalSeconds) * intervalSeconds;

      const tokenPriceSol = parseFloat(trade.token_price_sol);
      const value = displayMode === 'mcap'
        ? priceToMarketCap(tokenPriceSol, currencyMode === 'usd' ? solPrice : 1)
        : tokenPriceSol * (currencyMode === 'usd' ? solPrice : 1);

      const volume = Number(trade.sol_amount) / 1e9;

      const existing = candles.get(candleTime);
      if (existing) {
        existing.high = Math.max(existing.high, value);
        existing.low = Math.min(existing.low, value);
        existing.close = value;
        existing.volume += volume;
      } else {
        candles.set(candleTime, {
          open: value,
          high: value,
          low: value,
          close: value,
          volume,
        });
      }
    });

    // Fill gaps
    const sortedTimes = Array.from(candles.keys()).sort((a, b) => a - b);
    if (sortedTimes.length > 1) {
      const minTime = sortedTimes[0];
      const maxTime = sortedTimes[sortedTimes.length - 1];
      let lastClose = candles.get(minTime)!.close;

      for (let t = minTime; t <= maxTime; t += intervalSeconds) {
        if (!candles.has(t)) {
          candles.set(t, { open: lastClose, high: lastClose, low: lastClose, close: lastClose, volume: 0 });
        } else {
          lastClose = candles.get(t)!.close;
        }
      }
    }

    return Array.from(candles.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([time, data]) => ({
        time: time as UTCTimestamp,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
      }));
  }, [displayMode, currencyMode]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0a' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      crosshair: {
        mode: 1,
        vertLine: { width: 1, color: '#6b7280', style: 2 },
        horzLine: { width: 1, color: '#6b7280', style: 2 },
      },
      rightPriceScale: {
        borderColor: '#1f2937',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: '#1f2937',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    // V4 API - addCandlestickSeries
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // V4 API - addHistogramSeries
    const volumeSeries = chart.addHistogramSeries({
      color: '#3b82f6',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    const tf = TIMEFRAMES.find(t => t.key === timeframe);
    if (!tf) return;

    const candles = aggregateToCandles(trades, tf.seconds, currentSolPrice);

    if (candles.length > 0) {
      candleSeriesRef.current.setData(candles);

      const volumeData = trades.reduce((acc, trade) => {
        const timestamp = Math.floor(new Date(trade.block_time).getTime() / 1000);
        const candleTime = Math.floor(timestamp / tf.seconds) * tf.seconds;
        const volume = Number(trade.sol_amount) / 1e9;
        const isBuy = trade.trade_type === 'buy';

        const existing = acc.find(v => v.time === candleTime);
        if (existing) {
          existing.value += volume;
        } else {
          acc.push({
            time: candleTime as UTCTimestamp,
            value: volume,
            color: isBuy ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
          });
        }
        return acc;
      }, [] as { time: UTCTimestamp; value: number; color: string }[]);

      volumeSeriesRef.current.setData(volumeData.sort((a, b) => a.time - b.time));
      chartRef.current?.timeScale().fitContent();
    }
  }, [trades, timeframe, aggregateToCandles, currentSolPrice]);

  // Stats calculations
  const currentTokenPrice = trades.length > 0 ? parseFloat(trades[trades.length - 1].token_price_sol) : 0;
  const currentMC = trades.length > 0 ? priceToMarketCap(currentTokenPrice, currentSolPrice) : realMarketCap;
  const athMC = trades.length > 0
    ? Math.max(...trades.map(t => priceToMarketCap(parseFloat(t.token_price_sol), currentSolPrice)), realMarketCap)
    : realMarketCap;
  const athProgress = athMC > 0 ? (currentMC / athMC) * 100 : 100;

  const firstTokenPrice = trades.length > 0 ? parseFloat(trades[0].token_price_sol) : 0;
  const firstMC = trades.length > 0 ? priceToMarketCap(firstTokenPrice, currentSolPrice) : realMarketCap;
  const priceChange = firstMC > 0 ? ((currentMC - firstMC) / firstMC) * 100 : 0;
  const priceChangeUsd = currentMC - firstMC;

  const totalVolumeSol = trades.reduce((sum, t) => sum + Number(t.sol_amount) / 1e9, 0);
  const totalVolumeUsd = totalVolumeSol * currentSolPrice;
  const pricePerTokenUsd = currentTokenPrice * currentSolPrice;

  const getChangeForPeriod = (seconds: number): number => {
    const cutoff = Date.now() - (seconds * 1000);
    const recentTrades = trades.filter(t => new Date(t.block_time).getTime() >= cutoff);
    if (recentTrades.length === 0 || trades.length === 0) return 0;
    const oldPrice = parseFloat(recentTrades[0].token_price_sol);
    return oldPrice > 0 ? ((currentTokenPrice - oldPrice) / oldPrice) * 100 : 0;
  };

  const change5m = getChangeForPeriod(300);
  const change1h = getChangeForPeriod(3600);
  const change6h = getChangeForPeriod(21600);

  return (
    <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Market Cap</div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-white">{formatMarketCap(currentMC)}</span>
              <span className={`text-sm font-medium ${priceChangeUsd >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {priceChangeUsd >= 0 ? '+' : ''}{formatMarketCap(Math.abs(priceChangeUsd))} ({priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%)
              </span>
              <span className="text-gray-500 text-sm">24hr</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-cyan-400 rounded-full"
                  style={{ width: `${Math.min(athProgress, 100)}%` }}
                />
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">ATH</div>
                <div className="text-sm font-bold text-white">{athMC > realMarketCap ? formatMarketCap(athMC) : 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 text-sm">
        <div className="flex items-center gap-4">
          {/* Timeframes */}
          <div className="flex items-center gap-1">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.key}
                onClick={() => setTimeframe(tf.key)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${timeframe === tf.key ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white'
                  }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-gray-700" />

          {/* Price/MCap Toggle */}
          <button
            onClick={() => setDisplayMode(displayMode === 'mcap' ? 'price' : 'mcap')}
            className="flex items-center gap-1 text-gray-400 hover:text-white"
          >
            <span className={displayMode === 'price' ? 'text-white' : ''}>Price</span>
            <span>/</span>
            <span className={displayMode === 'mcap' ? 'text-green-500' : ''}>MCap</span>
          </button>

          {/* USD/SOL Toggle */}
          <button
            onClick={() => setCurrencyMode(currencyMode === 'usd' ? 'sol' : 'usd')}
            className="flex items-center gap-1 text-gray-400 hover:text-white"
          >
            <span className={currencyMode === 'usd' ? 'text-green-500' : ''}>USD</span>
            <span>/</span>
            <span className={currencyMode === 'sol' ? 'text-white' : ''}>SOL</span>
          </button>
        </div>

        <div className="text-gray-500 text-xs">
          {token.symbol}/SOL Market Cap (USD) · 1 · Pump
        </div>
      </div>

      {/* Chart Info Bar */}
      <div className="px-4 py-1 border-b border-gray-800 flex items-center gap-4 text-xs">
        <span className="text-gray-500">Volume</span>
        <span className="text-green-400">{totalVolumeSol.toFixed(2)}</span>
      </div>

      {/* Chart */}
      <div className="relative h-80">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/80 z-10">
            <div className="text-gray-400">Loading chart data...</div>
          </div>
        )}
        {!loading && trades.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/80 z-10">
            <div className="text-center">
              <div className="text-6xl mb-4 opacity-30">👻</div>
              <div className="text-gray-400 text-lg">No data here</div>
            </div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-5 border-t border-gray-800">
        <div className="p-3 text-center border-r border-gray-800">
          <div className="text-xs text-gray-500 mb-1">Vol 24h</div>
          <div className="text-white font-medium">{formatMarketCap(totalVolumeUsd)}</div>
        </div>
        <div className="p-3 text-center border-r border-gray-800">
          <div className="text-xs text-gray-500 mb-1">Price</div>
          <div className="text-white font-medium">{formatPrice(pricePerTokenUsd)}</div>
        </div>
        <div className="p-3 text-center border-r border-gray-800">
          <div className="text-xs text-gray-500 mb-1">5m</div>
          <div className={`font-medium ${change5m >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {change5m >= 0 ? '+' : ''}{change5m.toFixed(2)}%
          </div>
        </div>
        <div className="p-3 text-center border-r border-gray-800">
          <div className="text-xs text-gray-500 mb-1">1h</div>
          <div className={`font-medium ${change1h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {change1h >= 0 ? '+' : ''}{change1h.toFixed(2)}%
          </div>
        </div>
        <div className="p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">6h</div>
          <div className={`font-medium ${change6h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {change6h >= 0 ? '+' : ''}{change6h.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
}