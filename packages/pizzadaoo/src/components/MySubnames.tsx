import axios, { AxiosResponse } from "axios";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Spinner } from "./Spinner";
import { PlainBtn } from "./TechBtn";
import Link from "next/link";
import { SideModal } from "./SideModal";
import { SingleSubname } from "./SingleSubname";
import { Subname } from "./Models";
import { useRouter } from "next/router";
import { LISTED_NAMES } from "./Listing";

const indexer = "https://indexer.namespace.ninja/api/v1/nodes";

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
    <div className="my-subnames-container d-flex flex-column justify-content-center align-items-center">
      {selectedSubname !== undefined && (
        <SideModal open={true} onClose={() => setSelectedSubname(undefined)}>
          <SingleSubname
            onUpdate={() => refreshSubnames()}
            subname={selectedSubname}
          />
        </SideModal>
      )}

      <div className="subname-nav row w-100 mb-3">
        <div className="col-lg-12 title text-center mb-3 title-text">
          Subnames
        </div>
        <div className="col-lg-6 p-0 d-flex align-items-center">
          <p style={{ fontSize: 25 }}>Total: {subnames.totalItems}</p>
        </div>
        <div className="col-lg-6 p-0 justify-content-end d-flex">
          <input
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Find your subnames"
            className="tech-input"
          />
        </div>
      </div>
      <div className="subnames-form">
        {subnames.fetching && (
          <div
            style={{ height: "100%" }}
            className="d-flex flex-column align-items-center justify-content-center"
          >
            <div style={{ width: 25 }}>
              <Spinner size="big" />
            </div>
          </div>
        )}

        {!subnames.fetching && (
          <>
            {visibleSubnames.length === 0 && (
              <>
                {!filterApplied && (
                  <div
                    style={{ height: "100%" }}
                    className="d-flex flex-column align-items-center justify-content-center"
                  >
                    <h5 className="mb-4">You don&apos;t own any subname</h5>
                    <Link href="/">
                      <PlainBtn>Register</PlainBtn>
                    </Link>
                  </div>
                )}
                {filterApplied && (
                  <div
                    style={{ height: "100%" }}
                    className="d-flex flex-column align-items-center justify-content-center"
                  >
                    <h5 style={{ color: "white" }} className="mb-4">
                      No subnames with search criteria
                    </h5>
                    <PlainBtn onClick={() => setSearchFilter("")}>
                      Clear
                    </PlainBtn>
                  </div>
                )}
              </>
            )}
            {visibleSubnames.length > 0 &&
              visibleSubnames.map((subname) => (
                <button
                  type="button"
                  onClick={() => setSelectedSubname(subname)}
                  key={subname.name}
                  className="subname-item d-flex align-items-center"
                >
                  <img
                    src={subname.texts["avatar"]}
                    className="avatar"
                    alt={subname.name}
                  />
                  <p className="txt">{subname.name}</p>
                </button>
              ))}
          </>
        )}
      </div>
    </div>
  );
};
