export function lamportsToSol(lamports: string): string {
  const n = Number(lamports);
  if (n === 0) return "0";
  return (n / 1e9).toFixed(4);
}

export function shortenAddress(addr: string, prefix = 4, suffix = 4): string {
  if (addr.length <= prefix + suffix + 3) return addr;
  return `${addr.slice(0, prefix)}...${addr.slice(-suffix)}`;
}
