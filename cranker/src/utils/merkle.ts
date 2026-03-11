import { createHash } from "crypto";

export interface MerkleLeaf {
  wallet: Buffer; // 32 bytes
  amount: bigint; // cumulative lamports
}

export interface MerkleTree {
  root: Buffer;
  leaves: MerkleLeaf[];
  layers: Buffer[][];
}

/** SHA-256 hash matching the on-chain helpers.rs implementation */
function sha256(data: Buffer): Buffer {
  return createHash("sha256").update(data).digest();
}

/** Compute leaf hash: sha256(wallet_32bytes || amount_le_8bytes) */
export function computeLeaf(wallet: Buffer, amount: bigint): Buffer {
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(amount);
  return sha256(Buffer.concat([wallet, amountBuf]));
}

/** Hash two nodes in sorted order (smaller first) — matches on-chain sorted-pair hashing */
function hashPair(a: Buffer, b: Buffer): Buffer {
  if (a.compare(b) <= 0) {
    return sha256(Buffer.concat([a, b]));
  }
  return sha256(Buffer.concat([b, a]));
}

/** Build a Merkle tree from leaves. Returns root and layers for proof extraction. */
export function buildMerkleTree(leaves: MerkleLeaf[]): MerkleTree {
  if (leaves.length === 0) {
    return {
      root: Buffer.alloc(32),
      leaves,
      layers: [],
    };
  }

  // Compute leaf hashes
  const leafHashes = leaves.map((l) => computeLeaf(l.wallet, l.amount));

  // Build tree bottom-up
  const layers: Buffer[][] = [leafHashes];
  let current = leafHashes;

  while (current.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < current.length; i += 2) {
      if (i + 1 < current.length) {
        next.push(hashPair(current[i], current[i + 1]));
      } else {
        // Odd node — promote without hashing
        next.push(current[i]);
      }
    }
    layers.push(next);
    current = next;
  }

  return {
    root: current[0],
    leaves,
    layers,
  };
}

/** Extract a Merkle proof for a specific leaf index */
export function getProof(tree: MerkleTree, leafIndex: number): Buffer[] {
  const proof: Buffer[] = [];
  let idx = leafIndex;

  for (let i = 0; i < tree.layers.length - 1; i++) {
    const layer = tree.layers[i];
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;

    if (siblingIdx < layer.length) {
      proof.push(layer[siblingIdx]);
    }

    idx = Math.floor(idx / 2);
  }

  return proof;
}

/** Verify a proof against a root (for testing) */
export function verifyProof(
  proof: Buffer[],
  root: Buffer,
  leaf: Buffer
): boolean {
  let computed = leaf;
  for (const node of proof) {
    computed = hashPair(computed, node);
  }
  return computed.equals(root);
}
