'use client';

import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PriceChartProps {
  token: {
    solRaised: number;
    virtualSolInit: number;
    constantK: string;
    createdAt: number;
    name: string;
    symbol: string;
  };
}

export function PriceChart({ token }: PriceChartProps) {
  const chartData = useMemo(() => {
    const data = [];
    const now = Math.floor(Date.now() / 1000);
    const startTime = token.createdAt;
    const solRaised = token.solRaised;

    const points = 100;
    const timeStep = Math.max((now - startTime) / points, 60);

    for (let i = 0; i <= points; i++) {
      const time = startTime + (i * timeStep);
      const solAtTime = (solRaised / points) * i;
      const virtualSol = token.virtualSolInit + solAtTime;
      const price = calculateCurrentPrice(virtualSol, token.constantK);

      const date = new Date(time * 1000);
      const label = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      data.push({
        time: label,
        timestamp: time,
        price: price * 1e9,
        priceUSD: price * 100,
      });
    }

    return data;
  }, [token]);

  const currentPrice = calculateCurrentPrice(
    token.virtualSolInit + token.solRaised,
    token.constantK
  );

  const initialPrice = calculateCurrentPrice(
    token.virtualSolInit,
    token.constantK
  );

  const priceChange = ((currentPrice / initialPrice) - 1) * 100;
  const high = Math.max(...chartData.map(d => d.priceUSD));
  const low = Math.min(...chartData.map(d => d.priceUSD));

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 mb-6">
      {/* Header Stats */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-2xl font-bold">{token.symbol}/SOL</h3>
          <div className="text-xl font-bold text-white">
            ${(currentPrice * 100).toFixed(6)}
          </div>
          <div className={`px-3 py-1 rounded-lg text-sm font-bold ${priceChange >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded-lg bg-purple-600/20 text-purple-400 text-sm font-medium">
            ALL
          </button>
        </div>
      </div>

      {/* Mini Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6 text-sm">
        <div>
          <div className="text-gray-500 mb-1">Market Cap</div>
          <div className="font-bold">${((token.virtualSolInit + token.solRaised) * 100).toFixed(0)}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">High</div>
          <div className="font-bold text-green-400">${high.toFixed(6)}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">Low</div>
          <div className="font-bold text-red-400">${low.toFixed(6)}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">Volume</div>
          <div className="font-bold">{token.solRaised.toFixed(2)} SOL</div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={450}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
          <XAxis
            dataKey="time"
            stroke="#666"
            tick={{ fontSize: 11, fill: '#666' }}
            axisLine={{ stroke: '#333' }}
          />
          <YAxis
            stroke="#666"
            tick={{ fontSize: 11, fill: '#666' }}
            axisLine={{ stroke: '#333' }}
            tickFormatter={(value) => `$${value.toFixed(6)}`}
            domain={['dataMin * 0.99', 'dataMax * 1.01']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}
            labelStyle={{ color: '#999' }}
            itemStyle={{ color: '#10b981' }}
            formatter={(value: number | string) => {
              const numValue = typeof value === 'string' ? parseFloat(value) : value;
              return [`$${numValue.toFixed(6)}`, 'Price'];
            }}
          />
          <Area
            type="monotone"
            dataKey="priceUSD"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#colorPrice)"
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function calculateCurrentPrice(virtualSol: number, constantK: string): number {
  const k = BigInt(constantK);
  const x = BigInt(Math.floor(virtualSol * 1e9));
  const y = k / x;
  const price = Number(x) / Number(y);
  return price;
} 