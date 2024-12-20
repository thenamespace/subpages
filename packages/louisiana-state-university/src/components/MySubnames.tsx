import axios, { all } from "axios";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Spinner } from "./Spinner";
import { PlainBtn } from "./TechBtn";
import Link from "next/link";
import { SideModal } from "./SideModal";
import { SingleSubname } from "./SingleSubname";
import { Subname } from "./Models";
import { useRouter } from "next/router";

const indexer = "https://indexer.namespace.tech/api/v1/nodes";

const fetchSubnames = async (owner: string) => {
  const { data } = await axios.get<{
    items: Subname[];
    totalItems: number;
  }>(`${indexer}`, {
    params: {
      owner,
      parentName: "lsu.eth",
    },
  });
  return data;
};

export const MySubnames = () => {
  const { address } = useAccount();
  const [selectedSubname, setSelectedSubname] = useState<Subname>();
  const router = useRouter();
  const [searchFilter, setSearchFilter] = useState("");
  const [subnames, setSubnames] = useState<{
    fetching: boolean;
    items: Subname[];
    totalItems: number;
  }>({
    fetching: true,
    items: [],
    totalItems: 0,
  });

  useEffect(() => {
    if (!address) {
      return;
    }

    fetchSubnames(address).then((res) => {
      setTimeout(() => {
        setSubnames({
          fetching: false,
          items: res.items,
          totalItems: res.totalItems,
        });
        const _selectedSubname = router.query.selected;
        if (_selectedSubname && _selectedSubname.length) {
          const currentSubname = res.items.find(sbnm => sbnm.name === _selectedSubname);
          if (currentSubname !== undefined) {
            setSelectedSubname(currentSubname)
          }
        }

      }, 0);
    });
  }, [address]);

  const refreshSubnames = async () => {
    fetchSubnames(address!!).then((res) => {
      setSubnames({
        fetching: false,
        items: res.items,
        totalItems: res.totalItems,
      });
    });
  };

  let sbnms: Subname[] = [];
  for (let i = 0; i < 10; i++) {
    sbnms = [...sbnms, ...subnames.items];
  }
  const filterApplied = searchFilter.length > 0;

  const allSubnames = useMemo(() => {
    return subnames.items.filter(i => {
      if (searchFilter.length === 0) {
        return true;
      }
      return i.name.includes(searchFilter.toLocaleLowerCase());;
    })    
  },[subnames, searchFilter])


  return (
    <div className="my-subnames-container d-flex flex-column justify-content-center align-items-center">
      {selectedSubname !== undefined && (
        <SideModal open={true} onClose={() => setSelectedSubname(undefined)}>
          <SingleSubname onUpdate={() => refreshSubnames()} subname={selectedSubname} />
        </SideModal>
      )}

      <div className="subname-nav row w-100">
        <div
          className="col-lg-12 title text-center mb-3 title-text"
        >
          Subnames
        </div>
        <div className="col-lg-6 p-0">
          <p>Total: {subnames.totalItems}</p>
        </div>
        <div className="col-lg-6 p-0 justify-content-end d-flex">
          <input
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Find your subnames"
            className="tech-input"
          ></input>
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
            {allSubnames.length === 0 && (
              <>
                {!filterApplied && <div
                  style={{ height: "100%" }}
                  className="d-flex flex-column align-items-center justify-content-center"
                >
                  <h5 className="mb-4">
                    You don't own any subname
                  </h5>
                  <Link href="/">
                    <PlainBtn>Register</PlainBtn>
                  </Link>
                </div>}
                {filterApplied && <div
                  style={{ height: "100%" }}
                  className="d-flex flex-column align-items-center justify-content-center"
                >
                  <h5 style={{ color: "white" }} className="mb-4">
                    No subnames with search criteria
                  </h5>
                  <PlainBtn onClick={() => setSearchFilter("")}>Clear</PlainBtn>
                </div>}
              </>
            )}
            {allSubnames.length > 0 && (
              <>
                {allSubnames
                  .filter((i) => {
                    if (searchFilter.length === 0) {
                      return true;
                    }

                    return i.name.includes(searchFilter.toLocaleLowerCase());
                  })
                  .map((subname, index) => (
                    <div
                      onClick={() => setSelectedSubname(subname)}
                      key={subname.name + "-" + index}
                      className="subname-item d-flex align-items-center"
                    >
                      <img src={subname.texts["avatar"]} className="avatar"></img>
                      <p className="txt">{subname.name}</p>
                    </div>
                  ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
