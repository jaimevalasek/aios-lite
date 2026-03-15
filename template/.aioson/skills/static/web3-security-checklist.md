# Web3 Security Checklist

> Every vulnerability on this list has drained real funds. Check all of them before mainnet.

---

## Critical: Reentrancy

**What:** An external contract calls back into your contract before the first execution completes.

```solidity
// VULNERABLE
function withdraw() external {
    uint256 amount = balances[msg.sender];
    (bool success,) = msg.sender.call{value: amount}(""); // attacker re-enters here
    require(success);
    balances[msg.sender] = 0; // never reached in attack
}

// SAFE — CEI pattern + ReentrancyGuard
function withdraw() external nonReentrant {
    uint256 amount = balances[msg.sender];
    balances[msg.sender] = 0;                             // effect first
    (bool success,) = msg.sender.call{value: amount}(""); // interaction last
    require(success, "Transfer failed");
}
```

**Checklist:**
- [ ] All external calls come AFTER state changes (CEI pattern)
- [ ] `ReentrancyGuard` on all functions making external calls
- [ ] `nonReentrant` on withdraw, claim, and swap functions
- [ ] Cross-function reentrancy checked (function A → function B → reenter A)

---

## Critical: Access Control

**What:** Missing or bypassed authorization on privileged functions.

```solidity
// VULNERABLE — anyone can drain
function withdrawFees() external {
    payable(msg.sender).transfer(address(this).balance);
}

// SAFE
function withdrawFees() external onlyRole(TREASURY_ROLE) {
    payable(treasury).transfer(address(this).balance);
}
```

**Checklist:**
- [ ] Every state-changing function has explicit caller validation
- [ ] Admin functions use `AccessControl` roles, not `onlyOwner` alone
- [ ] Constructor sets roles explicitly — no open initialization window
- [ ] Role transfers require two-step confirmation (propose + accept)
- [ ] `renounceRole` / `transferOwnership` tested and working as expected

---

## Critical: Integer Overflow / Underflow

Pre-Solidity 0.8: integers wrap silently. Post-0.8: revert on overflow by default.

```solidity
// Post-0.8 — safe by default, but watch unchecked blocks
unchecked {
    // No overflow protection here — only use when you've proven safety
    total += amount;
}

// Safe arithmetic pattern for complex calculations
uint256 fee = Math.mulDiv(amount, feeBps, 10_000); // OpenZeppelin safe mulDiv

// Precision loss from division order
uint256 bad  = (amount / 100) * 3;  // loses decimals
uint256 good = (amount * 3) / 100;  // multiply first
```

**Checklist:**
- [ ] Solidity version ≥ 0.8.0 (overflow protection by default)
- [ ] All `unchecked` blocks justified with a comment explaining why it's safe
- [ ] Multiplication happens before division in all fee calculations
- [ ] No precision loss in basis-points calculations (use `mulDiv`)

---

## Critical: Oracle Manipulation

**What:** Price oracles can be manipulated, especially spot prices read in a single block.

```solidity
// VULNERABLE — spot price from AMM, manipulable via flash loan
function getPrice() external view returns (uint256) {
    return IUniswapV2Pair(pair).getReserves(); // single-block price
}

// SAFE — use time-weighted average price (TWAP)
function getPrice() external view returns (uint256) {
    return IUniswapV3Pool(pool).observe(twapInterval); // time-weighted
}

// ALSO SAFE — Chainlink oracle with staleness check
function getPrice() external view returns (uint256) {
    (, int256 price,, uint256 updatedAt,) = AggregatorV3Interface(feed).latestRoundData();
    require(block.timestamp - updatedAt < 3600, "Oracle: stale price");
    require(price > 0, "Oracle: invalid price");
    return uint256(price);
}
```

**Checklist:**
- [ ] No spot prices from AMMs used for liquidations, borrowing, or minting
- [ ] TWAP or Chainlink feeds for all price-sensitive logic
- [ ] Chainlink answers validated: `updatedAt`, `answeredInRound`, `price > 0`
- [ ] Circuit breaker for extreme price deviations (±X% from last round)

---

## Critical: Flash Loan Attacks

**What:** An attacker borrows a large amount, manipulates your protocol's state, and repays — all in one transaction.

```solidity
// Pattern: protect against flash loan price manipulation
modifier noFlashLoan() {
    require(tx.origin == msg.sender, "Flash loans not allowed");
    _;
}

// Better: use internal accounting, not external balances
// VULNERABLE — reads current balance (flash-loanable)
function getReserves() view returns (uint256) {
    return IERC20(token).balanceOf(address(this));
}

// SAFE — uses tracked internal accounting
mapping(address => uint256) private reserves;
function getReserves(address token) view returns (uint256) {
    return reserves[token]; // updated only after safe deposits
}
```

