import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const PIN_CREDENTIAL_KEY = 'vault_pin_credential';

type PinCredential = { salt: string; hash: string };

async function randomSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function hasStoredPin(): Promise<boolean> {
  const raw = await SecureStore.getItemAsync(PIN_CREDENTIAL_KEY);
  return raw !== null;
}

/**
 * Hashes and stores a new PIN (Android Keystore-backed via SecureStore) —
 * the raw PIN is never persisted anywhere, only a salted digest.
 */
export async function savePin(pin: string): Promise<void> {
  const salt = await randomSalt();
  const hash = await hashPin(pin, salt);
  const credential: PinCredential = { salt, hash };
  await SecureStore.setItemAsync(PIN_CREDENTIAL_KEY, JSON.stringify(credential));
}

export async function verifyStoredPin(pin: string): Promise<boolean> {
  const raw = await SecureStore.getItemAsync(PIN_CREDENTIAL_KEY);
  if (!raw) {
    return false;
  }
  try {
    const credential = JSON.parse(raw) as PinCredential;
    const hash = await hashPin(pin, credential.salt);
    return hash === credential.hash;
  } catch {
    return false;
  }
}

export async function clearStoredPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_CREDENTIAL_KEY);
}
