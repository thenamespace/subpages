import axios, { AxiosResponse } from "axios";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { PlainBtn } from "./TechBtn";
import Link from "next/link";
import { SideModal } from "./SideModal";
import { SingleSubname } from "./SingleSubname";
import { Subname } from "./Models";
import { useRouter } from "next/router";
import { LISTED_NAMES } from "./Listing";

const indexer = "https://indexer.namespace.ninja/api/v1/nodes";
const FALLBACK_AVATAR = "https://avatars.namespace.ninja/pizzadaoo.png";

interface IndexerResponse {
  items: Subname[];
  totalItems: number;
}

const fetchSubnames = async (owner: string) => {
  const requests: Promise<AxiosResponse<IndexerResponse>>[] = LISTED_NAMES.map(
    (name) =>
      axios.get<IndexerResponse>(indexer, {
        params: { owner, parentName: name.fullName },
      }),
  );

  const results = await Promise.all(requests);

  let totalItems = 0;
  let subnames: Subname[] = [];
  for (const res of results) {
    totalItems += res.data.totalItems;
    subnames = [...subnames, ...res.data.items];
  }

  return { totalItems, subnames };
};

interface SubnamesState {
  fetching: boolean;
  items: Subname[];
  totalItems: number;
}

const SubnameAvatar = ({ subname }: { subname: Subname }) => {
  const [src, setSrc] = useState(subname.texts?.["avatar"] || FALLBACK_AVATAR);
  return (
    <img
      src={src}
      className="avatar"
      alt={subname.name}
      width={48}
      height={48}
      loading="lazy"
      onError={() => {
        if (src !== FALLBACK_AVATAR) setSrc(FALLBACK_AVATAR);
      }}
    />
  );
};

