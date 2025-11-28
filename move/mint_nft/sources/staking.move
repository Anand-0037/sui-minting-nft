/// NFT Staking Module - Simple DeFi feature
/// Users can stake NFTs to earn time-based rewards
module mint_nft::staking;

use sui::clock::{Self, Clock};
use sui::table::{Self, Table};
use sui::event;
use mint_nft::mint_nft::NFT;

// Error codes
const ENotStakeOwner: u64 = 0;
const EStakeNotFound: u64 = 1;
const ENFTNotFound: u64 = 2;

// Reward rate: 1 MIST per second (for demo purposes)
const REWARD_RATE_PER_SECOND: u64 = 1;

/// Shared staking pool - holds all staked NFTs
public struct StakingPool has key {
    id: UID,
    total_staked: u64,
    admin: address,
}

/// Individual stake record stored in separate object
public struct StakeRecord has key, store {
    id: UID,
    nft: NFT,
    owner: address,
    stake_time_ms: u64,
}

// Events
public struct PoolCreated has copy, drop {
    pool_id: ID,
    admin: address,
}

public struct NFTStaked has copy, drop {
    stake_id: ID,
    nft_id: ID,
    owner: address,
    stake_time_ms: u64,
}

public struct NFTUnstaked has copy, drop {
    stake_id: ID,
    nft_id: ID,
    owner: address,
    stake_duration_seconds: u64,
    rewards_earned: u64,
}

/// Initialize staking pool (called once on publish)
fun init(ctx: &mut TxContext) {
    let pool = StakingPool {
        id: object::new(ctx),
        total_staked: 0,
        admin: ctx.sender(),
    };

    event::emit(PoolCreated {
        pool_id: object::id(&pool),
        admin: ctx.sender(),
    });

    transfer::share_object(pool);
}

/// Stake an NFT to earn rewards
#[allow(lint(public_entry))]
public entry fun stake_nft(
    pool: &mut StakingPool,
    nft: NFT,
    clock: &Clock,
    ctx: &mut TxContext
) {
    let nft_id = object::id(&nft);
    let owner = ctx.sender();
    let stake_time_ms = clock::timestamp_ms(clock);

    let stake_record = StakeRecord {
        id: object::new(ctx),
        nft,
        owner,
        stake_time_ms,
    };

    let stake_id = object::id(&stake_record);

    pool.total_staked = pool.total_staked + 1;

    event::emit(NFTStaked {
        stake_id,
        nft_id,
        owner,
        stake_time_ms,
    });

    // Transfer stake record to owner (they need it to unstake)
    transfer::transfer(stake_record, owner);
}

/// Unstake NFT and claim rewards
#[allow(lint(public_entry))]
public entry fun unstake_nft(
    pool: &mut StakingPool,
    stake_record: StakeRecord,
    clock: &Clock,
    ctx: &mut TxContext
) {
    let StakeRecord { id, nft, owner, stake_time_ms } = stake_record;
    
    // Verify ownership
    assert!(owner == ctx.sender(), ENotStakeOwner);
    
    let current_time_ms = clock::timestamp_ms(clock);
    let stake_duration_ms = current_time_ms - stake_time_ms;
    let stake_duration_seconds = stake_duration_ms / 1000;
    
    // Calculate rewards (1 MIST per second)
    let rewards = calculate_rewards(stake_duration_seconds);
    
    let stake_id = object::uid_to_inner(&id);
    let nft_id = object::id(&nft);
    
    // Clean up
    object::delete(id);
    pool.total_staked = pool.total_staked - 1;

    event::emit(NFTUnstaked {
        stake_id,
        nft_id,
        owner,
        stake_duration_seconds,
        rewards_earned: rewards,
    });

    // Return NFT to owner
    transfer::public_transfer(nft, owner);
    
    // Note: In a real dApp, you'd also transfer reward tokens here
    // For demo, we just emit the rewards amount in the event
}

/// Calculate rewards based on staking duration
public fun calculate_rewards(duration_seconds: u64): u64 {
    duration_seconds * REWARD_RATE_PER_SECOND
}

/// Get pending rewards for a stake (view function)
public fun get_pending_rewards(stake_record: &StakeRecord, clock: &Clock): u64 {
    let current_time_ms = clock::timestamp_ms(clock);
    let stake_duration_ms = current_time_ms - stake_record.stake_time_ms;
    let stake_duration_seconds = stake_duration_ms / 1000;
    calculate_rewards(stake_duration_seconds)
}

/// Get stake info
public fun get_stake_owner(stake_record: &StakeRecord): address {
    stake_record.owner
}

public fun get_stake_time(stake_record: &StakeRecord): u64 {
    stake_record.stake_time_ms
}

public fun get_total_staked(pool: &StakingPool): u64 {
    pool.total_staked
}
