import { createRemoteJWKSet, jwtVerify } from "jose";

let jwks; // jose caches the keys and re-fetches only when it sees an unknown key id

export async function verifyAuthToken(token) {
  jwks ??= createRemoteJWKSet(new URL(process.env.AUTH_JWKS_URL));
  const { payload } = await jwtVerify(token, jwks, { issuer: process.env.AUTH_ISSUER });
  return payload;
}