# Web3 Solana Patterns

> Anchor framework, PDAs, and account model. Rust programs that don't leak lamports.

---

## Solana account model — understand before coding

Unlike Ethereum where contract storage is internal, **Solana programs are stateless**. All state lives in separate accounts that the program owns.

```
Program Account   → executable code (your Anchor program)
Data Account      → state storage (owned by the program)
Signer Account    → user wallet (signs transactions)
System Account    → system program (creates accounts, transfers SOL)
Token Account     → holds SPL tokens (owned by Token Program)
```

**PDA (Program Derived Address):** A deterministic account address derived from seeds + program ID. No private key — only the program can sign for it.

---

## Anchor program structure

```
programs/
  my-program/
    src/
      lib.rs              ← entry point, declare_id!, mod declarations
      instructions/
        initialize.rs     ← one file per instruction
        deposit.rs
        withdraw.rs
      state/
        pool.rs           ← account data structures
        config.rs
      errors.rs           ← custom error codes
      constants.rs        ← seeds, limits, fees
    Cargo.toml
tests/
  my-program.ts          ← Anchor TypeScript tests
Anchor.toml
```

---

## Account data structures

```rust
// state/pool.rs
use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct Pool {
    pub authority: Pubkey,    // 32
    pub token_mint: Pubkey,   // 32
    pub total_deposits: u64,  // 8
    pub fee_bps: u16,         // 2
    pub bump: u8,             // 1  ← always store the PDA bump
    pub _padding: [u8; 5],   // 5  ← align to 8-byte boundary
}

impl Pool {
    // Calculate space: discriminator (8) + fields
    pub const LEN: usize = 8 + 32 + 32 + 8 + 2 + 1 + 5;
}
```

---

## Instructions with account validation

```rust
// instructions/initialize.rs
use anchor_lang::prelude::*;
use crate::{state::Pool, constants::POOL_SEED, errors::ProtocolError};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = Pool::LEN,
        seeds = [POOL_SEED, token_mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,

    pub token_mint: Account<'info, anchor_spl::token::Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>, fee_bps: u16) -> Result<()> {
    require!(fee_bps <= 1_000, ProtocolError::FeeTooHigh);  // max 10%

    let pool = &mut ctx.accounts.pool;
    pool.authority    = ctx.accounts.authority.key();
    pool.token_mint   = ctx.accounts.token_mint.key();
    pool.fee_bps      = fee_bps;
    pool.bump         = ctx.bumps.pool;  // store bump for future PDA signing

    Ok(())
}
```

---

## PDA signing (CPI with PDA as signer)

```rust
// When the program needs to sign on behalf of a PDA
pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let pool = &ctx.accounts.pool;
    let token_mint_key = pool.token_mint.key();

    // Seeds must match exactly what was used to derive the PDA
    let seeds = &[
        POOL_SEED,
        token_mint_key.as_ref(),
        &[pool.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    // CPI transfer signed by the pool PDA
    anchor_spl::token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from:      ctx.accounts.pool_token_account.to_account_info(),
                to:        ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.pool.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )?;

    Ok(())
}
```

---

## Custom errors

```rust
// errors.rs
use anchor_lang::prelude::*;

#[error_code]
pub enum ProtocolError {
    #[msg("Fee exceeds maximum allowed (10%)")]
    FeeTooHigh,

    #[msg("Insufficient balance for withdrawal")]
    InsufficientBalance,

    #[msg("Pool is currently paused")]
    PoolPaused,

    #[msg("Unauthorized: only pool authority can perform this action")]
    Unauthorized,

    #[msg("Arithmetic overflow")]
    Overflow,
}
```

---

## Security validations

```rust
// Always validate: ownership, signer, mint, amounts

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [POOL_SEED, pool.token_mint.as_ref()],
        bump = pool.bump,                          // validates PDA derivation
        has_one = token_mint,                      // mint must match pool's mint
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = user,        // validates ownership
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = pool,        // pool owns this account
    )]
    pub pool_token_account: Account<'info, TokenAccount>,

    pub token_mint: Account<'info, Mint>,

    pub user: Signer<'info>,                       // must sign the transaction
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(amount > 0, ProtocolError::InsufficientBalance);
    require!(!ctx.accounts.pool.paused, ProtocolError::PoolPaused);

    let pool = &mut ctx.accounts.pool;

    // Safe arithmetic — use checked operations
    pool.total_deposits = pool.total_deposits
        .checked_add(amount)
        .ok_or(ProtocolError::Overflow)?;

    // ... transfer tokens
    Ok(())
}
```

---

## Compute budget management

```ts
// client-side: add compute budget for complex instructions
import { ComputeBudgetProgram } from '@solana/web3.js';

const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
    units: 400_000,  // increase from default 200k for complex CPI chains
});

const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 1_000,  // priority fee for faster inclusion
});

const tx = new Transaction()
    .add(modifyComputeUnits)
    .add(addPriorityFee)
    .add(yourInstruction);
```

---

## Anchor tests

```ts
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createMint, createAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { MyProgram } from '../target/types/my_program';
import { expect } from 'chai';

describe('my-program', () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.MyProgram as Program<MyProgram>;

    let tokenMint: PublicKey;
    let [poolPda, poolBump]: [PublicKey, number];

    before(async () => {
        tokenMint = await createMint(provider.connection, provider.wallet.payer, provider.wallet.publicKey, null, 6);
        [poolPda, poolBump] = PublicKey.findProgramAddressSync(
            [Buffer.from('pool'), tokenMint.toBuffer()],
            program.programId
        );
    });

    it('initializes pool with correct state', async () => {
        const feeBps = 300; // 3%

        await program.methods
            .initialize(feeBps)
            .accounts({
                pool:          poolPda,
                tokenMint,
                authority:     provider.wallet.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        const pool = await program.account.pool.fetch(poolPda);
        expect(pool.feeBps).to.equal(feeBps);
        expect(pool.bump).to.equal(poolBump);
        expect(pool.authority.toString()).to.equal(provider.wallet.publicKey.toString());
    });

    it('rejects fee above maximum', async () => {
        try {
            await program.methods.initialize(1_001).accounts({ ... }).rpc();
            expect.fail('Should have thrown');
        } catch (err: any) {
            expect(err.error.errorCode.code).to.equal('FeeTooHigh');
        }
    });
});
```

---

## ALWAYS
- Store PDA bump in the account and use it for future CPI signing
- Use `has_one`, `constraint`, and `associated_token::authority` for account validation
- Validate all amounts are > 0 before operations
- Use `checked_add`, `checked_sub`, `checked_mul` — never plain arithmetic
- Derive PDAs client-side with `PublicKey.findProgramAddressSync` and pass as account
- One file per instruction in `instructions/`

## NEVER
- Trust user-provided account ownership — use Anchor constraints
- Use unbounded loops (Solana has compute unit limits)
- Skip PDA bump storage (you'll need it for CPI signing)
- Mix up `lamports` (SOL × 10⁹) and token amounts (token × 10^decimals)
- Deploy to mainnet without testing on devnet with realistic account sizes
