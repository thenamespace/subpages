/** Shorten a raw 0x address: 0x1234…abcd. Only for hex addresses, never names. */
export const shortenAddress = (address: string): string =>
  address.length <= 12
    ? address
    : `${address.slice(0, 6)}…${address.slice(-4)}`;

/**
 * ENS names are shown in full by default so the left-most label (the user's
 * own subname) is always visible. Only as a last-resort layout guard for
 * extremely long names do we abbreviate — and even then we keep the leaf
 * label and the TLD, abbreviating the *parent* in the middle.
 */
export const formatEnsName = (name: string, maxLength = 36): string => {
  if (name.length <= maxLength) return name;

  const labels = name.split(".");
  // "verylongsinglename.eth" – nothing safe to drop, keep it intact.
  if (labels.length <= 2) return name;

  const leaf = labels[0];
  const tld = labels[labels.length - 1];
  return `${leaf}.…${tld}`;
};
