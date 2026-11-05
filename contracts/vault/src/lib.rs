//! PasskeyVault: a Soroban smart wallet whose signers are WebAuthn passkeys.
//!
//! * Any registered passkey (secp256r1 / ES256) can authorize the vault.
//! * Guardians (any Stellar address) can freeze the vault in an emergency.
//! * A threshold of guardians can unfreeze it, or recover it by replacing
//!   every signer with a new passkey.
#![no_std]

mod webauthn;

#[cfg(test)]
mod test;

use soroban_sdk::{
    auth::{Context, CustomAccountInterface},
    contract, contracterror, contractevent, contractimpl, contracttype,
    crypto::Hash,
    Address, Bytes, BytesN, Env, Map, Vec,
};

/// Maximum number of guardians a vault can have.
pub const MAX_GUARDIANS: u32 = 5;
/// Maximum number of passkey signers a vault can have.
pub const MAX_SIGNERS: u32 = 10;

const DAY_IN_LEDGERS: u32 = 17_280;
const INSTANCE_BUMP: u32 = 30 * DAY_IN_LEDGERS;
const INSTANCE_THRESHOLD: u32 = INSTANCE_BUMP - DAY_IN_LEDGERS;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Frozen = 1,
    NotFrozen = 2,
    UnknownSigner = 3,
    SignerExists = 4,
    LastSigner = 5,
    TooManySigners = 6,
    InvalidThreshold = 7,
    TooManyGuardians = 8,
    DuplicateGuardian = 9,
    NotGuardian = 10,
    NotEnoughApprovals = 11,
    InvalidAuthenticatorData = 12,
    UserNotPresent = 13,
    InvalidClientData = 14,
    ChallengeMismatch = 15,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Signers,
    Guardians,
    Threshold,
    Frozen,
}

/// A registered passkey: the WebAuthn credential id and its uncompressed
/// SEC1 public key (0x04 || X || Y).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Signer {
    pub key_id: Bytes,
    pub public_key: BytesN<65>,
}