export const MySubnames = () => {
  const { address } = useAccount();
  const [selectedSubname, setSelectedSubname] = useState<Subname>();
  const router = useRouter();
  const [searchFilter, setSearchFilter] = useState("");
  const [subnames, setSubnames] = useState<SubnamesState>({
    fetching: true,
    items: [],
    totalItems: 0,
  });
  // Name of the optimistically-inserted rename result still awaiting the
  // indexer. Drives the "syncing…" badge on that row.
  const [syncingName, setSyncingName] = useState<string | null>(null);

  const selectedQuery = router.query.selected;

  useEffect(() => {
    if (!address) {
      return;
    }

    let cancelled = false;

    fetchSubnames(address).then((res) => {
      if (cancelled) {
        return;
      }
      setSubnames({
        fetching: false,
        items: res.subnames,
        totalItems: res.totalItems,
      });

      const selectedName = Array.isArray(selectedQuery)
        ? selectedQuery[0]
        : selectedQuery;
      if (selectedName) {
        const current = res.subnames.find((s) => s.name === selectedName);
        if (current) {
          setSelectedSubname(current);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [address, selectedQuery]);

  // Optimistically reflect a successful rename before the indexer catches
  // up: prepend the new name (carrying over avatar/addresses/texts, which
  // the swap preserves on-chain) and drop the burned old one. Count is
  // unchanged — burn 1, mint 1. Marking it as a swap result also flips
  // `alreadySwapped` immediately, so the Rename action disappears at once.
  const applyOptimisticRename = (source: Subname, newName: string) => {
    setSubnames((prev) => ({
      fetching: false,
      totalItems: prev.totalItems,
      items: [
        {
          ...source,
          name: newName,
          label: newName.split(".")[0],
          mintSource: "pizzadaoo-swap",
        },
        ...prev.items.filter((s) => s.name !== source.name),
      ],
    }));
    setSyncingName(newName);
  };

  // Re-fetch the owner's subnames. When `expectedName` is given (after a
  // rename) the indexer may lag the on-chain mint by a few seconds, so we
  // poll until the new name shows up, then adopt the indexer's truth and
  // clear the syncing badge. If it never shows within the window, we keep
  // the optimistic row (the name IS on-chain) and just drop the badge —
  // reverting to stale indexer data would wrongly hide the rename.
  const refreshSubnames = async (expectedName?: string) => {
    if (!address) {
      return;
    }
    const maxAttempts = expectedName ? 8 : 1;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const res = await fetchSubnames(address);
      const found = !expectedName || res.subnames.some((s) => s.name === expectedName);
      if (found) {
        setSubnames({
          fetching: false,
          items: res.subnames,
          totalItems: res.totalItems,
        });
        setSyncingName(null);
        return;
      }
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    setSyncingName(null);
  };

  const filterApplied = searchFilter.length > 0;

  // The wallet has used its one sponsored swap if it owns any name produced
  // by the swap flow. Drives whether the Rename action is offered at all.
  const alreadySwapped = useMemo(
    () => subnames.items.some((i) => i.mintSource === "pizzadaoo-swap"),
    [subnames.items],
  );

  const visibleSubnames = useMemo(() => {
    if (searchFilter.length === 0) {
      return subnames.items;
    }
    const needle = searchFilter.toLocaleLowerCase();
    return subnames.items.filter((i) => i.name.includes(needle));
  }, [subnames, searchFilter]);

  return (
    <div className="my-subnames-container">
      {selectedSubname !== undefined && (
        <SideModal open={true} onClose={() => setSelectedSubname(undefined)}>
          <SingleSubname
            onUpdate={(renamedTo) => {
              if (renamedTo) {
                // The viewed name was burned and the new one minted. Reflect
                // it in the list immediately, then close the detail panel and
                // poll the indexer to reconcile.
                if (selectedSubname) {
                  applyOptimisticRename(selectedSubname, renamedTo);
                }
                setSelectedSubname(undefined);
              }
              void refreshSubnames(renamedTo);
            }}
            subname={selectedSubname}
            alreadySwapped={alreadySwapped}
          />
        </SideModal>
      )}

      <header className="subnames-header">
        <h1 className="subnames-title">Subnames</h1>
        <div className="subnames-meta">
          <span className="subnames-count">
            {subnames.totalItems}{" "}
            {subnames.totalItems === 1 ? "name" : "names"}
          </span>
          <input
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Find your subnames"
            className="tech-input subnames-search"
            aria-label="Search your subnames"
          />
        </div>
      </header>

      <div className="subnames-form">
        {subnames.fetching && (
          <div className="subnames-skeleton" aria-busy="true" aria-live="polite">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="skeleton-item" key={i}>
                <div className="skeleton-avatar" />
                <div className="skeleton-bar" />
              </div>
            ))}
          </div>
        )}

        {!subnames.fetching && visibleSubnames.length === 0 && (
          <div className="subnames-empty">
            {filterApplied ? (
              <>
                <h5>No subnames match “{searchFilter}”</h5>
                <PlainBtn onClick={() => setSearchFilter("")}>
                  Clear search
                </PlainBtn>
              </>
            ) : (
              <>
                <h5>You don&apos;t own any subname yet</h5>
                <Link href="/">
                  <PlainBtn>Register one</PlainBtn>
                </Link>
              </>
            )}
          </div>
        )}

        {!subnames.fetching && visibleSubnames.length > 0 && (
          <ul className="subnames-list">
            {visibleSubnames.map((subname) => (
              <li key={subname.name}>
                <button
                  type="button"
                  onClick={() => setSelectedSubname(subname)}
                  className="subname-item"
                >
                  <SubnameAvatar subname={subname} />
                  <span className="txt">{subname.name}</span>
                  {subname.name === syncingName && (
                    <span
                      className="subname-item__syncing"
                      role="status"
                      aria-live="polite"
                    >
                      <span
                        className="subname-item__syncing-dot"
                        aria-hidden="true"
                      />
                      syncing…
                    </span>
                  )}
                  <span className="subname-item__chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
