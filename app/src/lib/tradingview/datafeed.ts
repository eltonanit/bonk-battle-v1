// src/lib/tradingview/datafeed.ts

// Type definitions for TradingView datafeed
interface TokenData {
    symbol: string;
    name: string;
    createdAt: number;
    solRaised: number;
    virtualSolInit: number;
    constantK: string;
}

interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface SymbolInfo {
    name: string;
    description: string;
    type: string;
    session: string;
    timezone: string;
    exchange: string;
    minmov: number;
    pricescale: number;
    has_intraday: boolean;
    has_no_volume: boolean;
    supported_resolutions: string[];
    volume_precision: number;
    data_status: string;
}

interface PeriodParams {
    from: number;
    to: number;
    firstDataRequest: boolean;
}

interface DatafeedConfiguration {
    supported_resolutions: string[];
    exchanges: Array<{ value: string; name: string; desc: string }>;
    symbols_types: Array<{ name: string; value: string }>;
}

export class BondingCurveDatafeed {
    private token: TokenData;
    private trades: Candle[] = [];

    constructor(token: TokenData) {
        this.token = token;
        this.generateHistoricalData();
    }

    private generateHistoricalData() {
        // Genera candele da eventi buy on-chain
        const now = Math.floor(Date.now() / 1000);
        const startTime = this.token.createdAt;
        const solRaised = this.token.solRaised;

        const candles = 100;
        const timeStep = Math.max((now - startTime) / candles, 60); // 1min minimum

        for (let i = 0; i < candles; i++) {
            const time = (startTime + (i * timeStep)) * 1000;
            const solAtTime = (solRaised / candles) * i;
            const virtualSol = this.token.virtualSolInit + solAtTime;
            const price = this.calculatePrice(virtualSol);

            // Simula variazione OHLC
            const variation = 0.001; // 0.1% variation
            const open = price * (1 + (Math.random() - 0.5) * variation);
            const high = Math.max(open, price) * (1 + Math.random() * variation);
            const low = Math.min(open, price) * (1 - Math.random() * variation);
            const close = price;
            const volume = (solRaised / candles) * (0.8 + Math.random() * 0.4);

            this.trades.push({
                time,
                open: open * 1e9, // lamports
                high: high * 1e9,
                low: low * 1e9,
                close: close * 1e9,
                volume,
            });
        }
    }

    private calculatePrice(virtualSol: number): number {
        const k = BigInt(this.token.constantK);
        const x = BigInt(Math.floor(virtualSol * 1e9));
        const y = k / x;
        return Number(x) / Number(y);
    }

    onReady(callback: (config: DatafeedConfiguration) => void) {
        setTimeout(() => callback({
            supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D'],
            exchanges: [{ value: 'STONKS', name: 'STONKS.FUN', desc: 'STONKS.FUN' }],
            symbols_types: [{ name: 'crypto', value: 'crypto' }],
        }), 0);
    }

    resolveSymbol(
        symbolName: string,
        onResolve: (symbolInfo: SymbolInfo) => void,
        onError: (error: string) => void
    ) {
        const symbolInfo: SymbolInfo = {
            name: `${this.token.symbol}/SOL`,
            description: this.token.name,
            type: 'crypto',
            session: '24x7',
            timezone: 'Etc/UTC',
            exchange: 'STONKS',
            minmov: 1,
            pricescale: 1000000000,
            has_intraday: true,
            has_no_volume: false,
            supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D'],
            volume_precision: 2,
            data_status: 'streaming',
        };
        setTimeout(() => onResolve(symbolInfo), 0);
    }

    getBars(
        symbolInfo: SymbolInfo,
        resolution: string,
        periodParams: PeriodParams,
        onResult: (bars: Candle[], meta: { noData: boolean }) => void,
        onError: (error: string) => void
    ) {
        const { from, to } = periodParams;

        const bars = this.trades
            .filter(trade => {
                const time = trade.time / 1000;
                return time >= from && time < to;
            })
            .map(trade => ({
                time: trade.time,
                open: trade.open,
                high: trade.high,
                low: trade.low,
                close: trade.close,
                volume: trade.volume,
            }));

        if (bars.length === 0) {
            onResult([], { noData: true });
        } else {
            onResult(bars, { noData: false });
        }
    }

    subscribeBars() {
        // Real-time updates (implement WebSocket here)
    }

    unsubscribeBars() {
        // Cleanup
    }
}