extern crate std;

use p256::ecdsa::{signature::hazmat::PrehashSigner, Signature as P256Signature, SigningKey};
use soroban_sdk::{
    auth::Context, testutils::Address as _, vec, Address, Bytes, BytesN, Env, IntoVal, Vec,
};
use std::{format, string::String};

use crate::{webauthn::base64url_32, Error, Signature, Vault, VaultClient};

struct Passkey {
    id: Bytes,
    key: SigningKey,
}

impl Passkey {
    fn new(env: &Env, seed: u8) -> Self {
        Passkey {
            id: Bytes::from_array(env, &[seed; 16]),
            key: SigningKey::from_bytes(&[seed; 32].into()).unwrap(),
        }
    }

    fn public_key(&self, env: &Env) -> BytesN<65> {
        let point = self.key.verifying_key().to_encoded_point(false);
        BytesN::from_array(env, point.as_bytes().try_into().unwrap())
    }

    /// Produce a WebAuthn assertion over `payload`, the way a browser would.
    fn sign(&self, env: &Env, payload: &[u8; 32], opts: SignOpts) -> Signature {
        let mut auth_data = [0u8; 37];
        auth_data[32] = opts.flags;
        let challenge =
            String::from_utf8(base64url_32(&opts.challenge.unwrap_or(*payload)).into()).unwrap();
        let client_data = format!(
            r#"{{"type":"{}","challenge":"{}","origin":"https://passkeyvault.test","crossOrigin":false}}"#,
            opts.kind, challenge
        );

        let mut message = std::vec::Vec::from(auth_data);
        message.extend_from_slice(&sha256(client_data.as_bytes()));
        let sig: P256Signature = self.key.sign_prehash(&sha256(&message)).unwrap();
        let sig = sig.normalize_s().unwrap_or(sig);

        Signature {
            id: self.id.clone(),
            authenticator_data: Bytes::from_slice(env, &auth_data),
            client_data_json: Bytes::from_slice(env, client_data.as_bytes()),
            signature: BytesN::from_array(env, &sig.to_bytes().into()),
        }
    }
}

struct SignOpts {
    flags: u8,
    kind: &'static str,
    challenge: Option<[u8; 32]>,
}

impl Default for SignOpts {
    fn default() -> Self {
        SignOpts {
            flags: 0x05,
            kind: "webauthn.get",
            challenge: None,
        }
    }
}

fn sha256(data: &[u8]) -> [u8; 32] {
    let env = Env::default();
    env.crypto()
        .sha256(&Bytes::from_slice(&env, data))
        .to_array()
}

fn setup(env: &Env) -> (Address, VaultClient<'_>, Passkey) {
    let passkey = Passkey::new(env, 1);
    let id = env.register(Vault, (passkey.id.clone(), passkey.public_key(env)));
    (id.clone(), VaultClient::new(env, &id), passkey)
}

fn check_auth(env: &Env, vault: &Address, payload: &[u8; 32], sig: Signature) -> Result<(), Error> {
    env.try_invoke_contract_check_auth::<Error>(
        vault,
        &BytesN::from_array(env, payload),
        sig.into_val(env),
        &Vec::<Context>::new(env),
    )
    .map_err(|e| e.expect("contract error"))
}

fn check_auth_traps(env: &Env, vault: &Address, payload: &[u8; 32], sig: Signature) -> bool {
    env.try_invoke_contract_check_auth::<Error>(
        vault,
        &BytesN::from_array(env, payload),
        sig.into_val(env),
        &Vec::<Context>::new(env),
    )
    .is_err()
}

const PAYLOAD: [u8; 32] = [7u8; 32];

#[test]
fn valid_passkey_signature_is_accepted() {
    let env = Env::default();
    let (vault, _, passkey) = setup(&env);
    let sig = passkey.sign(&env, &PAYLOAD, SignOpts::default());
    assert_eq!(check_auth(&env, &vault, &PAYLOAD, sig), Ok(()));
}

#[test]
fn unknown_passkey_is_rejected() {
    let env = Env::default();
    let (vault, _, _) = setup(&env);
    let stranger = Passkey::new(&env, 9);
    let sig = stranger.sign(&env, &PAYLOAD, SignOpts::default());
    assert_eq!(
        check_auth(&env, &vault, &PAYLOAD, sig),
        Err(Error::UnknownSigner)
    );
}

#[test]
fn signature_for_other_payload_is_rejected() {
    let env = Env::default();
    let (vault, _, passkey) = setup(&env);
    let sig = passkey.sign(
        &env,
        &PAYLOAD,
        SignOpts {
            challenge: Some([8u8; 32]),
            ..Default::default()
        },
    );
    assert_eq!(
        check_auth(&env, &vault, &PAYLOAD, sig),
        Err(Error::ChallengeMismatch)
    );
}

#[test]
fn tampered_signature_traps() {
    let env = Env::default();
    let (vault, _, passkey) = setup(&env);
    let mut sig = passkey.sign(&env, &PAYLOAD, SignOpts::default());
    let mut raw = sig.signature.to_array();
    raw[10] ^= 0xff;
    sig.signature = BytesN::from_array(&env, &raw);
    assert!(check_auth_traps(&env, &vault, &PAYLOAD, sig));
}

#[test]
fn user_presence_is_required() {
    let env = Env::default();
    let (vault, _, passkey) = setup(&env);
    let sig = passkey.sign(
        &env,
        &PAYLOAD,
        SignOpts {
            flags: 0x04,
            ..Default::default()
        },
    );
    assert_eq!(
        check_auth(&env, &vault, &PAYLOAD, sig),
        Err(Error::UserNotPresent)
    );
}

