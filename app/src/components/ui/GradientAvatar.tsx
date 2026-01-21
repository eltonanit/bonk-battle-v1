'use client';

import { useState } from 'react';
import { getAvatarGradient } from '@/lib/generateGradientAvatar';

interface GradientAvatarProps {
  walletAddress: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
  showBorder?: boolean;
  borderColor?: string;
  onClick?: () => void;
  showOnlineIndicator?: boolean;
}

/**
 * Main GradientAvatar component with all options
 * Falls back to gradient if avatarUrl fails to load or is not provided
 */
export function GradientAvatar({
  walletAddress,
  avatarUrl,
  size = 40,
  className = '',
  showBorder = false,
  borderColor = 'border-white/20',
  onClick,
  showOnlineIndicator = false,
}: GradientAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const gradient = getAvatarGradient(walletAddress);

  const shouldShowImage = avatarUrl && !imageError;

  const baseStyles: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: '50%',
    background: shouldShowImage ? 'transparent' : gradient,
    overflow: 'hidden',
    position: 'relative',
  };

  return (
    <div
      className={`relative ${showBorder ? `border-2 ${borderColor}` : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={baseStyles}
      onClick={onClick}
    >
      {shouldShowImage && (
        <img
          src={avatarUrl}
          alt="Avatar"
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      )}
      {showOnlineIndicator && <OnlineIndicator size={size} />}
    </div>
  );
}

/**
 * Online indicator green dot
 */
export function OnlineIndicator({ size }: { size: number }) {
  const dotSize = Math.max(8, size * 0.25);
  return (
    <div
      className="absolute bg-green-500 rounded-full border-2 border-[#15161b]"
      style={{
        width: dotSize,
        height: dotSize,
        bottom: 0,
        right: 0,
      }}
    />
  );
}

/**
 * Small avatar (32px) for feeds, lists, activity items
 */
export function SmallGradientAvatar({
  walletAddress,
  avatarUrl,
  className = '',
  onClick,
}: {
  walletAddress: string;
  avatarUrl?: string | null;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <GradientAvatar
      walletAddress={walletAddress}
      avatarUrl={avatarUrl}
      size={32}
      className={className}
      onClick={onClick}
    />
  );
}

/**
 * Large avatar (80px) for profile pages
 */
export function LargeGradientAvatar({
  walletAddress,
  avatarUrl,
  className = '',
  showBorder = true,
  onClick,
}: {
  walletAddress: string;
  avatarUrl?: string | null;
  className?: string;
  showBorder?: boolean;
  onClick?: () => void;
}) {
  return (
    <GradientAvatar
      walletAddress={walletAddress}
      avatarUrl={avatarUrl}
      size={80}
      className={className}
      showBorder={showBorder}
      borderColor="border-white/30"
      onClick={onClick}
    />
  );
}

/**
 * Header avatar (36px) for navigation headers
 */
export function HeaderGradientAvatar({
  walletAddress,
  avatarUrl,
  className = '',
  onClick,
}: {
  walletAddress: string;
  avatarUrl?: string | null;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <GradientAvatar
      walletAddress={walletAddress}
      avatarUrl={avatarUrl}
      size={36}
      className={className}
      showBorder={true}
      borderColor="border-white/20"
      onClick={onClick}
    />
  );
}

/**
 * Extra small avatar (24px) for inline mentions, compact lists
 */
export function TinyGradientAvatar({
  walletAddress,
  avatarUrl,
  className = '',
}: {
  walletAddress: string;
  avatarUrl?: string | null;
  className?: string;
}) {
  return (
    <GradientAvatar
      walletAddress={walletAddress}
      avatarUrl={avatarUrl}
      size={24}
      className={className}
    />
  );
}
