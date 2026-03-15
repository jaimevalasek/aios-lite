# Dynamic Skill: Ethereum Docs

Use MCP or official sources to validate current EVM tooling, Solidity compiler notes, and client library changes before implementing or reviewing code.

**Fetch from:**
- Solidity: https://docs.soliditylang.org/en/latest/
- Ethers.js v6: https://docs.ethers.org/v6/
- Hardhat: https://hardhat.org/docs
- OpenZeppelin: https://docs.openzeppelin.com/contracts/

**Focus areas:**
- Solidity version-specific syntax (custom errors, named return values, etc.)
- ABI encoding edge cases
- Gas optimization patterns (SSTORE vs SLOAD costs)
- Current OpenZeppelin contract versions and breaking changes

**MCP tool example:** `mcp_fetch url="https://docs.soliditylang.org/en/latest/control-structures.html" topic="error handling"`
