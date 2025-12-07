'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, CandlestickData, Time, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { supabase } from '@/lib/supabase';

interface PriceChartProps {
  token: {
    mint?: string;
    solRaised: number;
    virtualSolInit: number;
    constantK: string;
    createdAt: number;
    name: string;
    symbol: string;
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

export function PriceChart({ token }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candleSeriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const volumeSeriesRef = useRef<any>(null);

  const [timeframe, setTimeframe] = useState<TimeframeKey>('1m');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch trades from database
  const fetchTrades = useCallback(async () => {
    if (!token.mint) return;

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

  // Initial fetch
  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!token.mint) return;

    const channel = supabase
      .channel(`trades-${token.mint}`)
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
  const aggregateToCandles = useCallback((trades: Trade[], intervalSeconds: number): CandlestickData[] => {
    if (trades.length === 0) return [];

    const candles: Map<number, { open: number; high: number; low: number; close: number; volume: number }> = new Map();

    trades.forEach(trade => {
      const timestamp = Math.floor(new Date(trade.block_time).getTime() / 1000);
      const candleTime = Math.floor(timestamp / intervalSeconds) * intervalSeconds;
      const price = parseFloat(trade.token_price_sol) * 1e9; // Convert to readable format
      const volume = Number(trade.sol_amount) / 1e9;

      const existing = candles.get(candleTime);
      if (existing) {
        existing.high = Math.max(existing.high, price);
        existing.low = Math.min(existing.low, price);
        existing.close = price;
        existing.volume += volume;
      } else {
        candles.set(candleTime, {
          open: price,
          high: price,
          low: price,
          close: price,
          volume,
        });
      }
    });

    // Fill gaps with previous close
    const sortedTimes = Array.from(candles.keys()).sort((a, b) => a - b);
    if (sortedTimes.length > 1) {
      const minTime = sortedTimes[0];
      const maxTime = sortedTimes[sortedTimes.length - 1];
      let lastClose = candles.get(minTime)!.close;

      for (let t = minTime; t <= maxTime; t += intervalSeconds) {
        if (!candles.has(t)) {
          candles.set(t, {
            open: lastClose,
            high: lastClose,
            low: lastClose,
            close: lastClose,
            volume: 0,
          });
        } else {
          lastClose = candles.get(t)!.close;
        }
      }
    }

    return Array.from(candles.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([time, data]) => ({
        time: time as Time,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
      }));
  }, []);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0a0a0a' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: '#6b7280',
          style: 2,
        },
        horzLine: {
          width: 1,
          color: '#6b7280',
          style: 2,
        },
      },
      rightPriceScale: {
        borderColor: '#1f2937',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: '#1f2937',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        vertTouchDrag: false,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#3b82f6',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Handle resize
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

  // Update chart data when trades or timeframe changes
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    const tf = TIMEFRAMES.find(t => t.key === timeframe);
    if (!tf) return;

    const candles = aggregateToCandles(trades, tf.seconds);

    if (candles.length > 0) {
      candleSeriesRef.current.setData(candles);

      // Volume data
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
            time: candleTime as Time,
            value: volume,
            color: isBuy ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
          });
        }
        return acc;
      }, [] as { time: Time; value: number; color: string }[]);

      volumeSeriesRef.current.setData(volumeData.sort((a, b) => (a.time as number) - (b.time as number)));

      // Fit content
      chartRef.current?.timeScale().fitContent();
    }
  }, [trades, timeframe, aggregateToCandles]);

  // Calculate current stats
  const currentPrice = trades.length > 0
    ? parseFloat(trades[trades.length - 1].token_price_sol) * 1e9
    : 0;

  const firstPrice = trades.length > 0
    ? parseFloat(trades[0].token_price_sol) * 1e9
    : 0;

  const priceChange = firstPrice > 0
    ? ((currentPrice - firstPrice) / firstPrice) * 100
    : 0;

  const totalVolume = trades.reduce((sum, t) => sum + Number(t.sol_amount) / 1e9, 0);

  return (
    <div className="bg-bonk-card border border-bonk-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-bonk-border">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-2xl font-bold">{currentPrice.toFixed(6)}</span>
            <span className="text-gray-400 text-sm ml-2">SOL</span>
          </div>
          <span className={`text-sm font-medium ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
          </span>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 bg-bonk-dark rounded-lg p-1">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.key}
              onClick={() => setTimeframe(tf.key)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${timeframe === tf.key
                  ? 'bg-bonk-green text-black'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 px-4 py-2 border-b border-bonk-border text-sm">
        <div>
          <span className="text-gray-500">24h Vol: </span>
          <span className="text-white font-medium">{totalVolume.toFixed(2)} SOL</span>
        </div>
        <div>
          <span className="text-gray-500">Trades: </span>
          <span className="text-white font-medium">{trades.length}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-96">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-bonk-dark/80 z-10">
            <div className="text-gray-400">Loading chart data...</div>
          </div>
        )}
        {!loading && trades.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-bonk-dark/80 z-10">
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <div className="text-gray-400">No trades yet</div>
              <div className="text-gray-500 text-sm">Be the first to trade!</div>
            </div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
}