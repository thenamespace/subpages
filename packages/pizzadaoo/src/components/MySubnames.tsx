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

  const refreshSubnames = async () => {
    if (!address) {
      return;
    }
    const res = await fetchSubnames(address);
    setSubnames({
      fetching: false,
      items: res.subnames,
      totalItems: res.totalItems,
    });
  };

  const filterApplied = searchFilter.length > 0;

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
            onUpdate={() => refreshSubnames()}
            subname={selectedSubname}
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
