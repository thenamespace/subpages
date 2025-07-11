import axios from "axios";
import { useEffect, useState } from "react";
import { Address } from "viem";
import { ENS_CLIENT } from "./ens/ens-client";
import { KnownTexts } from "./records/TextRecords";
import { KnownAddresses } from "./records/Addresses";
import { EnsRecords } from "./Types";

export interface GenericSubname {
  name: string;
  avatar: string;
  texts: Record<string, string>;
  addresses: Record<string, string>;
  expiry?: number;
  fetchRecords: boolean;
}

const fetchL2Subnames = async (
  owner: string,
  parentName: string
): Promise<GenericSubname[]> => {
  const { data } = await axios.get<{
    items: GenericSubname[];
    totalItems: number;
  }>(`https://indexer.namespace.ninja/api/v1/nodes`, {
    params: {
      owner,
      parentName: parentName,
    },
  });

  return data.items.map((item) => {
    return {
      avatar: item.texts["avatar"],
      name: item.name,
      addresses: item.addresses,
      expiry: item.expiry,
      texts: item.texts,
      fetchRecords: false,
    };
  });
};

const fetchL1Subnames = async (
  owner: string,
  parentName: string
): Promise<GenericSubname[]> => {
  const allSubs = await ENS_CLIENT.getNamesForAddress({
    filter: {
      searchType: "name",
      searchString: `${parentName}`,
    },
    address: owner as Address,
    pageSize: 25,
  });

  const subs: GenericSubname[] = [];
  allSubs
    .filter((sub) => sub.parentName === parentName)
    .filter((sub) => sub.name && sub.name.length > 0)
    .forEach((sub) => {
      subs.push({
        avatar: "",
        name: sub.name || "",
        addresses: {},
        expiry: sub.expiryDate?.value,
        texts: {},
        fetchRecords: true,
      });
    });

    const subnamesWithRecords: GenericSubname[] = [];
    for (const sub of subs) {
      const records = await fetchSubnameRecords(sub.name);
      subnamesWithRecords.push({...sub, ...records})
    }
    

  return subnamesWithRecords;
};

export const useSubnames = (
  parentName: string,
  owner: Address,
  subnameType: "L1" | "L2"
) => {
  const [state, setState] = useState<{
    isFetching: boolean;
    items: GenericSubname[];
    isL1Subnames: boolean;
  }>({
    isFetching: true,
    isL1Subnames: false,
    items: [],
  });

  useEffect(() => {
    const fetchFunc = subnameType === "L1" ? fetchL1Subnames : fetchL2Subnames;
    fetchFunc(owner, parentName)
      .then((res) => {
        setState({
          isFetching: false,
          isL1Subnames: subnameType === "L1",
          items: res,
        });
      })
      .catch((err) => {
        console.error(err)
        setState({
          isFetching: false,
          isL1Subnames: subnameType === "L1",
          items: [],
        });
      });
  }, [owner]);

  return state;
};

export const fetchSubnameRecords = async (
  subname: string
): Promise<EnsRecords> => {
  const textKeys = Object.keys(KnownTexts);
  const coins = Object.keys(KnownAddresses);

  const records = await ENS_CLIENT.getRecords({
    name: subname,
    coins: coins,
    texts: textKeys,
  });

  const resolvedAddresses: Record<string, string> = {};
  const resolvedTexts: Record<string, string> = {};

  if (records) {
    const { texts, coins } = records;
    if (coins) {
      coins.forEach((coin) => {
        resolvedAddresses[coin.id] = coin.value;
      });
    }
    if (texts) {
      texts.forEach((txt) => {
        resolvedTexts[txt.key] = txt.value;
      });
    }
  }

  return {
    addresses: resolvedAddresses,
    texts: resolvedTexts,
  };
};
