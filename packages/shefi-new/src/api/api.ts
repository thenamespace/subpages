"use client";

import axios from "axios";

export const addReferral = async (code: string, subname: string) => {
  return await axios
    .post(`https://api.namespace.tech/api/v1/referral/add-referral`, {
      code,
      subname,
    })
    .then((res) => res.data);
};

export const generateCode = async (authToken: string) => {
  return await axios
    .post(
      `https://api.namespace.tech/api/v1/referral/generate-code`,
      {},
      {
        headers: {
          Authorization: authToken,
        },
      }
    )
    .then((res) => res.data);
};

export const isRenting = async (network: string, namehash: string) => {
  return await axios
    .get(
      `https://api.namespace.tech/api/v1/l2-registry/is-renting/network/${network}/namehash/${namehash}`,
      {}
    )
    .then((res) => res.data);
};
