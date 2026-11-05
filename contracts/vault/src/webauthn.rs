//! WebAuthn assertion verification.
//!
//! The signed message is `authenticatorData || SHA-256(clientDataJSON)`, and
//! `clientDataJSON` must carry the Soroban signature payload as its
//! base64url-encoded `challenge`.

use soroban_sdk::{crypto::Hash, Bytes, BytesN, Env};

use crate::{Error, Signature};

/// authenticatorData = rpIdHash (32) || flags (1) || signCount (4) || ...
const AUTH_DATA_MIN_LEN: u32 = 37;
const FLAG_USER_PRESENT: u8 = 0x01;

/// Upper bound on clientDataJSON we are willing to scan.
const CLIENT_DATA_MAX_LEN: usize = 1024;

const TYPE_GET: &[u8] = b"\"type\":\"webauthn.get\"";
const CHALLENGE_KEY: &[u8] = b"\"challenge\":\"";
/// base64url of 32 bytes, without padding.
const CHALLENGE_LEN: usize = 43;

pub fn verify(
    env: &Env,
    payload: &Hash<32>,
    rp_id_hash: &BytesN<32>,
    public_key: &BytesN<65>,
    sig: &Signature,
) -> Result<(), Error> {
    let auth_data = &sig.authenticator_data;
    if auth_data.len() < AUTH_DATA_MIN_LEN {
        return Err(Error::InvalidAuthenticatorData);
    }
    if auth_data.slice(0..32) != Bytes::from(rp_id_hash) {
        return Err(Error::RpIdMismatch);
    }
    if auth_data.get_unchecked(32) & FLAG_USER_PRESENT == 0 {
        return Err(Error::UserNotPresent);
    }

    check_client_data(&sig.client_data_json, &payload.to_array())?;

    let mut message = auth_data.clone();
    message.extend_from_array(&env.crypto().sha256(&sig.client_data_json).to_array());
    let digest = env.crypto().sha256(&message);

    // Traps (failing the invocation) when the signature does not verify.
    env.crypto()
        .secp256r1_verify(public_key, &digest, &sig.signature);
    Ok(())
}

fn check_client_data(client_data: &Bytes, payload: &[u8; 32]) -> Result<(), Error> {
    let len = client_data.len() as usize;
    if len > CLIENT_DATA_MAX_LEN {
        return Err(Error::InvalidClientData);
    }
    let mut buf = [0u8; CLIENT_DATA_MAX_LEN];
    client_data.copy_into_slice(&mut buf[..len]);
    let json = &buf[..len];

    if find(json, TYPE_GET).is_none() {
        return Err(Error::InvalidClientData);
    }

    let start = find(json, CHALLENGE_KEY).ok_or(Error::InvalidClientData)? + CHALLENGE_KEY.len();
    let end = start + CHALLENGE_LEN;
    // The challenge must be exactly 43 chars followed by the closing quote.
    if end >= len || json[end] != b'"' {
        return Err(Error::ChallengeMismatch);
    }
    if json[start..end] != base64url_32(payload) {
        return Err(Error::ChallengeMismatch);
    }
    Ok(())
}

fn find(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack.windows(needle.len()).position(|w| w == needle)
}

const B64URL: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/// Unpadded base64url encoding of a 32-byte value.
pub(crate) fn base64url_32(input: &[u8; 32]) -> [u8; CHALLENGE_LEN] {
    let mut out = [0u8; CHALLENGE_LEN];
    let mut o = 0;
    for chunk in input.chunks(3) {
        let b = [
            chunk[0],
            *chunk.get(1).unwrap_or(&0),
            *chunk.get(2).unwrap_or(&0),
        ];
        let n = ((b[0] as u32) << 16) | ((b[1] as u32) << 8) | b[2] as u32;
        let chars = chunk.len() + 1;
        for i in 0..chars {
            out[o] = B64URL[((n >> (18 - 6 * i)) & 0x3f) as usize];
            o += 1;
        }
    }
    out
}
