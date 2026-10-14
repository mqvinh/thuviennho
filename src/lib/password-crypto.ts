import { scryptAsync } from "@noble/hashes/scrypt.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";

function equal(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bytes = new Uint8Array(salt).buffer;
  return new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:bytes,iterations},key,256));
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    if (stored.startsWith("pbkdf2-sha256:")) {
      const [algorithm, rounds, salt, hash, extra] = stored.split(":");
      if (algorithm !== "pbkdf2-sha256" || extra || rounds !== "210000" || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{64}$/.test(hash)) return false;
      return equal(await derive(password,hexToBytes(salt),Number(rounds)),hexToBytes(hash));
    }
    // Existing account hashes use Node's default scrypt parameters. Keep them usable.
    const [salt, hash, extra] = stored.split(":");
    if (!salt || salt.length>200 || extra || !/^[a-f0-9]{128}$/.test(hash)) return false;
    const actual = await scryptAsync(utf8ToBytes(password),utf8ToBytes(salt),{N:16384,r:8,p:1,dkLen:64,asyncTick:8});
    return equal(actual,hexToBytes(hash));
  } catch { return false; }
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256:210000:${bytesToHex(salt)}:${bytesToHex(await derive(password,salt,210000))}`;
}
