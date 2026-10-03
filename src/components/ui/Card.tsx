import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({ className, hoverable = true, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-neutral-100 rounded-xl overflow-hidden',
        hoverable && 'transition-all hover:shadow-premium hover:-translate-y-1',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
