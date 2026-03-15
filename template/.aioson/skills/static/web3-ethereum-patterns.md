# Web3 Ethereum Patterns

> Solidity, Hardhat/Foundry, and frontend integration. Security first, gas second.

---

## Project structure (Hardhat monorepo)

```
contracts/
  core/
    Protocol.sol         ← main contract
    interfaces/
      IProtocol.sol      ← interface first, implementation second
  tokens/
    MyToken.sol          ← ERC-20/721/1155
  utils/
    Math.sol
    Pausable.sol
  mocks/
    MockToken.sol        ← test doubles only, never in production
scripts/
  deploy/
    01_deploy_token.ts
    02_deploy_protocol.ts
  verify.ts              ← Etherscan verification
test/
  Protocol.test.ts
  integration/
    fork.test.ts         ← mainnet fork tests
hardhat.config.ts
```

---

## Security patterns — always apply

### 1. Reentrancy guard (any function that sends ETH or calls external contracts)

```solidity
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Marketplace is ReentrancyGuard {
    // WRONG — state change after external call
    function withdraw() external {
        uint256 amount = balances[msg.sender];
        payable(msg.sender).transfer(amount); // external call first = reentrancy vector
        balances[msg.sender] = 0;             // state change after = too late
    }

    // RIGHT — CEI pattern (Checks → Effects → Interactions)
    function withdraw() external nonReentrant {
        uint256 amount = balances[msg.sender];  // Check
        balances[msg.sender] = 0;               // Effect (state change BEFORE external call)
        payable(msg.sender).transfer(amount);   // Interaction (external call LAST)
    }
}
```

### 2. Pull over push for payments

```solidity
// WRONG — push: sending ETH to multiple addresses in a loop
function distributeRewards(address[] calldata recipients, uint256[] calldata amounts) external {
    for (uint i = 0; i < recipients.length; i++) {
        payable(recipients[i]).transfer(amounts[i]);  // one revert blocks all
    }
}

// RIGHT — pull: let recipients withdraw their own funds
mapping(address => uint256) public pendingWithdrawals;

function claimReward() external nonReentrant {
    uint256 amount = pendingWithdrawals[msg.sender];
    require(amount > 0, "Nothing to claim");
    pendingWithdrawals[msg.sender] = 0;
    (bool success, ) = payable(msg.sender).call{ value: amount }("");
    require(success, "Transfer failed");
}
```

### 3. Access control

```solidity
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Protocol is AccessControl {
    bytes32 public constant ADMIN_ROLE   = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    function pause() external onlyRole(ADMIN_ROLE) { ... }
    function setFee(uint256 fee) external onlyRole(OPERATOR_ROLE) { ... }
}
```

### 4. Integer arithmetic — use 18-decimal fixed point

```solidity
// WRONG — division before multiplication loses precision
uint256 fee = (amount / 100) * 3;      // loses precision if amount < 100

// RIGHT — multiply first, divide last
uint256 FEE_BPS = 300;  // 3% in basis points
uint256 fee = (amount * FEE_BPS) / 10_000;

// Use constants for magic numbers
uint256 public constant MAX_FEE_BPS = 1_000;  // 10% max
uint256 public constant PRECISION    = 1e18;
```

### 5. Emit events for all state changes

```solidity
event Deposited(address indexed user, uint256 amount, uint256 timestamp);
event Withdrawn(address indexed user, uint256 amount);
event FeeUpdated(uint256 oldFee, uint256 newFee, address updatedBy);

function deposit() external payable {
    require(msg.value > 0, "Amount must be positive");
    balances[msg.sender] += msg.value;
    emit Deposited(msg.sender, msg.value, block.timestamp);
}
```

---

## Gas optimization

```solidity
// Pack struct fields to use fewer storage slots (32 bytes each)
// WRONG — 3 slots
struct BadPacking {
    uint256 amount;    // slot 0
    address owner;     // slot 1 (20 bytes, wastes 12)
    uint256 timestamp; // slot 2
}

// RIGHT — 2 slots
struct GoodPacking {
    uint256 amount;    // slot 0
    address owner;     // slot 1 (20 bytes)
    uint96 timestamp;  // slot 1 (12 bytes — fits in same slot as owner)
}

// Use calldata instead of memory for read-only external function params
function processItems(uint256[] calldata items) external view returns (uint256) { ... }

// Cache storage reads in local variables (SLOAD costs 100+ gas)
function calculate() external view returns (uint256) {
    uint256 _balance = balance;  // one SLOAD
    return _balance * _balance;  // two local reads, not two SLOADs
}

// Use custom errors instead of string revert (saves gas)
error InsufficientBalance(uint256 available, uint256 required);

function withdraw(uint256 amount) external {
    if (balances[msg.sender] < amount) {
        revert InsufficientBalance(balances[msg.sender], amount);
    }
    // ...
}
```

