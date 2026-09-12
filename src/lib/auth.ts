import { SignJWT, jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "quentinhas_da_re_jwt_super_secret_key_2026_seguro"
);

export interface SessionPayload {
  role: "admin" | "motoboy";
  id?: number;
  nome: string;
  login?: string;
  [key: string]: unknown;
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d") // Sessão válida por 30 dias para facilidade no celular
    .sign(SECRET_KEY);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
