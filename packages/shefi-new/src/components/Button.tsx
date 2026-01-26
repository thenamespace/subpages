'use client'

import { cn } from '@/lib/utils'

import { Spinner } from './Spinner'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type Props = {
  children: React.ReactNode
  loading?: boolean
  variant?: ButtonVariant
  size?: ButtonSize
} & React.ButtonHTMLAttributes<HTMLButtonElement>

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border-brand-orange bg-brand-yellowBtn hover:bg-brand-yellowBg text-brand-dark',
  secondary: 'border-brand-pink bg-brand-pink/30 hover:bg-brand-pink/50 text-brand-dark',
  outline: 'border-brand-orange bg-transparent hover:bg-brand-yellowBtn/30 text-brand-dark',
  ghost: 'border-transparent bg-transparent hover:bg-brand-dark/5 text-brand-dark',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg',
};

export function Button({
  children,
  className,
  loading,
  variant = 'primary',
  size = 'md',
  ...props
}: Props) {
  return (
    <button
      className={cn([
        'flex items-center justify-center gap-2 rounded-full border font-medium uppercase transition-colors',
        variantClasses[variant],
        sizeClasses[size],
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      ])}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Spinner />}

      {children}
    </button>
  )
}
