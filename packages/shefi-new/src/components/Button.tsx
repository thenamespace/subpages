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
  primary: 'border-brand-accent bg-brand-pinkBtn hover:bg-brand-pinkBg text-brand-dark shadow-sm hover:shadow-md hover:shadow-brand-accent/10 transition-all btn-shimmer',
  secondary: 'border-brand-lavender bg-brand-lavender/40 hover:bg-brand-lavender/60 text-brand-dark',
  outline: 'border-brand-accent bg-transparent hover:bg-brand-pinkBtn/30 text-brand-dark',
  ghost: 'border-transparent bg-transparent hover:bg-brand-pink/20 text-brand-dark',
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
