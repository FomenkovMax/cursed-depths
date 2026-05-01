import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { RACES, CLASSES } from '@/lib/game-data';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { telegramId, name, race, className } = body;

    if (!telegramId || !name || !race || !className) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if player already exists
    const existing = await db.player.findUnique({ where: { telegramId } });
    if (existing) {
      return NextResponse.json({ error: 'Player already exists' }, { status: 400 });
    }

    const raceData = RACES.find(r => r.id === race);
    const classData = CLASSES.find(c => c.id === className);

    if (!raceData || !classData) {
      return NextResponse.json({ error: 'Invalid race or class' }, { status: 400 });
    }

    const strength = 10 + (raceData.bonuses.strength || 0);
    const dexterity = 10 + (raceData.bonuses.dexterity || 0);
    const constitution = 10 + (raceData.bonuses.constitution || 0);
    const intelligence = 10 + (raceData.bonuses.intelligence || 0);
    const wisdom = 10 + (raceData.bonuses.wisdom || 0);
    const charisma = 10 + (raceData.bonuses.charisma || 0);

    const maxHp = classData.baseHp + Math.floor((constitution - 10) / 2);
    const maxMp = classData.baseMp + Math.floor((intelligence - 10) / 2);

    const player = await db.player.create({
      data: {
        telegramId,
        name,
        race,
        class: className,
        strength,
        dexterity,
        constitution,
        intelligence,
        wisdom,
        charisma,
        hp: maxHp,
        maxHp,
        mp: maxMp,
        maxMp,
      },
    });

    // Give starting items
    await db.inventory.createMany({
      data: [
        { playerId: player.id, itemId: 'rusty_sword', name: 'Ржавый меч', type: 'weapon', rarity: 'common', equipped: true, slot: 'weapon', stats: '{"attack":2}', icon: '🗡️' },
        { playerId: player.id, itemId: 'leather_armor', name: 'Кожаная броня', type: 'armor', rarity: 'common', equipped: true, slot: 'chest', stats: '{"defense":2}', icon: '🦺' },
        { playerId: player.id, itemId: 'health_potion', name: 'Зелье здоровья', type: 'consumable', rarity: 'common', stats: '{"healHp":15}', icon: '🧪', quantity: 3 },
      ],
    });

    return NextResponse.json({ success: true, player });
  } catch (error) {
    console.error('Create player error:', error);
    return NextResponse.json({ error: 'Failed to create player' }, { status: 500 });
  }
}
