import { AppEnv } from "@/environment";
import axios from "axios";



const backendUrl = AppEnv.backendUrl

export const addReferral = async (code: string, subname: string, token: string, authToken: string) => {
    return await axios
    .post(`${backendUrl}/api/v1/referral/add-referral`, {
        code,
        subname,
        token: token
    }, {
        headers: { 
            Authorization: authToken,
        }
    }).then(res => res.data);
}



export const generateCode = async (authToken: string) => {
    return await axios
    .post(`${backendUrl}/api/v1/referral/generate-code`, {}, {
        headers: { 
            Authorization: authToken,
        }
    }).then(res => res.data);
}



export const isRenting = async (network: string, namehash: string) => {
    return await axios
    .get(`${backendUrl}/api/v1/l2-registry/is-renting/network/${network}/namehash/${namehash}`, {
    }).then(res => res.data);
}