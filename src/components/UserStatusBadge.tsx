import React from 'react';

export interface UserStatusBadgeProps {
  isOnline: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showPulse?: boolean;
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

/**
 * Reusable real-time user presence status indicator badge
 * - Bright glowing Green Light with animated halo when user is Online
 * - Solid dark Red Light when user is Offline / Inactive / Away
 */
export const UserStatusBadge: React.FC<UserStatusBadgeProps> = ({
  isOnline,
  size = 'md',
  showPulse = true,
  className = '',
  showText = false,
  textClassName = '',
}) => {
  const dotSizes = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
    xl: 'w-4 h-4',
  };

  const pingSizes = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
    xl: 'w-4 h-4',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="relative flex items-center justify-center shrink-0">
        {isOnline ? (
          <>
            {/* Ambient Halo & Animated Ping */}
            {showPulse && (
              <span
                className={`animate-ping absolute inline-flex ${pingSizes[size]} rounded-full bg-emerald-400 opacity-80`}
              />
            )}
            {/* Bright Glowing Green Light with distinct shadow */}
            <span
              className={`relative inline-flex ${dotSizes[size]} rounded-full bg-emerald-500 border-2 border-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.95)] ring-1 ring-emerald-400/50`}
              title="Online (Active now)"
            />
          </>
        ) : (
          /* Solid Dark Red Light when offline */
          <span
            className={`relative inline-flex ${dotSizes[size]} rounded-full bg-rose-600 border-2 border-slate-950 shadow-[0_0_5px_rgba(225,29,72,0.6)] ring-1 ring-rose-700/40`}
            title="Offline (Away)"
          />
        )}
      </span>

      {showText && (
        <span
          className={`text-[10px] font-semibold tracking-tight ${
            isOnline ? 'text-emerald-400' : 'text-rose-400/90'
          } ${textClassName}`}
        >
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  );
};
