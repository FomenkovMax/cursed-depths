/**
 * Telegram WebApp authentication helper
 *
 * Validates initData from the Telegram WebApp SDK using HMAC-SHA256
 * signature verification as described in the Telegram documentation:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Algorithm:
 * 1. Parse initData as URLSearchParams
 * 2. Extract the `hash` parameter
 * 3. Create a data-check string by sorting all other key-value pairs
 *    alphabetically and joining with newlines (`key=value\n...`)
 * 4. Compute HMAC-SHA256 with key = HMAC-SHA256(bot_token, "WebAppData")
 * 5. Compare the computed hash hex with the provided hash
 * 6. Verify `auth_date` is not too old (within 24 hours)
 */

import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';

/** Maximum age of auth_date in seconds (24 hours) */
const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

/**
 * Validates Telegram WebApp initData using HMAC-SHA256.
 *
 * @param initData - The raw initData string from Telegram WebApp SDK
 * @param botToken - The bot token used to compute the secret key
 * @returns Parsed user info if validation succeeds, null otherwise
 */
export function verifyTelegramAuth(
  initData: string,
  botToken: string,
): { id: number; first_name: string; username?: string } | null {
  try {
    const params = new URLSearchParams(initData);

    // Step 1: Extract the hash
    const hash = params.get('hash');
    if (!hash) return null;

    // Step 2: Remove hash from params and build the data-check string
    params.delete('hash');

    const keyValuePairs: string[] = [];
    params.forEach((value, key) => {
      keyValuePairs.push(`${key}=${value}`);
    });

    // Sort alphabetically by key
    keyValuePairs.sort();

    const dataCheckString = keyValuePairs.join('\n');

    // Step 3: Compute secret key = HMAC-SHA256(bot_token, "WebAppData")
    const secretKey = createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Step 4: Compute HMAC-SHA256(secret_key, data_check_string)
    const computedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Step 5: Compare hashes (timing-safe comparison)
    if (computedHash.length !== hash.length) return null;

    // Manual timing-safe comparison to avoid importing timingSafeEqual
    // which requires Buffer in Node.js
    let mismatch = 0;
    for (let i = 0; i < computedHash.length; i++) {
      mismatch |= computedHash.charCodeAt(i) ^ hash.charCodeAt(i);
    }
    if (mismatch !== 0) return null;

    // Step 6: Verify auth_date is not too old
    const authDateStr = params.get('auth_date');
    if (!authDateStr) return null;

    const authDate = parseInt(authDateStr, 10);
    if (isNaN(authDate)) return null;

    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > MAX_AUTH_AGE_SECONDS) return null;

    // Step 7: Parse and return user data
    const userStr = params.get('user');
    if (!userStr) return null;

    const user = JSON.parse(userStr);
    if (!user.id) return null;

    return { id: user.id, first_name: user.first_name, username: user.username };
  } catch {
    return null;
  }
}

/**
 * Validates a Telegram WebApp request.
 *
 * Authentication strategy (in order of priority):
 * 1. `X-Telegram-Init-Data` header — validated with HMAC-SHA256 (production)
 * 2. `x-telegram-id` header — fallback ONLY in development mode for easy testing
 *
 * @param req - The incoming NextRequest
 * @returns `{ telegramId: string }` if authentication succeeds, `null` otherwise
 */
export function validateTelegramRequest(
  req: NextRequest,
): { telegramId: string } | null {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    console.error('BOT_TOKEN environment variable is not set');
    return null;
  }

  // Strategy 1: Validate X-Telegram-Init-Data header (real Telegram WebApp)
  const initDataHeader = req.headers.get('X-Telegram-Init-Data');
  if (initDataHeader) {
    // Strip "Bearer " prefix if present
    const initData = initDataHeader.replace(/^Bearer\s+/, '');
    const user = verifyTelegramAuth(initData, botToken);
    if (user) {
      return { telegramId: String(user.id) };
    }
    // If initData is present but invalid, reject immediately
    return null;
  }

  // Strategy 2: Fallback to x-telegram-id header (development mode only)
  if (process.env.NODE_ENV !== 'production') {
    const fallbackId = req.headers.get('x-telegram-id');
    if (fallbackId) {
      return { telegramId: fallbackId };
    }
  }

  return null;
}
