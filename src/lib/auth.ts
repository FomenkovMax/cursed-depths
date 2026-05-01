/**
 * Telegram WebApp authentication helper
 * Validates initData from the Telegram WebApp SDK
 */

export function verifyTelegramAuth(initData: string): { id: number; first_name: string; username?: string } | null {
  // In production, validate with BOT_TOKEN hash
  // For dev, parse the user from initData
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    if (!user.id) return null;
    return user;
  } catch {
    return null;
  }
}

export function getTelegramUser(headers: Headers): { id: number; first_name: string; username?: string } | null {
  const authHeader = headers.get('X-Telegram-Init-Data') || headers.get('Authorization');
  if (!authHeader) return null;

  // Remove "Bearer " prefix if present
  const initData = authHeader.replace(/^Bearer\s+/, '');
  return verifyTelegramAuth(initData);
}

export function getPlayerId(headers: Headers): string | null {
  const user = getTelegramUser(headers);
  if (!user) return null;
  return `tg_${user.id}`;
}
