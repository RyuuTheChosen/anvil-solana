import rateLimit from "express-rate-limit";

// Strict: expensive operations (launch, vault creation, file upload)
export const strictLimit = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// Admin: admin actions (pause, reactivate)
export const adminLimit = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});

// Read: public read endpoints (explore, claims)
export const readLimit = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// Bot: elevated limit for bot service (each launch = multiple API calls)
export const botLimit = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});

// Wallet creation: prevent spam wallet creation (S11)
export const walletCreateLimit = rateLimit({
  windowMs: 60 * 60_000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many wallet creation requests. Try again later." },
});
