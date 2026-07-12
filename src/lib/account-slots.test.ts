import { describe, it, expect, vi } from 'vitest';
import { inactiveSlotTelegramId, switchActiveCharacter, MAX_CHARACTER_SLOTS } from './account-slots';

describe('inactiveSlotTelegramId', () => {
  it('is deterministic — same accountId + slotNumber always produces the same placeholder', () => {
    expect(inactiveSlotTelegramId('12345', 2)).toBe(inactiveSlotTelegramId('12345', 2));
  });

  it('differs between slot numbers of the same account', () => {
    expect(inactiveSlotTelegramId('12345', 1)).not.toBe(inactiveSlotTelegramId('12345', 2));
  });

  it('differs between accounts with the same slot number', () => {
    expect(inactiveSlotTelegramId('12345', 2)).not.toBe(inactiveSlotTelegramId('67890', 2));
  });
});

describe('MAX_CHARACTER_SLOTS', () => {
  it('is exactly 2 — "второй слот", not an arbitrary roster', () => {
    expect(MAX_CHARACTER_SLOTS).toBe(2);
  });
});

describe('switchActiveCharacter', () => {
  it('frees the real telegramId before claiming it for the target — never both rows hold it at once', async () => {
    const calls: { where: { id: string }; data: { telegramId: string } }[] = [];
    const fakeTx = {
      player: {
        update: vi.fn(async (args: { where: { id: string }; data: { telegramId: string } }) => {
          calls.push(args);
          return {};
        }),
      },
    } as any;

    await switchActiveCharacter(fakeTx, 'acct123', 'player-active-id', 1, 'player-target-id');

    expect(calls).toHaveLength(3);
    // Step 1: active player gives up the real telegramId to a temp value.
    expect(calls[0].where.id).toBe('player-active-id');
    expect(calls[0].data.telegramId).not.toBe('acct123');
    // Step 2: target claims the real telegramId — only after it was freed in step 1.
    expect(calls[1].where.id).toBe('player-target-id');
    expect(calls[1].data.telegramId).toBe('acct123');
    // Step 3: active player settles into its deterministic placeholder for slot 1.
    expect(calls[2].where.id).toBe('player-active-id');
    expect(calls[2].data.telegramId).toBe(inactiveSlotTelegramId('acct123', 1));
  });
});
