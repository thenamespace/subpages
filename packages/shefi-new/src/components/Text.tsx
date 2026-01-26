'use client';

import { cn } from '@/lib/utils';

type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
type TextWeight = 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
type TextColor = 'dark' | 'light' | 'gray' | 'orange' | 'pink' | 'green' | 'red';

interface TextProps {
  children: React.ReactNode;
  size?: TextSize;
  weight?: TextWeight;
  color?: TextColor;
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label';
  className?: string;
}

const sizeClasses: Record<TextSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
  '5xl': 'text-5xl',
};

const weightClasses: Record<TextWeight, string> = {
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

const colorClasses: Record<TextColor, string> = {
  dark: 'text-brand-dark',
  light: 'text-brand-light',
  gray: 'text-brand-dark/60',
  orange: 'text-brand-orange',
  pink: 'text-brand-pink',
  green: 'text-green-600',
  red: 'text-red-500',
};

export function Text({
  children,
  size = 'base',
  weight = 'normal',
  color = 'dark',
  as: Component = 'p',
  className = '',
}: TextProps) {
  // Use seasons font for headings
  const isHeading = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(Component);
  const fontClass = isHeading ? 'font-seasons' : '';

  return (
    <Component
      className={cn(
        sizeClasses[size],
        weightClasses[weight],
        colorClasses[color],
        fontClass,
        className
      )}
    >
      {children}
    </Component>
  );
}
