"use client";

import { useEffect, useState } from "react";
import { PARENT_NAME } from "@/lib/config";
import { getListing, type ListingResult } from "@/lib/listing";
import { previewListing, type PreviewState } from "@/lib/preview";

export function useListing(preview: PreviewState | null) {
  const [live, setLive] = useState<ListingResult | null>(null);

  useEffect(() => {
    // Preview fixtures are derived below, so the effect has nothing to do.
    if (preview) return;

    let cancelled = false;
    void getListing(PARENT_NAME).then((r) => {
      if (!cancelled) setLive(r);
    });
    return () => {
      cancelled = true;
    };
  }, [preview]);

  // Computed during render rather than stored: the fixture is a pure function
  // of a prop, and pushing it through state costs an extra render pass.
  return preview ? previewListing(preview) : live;
}
