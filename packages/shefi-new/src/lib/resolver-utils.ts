import { getCoderByCoinType } from '@ensdomains/address-encoder';
import { encode } from '@ensdomains/content-hash';
import {
  getSupportedAddressByCoin,
  type EnsAddressRecord,
  type EnsContenthashRecord,
  type EnsRecords,
  type EnsRecordsDiff,
  type EnsTextRecord,
} from '@thenamespace/ens-components';
import { encodeFunctionData, namehash, parseAbi, toHex, type Hash } from 'viem';

export const SET_TEXT_FUNC =
  'function setText(bytes32 node, string key, string value)';
export const SET_ADDRESS_FUNC =
  'function setAddr(bytes32 node, uint256 coin, bytes value)';
export const SET_CONTENTHASH_FUNC =
  'function setContenthash(bytes32 node, bytes value)';
export const MULTICALL = 'function multicall(bytes[] data)';

export const ENS_RESOLVER_ABI = parseAbi([
  SET_TEXT_FUNC,
  SET_ADDRESS_FUNC,
  SET_CONTENTHASH_FUNC,
  MULTICALL,
]);

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const deepCopy = <T>(a: T): T => {
  return JSON.parse(JSON.stringify(a));
};

export const convertToResolverData = (
  full_name: string,
  records: EnsRecords
): Hash[] => {
  const node = namehash(full_name);
  const resolverMulticallData: Hash[] = [];

  records.texts
    .filter((text) => text.value.length > 0)
    .forEach((text) => {
      const data = encodeFunctionData({
        functionName: 'setText',
        abi: parseAbi([SET_TEXT_FUNC]),
        args: [node, text.key, text.value],
      });
      resolverMulticallData.push(data);
    });

  records.addresses.forEach((addr) => {
    const supportedAddress = getSupportedAddressByCoin(addr.coinType);

    if (!supportedAddress) {
      console.warn(`Unknown address provided: ${addr}`);
      return;
    }

    const isValid =
      addr.value.length > 0 && supportedAddress.validateFunc?.(addr.value);

    if (!isValid) {
      console.warn(`Invalid format provided for address: ${addr}`);
      return;
    }

    const coinEncoder = getCoderByCoinType(addr.coinType);
    if (!coinEncoder) {
      throw Error(
        `Coin type is not supported: ${addr.coinType}. Cannot get an encoder`
      );
    }
    const decode = coinEncoder.decode(addr.value);
    const hexValue = toHex(decode);
    const data = encodeFunctionData({
      functionName: 'setAddr',
      abi: parseAbi([SET_ADDRESS_FUNC]),
      args: [node, BigInt(addr.coinType), hexValue],
    });
    resolverMulticallData.push(data);
  });

  if (records.contenthash !== undefined) {
    try {
      const { protocol, value } = records.contenthash;
      const encodedValue = `0x${encode(protocol, value)}`;

      const data = encodeFunctionData({
        functionName: 'setContenthash',
        abi: parseAbi([SET_CONTENTHASH_FUNC]),
        args: [node, encodedValue as `0x${string}`],
      });
      resolverMulticallData.push(data);
    } catch (err) {
      console.warn('Error while adding contenthash', err);
    }
  }

  return resolverMulticallData;
};

export const convertRecordsDiffToResolverData = (
  name: string,
  recordsDiff: EnsRecordsDiff
): Hash[] => {
  const node = namehash(name);
  const resolverMulticallData: Hash[] = [];

  convertTextData(node, resolverMulticallData, recordsDiff);
  convertAddressData(node, resolverMulticallData, recordsDiff);
  convertContenthashData(node, resolverMulticallData, recordsDiff);
  return resolverMulticallData;
};

const convertTextData = (
  node: Hash,
  resolverData: Hash[],
  diff: EnsRecordsDiff
) => {
  const modifiedTexts: EnsTextRecord[] = [
    ...diff.textsAdded,
    ...diff.textsModified,
  ];
  modifiedTexts.forEach((text) => {
    const data = encodeFunctionData({
      functionName: 'setText',
      abi: parseAbi([SET_TEXT_FUNC]),
      args: [node, text.key, text.value],
    });
    resolverData.push(data);
  });

  diff.textsRemoved.forEach((text) => {
    const data = encodeFunctionData({
      functionName: 'setText',
      abi: parseAbi([SET_TEXT_FUNC]),
      args: [node, text.key, ''],
    });
    resolverData.push(data);
  });
};

const convertAddressData = (
  node: Hash,
  resolverData: Hash[],
  diff: EnsRecordsDiff
) => {
  const modifiedAddressMap: Record<string, EnsAddressRecord> = {};
  diff.addressesAdded.forEach((addr) => {
    modifiedAddressMap[addr.coinType] = addr;
  });
  diff.addressesModified.forEach((addr) => {
    modifiedAddressMap[addr.coinType] = addr;
  });
  const modifiedAddresses: EnsAddressRecord[] =
    Object.values(modifiedAddressMap);

  modifiedAddresses.forEach((addr) => {
    const coinEncoder = getCoderByCoinType(addr.coinType);
    if (!coinEncoder) {
      console.warn(
        `Coin type is not supported: ${addr.coinType}. Cannot get an encoder`
      );
      return;
    }
    const decode = coinEncoder.decode(addr.value);
    const hexValue = toHex(decode);
    const data = encodeFunctionData({
      functionName: 'setAddr',
      abi: parseAbi([SET_ADDRESS_FUNC]),
      args: [node, BigInt(addr.coinType), hexValue],
    });
    resolverData.push(data);
  });

  diff.addressesRemoved.forEach((addr) => {
    const data = encodeFunctionData({
      functionName: 'setAddr',
      abi: parseAbi([SET_ADDRESS_FUNC]),
      args: [node, BigInt(addr.coinType), '0x'],
    });
    resolverData.push(data);
  });
};

const convertContenthashData = (
  node: Hash,
  resolverData: Hash[],
  diff: EnsRecordsDiff
) => {
  if (diff.contenthashRemoved) {
    const data = encodeFunctionData({
      functionName: 'setContenthash',
      abi: parseAbi([SET_CONTENTHASH_FUNC]),
      args: [node, '0x'],
    });
    resolverData.push(data);
    return;
  }

  let contenthash: EnsContenthashRecord | undefined = undefined;
  if (diff.contenthashModified !== undefined) {
    contenthash = diff.contenthashModified;
  } else if (diff.contenthashAdded !== undefined) {
    contenthash = diff.contenthashAdded;
  }

  if (contenthash !== undefined) {
    const { protocol, value } = contenthash;
    const encodedValue = `0x${encode(protocol, value)}`;

    const data = encodeFunctionData({
      functionName: 'setContenthash',
      abi: parseAbi([SET_CONTENTHASH_FUNC]),
      args: [node, encodedValue as `0x${string}`],
    });
    resolverData.push(data);
  }
};
