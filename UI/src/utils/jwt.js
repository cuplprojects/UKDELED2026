/**
 * Decodes a JWT token and returns its payload.
 * @param {string} token - The JWT token to decode.
 * @returns {object|null} The decoded payload or null if invalid.
 */
export const decodeToken = (token) => {
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("[JWT] Failed to decode token:", error);
    return null;
  }
};

/**
 * Checks if a token is expired.
 * @param {string} token - The JWT token to check.
 * @returns {boolean} True if expired or invalid, false otherwise.
 */
export const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  // exp is in seconds, Date.now() is in milliseconds
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
};

/**
 * Gets the time remaining before the token expires (in seconds).
 * @param {string} token - The JWT token.
 * @returns {number} Seconds remaining, or 0 if expired/invalid.
 */
export const getTokenTimeRemaining = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return 0;
  
  const currentTime = Math.floor(Date.now() / 1000);
  const remaining = decoded.exp - currentTime;
  return remaining > 0 ? remaining : 0;
};
