import { createRemoteJWKSet, jwtVerify } from 'jose';

const supabaseUrl = process.env.SUPABASE_URL;
const jwksUrl = new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
const JWKS = createRemoteJWKSet(jwksUrl);

export const handler = async (event) => {
  const token = event.identitySource?.replace('Bearer ', '');

  if (!token) {
    return { isAuthorized: false };
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${supabaseUrl}/auth/v1`,
      audience: 'authenticated',
    });

    const userId = payload.sub;
    if (!userId) {
      return { isAuthorized: false };
    }

    return {
      isAuthorized: true,
      context: { userId },
    };
  } catch {
    return { isAuthorized: false };
  }
};
