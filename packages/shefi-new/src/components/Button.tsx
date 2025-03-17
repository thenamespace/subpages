'use client'

import { cn } from '@/lib/utils'

import { Spinner } from './Spinner'

type Props = {
  children: React.ReactNode
  loading?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export function Button({ children, className, loading, ...props }: Props) {
  return (
    <button
      className={cn([
        'border-brand-orange bg-brand-yellowBtn hover:bg-brand-yellowBg flex items-center justify-center gap-2 rounded-full border px-4 py-2 uppercase',
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
