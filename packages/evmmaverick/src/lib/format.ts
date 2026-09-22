/** `0x1234…abcd` — short enough to fit, long enough to eyeball-verify. */
export function shortAddress(address: string, lead = 6, tail = 4) {
  if (address.length <= lead + tail + 1) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

/** Trims trailing zeros so `0.0100` reads as `0.01`. Returns "Free" at zero. */
export function formatEth(value: number) {
  if (value === 0) return "Free";
  const fixed = value.toFixed(5).replace(/0+$/, "").replace(/\.$/, "");
  return `${fixed} ETH`;
}
