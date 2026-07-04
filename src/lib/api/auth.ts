export type TokenProvider = () => string | null | Promise<string | null>;

let provider: TokenProvider = () => null; // default no-op — starter jalan tanpa auth

/** Fork menyambungkan strategi auth-nya, mis. setAuthTokenProvider(() => sesi.accessToken). */
export function setAuthTokenProvider(p: TokenProvider) { provider = p; }

export async function getAuthToken(): Promise<string | null> { return provider(); }
