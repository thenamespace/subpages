import { useLayoutEffect, useState } from 'react';

const middleTruncate = (str: string, maxLen: number) => {
  if (str.length <= maxLen) return str;
  const separator = '...';
  const sepLen = separator.length;
  if (maxLen <= sepLen) return str.substring(0, maxLen);

  const charsToShow = maxLen - sepLen;
  const front = Math.ceil(charsToShow / 2);
  const back = Math.floor(charsToShow / 2);

  return str.substring(0, front) + separator + str.substring(str.length - back);
};

export const useEnsTruncation = (
  parts: string[],
  containerRef: React.RefObject<HTMLElement | null>,
  spanRefs: React.RefObject<(HTMLElement | null)[]>,
  buffer = 4,
) => {
  const [allowedChars, setAllowedChars] = useState<number>(
    Number.POSITIVE_INFINITY,
  );

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const availableWidth = container.clientWidth;
      if (availableWidth === 0) return;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const getFontForPart = (index: number) => {
        const span = spanRefs.current[index];
        if (span) {
          const style = window.getComputedStyle(span);
          return `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        }
        const style = window.getComputedStyle(container);
        return `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      };

      // Reserve full width for everything except the first part (label).
      // Only the first segment is truncated; e.g. "myname.shefi.eth" → "my...e.shefi.eth" (shefi.eth always full).
      const containerStyle = window.getComputedStyle(container);
      ctx.font = `${containerStyle.fontWeight} ${containerStyle.fontSize} ${containerStyle.fontFamily}`;
      const dotWidth = ctx.measureText('.').width;
      let usedWidth = dotWidth * (parts.length - 1);

      for (let i = 1; i < parts.length; i++) {
        ctx.font = getFontForPart(i);
        usedWidth += ctx.measureText(parts[i]!).width;
      }

      const remainingBudget = availableWidth - usedWidth - buffer;
      const labelMaxLen = parts[0]!.length;

      const getLabelWidth = (k: number) => {
        ctx.font = getFontForPart(0);
        return ctx.measureText(middleTruncate(parts[0]!, k)).width;
      };

      if (getLabelWidth(labelMaxLen) <= remainingBudget) {
        setAllowedChars(Number.POSITIVE_INFINITY);
        return;
      }

      let low = 2;
      let high = labelMaxLen;
      let optimalK = low;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (getLabelWidth(mid) <= remainingBudget) {
          optimalK = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      setAllowedChars(optimalK);
    };

    const observer = new ResizeObserver(() => requestAnimationFrame(measure));
    observer.observe(container);
    measure();

    return () => observer.disconnect();
  }, [parts, containerRef, spanRefs, buffer]);

  return { allowedChars, middleTruncate };
};
