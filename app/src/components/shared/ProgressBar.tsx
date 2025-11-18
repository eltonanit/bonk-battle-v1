interface ProgressBarProps {
  progress: number;
  raised: number;
  target: number;
  className?: string;
}

export function ProgressBar({ progress, raised, target, className = '' }: ProgressBarProps) {
  const containerClass = "mt-3 " + className;
  const barWidth = Math.min(100, progress) + "%";

  return (
    <div className={containerClass}>
      <div className="flex items-baseline justify-between mb-2.5 w-full">
        <div className="text-2xl lg:text-2xl font-bold tracking-tight">
          {Math.round(progress)}%
        </div>
        <div className="text-sm text-white/50 font-medium">
          ${(raised * 100).toFixed(1)}K / ${(target * 100).toFixed(0)}K
        </div>
      </div>
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-700 ease-out"
          style={{ width: barWidth }}
        />
      </div>
    </div>
  );
}