#[test]
fn registration_ceremony_data_is_rejected() {
    let env = Env::default();
    let (vault, _, passkey) = setup(&env);
    let sig = passkey.sign(
        &env,
        &PAYLOAD,
        SignOpts {
            kind: "webauthn.create",
            ..Default::default()
        },
    );
    assert_eq!(
        check_auth(&env, &vault, &PAYLOAD, sig),
        Err(Error::InvalidClientData)
    );
}

#[test]
fn signers_can_be_added_and_removed() {
    let env = Env::default();
    env.mock_all_auths();
    let (vault, client, first) = setup(&env);
    let second = Passkey::new(&env, 2);

    client.add_signer(&second.id, &second.public_key(&env));
    assert_eq!(client.signers().len(), 2);
    assert_eq!(
        client.try_add_signer(&second.id, &second.public_key(&env)),
        Err(Ok(Error::SignerExists))
    );

    let sig = second.sign(&env, &PAYLOAD, SignOpts::default());
    assert_eq!(check_auth(&env, &vault, &PAYLOAD, sig), Ok(()));

    client.remove_signer(&first.id);
    assert_eq!(
        client.try_remove_signer(&second.id),
        Err(Ok(Error::LastSigner))
    );
    let sig = first.sign(&env, &PAYLOAD, SignOpts::default());
    assert_eq!(
        check_auth(&env, &vault, &PAYLOAD, sig),
        Err(Error::UnknownSigner)
    );
}

#[test]
fn guardian_config_is_validated() {
    let env = Env::default();
    env.mock_all_auths();
    let (vault, client, _) = setup(&env);
    let g1 = Address::generate(&env);
    let g2 = Address::generate(&env);

    assert_eq!(
        client.try_set_guardians(&vec![&env, g1.clone()], &2),
        Err(Ok(Error::InvalidThreshold))
    );
    assert_eq!(
        client.try_set_guardians(&vec![&env, g1.clone()], &0),
        Err(Ok(Error::InvalidThreshold))
    );
    assert_eq!(
        client.try_set_guardians(&vec![&env, g1.clone(), g1.clone()], &1),
        Err(Ok(Error::DuplicateGuardian))
    );
    assert_eq!(
        client.try_set_guardians(&vec![&env, vault], &1),
        Err(Ok(Error::DuplicateGuardian))
    );

    client.set_guardians(&vec![&env, g1.clone(), g2.clone()], &2);
    assert_eq!(client.guardians(), vec![&env, g1, g2]);
    assert_eq!(client.threshold(), 2);
}

#[test]
fn frozen_vault_rejects_auth_until_quorum_unfreezes() {
    let env = Env::default();
    env.mock_all_auths();
    let (vault, client, passkey) = setup(&env);
    let [g1, g2, g3] = [
        Address::generate(&env),
        Address::generate(&env),
        Address::generate(&env),
    ];
    client.set_guardians(&vec![&env, g1.clone(), g2.clone(), g3.clone()], &2);

    assert_eq!(
        client.try_freeze(&Address::generate(&env)),
        Err(Ok(Error::NotGuardian))
    );
    client.freeze(&g3);
    assert!(client.is_frozen());

    let sig = passkey.sign(&env, &PAYLOAD, SignOpts::default());
    assert_eq!(
        check_auth(&env, &vault, &PAYLOAD, sig.clone()),
        Err(Error::Frozen)
    );

    assert_eq!(
        client.try_unfreeze(&vec![&env, g1.clone()]),
        Err(Ok(Error::NotEnoughApprovals))
    );
    assert_eq!(
        client.try_unfreeze(&vec![&env, g1.clone(), g1.clone()]),
        Err(Ok(Error::DuplicateGuardian))
    );
    client.unfreeze(&vec![&env, g1, g2]);
    assert!(!client.is_frozen());
    assert_eq!(check_auth(&env, &vault, &PAYLOAD, sig), Ok(()));
}

#[test]
fn vault_can_freeze_itself() {
    let env = Env::default();
    env.mock_all_auths();
    let (vault, client, _) = setup(&env);
    client.freeze(&vault);
    assert!(client.is_frozen());
    assert_eq!(client.try_freeze(&vault), Err(Ok(Error::Frozen)));
}

#[test]
fn guardians_can_recover_with_new_passkey() {
    let env = Env::default();
    env.mock_all_auths();
    let (vault, client, old) = setup(&env);
    let [g1, g2] = [Address::generate(&env), Address::generate(&env)];
    client.set_guardians(&vec![&env, g1.clone(), g2.clone()], &2);
    client.freeze(&g1);

    let new = Passkey::new(&env, 3);
    client.recover(&vec![&env, g1, g2], &new.id, &new.public_key(&env));

    assert!(!client.is_frozen());
    assert_eq!(client.signers().len(), 1);
    let sig = old.sign(&env, &PAYLOAD, SignOpts::default());
    assert_eq!(
        check_auth(&env, &vault, &PAYLOAD, sig),
        Err(Error::UnknownSigner)
    );
    let sig = new.sign(&env, &PAYLOAD, SignOpts::default());
    assert_eq!(check_auth(&env, &vault, &PAYLOAD, sig), Ok(()));
}

#[test]
fn recovery_without_guardians_is_impossible() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client, _) = setup(&env);
    let new = Passkey::new(&env, 3);
    assert_eq!(
        client.try_recover(&Vec::new(&env), &new.id, &new.public_key(&env)),
        Err(Ok(Error::NotEnoughApprovals))
    );
}

#[test]
fn base64url_matches_reference() {
    // Reference: base64url of 32 zero bytes / 0..32.
    assert_eq!(
        &base64url_32(&[0u8; 32]),
        b"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    );
    let seq: [u8; 32] = core::array::from_fn(|i| i as u8);
    assert_eq!(
        &base64url_32(&seq),
        b"AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8"
    );
}
