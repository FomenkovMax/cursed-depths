import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ABILITIES, ENEMIES, ITEMS } from '@/lib/game-data';
import { rollD20, rollDice, getModifier, rollLoot, isCriticalHit } from '@/lib/dice';
import { validateTelegramRequest } from '@/lib/auth';
import { getCached, setCached, CACHE_TTL } from '@/lib/cache';
import { addItemToInventory } from '@/lib/inventory-utils';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  try {
    const body = await req.json();
    const { action } = body; // 'attack', 'spell', 'flee', 'use_item', 'ability'
    const itemId = body.itemId;

    const player = await db.player.findUnique({
      where: { telegramId },
      include: { inventory: true },
    });

    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (!player.inCombat) return NextResponse.json({ error: 'Вы не в бою' }, { status: 400 });
    if (!player.enemyId) return NextResponse.json({ error: 'Нет врага' }, { status: 400 });

    // Fetch enemy data with caching
    const cacheKey = `enemies:id:${player.enemyId}`;
    let enemyTemplate = getCached<typeof ENEMIES[0]>(cacheKey);
    if (!enemyTemplate) {
      enemyTemplate = ENEMIES.find(e => e.id === player.enemyId);
      if (enemyTemplate) {
        setCached(cacheKey, enemyTemplate, CACHE_TTL);
      }
    }

    if (!enemyTemplate) return NextResponse.json({ error: 'Враг не найден' }, { status: 404 });

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

    // Track deferred DB operations for transaction
    let itemToConsume: { id: string; delete: boolean } | null = null;
    const lootItems: { itemData: typeof ITEMS[0]; quantity: number }[] = [];

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

        // Defer item consumption for transaction
        itemToConsume = { id: item.id, delete: item.quantity <= 1 };
      }
    } else if (action === 'ability') {
      const abilityId = body.abilityId;
      const ability = ABILITIES.find(a => a.id === abilityId);

      if (!ability) {
        combatLog.push({ text: 'Способность не найдена!', turn: currentTurn });
      } else if (ability.classId !== player.class) {
        combatLog.push({ text: 'Эта способность не для вашего класса!', turn: currentTurn });
      } else if (ability.level > player.level) {
        combatLog.push({ text: `Нужен уровень ${ability.level}!`, turn: currentTurn });
      } else if (playerMp < ability.mpCost) {
        combatLog.push({ text: `Нужно ${ability.mpCost} MP!`, turn: currentTurn });
      } else if (playerHp <= ability.hpCost) {
        combatLog.push({ text: `Нужно ${ability.hpCost} HP! Вы слишком слабы.`, turn: currentTurn });
      } else {
        // Pay costs
        playerMp -= ability.mpCost;
        playerHp -= ability.hpCost;

        const statBonus = getModifier(player[ability.scalingStat as keyof typeof player] as number);

        // Handle damage abilities
        if (ability.damage) {
          const abilityDamage = rollDice(ability.damage) + statBonus;
          enemyHp = Math.max(0, enemyHp - abilityDamage);
          combatLog.push({
            text: `${ability.icon} ${ability.nameRu}! Урон: ${abilityDamage}${ability.hpCost > 0 ? ` (цена: ${ability.hpCost} HP)` : ''}${ability.mpCost > 0 ? ` (${ability.mpCost} MP)` : ''}`,
            turn: currentTurn,
          });
        }

        // Handle heal abilities
        if (ability.heal) {
          const healAmount = rollDice(ability.heal) + statBonus;
          playerHp = Math.min(player.maxHp, playerHp + healAmount);
          combatLog.push({
            text: `${ability.icon} ${ability.nameRu}! Восстановлено ${healAmount} HP`,
            turn: currentTurn,
          });
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

      // Collect loot items for deferred addition in transaction
      for (const lootItemId of droppedItems) {
        const itemData = ITEMS.find(i => i.id === lootItemId);
        if (itemData) {
          lootItems.push({ itemData, quantity: 1 });
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

    // Wrap all DB writes in a transaction
    const updatedPlayer = await db.$transaction(async (tx) => {
      // Consume used item (if any)
      if (itemToConsume) {
        if (itemToConsume.delete) {
          await tx.inventory.delete({ where: { id: itemToConsume.id } });
        } else {
          await tx.inventory.update({ where: { id: itemToConsume.id }, data: { quantity: { decrement: 1 } } });
        }
      }

      // Add loot items to inventory
      for (const loot of lootItems) {
        await addItemToInventory({
          playerId: player.id,
          itemId: loot.itemData.id,
          name: loot.itemData.nameRu,
          type: loot.itemData.type,
          rarity: loot.itemData.rarity,
          stats: JSON.stringify(loot.itemData.stats),
          icon: loot.itemData.icon,
          quantity: loot.quantity,
        }, tx);
      }

      // Update player state
      return tx.player.update({
        where: { telegramId },
        data: updateData,
        include: { inventory: true },
      });
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
  } catch (error) {
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
