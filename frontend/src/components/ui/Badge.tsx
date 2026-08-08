import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: 'online' | 'offline' | 'locked' | 'unlocked' | 'pending' | 'used' | 'expired';
}

export const Badge: React.FC<BadgeProps> = ({ status = 'offline', className, children, ...props }) => {
  const baseStyles = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize";
  
  const statusStyles: Record<string, string> = {
    online: "bg-green-100 text-green-800",
    offline: "bg-slate-100 text-slate-800",
    locked: "bg-red-100 text-red-800",
    unlocked: "bg-blue-100 text-blue-800",
    pending: "bg-yellow-100 text-yellow-800",
    used: "bg-gray-100 text-gray-800",
    expired: "bg-red-50 text-red-600",
  };

  return (
    <span className={cn(baseStyles, statusStyles[status] || statusStyles.offline, className)} {...props}>
      {children || status}
    </span>
  );
};