---

## Hardhat testing

```ts
import { ethers } from 'hardhat';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const Protocol = await ethers.getContractFactory('Protocol');
    const protocol = await Protocol.deploy(owner.address);
    return { protocol, owner, alice, bob };
}

describe('Protocol', () => {
    it('allows deposits and tracks balances', async () => {
        const { protocol, alice } = await loadFixture(deployFixture);
        const amount = ethers.parseEther('1.0');

        await protocol.connect(alice).deposit({ value: amount });
        expect(await protocol.balances(alice.address)).to.equal(amount);
    });

    it('prevents reentrancy on withdraw', async () => {
        const { protocol, alice } = await loadFixture(deployFixture);
        const MaliciousContract = await ethers.getContractFactory('MockReentrant');
        const attacker = await MaliciousContract.deploy(await protocol.getAddress());

        await protocol.connect(alice).deposit({ value: ethers.parseEther('1') });
        await expect(attacker.attack()).to.be.revertedWith('ReentrancyGuard: reentrant call');
    });

    it('emits Deposited event', async () => {
        const { protocol, alice } = await loadFixture(deployFixture);
        const amount = ethers.parseEther('0.5');

        await expect(protocol.connect(alice).deposit({ value: amount }))
            .to.emit(protocol, 'Deposited')
            .withArgs(alice.address, amount, anyValue);
    });
});
```

---

## Frontend integration (wagmi v2)

```ts
// lib/contracts.ts — ABI and address registry
export const PROTOCOL_ADDRESS = process.env.NEXT_PUBLIC_PROTOCOL_ADDRESS as `0x${string}`;
export { abi as PROTOCOL_ABI } from './abis/Protocol.json';

// Read contract data
import { useReadContract } from 'wagmi';

function UserBalance({ address }: { address: `0x${string}` }) {
    const { data: balance, isLoading } = useReadContract({
        address: PROTOCOL_ADDRESS,
        abi: PROTOCOL_ABI,
        functionName: 'balances',
        args: [address],
    });

    if (isLoading) return <Skeleton />;
    return <p>{formatEther(balance ?? 0n)} ETH</p>;
}

// Write contract
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';

function DepositButton() {
    const { writeContract, data: hash, isPending } = useWriteContract();
    const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

    return (
        <button
            disabled={isPending || isConfirming}
            onClick={() => writeContract({
                address: PROTOCOL_ADDRESS,
                abi: PROTOCOL_ABI,
                functionName: 'deposit',
                value: parseEther('0.1'),
            })}
        >
            {isPending ? 'Waiting for wallet...' : isConfirming ? 'Confirming...' : 'Deposit 0.1 ETH'}
        </button>
    );
}
```

---

## Deployment scripts

```ts
// scripts/deploy/01_deploy_protocol.ts
import { ethers, run } from 'hardhat';

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying with: ${deployer.address}`);
    console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);

    const Protocol = await ethers.getContractFactory('Protocol');
    const protocol = await Protocol.deploy(deployer.address);
    await protocol.waitForDeployment();

    const address = await protocol.getAddress();
    console.log(`Protocol deployed to: ${address}`);

    // Verify on Etherscan
    if (process.env.ETHERSCAN_API_KEY) {
        await new Promise(r => setTimeout(r, 30_000)); // wait for indexing
        await run('verify:verify', { address, constructorArguments: [deployer.address] });
    }
}

main().catch((err) => { console.error(err); process.exit(1); });
```

---

## ALWAYS
- CEI pattern (Checks → Effects → Interactions) in every state-changing function
- `ReentrancyGuard` on functions that send ETH or call external contracts
- Pull pattern for ETH payments
- `AccessControl` for role-based permissions
- Custom errors over string reverts
- `loadFixture` in tests for consistent state
- Emit events for every important state change

## NEVER
- `transfer()` or `send()` in public functions (use `.call{value: ...}("")`)
- Division before multiplication (precision loss)
- Unbounded loops that could hit block gas limit
- `block.timestamp` for critical time-based logic (miners can manipulate ±15s)
- Deploy without testing on a fork of mainnet for DeFi integrations
- `selfdestruct` — deprecated and dangerous
