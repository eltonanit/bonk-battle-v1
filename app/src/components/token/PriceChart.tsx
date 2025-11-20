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

  return (
    <div className="w-full h-96 bg-bonk-card rounded-xl p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="#666"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            orientation="right"
            stroke="#666"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value.toFixed(6)}`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#111', borderColor: '#333' }}
            itemStyle={{ color: '#fff' }}
            formatter={(value: number) => [`$${value.toFixed(9)}`, 'Price']}
          />
          <Area
            type="monotone"
            dataKey="priceUSD"
            stroke="#22c55e"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorPrice)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function calculateCurrentPrice(virtualSol: number, constantK: string): number {
  if (!constantK || constantK === '0') return 0;
  try {
    const k = BigInt(constantK);
    const x = BigInt(Math.floor(virtualSol * 1e9));
    if (x === 0n) return 0;
    const y = k / x;
    if (y === 0n) return 0;
    const price = Number(x) / Number(y);
    return price;
  } catch (e) {
    console.error('Error calculating price:', e);
    return 0;
  }
}