/// The signature passed to `__check_auth`: a WebAuthn assertion.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Signature {
    /// Credential id of the passkey that signed.
    pub id: Bytes,
    pub authenticator_data: Bytes,
    pub client_data_json: Bytes,
    /// Raw `r || s` signature, with `s` normalized to the low half of the order.
    pub signature: BytesN<64>,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SignerAdded {
    #[topic]
    pub key_id: Bytes,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SignerRemoved {
    #[topic]
    pub key_id: Bytes,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GuardiansSet {
    pub guardians: Vec<Address>,
    pub threshold: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Frozen {
    #[topic]
    pub by: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Unfrozen {
    pub approvers: Vec<Address>,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Recovered {
    #[topic]
    pub key_id: Bytes,
    pub approvers: Vec<Address>,
}

#[contract]
pub struct Vault;

#[contractimpl]
impl Vault {
    pub fn __constructor(env: Env, key_id: Bytes, public_key: BytesN<65>) {
        let mut signers = Map::new(&env);
        signers.set(key_id, public_key);
        let storage = env.storage().instance();
        storage.set(&DataKey::Signers, &signers);
        storage.set(&DataKey::Guardians, &Vec::<Address>::new(&env));
        storage.set(&DataKey::Threshold, &0u32);
        storage.set(&DataKey::Frozen, &false);
    }

    // ---------------------------------------------------------------- signers

    /// Register another passkey. Requires the vault's own authorization.
    pub fn add_signer(env: Env, key_id: Bytes, public_key: BytesN<65>) -> Result<(), Error> {
        env.current_contract_address().require_auth();
        let mut signers = get_signers(&env);
        if signers.contains_key(key_id.clone()) {
            return Err(Error::SignerExists);
        }
        if signers.len() >= MAX_SIGNERS {
            return Err(Error::TooManySigners);
        }
        signers.set(key_id.clone(), public_key);
        env.storage().instance().set(&DataKey::Signers, &signers);
        SignerAdded { key_id }.publish(&env);
        Ok(())
    }

    /// Revoke a passkey. The last remaining passkey cannot be removed.
    pub fn remove_signer(env: Env, key_id: Bytes) -> Result<(), Error> {
        env.current_contract_address().require_auth();
        let mut signers = get_signers(&env);
        if !signers.contains_key(key_id.clone()) {
            return Err(Error::UnknownSigner);
        }
        if signers.len() == 1 {
            return Err(Error::LastSigner);
        }
        signers.remove(key_id.clone());
        env.storage().instance().set(&DataKey::Signers, &signers);
        SignerRemoved { key_id }.publish(&env);
        Ok(())
    }

    pub fn signers(env: Env) -> Vec<Signer> {
        let mut out = Vec::new(&env);
        for (key_id, public_key) in get_signers(&env).iter() {
            out.push_back(Signer { key_id, public_key });
        }
        out
    }

    // -------------------------------------------------------------- guardians

    /// Replace the guardian set. `threshold` guardians are needed to unfreeze
    /// or recover the vault. Requires the vault's own authorization.
    pub fn set_guardians(env: Env, guardians: Vec<Address>, threshold: u32) -> Result<(), Error> {
        env.current_contract_address().require_auth();
        if guardians.len() > MAX_GUARDIANS {
            return Err(Error::TooManyGuardians);
        }
        let valid_threshold = if guardians.is_empty() {
            threshold == 0
        } else {
            threshold >= 1 && threshold <= guardians.len()
        };
        if !valid_threshold {
            return Err(Error::InvalidThreshold);
        }
        let self_address = env.current_contract_address();
        for (i, g) in guardians.iter().enumerate() {
            if g == self_address || guardians.first_index_of(&g) != Some(i as u32) {
                return Err(Error::DuplicateGuardian);
            }
        }
        let storage = env.storage().instance();
        storage.set(&DataKey::Guardians, &guardians);
        storage.set(&DataKey::Threshold, &threshold);
        GuardiansSet {
            guardians,
            threshold,
        }
        .publish(&env);
        Ok(())
    }

    pub fn guardians(env: Env) -> Vec<Address> {
        get_guardians(&env)
    }

    pub fn threshold(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::Threshold)
            .unwrap_or(0)
    }

    // ---------------------------------------------------------- freeze/recover

    /// Emergency freeze. `caller` must be the vault itself or one of its
    /// guardians. While frozen, the vault rejects every authorization.
    pub fn freeze(env: Env, caller: Address) -> Result<(), Error> {
        if caller != env.current_contract_address() && !get_guardians(&env).contains(&caller) {
            return Err(Error::NotGuardian);
        }
        caller.require_auth();
        if is_frozen(&env) {
            return Err(Error::Frozen);
        }
        env.storage().instance().set(&DataKey::Frozen, &true);
        Frozen { by: caller }.publish(&env);
        Ok(())
    }

    /// Lift a freeze. Needs `threshold` distinct guardians to authorize.
    pub fn unfreeze(env: Env, approvers: Vec<Address>) -> Result<(), Error> {
        if !is_frozen(&env) {
            return Err(Error::NotFrozen);
        }
        require_guardian_quorum(&env, &approvers)?;
        env.storage().instance().set(&DataKey::Frozen, &false);
        Unfrozen { approvers }.publish(&env);
        Ok(())
    }

    /// Social recovery: a guardian quorum replaces every signer with a single
    /// new passkey and lifts any freeze.
    pub fn recover(
        env: Env,
        approvers: Vec<Address>,
        key_id: Bytes,
        public_key: BytesN<65>,
    ) -> Result<(), Error> {
        require_guardian_quorum(&env, &approvers)?;
        let mut signers = Map::new(&env);
        signers.set(key_id.clone(), public_key);
        let storage = env.storage().instance();
        storage.set(&DataKey::Signers, &signers);
        storage.set(&DataKey::Frozen, &false);
        Recovered { key_id, approvers }.publish(&env);
        Ok(())
    }

    pub fn is_frozen(env: Env) -> bool {
        is_frozen(&env)
    }
}

#[contractimpl]
impl CustomAccountInterface for Vault {
    type Signature = Signature;
    type Error = Error;

    #[allow(non_snake_case)]
    fn __check_auth(
        env: Env,
        signature_payload: Hash<32>,
        signature: Signature,
        _auth_contexts: Vec<Context>,
    ) -> Result<(), Error> {
        if is_frozen(&env) {
            return Err(Error::Frozen);
        }
        let public_key = get_signers(&env)
            .get(signature.id.clone())
            .ok_or(Error::UnknownSigner)?;

        webauthn::verify(&env, &signature_payload, &public_key, &signature)?;

        env.storage()
            .instance()
            .extend_ttl(INSTANCE_THRESHOLD, INSTANCE_BUMP);
        Ok(())
    }
}

fn get_signers(env: &Env) -> Map<Bytes, BytesN<65>> {
    env.storage()
        .instance()
        .get(&DataKey::Signers)
        .unwrap_or_else(|| Map::new(env))
}

fn get_guardians(env: &Env) -> Vec<Address> {
    env.storage()
        .instance()
        .get(&DataKey::Guardians)
        .unwrap_or_else(|| Vec::new(env))
}

fn is_frozen(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::Frozen)
        .unwrap_or(false)
}

/// Checks that `approvers` are distinct guardians, that there are at least
/// `threshold` of them, and requires each one's authorization.
fn require_guardian_quorum(env: &Env, approvers: &Vec<Address>) -> Result<(), Error> {
    let guardians = get_guardians(env);
    let threshold: u32 = env
        .storage()
        .instance()
        .get(&DataKey::Threshold)
        .unwrap_or(0);
    if threshold == 0 || approvers.len() < threshold {
        return Err(Error::NotEnoughApprovals);
    }
    for (i, a) in approvers.iter().enumerate() {
        if !guardians.contains(&a) {
            return Err(Error::NotGuardian);
        }
        if approvers.first_index_of(&a) != Some(i as u32) {
            return Err(Error::DuplicateGuardian);
        }
        a.require_auth();
    }
    Ok(())
}
