import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ENEMIES, LOCATIONS, ITEMS } from '@/lib/game-data';
import { rollDice, rollLoot } from '@/lib/dice';
import { validateTelegramRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  const player = await db.player.findUnique({ where: { telegramId } });
  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  if (player.inCombat) return NextResponse.json({ error: 'Already in combat' }, { status: 400 });
  if (player.hp <= 0) return NextResponse.json({ error: 'You are dead. Rest at the tavern.' }, { status: 400 });

  const location = LOCATIONS.find(l => l.id === player.locationId);
  if (!location) return NextResponse.json({ error: 'Invalid location' }, { status: 400 });

  if (player.locationId === 'town' || player.locationId === 'market') {
    // Safe locations - find items or nothing
    const goldFound = rollDice('1d4') * player.level;
    const updated = await db.player.update({
      where: { telegramId },
      data: { gold: { increment: goldFound } },
    });
    return NextResponse.json({
      type: 'safe',
      message: `Вы осмотрели окрестности и нашли ${goldFound} золота.`,
      goldFound,
      player: updated,
    });
  }

  // Dangerous location - random encounter chance
  const encounterChance = 0.6;
  if (Math.random() < encounterChance) {
    // Combat encounter
    const locationEnemies = ENEMIES.filter(e => e.locationId === player.locationId && !e.isBoss);
    if (locationEnemies.length === 0) {
      return NextResponse.json({ type: 'empty', message: 'Пусто... Никаких врагов не найдено.' });
    }

    const enemy = locationEnemies[Math.floor(Math.random() * locationEnemies.length)];
    const enemyHp = enemy.hp + Math.floor(Math.random() * 5);

    const updated = await db.player.update({
      where: { telegramId },
      data: {
        inCombat: true,
        enemyId: enemy.id,
        enemyHp,
        enemyMaxHp: enemyHp,
        combatLog: JSON.stringify([{ text: `${enemy.nameRu} появляется!`, turn: 0 }]),
      },
    });

    return NextResponse.json({
      type: 'combat',
      message: `Вы встретили ${enemy.nameRu}!`,
      enemy: { ...enemy, hp: enemyHp, maxHp: enemyHp },
      player: updated,
    });
  }

  // Exploration - find items or gold
  const goldFound = rollDice('2d4') * player.level;
  const foundItems: string[] = [];

  // Random item drop
  const commonItems = ITEMS.filter(i => i.rarity === 'common' && i.type !== 'quest');
  if (commonItems.length > 0 && Math.random() < 0.3) {
    const item = commonItems[Math.floor(Math.random() * commonItems.length)];
    foundItems.push(item.id);

    await db.inventory.create({
      data: {
        playerId: player.id,
        itemId: item.id,
        name: item.nameRu,
        type: item.type,
        rarity: item.rarity,
        stats: JSON.stringify(item.stats),
        icon: item.icon,
        quantity: 1,
      },
    });
  }

  const updated = await db.player.update({
    where: { telegramId },
    data: { gold: { increment: goldFound } },
  });

  return NextResponse.json({
    type: 'explore',
    message: `Вы исследовали ${location.nameRu} и нашли ${goldFound} золота!`,
    goldFound,
    foundItems,
    player: updated,
  });
}
