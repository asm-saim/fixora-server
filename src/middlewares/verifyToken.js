import { col } from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyAuthToken } from "../utils/verifyAuthToken.js";

// jose error codes that mean "the token itself is bad" (client problem -> 401)
const BAD_TOKEN_PREFIXES = ["ERR_JWT_", "ERR_JWS_"];
const BAD_TOKEN_CODES = new Set([
  "ERR_JWKS_NO_MATCHING_KEY",
  "ERR_JWKS_MULTIPLE_MATCHING_KEYS",
  "ERR_JOSE_NOT_SUPPORTED",
  "ERR_JOSE_ALG_NOT_ALLOWED",
]);

export const verifyToken = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new ApiError(401, "Unauthorized: token missing");
  }

  let payload;
  try {
    payload = await verifyAuthToken(token);
  } catch (err) {
    if (err.code === "ERR_JWT_EXPIRED") throw new ApiError(401, "Unauthorized: token expired");
    if (BAD_TOKEN_PREFIXES.some((p) => err.code?.startsWith(p)) || BAD_TOKEN_CODES.has(err.code)) {
      throw new ApiError(401, "Unauthorized: invalid token");
    }
    // Not the client's fault (for example the JWKS endpoint is unreachable)
    console.error("Token verification failed:", err);
    throw new ApiError(503, "Authentication service unavailable");
  }

  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
  if (!email) throw new ApiError(401, "Unauthorized: invalid token");

  // Role and identity come from the database, not from the token
  const user = await col.users.findOne(
    { email },
    { projection: { name: 1, email: 1, role: 1, image: 1 } }
  );
  if (!user) throw new ApiError(401, "Unauthorized: user not found");

  req.user = {
    _id: user._id,
    id: String(user._id),
    email: user.email,
    name: user.name,
    image: user.image ?? null,
    role: user.role || "customer",
  };
  next();
});