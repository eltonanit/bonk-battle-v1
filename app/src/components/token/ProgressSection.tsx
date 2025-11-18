'use client';

interface ProgressSectionProps {
  token: {
    solRaised: number;
    targetSol: number;
    progress: number;
  };
}

export function ProgressSection({ token }: ProgressSectionProps) {
  // MOSTRA DATI REALI - NO FALLBACK
  const targetUSD = token.targetSol * 100;
  const raisedUSD = token.solRaised * 100;
  const remainingSOL = Math.max(0, token.targetSol - token.solRaised);
  const remainingUSD = remainingSOL * 100;
  
  // Warning se dati sembrano corrotti
  const seemsCorrupted = token.targetSol > 1_000_000 || token.solRaised > 100_000;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      {seemsCorrupted && (
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3 mb-4 text-sm">
          ⚠️ <strong>Warning:</strong> This token has corrupted data. 
          <a href="/create" className="underline ml-1">Create a new token</a>
        </div>
      )}
      
      <div className="text-center mb-4">
        <div className="text-sm text-gray-400 mb-1">TARGET</div>
        <div className="text-3xl font-bold text-green-400">
          ${targetUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {token.targetSol.toLocaleString('en-US', { maximumFractionDigits: 2 })} SOL
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-baseline mb-2">
          <div className="text-4xl font-bold">
            {token.progress.toFixed(4)}%
          </div>
          <div className="text-sm text-gray-400">
            {token.solRaised.toFixed(2)} / {token.targetSol.toLocaleString()} SOL
          </div>
        </div>
        
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
            style={{ width: `${Math.min(Math.max(token.progress, 0), 100)}%` }}
          />
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Raised:</span>
          <span className="font-bold">${raisedUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Remaining:</span>
          <span className="font-bold">${remainingUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
        </div>
      </div>
    </div>
  );
}
