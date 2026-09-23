"use client";

/**
 * Client boundary for @thenamespace/ens-components.
 *
 * The published bundle carries no "use client" directives — they don't survive
 * its rollup build — so importing its hook-heavy components straight into an
 * App Router tree fails. Re-exporting them from a file that does carry the
 * directive draws the boundary explicitly.
 *
 * The stylesheet is imported here rather than in the root layout so it loads
 * only on routes that actually render these components. Our token overrides
 * come after it, and both are scoped by `.ens-scope`.
 */

import "@thenamespace/ens-components/styles.css";
import "@/app/ens-theme.css";

export { SelectRecordsForm, EnsRecordsForm } from "@thenamespace/ens-components";
export type { EnsRecords } from "@thenamespace/ens-components";
