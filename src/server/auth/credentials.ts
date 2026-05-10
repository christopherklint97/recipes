import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
	password: string,
	salt: Buffer,
	keylen: number,
) => Promise<Buffer>;

const N_KEYLEN = 64;
const SALT_BYTES = 16;
const HASH_PREFIX = "scrypt$";

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(SALT_BYTES);
	const derived = await scrypt(password, salt, N_KEYLEN);
	return `${HASH_PREFIX}${salt.toString("base64")}$${derived.toString("base64")}`;
}

async function verifyPasswordAgainstHash(
	password: string,
	hash: string,
): Promise<boolean> {
	if (!hash.startsWith(HASH_PREFIX)) return false;
	const [saltB64, derivedB64] = hash.slice(HASH_PREFIX.length).split("$");
	if (!saltB64 || !derivedB64) return false;
	const salt = Buffer.from(saltB64, "base64");
	const expected = Buffer.from(derivedB64, "base64");
	const actual = await scrypt(password, salt, expected.length);
	if (actual.length !== expected.length) return false;
	return timingSafeEqual(actual, expected);
}

export async function verifyCredentials(
	username: string,
	password: string,
): Promise<boolean> {
	const expectedUser = process.env.AUTH_USERNAME;
	const passwordHash = process.env.AUTH_PASSWORD_HASH;
	if (!expectedUser || !passwordHash) {
		throw new Error("AUTH_USERNAME and AUTH_PASSWORD_HASH must be set");
	}
	const userMatches = username === expectedUser;
	const passwordMatches = await verifyPasswordAgainstHash(
		password,
		passwordHash,
	);
	return userMatches && passwordMatches;
}
