use solana_sha256_hasher::hashv;

/// Compute leaf hash: sha256(wallet_pubkey_32bytes || cumulative_amount_le_8bytes)
pub fn compute_leaf(wallet: &[u8; 32], amount: u64) -> [u8; 32] {
    hashv(&[wallet.as_ref(), &amount.to_le_bytes()]).to_bytes()
}

/// Verify a Merkle proof using sorted-pair hashing (OpenZeppelin/SPL standard).
pub fn verify_proof(proof: &[[u8; 32]], root: [u8; 32], leaf: [u8; 32]) -> bool {
    let mut computed = leaf;
    for node in proof {
        computed = hash_pair(&computed, node);
    }
    computed == root
}

/// Hash two nodes in sorted order (smaller first) to ensure deterministic tree.
fn hash_pair(a: &[u8; 32], b: &[u8; 32]) -> [u8; 32] {
    if a <= b {
        hashv(&[a.as_ref(), b.as_ref()]).to_bytes()
    } else {
        hashv(&[b.as_ref(), a.as_ref()]).to_bytes()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_verify_single_leaf() {
        let wallet = [1u8; 32];
        let amount = 1_000_000u64;
        let leaf = compute_leaf(&wallet, amount);
        assert!(verify_proof(&[], leaf, leaf));
    }

    #[test]
    fn test_verify_two_leaf_tree() {
        let wallet_a = [1u8; 32];
        let wallet_b = [2u8; 32];
        let leaf_a = compute_leaf(&wallet_a, 1_000_000);
        let leaf_b = compute_leaf(&wallet_b, 2_000_000);
        let root = hash_pair(&leaf_a, &leaf_b);

        assert!(verify_proof(&[leaf_b], root, leaf_a));
        assert!(verify_proof(&[leaf_a], root, leaf_b));
    }

    #[test]
    fn test_invalid_proof_fails() {
        let wallet = [1u8; 32];
        let leaf = compute_leaf(&wallet, 1_000_000);
        let fake_root = [0u8; 32];
        assert!(!verify_proof(&[], fake_root, leaf));
    }
}
