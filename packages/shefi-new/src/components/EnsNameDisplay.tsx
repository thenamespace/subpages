'use client';

import { type ReactNode, useCallback, useMemo, useRef, Fragment } from 'react';
import { cn } from '@/lib/utils';
import { useEnsTruncation } from '@/hooks/useEnsTruncation';

type NameStyles = {
  dot?: string;
  label?: string;
  parent?: string;
  tld?: string;
  default?: string;
};

type EnsNameDisplayProps = {
  name: string;
  className?: string;
  styles?: NameStyles;
  buffer?: number;
  children?: ReactNode;
};

export const EnsNameDisplay = ({
  name,
  className,
  styles,
  buffer,
  children,
}: EnsNameDisplayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const spanRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const parts = useMemo(() => name.split('.'), [name]);

  const getPartType = useCallback(
    (index: number) => {
      const totalParts = parts.length;
      if (totalParts <= 1) return 'default';

      if (totalParts === 2) {
        if (index === 0) return 'label';
        return 'tld';
      }

      if (totalParts === 3) {
        if (index === 0) return 'label';
        if (index === 1) return 'parent';
        return 'tld';
      }

      if (index === 0) return 'label';
      if (index === 1) return 'parent';
      if (index === totalParts - 1) return 'tld';
      return 'default';
    },
    [parts],
  );

  const { allowedChars, middleTruncate } = useEnsTruncation(
    parts,
    containerRef,
    spanRefs,
    buffer,
  );

  return (
    <div
      className={cn(
        'flex w-full min-w-0 items-baseline overflow-hidden whitespace-nowrap',
        className,
      )}
      ref={containerRef}
      title={name}
    >
      {parts.map((part, index) => {
        const type = getPartType(index);
        const partClasses = styles?.[type] ?? styles?.default ?? '';
        const isLabel = index === 0;
        const isLast = index === parts.length - 1;

        // Only truncate the first segment (label); show parent + TLD (e.g. shefi.eth) in full.
        const textToShow =
          isLabel ? middleTruncate(part, allowedChars) : part;

        return (
          <Fragment key={index}>
            <span
              className={cn(partClasses, !isLabel ? 'shrink-0' : '')}
              ref={(el) => {
                spanRefs.current[index] = el;
              }}
            >
              {textToShow}
            </span>
            {!isLast && (
              <span className={cn('mx-[1px] shrink-0', styles?.dot)}>.</span>
            )}
          </Fragment>
        );
      })}
      {children}
    </div>
  );
};