**Checklist:**
- [ ] State does not depend on `balanceOf` for protocol invariants
- [ ] Invariants checked before and after complex operations
- [ ] Slippage / deviation limits on swaps and liquidations
- [ ] Test with foundry `vm.deal` simulating flash loan amounts

---

## High: Front-Running

**What:** Miners or MEV bots see your pending transaction and insert their own first.

```solidity
// Vulnerable: deadline and slippage in swap
function swap(uint256 amountIn) external {
    // No deadline, no slippage — sandwich attack trivial
    uint256 out = pool.swap(amountIn);
}

// Protected: explicit slippage and deadline
function swap(
    uint256 amountIn,
    uint256 minAmountOut,
    uint256 deadline
) external {
    require(block.timestamp <= deadline, "Expired");
    uint256 out = pool.swap(amountIn);
    require(out >= minAmountOut, "Slippage too high");
}
```

**Checklist:**
- [ ] All user-facing swaps include `minAmountOut` and `deadline`
- [ ] Governance votes have timelocks (≥48h for critical changes)
- [ ] Commit-reveal scheme for any sensitive on-chain randomness
- [ ] Consider using Flashbots Protect RPC for sensitive deployments

---

## High: Signature Replay

**What:** A valid signed message is resubmitted to the same or a different contract.

```solidity
// VULNERABLE — no nonce, no chain ID
function execute(bytes32 hash, bytes calldata sig) external {
    address signer = ECDSA.recover(hash, sig);
    require(signer == admin);
    // attacker replays this on another chain or calls again
}

// SAFE — EIP-712 with nonce and chainId
function execute(
    address target,
    uint256 value,
    uint256 nonce,
    uint256 deadline,
    bytes calldata sig
) external {
    require(block.timestamp <= deadline, "Expired");
    require(nonces[msg.sender] == nonce, "Invalid nonce");

    bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
        EXECUTE_TYPEHASH, target, value, nonce, deadline
    )));

    require(ECDSA.recover(digest, sig) == admin, "Invalid signature");
    nonces[msg.sender]++;
    // execute...
}
```

**Checklist:**
- [ ] All permit/signature functions use EIP-712 typed data
- [ ] Nonce incremented on every use
- [ ] `chainId` included in the domain separator
- [ ] `deadline` on every signature
- [ ] Signatures cannot be reused across different contract addresses

---

## High: Logic Errors

**Checklist:**
- [ ] All invariants documented and tested (e.g., `totalSupply == sum of balances`)
- [ ] Edge cases: zero amounts, single user, max amounts, empty state
- [ ] Rounding direction favors the protocol, not the user (round down on user withdrawals)
- [ ] State transitions are complete and correct (no half-updated state on revert)

---

## Pre-Deployment Checklist

### Code review
- [ ] Static analysis: `slither .` — zero critical/high findings
- [ ] Fuzzing: Foundry `forge fuzz` on all state-changing functions
- [ ] Invariant tests: Foundry invariant testing for protocol-level invariants
- [ ] Fork testing: mainnet fork with realistic protocols (DeFi integrations)
- [ ] Independent audit (3rd party, not affiliated team)

### Deployment
- [ ] Compiler version pinned: `pragma solidity 0.8.24;` (not `^`)
- [ ] All constructor arguments verified correct
- [ ] Contract verified on Etherscan before calling any admin function
- [ ] Multisig wallet as owner/admin (≥3 of 5)
- [ ] Timelock on all parameter changes (≥24h, ≥48h for critical)
- [ ] Deployment addresses, block numbers, and ABI hashes recorded

### Operations
- [ ] Emergency pause mechanism tested on testnet
- [ ] Incident response plan documented (who to call, how to pause, how to communicate)
- [ ] Monitoring: alerts on unusual value flows, failed transactions, admin calls
- [ ] Upgrade strategy defined (proxy pattern) or explicitly immutable with documentation

---

## Testing requirements by severity

| Scenario | Test type | Coverage |
|---|---|---|
| Normal operations | Unit tests | 100% |
| Access control violations | Unit tests | Every protected function |
| Reentrancy attacks | Fork tests with attacker contract | All external-call functions |
| Oracle manipulation | Fork tests with large swaps | All price-dependent paths |
| Integer edge cases | Fuzz tests | All arithmetic functions |
| Protocol invariants | Invariant tests | Total supply, balances, fees |
| Flash loan attacks | Fork tests with vm.deal | All single-tx exploit vectors |

---

## Emergency response

If a vulnerability is found post-deployment:
1. Pause the contract immediately (if pause mechanism exists)
2. Assess: is there active exploitation? How much at risk?
3. Do NOT disclose publicly until a fix is ready or funds are rescued
4. Contact affected protocols/integrations privately
5. Prepare and test the fix in isolation
6. Coordinate with security researchers / auditors
7. Deploy fix with a clear timeline communicated to users
