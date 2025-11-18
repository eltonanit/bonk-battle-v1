import Link from 'next/link';
import Image from 'next/image';
import { ProgressBar } from './ProgressBar';
import { UpvoteButton } from '@/components/token/UpvoteButton';
import { TIER_CONFIGS } from '@/types';
import type { TokenLaunchExtended } from '@/types';

interface TokenCardProps {
  token: TokenLaunchExtended;
}

function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'ENDED';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return days + ' day' + (days > 1 ? 's' : '') + ' left';
  return hours + ' hour' + (hours > 1 ? 's' : '') + ' left';
}

export function TokenCard({ token }: TokenCardProps) {
  const tierConfig = TIER_CONFIGS[token.tier];

  return (
    <div className="relative block bg-white/5 backdrop-blur-[40px] border border-white/10 rounded-[20px] p-5 pb-10 hover:-translate-y-1 hover:bg-white/8 hover:border-white/20 hover:shadow-2xl transition-all duration-300 w-full overflow-hidden">            {/* ⭐ Upvote section - LEFT SIDE */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
        <UpvoteButton
          tokenMint={token.mintAddress}
          creatorAddress={token.creatorAddress}
        />
      </div>

      {/* Main content - CLICKABLE */}
      <Link href={'/token/' + token.mintAddress} className="block ml-16">
        <div className="flex gap-5 lg:gap-5">
          <div className="w-40 lg:w-[180px] h-40 lg:h-[180px] rounded-2xl flex items-center justify-center text-6xl lg:text-7xl shrink-0 relative overflow-hidden">
            {token.imageUrl ? (
              <Image src={token.imageUrl} alt={token.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, ' + tierConfig.color + ' 0%, ' + tierConfig.color + 'cc 100%)' }}>
                {token.emoji || '💎'}
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col justify-between min-h-[160px] lg:min-h-[180px] min-w-0 max-w-0 overflow-hidden">                        <div className="space-y-1">
              <h3 className="text-base lg:text-lg font-bold tracking-tight truncate overflow-hidden max-w-full break-words">{token.name}</h3>              <div className="flex items-center gap-1.5 text-[#fbbf24] text-[13px] font-semibold">⏰ {formatTimeRemaining(token.timeRemaining)}</div>
              <div className="text-sm lg:text-base font-bold">MC ${(token.marketCapUsd / 1000).toFixed(0)}K</div>
              <div className="inline-block px-4 py-2 rounded-[10px] text-[13px] lg:text-sm font-bold uppercase w-fit" style={{ background: tierConfig.color, color: token.tier === 4 ? '#000' : '#fff' }}>
                {tierConfig.label}
              </div>
            </div>
            <ProgressBar progress={token.progress} raised={Number(token.solRaised) / 1e9} target={tierConfig.targetSol} />
          </div>
        </div>
      </Link>
    </div>
  );
}