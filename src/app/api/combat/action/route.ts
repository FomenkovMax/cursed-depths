import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ENEMIES, ITEMS } from '@/lib/game-data';
import { rollD20, rollDice, getModifier, rollLoot, isCriticalHit } from '@/lib/dice';
import { validateTelegramRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  const body = await req.json();
  const { action } = body; // 'attack', 'spell', 'flee', 'use_item'
  const itemId = body.itemId;

  const player = await db.player.findUnique({
    where: { telegramId },
    include: { inventory: true },
  });

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  if (!player.inCombat) return NextResponse.json({ error: 'Not in combat' }, { status: 400 });
  if (!player.enemyId) return NextResponse.json({ error: 'No enemy' }, { status: 400 });

  const enemyTemplate = ENEMIES.find(e => e.id === player.enemyId);
  if (!enemyTemplate) return NextResponse.json({ error: 'Enemy not found' }, { status: 404 });

  let combatLog: { text: string; turn: number }[] = [];
  try {
    combatLog = player.combatLog ? JSON.parse(player.combatLog) : [];
  } catch { combatLog = []; }

  const currentTurn = combatLog.length;
  let enemyHp = player.enemyHp || 0;
  let playerHp = player.hp;
  let playerMp = player.mp;
  let combatOver = false;
  let playerWon = false;
  let playerFled = false;
  let xpGained = 0;
  let goldGained = 0;
  const droppedItems: string[] = [];

  // Player action
  if (action === 'flee') {
    const fleeRoll = rollD20() + getModifier(player.dexterity);
    if (fleeRoll > enemyTemplate.ac) {
      playerFled = true;
      combatOver = true;
      combatLog.push({ text: `Вы сбежали от ${enemyTemplate.nameRu}!`, turn: currentTurn });
    } else {
      combatLog.push({ text: `Побег не удался!`, turn: currentTurn });
    }
  } else if (action === 'attack') {
    const roll = rollD20();
    const attackMod = getModifier(player.strength);
    // Check equipped weapon for attack bonus
    const weapon = player.inventory.find(i => i.equipped && i.slot === 'weapon');
    const weaponBonus = weapon?.stats ? (JSON.parse(weapon.stats).attack || 0) : 0;
    const totalAttack = roll + attackMod + weaponBonus;

    if (roll === 20 || totalAttack >= enemyTemplate.ac) {
      const crit = isCriticalHit(roll);
      const damage = rollDice(enemyTemplate.damage) + getModifier(player.strength) + weaponBonus + (crit ? rollDice(enemyTemplate.damage) : 0);
      enemyHp = Math.max(0, enemyHp - damage);
      combatLog.push({
        text: `Вы атакуете! Бросок: ${roll}+${attackMod}+${weaponBonus}=${totalAttack}. ${crit ? 'КРИТИЧЕСКИЙ УДАР! ' : ''}Урон: ${damage}`,
        turn: currentTurn,
      });
    } else {
      combatLog.push({ text: `Вы атакуете! Бросок: ${roll}+${attackMod}+${weaponBonus}=${totalAttack}. Промах!`, turn: currentTurn });
    }
  } else if (action === 'spell') {
    if (playerMp < 3) {
      combatLog.push({ text: 'Недостаточно маны для заклинания!', turn: currentTurn });
    } else {
      playerMp -= 3;
      const spellDamage = rollDice('2d6') + getModifier(player.intelligence);
      enemyHp = Math.max(0, enemyHp - spellDamage);
      combatLog.push({ text: `Вы произносите заклинание! Урон: ${spellDamage}`, turn: currentTurn });
    }
  } else if (action === 'use_item') {
    const item = player.inventory.find(i => i.itemId === itemId && i.type === 'consumable');
    if (!item) {
      combatLog.push({ text: 'Предмет не найден!', turn: currentTurn });
    } else {
      const stats = item.stats ? JSON.parse(item.stats) : {};
      if (stats.healHp) {
        playerHp = Math.min(player.maxHp, playerHp + stats.healHp);
        combatLog.push({ text: `Вы использовали ${item.name}. Восстановлено ${stats.healHp} HP.`, turn: currentTurn });
      } else if (stats.damage) {
        enemyHp = Math.max(0, enemyHp - stats.damage);
        combatLog.push({ text: `Вы использовали ${item.name}. Урон: ${stats.damage}`, turn: currentTurn });
      }

      if (item.quantity > 1) {
        await db.inventory.update({ where: { id: item.id }, data: { quantity: { decrement: 1 } } });
      } else {
        await db.inventory.delete({ where: { id: item.id } });
      }
    }
  }

  // Check if enemy is dead
  if (enemyHp <= 0 && !combatOver) {
    combatOver = true;
    playerWon = true;
    xpGained = enemyTemplate.xp;
    goldGained = enemyTemplate.gold + rollDice('1d4') * Math.ceil(player.level / 2);
    droppedItems.push(...rollLoot(enemyTemplate.lootTable));
    combatLog.push({ text: `${enemyTemplate.nameRu} повержен! +${xpGained} XP, +${goldGained} золота`, turn: currentTurn + 1 });

    // Add loot to inventory
    for (const lootItemId of droppedItems) {
      const itemData = ITEMS.find(i => i.id === lootItemId);
      if (itemData) {
        await db.inventory.create({
          data: {
            playerId: player.id,
            itemId: itemData.id,
            name: itemData.nameRu,
            type: itemData.type,
            rarity: itemData.rarity,
            stats: JSON.stringify(itemData.stats),
            icon: itemData.icon,
            quantity: 1,
          },
        });
        combatLog.push({ text: `Найдено: ${itemData.nameRu}!`, turn: currentTurn + 1 });
      }
    }
  }

  // Enemy attacks back if not dead and not fled
  if (!combatOver && !playerFled) {
    const enemyRoll = rollD20();
    const playerAc = 10 + getModifier(player.dexterity);
    const armorItem = player.inventory.find(i => i.equipped && i.type === 'armor');
    const armorBonus = armorItem?.stats ? (JSON.parse(armorItem.stats).defense || 0) : 0;
    const totalAc = playerAc + armorBonus;

    if (enemyRoll >= totalAc) {
      const enemyDamage = rollDice(enemyTemplate.damage);
      playerHp = Math.max(0, playerHp - enemyDamage);
      combatLog.push({ text: `${enemyTemplate.nameRu} атакует! Урон: ${enemyDamage}`, turn: currentTurn + 1 });
    } else {
      combatLog.push({ text: `${enemyTemplate.nameRu} атакует, но промахивается!`, turn: currentTurn + 1 });
    }
  }

  // Check if player is dead
  if (playerHp <= 0) {
    combatOver = true;
    combatLog.push({ text: 'Вы погибли! Вернитесь в таверну для восстановления.', turn: currentTurn + 2 });
  }

  // Check level up
  let leveledUp = false;
  let newXp = player.xp + xpGained;
  let newLevel = player.level;
  let newXpToNext = player.xpToNext;
  while (newXp >= newXpToNext) {
    newXp -= newXpToNext;
    newLevel++;
    newXpToNext = newLevel * 100;
    leveledUp = true;
  }

  // Update player
  const updateData: Record<string, unknown> = {
    hp: playerHp,
    mp: playerMp,
    combatLog: JSON.stringify(combatLog),
    xp: newXp,
    gold: { increment: goldGained },
  };

  if (leveledUp) {
    updateData.level = newLevel;
    updateData.xpToNext = newXpToNext;
    const newMaxHp = player.maxHp + rollDice('1d8');
    updateData.maxHp = newMaxHp;
    updateData.hp = newMaxHp; // Full heal on level up
  }

  if (combatOver) {
    updateData.inCombat = false;
    updateData.enemyId = null;
    updateData.enemyHp = null;
    updateData.enemyMaxHp = null;

    if (playerHp <= 0) {
      // Player died - teleport to town with 1 HP
      updateData.hp = 1;
      updateData.locationId = 'town';
    }
  } else {
    updateData.enemyHp = enemyHp;
  }

  const updatedPlayer = await db.player.update({
    where: { telegramId },
    data: updateData,
    include: { inventory: true },
  });

  return NextResponse.json({
    combatLog: combatLog.slice(-5), // Last 5 entries
    player: updatedPlayer,
    combatOver,
    playerWon,
    playerFled,
    enemyHp,
    enemyMaxHp: player.enemyMaxHp,
    xpGained,
    goldGained,
    droppedItems,
    leveledUp,
  });
}
