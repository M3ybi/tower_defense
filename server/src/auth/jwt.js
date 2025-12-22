import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";

const enc = new TextEncoder();

export async function signSession(payload) {
  const secret = enc.encode(process.env.JWT_SECRET);
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .setJti(crypto.randomUUID())
    .sign(secret);
}

export async function verifySession(token) {
  const secret = enc.encode(process.env.JWT_SECRET);
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  return payload;
}
