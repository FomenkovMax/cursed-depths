import { describe, it, expect } from 'vitest';
import { parseDeathWard } from './conditional-ability-engine';
import { ITEMS } from '@/lib/game-data';

describe('parseDeathWard — item reuse (audit 3, C2)', () => {
  it('recognizes the death-ward text on "Клык Пепельной Верности" the same way it already recognizes class abilities', () => {
    const item = ITEMS.find(i => i.id === 'ashen_loyalty_fang');
    expect(item).toBeDefined();
    const ward = parseDeathWard(item!.descriptionRu);
    expect(ward).not.toBeNull();
    expect(ward!.healPercent).toBe(0);
    expect(ward!.shieldPercent).toBe(0);
  });

  it('does not misfire on the second unique item (economy ring), which has no death-ward wording', () => {
    const item = ITEMS.find(i => i.id === 'ring_unquenchable_thirst');
    expect(item).toBeDefined();
    expect(parseDeathWard(item!.descriptionRu)).toBeNull();
  });
});
