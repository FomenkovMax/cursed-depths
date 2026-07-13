import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { ENEMIES, ITEMS } from '@/lib/game-data';
import { rollDice, rollLoot } from '@/lib/dice';
import { validateTelegramRequest } from '@/lib/auth';
import { getCached, setCached, CACHE_TTL } from '@/lib/cache';
import { addItemToInventory } from '@/lib/economy/inventory-utils';
import {
  basicAttackDamage,
  mitigateDamage,
  manaCostForStage,
  stageUnlockLevel,
  resolveAbility,
  extractBossOverridePercent,
  EFFECT_DURATION_TURNS,
  type PlayerCombatStats,
} from '@/lib/combat/combat-engine';
import {
  initBossState,
  applyDamageToBoss,
  resolveBossTurn,
  bossAcMultiplier,
  adaptiveResistMultiplier,
  playerDamageMultiplier,
  blockRandomMechanics,
  tickBlockedMechanics,
  type BossFightState,
} from '@/lib/combat/boss-mechanics';
import { addActiveEffect, activeEffectBonus, tickActiveEffects, tickCooldowns, applyDamageToPlayerShield, armEffect, consumeArmedEffects, peekArmedEffectPercent } from '@/lib/combat/combat-effects';
import { parsePassiveEffect, type PassiveEffect } from '@/lib/combat/passive-engine';
import {
  parseDeathWard,
  parseArmedEffects,
  parseImmediateSelfBuff,
  parseExecute,
  parseActivatedOnBlockCounter,
  parseDebuffAmplify,
  type DeathWardEffect,
} from '@/lib/combat/conditional-ability-engine';
import {
  PASSIVE_CRIT_MULTIPLIER,
  hpThresholdBonuses,
  unconditionalBonuses,
  critEveryNHits,
  hitsTakenEveryNHeal,
  dodgeChancePercent,
  reflectChancePercent,
  counterBurnChances,
  counterDamageFlatPercent,
  turnIntervalEmpowered,
  damageVsDebuffedEnemyBonus,
  damageVsShieldedEnemyBonus,
  enemyDebuffStackDrainDamage,
  perTurnLifestealFromEnemyPercent,
  onVictoryHealPercent,
  deathSaveHealPercent,
  hasRootImmune,
  onDefendDefenseBonus,
  hasFirstAttackCrit,
  onBlockHealPercent,
  onBlockCounterPercent,
  healChanceCleanseCurseChance,
  enemyHealCapPercent,
} from '@/lib/combat/passive-runtime';
import { computeEquipmentBonuses } from '@/lib/combat/equipment-stats';
import { incrementQuestProgress } from '@/lib/economy/quests';
import { findDungeon } from '@/lib/combat/dungeons';
import { findTrial, type TrialRoomOption } from '@/lib/combat/trials';
import { rollGearInstance, rollCurrencyDrop } from '@/lib/economy/item-affixes';
import { rollTemperScrollDrop } from '@/lib/economy/item-enhancement';
import { LEAGUE_POINTS } from '@/lib/social/pvp-season';
import { enforceActionCooldown, ActionCooldownError } from '@/lib/economy/rate-limit';
import { dungeonModifierEffect, heatLevelEffect, multiplyEffects } from '@/lib/combat/dungeon-modifiers';
import { abyssScaling, abyssEnemyIdForDepth, isEliteDepth } from '@/lib/combat/abyss';
import { FORTRESS_ID, CONTROL_GOLD_BONUS } from '@/lib/social/fortress';
import { bossIntroLine, deathMessage } from '@/lib/combat/exploration-flavor';
import { isPremiumActive, PREMIUM_GOLD_XP_MULT, isDeathDebuffActive, DEATH_DEBUFF_XP_MULT, DEATH_DEBUFF_HOURS } from '@/lib/premium/premium-shop';
import { findPet } from '@/lib/economy/pets';
import { battlePassXpForKill, effectiveBattlePassXp } from '@/lib/premium/battle-pass';
import { currentSeasonId } from '@/lib/social/seasons';
import { TOME_DROP_CHANCE, pickUncollectedTome } from '@/lib/economy/recipe-tomes';
import { rarestBossDrop, pityCapFor } from '@/lib/social/boss-trophies';
import { guildGoldMultBonus, guildXpMultBonus } from '@/lib/social/guild-upgrades';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  try {
    const body = await req.json();
    const { action } = body; // 'attack', 'ability', 'flee', 'use_item', 'defend'
    const itemId = body.itemId;

    const player = await db.player.findUnique({
      where: { telegramId },
      include: { inventory: true, class: { include: { abilities: true } }, guildMember: true, bossTrophies: { select: { enemyId: true, pityCounter: true } }, recipes: { select: { recipeId: true } } },
    });

    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (!player.inCombat) return NextResponse.json({ error: 'Вы не в бою' }, { status: 400 });
    if (!player.enemyId) return NextResponse.json({ error: 'Нет врага' }, { status: 400 });
    await enforceActionCooldown(db, player.id);

    // Fetch enemy data with caching
    const cacheKey = `enemies:id:${player.enemyId}`;
    let enemyTemplate = getCached<typeof ENEMIES[0]>(cacheKey);
    if (!enemyTemplate) {
      enemyTemplate = ENEMIES.find(e => e.id === player.enemyId) ?? null;
      if (enemyTemplate) {
        setCached(cacheKey, enemyTemplate, CACHE_TTL);
      }
    }

    if (!enemyTemplate) return NextResponse.json({ error: 'Враг не найден' }, { status: 404 });

    let combatLog: { text: string; turn: number }[] = [];
    try {
      combatLog = player.combatLog ? JSON.parse(player.combatLog) : [];
    } catch { combatLog = []; }

    let bossState: BossFightState;
    try {
      // Мёржим поверх свежего initBossState(), а не доверяем распарсенному JSON целиком —
      // bossState персистится в БД поле игрока и переживает деплои. Каждое поле, добавленное
      // в BossFightState за время этой сессии (activeEffects, armedEffects, abilityCooldowns,
      // poisonCured, blockedMechanics и т.д.), отсутствовало бы в JSON боя, начатого ДО
      // деплоя с этим полем — без мёржа JSON.parse "успешно" вернул бы объект без него, и
      // первая же попытка его использовать (напр. tickBlockedMechanics -> .map на undefined)
      // валила бы весь эндпоинт с 500 для игрока посреди боя.
      bossState = player.bossState ? { ...initBossState(enemyTemplate.mechanics), ...JSON.parse(player.bossState) } : initBossState(enemyTemplate.mechanics);
    } catch { bossState = initBossState(enemyTemplate.mechanics); }

    const currentTurn = combatLog.length;
    let enemyHp = player.enemyHp || 0;
    const enemyMaxHp = player.enemyMaxHp || enemyHp;
    let playerHp = player.hp;
    let playerMp = player.mp;
    let combatOver = false;
    let playerWon = false;
    let playerFled = false;
    let xpGained = 0;
    let goldGained = 0;
    let bossTrophyGained: string | null = null;
    let trophyPityCounter: number | null = null;
    let battlePassXpGained = 0;
    const droppedItems: string[] = [];
    // Модификатор забега по данжу (lib/combat/dungeon-modifiers.ts) — два независимых слоя,
    // перемножаемых друг на друга: случайный dungeonModifierId (роллится при входе) и
    // dungeonHeatLevel — риск, который игрок ВЫБРАЛ сам перед входом (см. dungeon/start).
    // Множители 1 по всем осям, если игрок не в данже.
    const dungeonEffect = player.dungeonId
      ? multiplyEffects(dungeonModifierEffect(player.dungeonModifierId), heatLevelEffect(player.dungeonHeatLevel))
      : dungeonModifierEffect(null);
    // Масштабирование Бездонного Разлома (lib/combat/abyss.ts) — растёт с глубиной, взаимоисключающе
    // с dungeonEffect (игрок не может быть одновременно в данже и в Разломе).
    const abyssEffect = player.abyssDepth > 0 ? abyssScaling(player.abyssDepth) : { hpMult: 1, damageMult: 1, goldMult: 1, xpMult: 1 };
    // Крепость (lib/social/fortress.ts) — гильдия, контролирующая Крепость на текущей неделе, даёт
    // всем своим участникам +10% золота с ЛЮБОГО боя (не только в данже/Разломе), независимо
    // от dungeonEffect/abyssEffect выше — умножается поверх них.
    let fortressGoldMult = 1;
    if (player.guildMember) {
      const fortress = await db.fortress.findUnique({ where: { id: FORTRESS_ID } });
      if (fortress?.controllingGuildId === player.guildMember.guildId) {
        fortressGoldMult = 1 + CONTROL_GOLD_BONUS;
      }
    }
    // Премиум-статус (lib/premium/premium-shop.ts, куплен за Осколки Короны) — +15% золота и опыта с
    // ЛЮБОГО боя, умножается поверх всех остальных множителей выше, тот же приём, что fortressGoldMult.
    const premiumMult = isPremiumActive(player.premiumUntil) ? PREMIUM_GOLD_XP_MULT : 1;
    // Дебафф смерти (-15% опыта, премиум иммунен) умножается ОТДЕЛЬНО от premiumMult — оба не
    // могут быть активны одновременно (isDeathDebuffActive сама проверяет премиум), но пишем
    // как самостоятельный множитель, а не ветку внутри premiumMult, чтобы логика была явной.
    const xpMultTotal = premiumMult * (isDeathDebuffActive(player.deathDebuffUntil, player.premiumUntil) ? DEATH_DEBUFF_XP_MULT : 1);
    // Именной легендарный перстень "Неутолимая Жажда" (аудит 3, C2) — уникальный эффект вместо
    // плоского стата: +20% золота и опыта с любого боя, пока экипирован. Прямая проверка itemId,
    // без парсинга текста — тот же приём, что у premiumMult/fortressGoldMult выше.
    const uniqueItemGoldXpMult = player.inventory.some(i => i.equipped && i.itemId === 'ring_unquenchable_thirst') ? 1.2 : 1;
    // Гильдейское дерево построек (аудит 4.1, D2, lib/social/guild-upgrades.ts) — постоянные пассивные
    // бонусы, разблокированные лидером за казну, накопленную пожертвованиями участников.
    // Умножается поверх всех остальных множителей выше, тот же приём, что fortressGoldMult.
    let guildGoldMult = 1;
    let guildXpMult = 1;
    if (player.guildMember) {
      const unlockedGuildUpgrades = await db.guildUpgrade.findMany({
        where: { guildId: player.guildMember.guildId },
        select: { upgradeId: true },
      });
      const unlockedIds = new Set(unlockedGuildUpgrades.map(u => u.upgradeId));
      guildGoldMult = 1 + guildGoldMultBonus(unlockedIds);
      guildXpMult = 1 + guildXpMultBonus(unlockedIds);
    }

    // Track deferred DB operations for transaction
    let itemToConsume: { id: string; delete: boolean } | null = null;
    const lootItems: { itemData: typeof ITEMS[0]; quantity: number }[] = [];
    // Эликсир Мощи и аналоги — устанавливается при использовании, применяется к updateData ниже.
    let consumableBuffUpdate: { attackBonus: number; fightsLeft: number } | null = null;

    // Бонусы экипировки (оружие/броня/аксессуары) + активного питомца (lib/economy/pets.ts) — единая
    // точка подсчёта, см. lib/combat/equipment-stats.ts
    const activePet = player.activePetId ? findPet(player.activePetId) : null;
    const equipBonuses = computeEquipmentBonuses(player.inventory, activePet);
    const effectiveMaxHp = player.maxHp + equipBonuses.hp;
    const effectiveMaxMp = player.maxMp + equipBonuses.mp;
    const effectiveVitality = player.vitality + equipBonuses.vitality;

    const combatStats: PlayerCombatStats = {
      strength: player.strength + equipBonuses.strength,
      dexterity: player.dexterity + equipBonuses.dexterity,
      vitality: effectiveVitality,
      intellect: player.intellect + equipBonuses.intellect,
      willpower: player.willpower + equipBonuses.willpower,
      instinct: player.instinct + equipBonuses.instinct,
      level: player.level,
      primaryStat: player.class.primaryStat,
    };

    // + временный бонус атаки от Эликсира Мощи (elixir_power) — действует пока consumableFightsLeft > 0.
    const weaponBonus = equipBonuses.attack + (player.consumableFightsLeft > 0 ? player.consumableAttackBonus : 0);

    // Пассивки игрока (открытые по уровню) — разобраны эвристически, см. lib/combat/passive-engine.ts.
    const playerPassives: PassiveEffect[] = player.class.abilities
      .filter(a => a.type === 'passive' && player.level >= stageUnlockLevel(a.stage))
      .map(a => parsePassiveEffect(a.description))
      .filter((e): e is PassiveEffect => e !== null);
    const hpPercentAtTurnStart = effectiveMaxHp > 0 ? (playerHp / effectiveMaxHp) * 100 : 100;
    const thresholdBonus = hpThresholdBonuses(playerPassives, hpPercentAtTurnStart);
    const uncondBonus = unconditionalBonuses(playerPassives);
    const totalHealingBonus = thresholdBonus.healingBonusPercent + uncondBonus.healingBonusPercent;

    /**
     * Инкрементирует счётчик ударов и считает множитель от "каждый N-й удар"/"раз в N ударов"
     * пассивок + снимает "заряженные" одноразовые эффекты (см. lib/combat/conditional-ability-engine.ts),
     * ждавшие следующей результативной атаки/способности игрока.
     */
    function applyPassiveOffenseBonuses(forceCrit = false): { mult: number; messages: string[]; lifestealPercent: number; ignoreDefensePercent: number } {
      bossState.playerAttackCount += 1;
      const critN = critEveryNHits(playerPassives);
      const firstAttackCrit = bossState.playerAttackCount === 1 && hasFirstAttackCrit(playerPassives);
      const armedCrit = consumeArmedEffects(bossState, 'next_attack_crit').count > 0;
      const isCrit = forceCrit || firstAttackCrit || armedCrit || (critN !== null && bossState.playerAttackCount % critN === 0);
      let intervalBonus = 0;
      for (const iv of turnIntervalEmpowered(playerPassives)) {
        if (bossState.playerAttackCount % iv.everyTurns === 0) intervalBonus += iv.damageMultBonus;
      }
      const armedBoost = consumeArmedEffects(bossState, 'boost_next_outgoing').percent;
      const lifestealPercent = consumeArmedEffects(bossState, 'next_attack_lifesteal').percent;
      const ignoreDefensePercent = consumeArmedEffects(bossState, 'next_attack_ignore_defense').percent;

      const messages: string[] = [];
      if (isCrit) messages.push('Критический удар!');
      if (intervalBonus > 0) messages.push('Способность усилена нарастающей мощью!');
      if (armedBoost > 0) messages.push('Заряженная атака усилена!');
      else if (armedBoost < 0) messages.push('Заряженная атака ослаблена побочным эффектом!');
      const mult = Math.max(0, (isCrit ? PASSIVE_CRIT_MULTIPLIER : 1) * (1 + intervalBonus + armedBoost));
      return { mult, messages, lifestealPercent, ignoreDefensePercent };
    }

    /** Шанс снять стак проклятия (лечение-с-проклятием боссов) при собственном лечении — fiery-sermon. */
    function tryCleanseCurseOnHeal(): string | null {
      const chance = healChanceCleanseCurseChance(playerPassives);
      if (chance <= 0 || bossState.curseStacks <= 0) return null;
      if (Math.random() >= chance) return null;
      bossState.curseStacks -= 1;
      return 'Пламенная проповедь снимает стак проклятия!';
    }

    // Защита босса (форма/берсерк/почти-неуязвимость) временно меняет его эффективный AC
    const effectiveAc = Math.max(1, Math.round(enemyTemplate.ac * bossAcMultiplier(enemyTemplate.mechanics, bossState)));
    // Окно уязвимости расходуется на текущее действие вне зависимости от его исхода
    bossState.vulnerableNextTurn = false;
    // Проклятие от лечения-с-проклятием (Сердце Айлет) кумулятивно ослабляет урон игрока
    const curseMult = playerDamageMultiplier(enemyTemplate.mechanics, bossState);

    // Множитель урона игрока от пассивок: пороговые по ХП + безусловные + многоходовые баффы
    // от активных способностей + бонусы "по ослабленному"/"по защищённому щитом" врагу.
    // "Ослаблен дебаффом" и "с пониженной защитой" приближены одним сигналом — активным
    // enemy_damage_debuff от способностей игрока (в движке нет отдельного состояния врага).
    const enemyCurrentlyDebuffed = activeEffectBonus(bossState, 'enemy_damage_debuff') > 0;
    const enemyCurrentlyShielded = bossState.shieldHp > 0 && !bossState.shieldBroken;
    const passiveDamageMult = 1
      + thresholdBonus.damageMultBonus
      + uncondBonus.damageMultBonus
      + damageVsDebuffedEnemyBonus(playerPassives, enemyCurrentlyDebuffed)
      + damageVsShieldedEnemyBonus(playerPassives, enemyCurrentlyShielded)
      + activeEffectBonus(bossState, 'player_damage_buff');

    // Обездвиживание корнями с предыдущего хода отменяет текущее действие игрока целиком
    // (кроме пассивок с иммунитетом к обездвиживанию, напр. steadfastness).
    let actionNegated = false;
    if (bossState.playerRooted) {
      bossState.playerRooted = false;
      if (hasRootImmune(playerPassives)) {
        combatLog.push({ text: 'Несокрушимая воля позволяет вам преодолеть обездвиживание!', turn: currentTurn });
      } else {
        actionNegated = true;
        combatLog.push({ text: 'Вы скованы корнями-ловушками и не можете действовать!', turn: currentTurn });
      }
    }

    // Player action
    if (actionNegated) {
      // действие игрока отменено обездвиживанием — переходим сразу к ходу врага
    } else if (action === 'flee') {
      const fleeChance = 0.5 + player.dexterity / 200; // выше Ловкость — выше шанс сбежать
      if (Math.random() < fleeChance) {
        playerFled = true;
        combatOver = true;
        combatLog.push({ text: `Вы сбежали от ${enemyTemplate.nameRu}!`, turn: currentTurn });
      } else {
        combatLog.push({ text: 'Побег не удался!', turn: currentTurn });
      }
    } else if (action === 'defend') {
      bossState.playerDefendedLastTurn = true;
      combatLog.push({ text: 'Вы приняли защитную стойку.', turn: currentTurn });
    } else if (action === 'attack') {
      const resist = adaptiveResistMultiplier(enemyTemplate.mechanics, bossState, 'attack');
      const { mult: offenseMult, messages: offenseMsgs, lifestealPercent, ignoreDefensePercent } = applyPassiveOffenseBonuses();
      const attackAc = ignoreDefensePercent > 0 ? Math.max(1, Math.round(effectiveAc * (1 - ignoreDefensePercent))) : effectiveAc;
      const rawDamage = Math.round(mitigateDamage(basicAttackDamage(combatStats) + weaponBonus, attackAc) * curseMult * resist * passiveDamageMult * offenseMult);
      const { hpDamage, messages } = applyDamageToBoss(enemyTemplate.mechanics, bossState, rawDamage);
      enemyHp = Math.max(0, enemyHp - hpDamage);
      const absorbed = rawDamage > 0 && hpDamage === 0;
      combatLog.push({ text: absorbed ? 'Вы атакуете! Урон поглощён щитом.' : `Вы атакуете! Урон: ${hpDamage}`, turn: currentTurn });
      if (resist < 1) combatLog.push({ text: 'Враг адаптировался к этому типу урона!', turn: currentTurn });
      for (const m of [...offenseMsgs, ...messages]) combatLog.push({ text: m, turn: currentTurn });
      if (lifestealPercent > 0 && hpDamage > 0) {
        const stolen = Math.round(hpDamage * lifestealPercent);
        if (stolen > 0) {
          playerHp = Math.min(effectiveMaxHp, playerHp + stolen);
          combatLog.push({ text: `Заряженная атака исцеляет вас на ${stolen} ХП!`, turn: currentTurn });
        }
      }
    } else if (action === 'use_item') {
      const item = player.inventory.find(i => i.itemId === itemId && i.type === 'consumable');
      if (!item) {
        combatLog.push({ text: 'Предмет не найден!', turn: currentTurn });
      } else {
        const stats = item.stats ? JSON.parse(item.stats) : {};
        if (stats.healHp) {
          const healAmount = Math.round(stats.healHp * (1 + totalHealingBonus));
          playerHp = Math.min(effectiveMaxHp, playerHp + healAmount);
          combatLog.push({ text: `Вы использовали ${item.name}. Восстановлено ${healAmount} HP.`, turn: currentTurn });
          const cleanseMsg = tryCleanseCurseOnHeal();
          if (cleanseMsg) combatLog.push({ text: cleanseMsg, turn: currentTurn });
        } else if (stats.healMp) {
          playerMp = Math.min(effectiveMaxMp, playerMp + stats.healMp);
          combatLog.push({ text: `Вы использовали ${item.name}. Восстановлено ${stats.healMp} MP.`, turn: currentTurn });
        } else if (stats.damage) {
          const itemDamage = Math.round(stats.damage * curseMult);
          const { hpDamage, messages } = applyDamageToBoss(enemyTemplate.mechanics, bossState, itemDamage);
          enemyHp = Math.max(0, enemyHp - hpDamage);
          const absorbed = itemDamage > 0 && hpDamage === 0;
          combatLog.push({ text: absorbed ? `Вы использовали ${item.name}. Урон поглощён щитом.` : `Вы использовали ${item.name}. Урон: ${hpDamage}`, turn: currentTurn });
          for (const m of messages) combatLog.push({ text: m, turn: currentTurn });
        } else if (stats.curePoison) {
          bossState.poisonCured = true;
          combatLog.push({ text: `Вы использовали ${item.name}. Продолжающийся урон (яд/горение) больше не действует в этом бою.`, turn: currentTurn });
        } else if (stats.attack && stats.duration) {
          consumableBuffUpdate = { attackBonus: stats.attack, fightsLeft: stats.duration };
          combatLog.push({ text: `Вы использовали ${item.name}. Урон усилен на +${stats.attack} на ${stats.duration} боёв.`, turn: currentTurn });
        }

        // Defer item consumption for transaction
        itemToConsume = { id: item.id, delete: item.quantity <= 1 };
      }
    } else if (action === 'ability') {
      const abilityId = body.abilityId;
      const ability = player.class.abilities.find(a => a.id === abilityId);

      if (!ability) {
        combatLog.push({ text: 'Способность не найдена!', turn: currentTurn });
      } else if (ability.type !== 'active') {
        combatLog.push({ text: 'Эта способность пассивна и не используется в бою напрямую!', turn: currentTurn });
      } else if (player.level < stageUnlockLevel(ability.stage)) {
        combatLog.push({ text: `Нужен уровень ${stageUnlockLevel(ability.stage)}!`, turn: currentTurn });
      } else if (parseDeathWard(ability.description)) {
        // "Обереги от смерти" (Последняя воля, Несокрушимый и т.п.) срабатывают САМИ при смертельном
        // ударе — их нельзя скастовать вручную, см. lib/combat/conditional-ability-engine.ts.
        combatLog.push({ text: 'Эта способность срабатывает автоматически при смертельном ударе — использовать её вручную нельзя.', turn: currentTurn });
      } else if ((bossState.abilityCooldowns[ability.slug] ?? 0) > 0) {
        combatLog.push({ text: `${ability.icon} ${ability.name} ещё перезаряжается: осталось ${bossState.abilityCooldowns[ability.slug]} х.`, turn: currentTurn });
      } else {
        const manaCost = manaCostForStage(ability.stage);
        const armedSpecs = parseArmedEffects(ability.description);
        const onBlockCounterSpec = parseActivatedOnBlockCounter(ability.description);
        const debuffAmplifySpec = parseDebuffAmplify(ability.description);
        const executeSpec = parseExecute(ability.description);
        const immediateSelfBuff = parseImmediateSelfBuff(ability.description);

        // Ability.bossNote — авторский боссовый овверайд процента (см. combat-engine.ts
        // extractBossOverridePercent) для тех "заряженных"/активированных эффектов, что
        // тоже разрешаются здесь, а не через resolveAbility().
        const bossOverridePercent = enemyTemplate.isBoss ? extractBossOverridePercent(ability.bossNote) : null;

        if (playerMp < manaCost) {
          combatLog.push({ text: `Нужно ${manaCost} маны!`, turn: currentTurn });
        } else if (armedSpecs.length > 0) {
          // "Заряженные" одноразовые эффекты (снижает урон следующего удара, следующая атака усилена
          // и т.п.) — не применяются сейчас, а ждут следующего relevant события.
          playerMp -= manaCost;
          for (const spec of armedSpecs) armEffect(bossState, spec.kind, bossOverridePercent ?? spec.percent);
          combatLog.push({ text: `${ability.icon} ${ability.name}! Способность заряжена и сработает при следующем ударе.`, turn: currentTurn });
        } else if (onBlockCounterSpec) {
          // "После блокировки/блока наносит контрудар" — активированная на несколько ходов стойка,
          // в отличие от одноимённых ПАССИВОК (tornak-foundation/bone-spike), которые всегда включены.
          playerMp -= manaCost;
          addActiveEffect(bossState, 'on_block_counter_active', onBlockCounterSpec.percent, EFFECT_DURATION_TURNS);
          combatLog.push({ text: `${ability.icon} ${ability.name}! Контрудар после блока активирован на ${EFFECT_DURATION_TURNS} х.`, turn: currentTurn });
        } else if (debuffAmplifySpec) {
          // "Все последующие дебаффы сильнее" — активированный на несколько ходов усилитель дебаффов.
          playerMp -= manaCost;
          const amplifyPercent = bossOverridePercent ?? debuffAmplifySpec.percent;
          addActiveEffect(bossState, 'debuff_amplify', amplifyPercent, EFFECT_DURATION_TURNS);
          combatLog.push({ text: `${ability.icon} ${ability.name}! Последующие дебаффы усилены на ${Math.round(amplifyPercent * 100)}% на ${EFFECT_DURATION_TURNS} х.`, turn: currentTurn });
        } else if (executeSpec && !enemyTemplate.isBoss && enemyMaxHp > 0 && enemyHp / enemyMaxHp < executeSpec.thresholdPercent) {
          // "Мгновенная казнь" — PvE-порог, боссов сама способность не касается (см. её описание).
          playerMp -= manaCost;
          enemyHp = 0;
          combatLog.push({ text: `${ability.icon} ${ability.name}! Мгновенная казнь!`, turn: currentTurn });
        } else {
          playerMp -= manaCost;
          if (immediateSelfBuff && immediateSelfBuff.cooldownTurns > 0) {
            bossState.abilityCooldowns[ability.slug] = immediateSelfBuff.cooldownTurns;
          }
          // "Следующая атака игнорирует N% брони" может относиться и к способности, не только к
          // обычной атаке — подсматриваем заранее (не снимая), чтобы передать скорректированный AC;
          // реально снимается ниже в applyPassiveOffenseBonuses(), только если способность и правда
          // нанесла урон (иначе заряд не тратится впустую на лечение/щит/бафф/дебафф). "Мгновенный
          // самобафф" (immediateSelfBuff, напр. piercing-blow) относится к ЭТОМУ касту — складывается
          // с заряженным эффектом от предыдущего каста, если оба почему-то активны одновременно.
          const pendingIgnoreDefense = Math.min(0.9, peekArmedEffectPercent(bossState, 'next_attack_ignore_defense') + (immediateSelfBuff?.ignoreDefensePercent ?? 0));
          const abilityAc = pendingIgnoreDefense > 0 ? Math.max(1, Math.round(effectiveAc * (1 - pendingIgnoreDefense))) : effectiveAc;
          const resolution = resolveAbility(ability.description, combatStats, abilityAc, { isBoss: enemyTemplate.isBoss, bossNote: ability.bossNote });

          let damageAbsorbed = false;
          if (resolution.damage > 0) {
            const resist = adaptiveResistMultiplier(enemyTemplate.mechanics, bossState, 'ability');
            const { mult: offenseMult, messages: offenseMsgs, lifestealPercent } = applyPassiveOffenseBonuses(immediateSelfBuff?.guaranteedCrit ?? false);
            const abilityDamage = Math.round(resolution.damage * curseMult * resist * passiveDamageMult * offenseMult);
            const { hpDamage, messages } = applyDamageToBoss(enemyTemplate.mechanics, bossState, abilityDamage);
            enemyHp = Math.max(0, enemyHp - hpDamage);
            damageAbsorbed = hpDamage === 0;
            resolution.damage = hpDamage;
            if (resist < 1) messages.push('Враг адаптировался к этому типу урона!');
            if (lifestealPercent > 0 && hpDamage > 0) {
              const stolen = Math.round(hpDamage * lifestealPercent);
              if (stolen > 0) {
                playerHp = Math.min(effectiveMaxHp, playerHp + stolen);
                messages.push(`Заряженная атака исцеляет вас на ${stolen} ХП!`);
              }
            }
            for (const m of [...offenseMsgs, ...messages]) combatLog.push({ text: m, turn: currentTurn });
          }
          let cleanseMsg: string | null = null;
          if (resolution.heal > 0) {
            resolution.heal = Math.round(resolution.heal * (1 + totalHealingBonus));
            playerHp = Math.min(effectiveMaxHp, playerHp + resolution.heal);
            cleanseMsg = tryCleanseCurseOnHeal();
          }
          if (resolution.shield > 0) {
            bossState.playerShieldHp += resolution.shield;
          }
          if (resolution.enemyDamageReduction > 0 && resolution.effectTurns > 0) {
            // "Гниющий знак" и аналоги — активированный усилитель последующих дебаффов (см. выше).
            const debuffAmp = activeEffectBonus(bossState, 'debuff_amplify');
            const amplifiedReduction = debuffAmp > 0 ? Math.min(0.9, resolution.enemyDamageReduction * (1 + debuffAmp)) : resolution.enemyDamageReduction;
            addActiveEffect(bossState, 'enemy_damage_debuff', amplifiedReduction, resolution.effectTurns);
            resolution.enemyDamageReduction = amplifiedReduction;
          }
          if (resolution.playerDamageBonus > 0 && resolution.effectTurns > 0) {
            addActiveEffect(bossState, 'player_damage_buff', resolution.playerDamageBonus, resolution.effectTurns);
          }
          if (resolution.dodgeBonus > 0 && resolution.effectTurns > 0) {
            addActiveEffect(bossState, 'player_dodge_buff', resolution.dodgeBonus, resolution.effectTurns);
          }
          if (resolution.enemyDotPercent > 0 && resolution.effectTurns > 0) {
            addActiveEffect(bossState, 'enemy_dot', resolution.enemyDotPercent, resolution.effectTurns);
          }
          if (resolution.summonDamage > 0 && resolution.effectTurns > 0) {
            // summonDamage — уже готовое число урона за ход (не процент), см. resolveAbility.
            addActiveEffect(bossState, 'summon_damage', resolution.summonDamage, resolution.effectTurns);
          }
          let blockedSkillLabels: string[] = [];
          if (resolution.blockSkillCount > 0) {
            // У рядовых врагов нет периодических механик вообще — блокировать нечего,
            // blockRandomMechanics корректно вернёт пустой массив в этом случае.
            blockedSkillLabels = blockRandomMechanics(enemyTemplate.mechanics, bossState, resolution.blockSkillCount, resolution.blockSkillTurns);
          }

          const parts = [`${ability.icon} ${ability.name}!`];
          if (damageAbsorbed) parts.push('Урон поглощён щитом.');
          else if (resolution.damage > 0) parts.push(`Урон: ${resolution.damage}`);
          if (resolution.heal > 0) parts.push(`Восстановлено ${resolution.heal} ХП`);
          if (resolution.shield > 0) parts.push(`Щит: ${resolution.shield} ХП`);
          if (resolution.enemyDamageReduction > 0) parts.push(`Враг ослаблен на ${Math.round(resolution.enemyDamageReduction * 100)}% на ${resolution.effectTurns} х.`);
          if (resolution.enemyDotPercent > 0) parts.push(`Враг отравлен: ${Math.round(resolution.enemyDotPercent * 100)}% ХП/ход на ${resolution.effectTurns} х.`);
          if (resolution.playerDamageBonus > 0) parts.push(`Ваш урон усилен на ${Math.round(resolution.playerDamageBonus * 100)}% на ${resolution.effectTurns} х.`);
          if (resolution.dodgeBonus > 0) parts.push(`Шанс уклонения повышен на ${Math.round(resolution.dodgeBonus * 100)}% на ${resolution.effectTurns} х.`);
          if (resolution.summonDamage > 0) parts.push(`Скелет-союзник будет наносить ${resolution.summonDamage} урона в ход (${resolution.effectTurns} х.)`);
          if (resolution.blockSkillCount > 0) {
            parts.push(
              blockedSkillLabels.length > 0
                ? `Заблокирован${blockedSkillLabels.length > 1 ? 'ы' : ''} скилл${blockedSkillLabels.length > 1 ? 'ы' : ''} врага (${blockedSkillLabels.join(', ')}) на ${resolution.blockSkillTurns} х.`
                : 'У врага не нашлось скилла для блокировки.'
            );
          }
          if (resolution.noAllyToTarget) parts.push('В группе нет союзников — способность не подействовала.');
          combatLog.push({ text: parts.join(' '), turn: currentTurn });
          if (cleanseMsg) combatLog.push({ text: cleanseMsg, turn: currentTurn });
        }
      }
    }

    // Реген от пороговых пассивок (tenacity и т.п.) — тикает ДО удара врага в этом же раунде,
    // иначе регенерация после floor(0) делала бы игрока неуязвимым к любому урону (см. commit).
    if (!combatOver && !playerFled && thresholdBonus.regenPercent > 0) {
      const regenAmount = Math.round(effectiveMaxHp * thresholdBonus.regenPercent);
      playerHp = Math.min(effectiveMaxHp, playerHp + regenAmount);
      combatLog.push({ text: `Вы регенерируете ${regenAmount} ХП!`, turn: currentTurn });
    }

    // Пассивные эффекты, тикающие каждый ход независимо от выбранного действия
    // (кража ХП, урон по врагу от накопленных дебаффов, контр-ДоТ от пассивок вроде blood-heat).
    if (!combatOver && !playerFled && enemyHp > 0) {
      const stealPercent = perTurnLifestealFromEnemyPercent(playerPassives);
      if (stealPercent > 0) {
        const stolen = Math.min(enemyHp, Math.round(enemyMaxHp * stealPercent));
        if (stolen > 0) {
          enemyHp = Math.max(0, enemyHp - stolen);
          playerHp = Math.min(effectiveMaxHp, playerHp + stolen);
          combatLog.push({ text: `Вы поглощаете ${stolen} ХП врага!`, turn: currentTurn });
        }
      }

      const debuffStacks = bossState.activeEffects.filter(e => e.kind === 'enemy_damage_debuff').length;
      const drainDamage = enemyDebuffStackDrainDamage(playerPassives, debuffStacks, enemyMaxHp);
      if (drainDamage > 0 && enemyHp > 0) {
        enemyHp = Math.max(0, enemyHp - drainDamage);
        combatLog.push({ text: `Враг теряет ${drainDamage} ХП от гниения реальности!`, turn: currentTurn });
      }

      const enemyDotPercent = activeEffectBonus(bossState, 'enemy_dot');
      if (enemyDotPercent > 0 && enemyHp > 0) {
        const dotDmg = Math.round(enemyMaxHp * enemyDotPercent);
        enemyHp = Math.max(0, enemyHp - dotDmg);
        combatLog.push({ text: `Враг горит! Урон: ${dotDmg}`, turn: currentTurn });
      }

      // summon_damage хранит уже готовое число урона за ход (не процент от enemyMaxHp,
      // в отличие от enemy_dot выше) — см. resolveAbility, ветка 'summon'.
      const summonDmg = activeEffectBonus(bossState, 'summon_damage');
      if (summonDmg > 0 && enemyHp > 0) {
        enemyHp = Math.max(0, enemyHp - summonDmg);
        combatLog.push({ text: `Скелет-союзник наносит урон! Урон: ${summonDmg}`, turn: currentTurn });
      }
    }

    // Check if enemy is dead
    if (enemyHp <= 0 && !combatOver) {
      combatOver = true;
      playerWon = true;
      xpGained = Math.round(enemyTemplate.xp * dungeonEffect.xpMult * abyssEffect.xpMult * xpMultTotal * uniqueItemGoldXpMult * guildXpMult);
      goldGained = Math.round((enemyTemplate.gold + rollDice('1d4') * Math.ceil(player.level / 2)) * dungeonEffect.goldMult * abyssEffect.goldMult * fortressGoldMult * premiumMult * uniqueItemGoldXpMult * guildGoldMult);
      droppedItems.push(...rollLoot(enemyTemplate.lootTable));
      const currencyDrop = rollCurrencyDrop(enemyTemplate.isBoss);
      if (currencyDrop) droppedItems.push(currencyDrop);
      const scrollDrop = rollTemperScrollDrop(enemyTemplate.isBoss);
      if (scrollDrop) droppedItems.push(scrollDrop);
      combatLog.push({ text: `${enemyTemplate.nameRu} повержен! +${xpGained} XP, +${goldGained} золота`, turn: currentTurn + 1 });

      // Комната трофеев (lib/social/boss-trophies.ts) — чисто коллекционная механика, доступна ТОЛЬКО с
      // активным премиумом (не просто "лучше награда" — без премиума счётчик не растёт вовсе).
      if (enemyTemplate.isBoss && premiumMult > 1) {
        bossTrophyGained = enemyTemplate.id;
        const isFirstTrophy = !player.bossTrophies.some(t => t.enemyId === enemyTemplate.id);
        combatLog.push({
          text: isFirstTrophy ? '🎖️ Новый трофей в Комнате трофеев!' : '🎖️ Трофей пополнен — новая победа записана.',
          turn: currentTurn + 1,
        });

        // Pity-счётчик (lib/social/boss-trophies.ts) — гарантирует самый редкий предмет добычи босса не
        // позже pityCapFor(enemyId) побед подряд без него; обычный шанс из lootTable выше уже
        // отработал в rollLoot и мог сам его выдать раньше срока.
        const rarest = rarestBossDrop(enemyTemplate.id);
        if (rarest) {
          const existingPity = player.bossTrophies.find(t => t.enemyId === enemyTemplate.id)?.pityCounter ?? 0;
          if (droppedItems.includes(rarest.itemId)) {
            trophyPityCounter = 0;
          } else if (existingPity + 1 >= pityCapFor(enemyTemplate.id)) {
            droppedItems.push(rarest.itemId);
            trophyPityCounter = 0;
            combatLog.push({ text: '🎯 Счётчик неудач исчерпан — редчайший трофей выпадает гарантированно!', turn: currentTurn + 1 });
          } else {
            trophyPityCounter = existingPity + 1;
          }
        }
      }

      // Боевой пропуск (lib/premium/battle-pass.ts) — очки только пока премиум активен, полный лок,
      // как у Комнаты трофеев (не просто "лучше награда").
      if (premiumMult > 1) {
        battlePassXpGained = battlePassXpForKill(enemyTemplate.xp);
      }

      // Тома рецептов (lib/economy/recipe-tomes.ts) — премиум-эксклюзивный ДОПОЛНИТЕЛЬНЫЙ источник тех
      // же 6 чертежей тира 3, что уже штучно капают всем игрокам из lootTable боссов; F2P-шанс
      // не меняется, премиум просто получает независимый шанс с ЛЮБОЙ победы.
      if (premiumMult > 1) {
        const learnedRecipeIds = new Set(player.recipes.map(r => r.recipeId));
        if (Math.random() < TOME_DROP_CHANCE) {
          const tome = pickUncollectedTome(learnedRecipeIds);
          if (tome) {
            droppedItems.push(tome.id);
            combatLog.push({ text: `📜 Редкая находка: ${tome.nameRu}!`, turn: currentTurn + 1 });
          }
        }
      }

      const victoryHealPercent = onVictoryHealPercent(playerPassives);
      if (victoryHealPercent > 0) {
        const healAmount = Math.round(effectiveMaxHp * victoryHealPercent);
        playerHp = Math.min(effectiveMaxHp, playerHp + healAmount);
        combatLog.push({ text: `Победа восстанавливает вам ${healAmount} ХП!`, turn: currentTurn + 1 });
      }

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
      const armorBonus = equipBonuses.defense;
      const isDefending = action === 'defend' && !actionNegated;
      // "Заряженный" эффект "снижает/блокирует урон следующего удара" (last-line, shield-of-faith
      // и т.п., см. lib/combat/conditional-ability-engine.ts) — снимается ровно на этот удар врага.
      // percent >= 1 означает полную блокировку ("Блокирует следующую атаку") — обрабатывается
      // отдельно ниже как fullyBlocked, а не через обычный 0.9-капped totalReduction.
      const armedBlock = consumeArmedEffects(bossState, 'reduce_next_incoming');
      const fullyBlocked = armedBlock.percent >= 1;
      // Дебафф от способностей игрока (многоходовой, см. combat-effects.ts) + пороговые/безусловные пассивки защиты
      // + бонус брони, пока игрок в защитной стойке (last-bastion и аналоги).
      const enemyDamageReduction = Math.min(0.9, activeEffectBonus(bossState, 'enemy_damage_debuff'));
      const passiveIncomingReduction = Math.min(0.9,
        thresholdBonus.incomingReductionPercent + thresholdBonus.defenseMultBonus + uncondBonus.defenseMultBonus
        + (isDefending ? onDefendDefenseBonus(playerPassives) : 0)
        + (fullyBlocked ? 0 : armedBlock.percent));
      const totalReduction = Math.min(0.9, enemyDamageReduction + passiveIncomingReduction);
      const rawDamage = rollDice(enemyTemplate.damage) * (1 - totalReduction) * dungeonEffect.enemyDamageMult * abyssEffect.damageMult;
      const baseEnemyDamage = Math.max(1, Math.round(mitigateDamage(rawDamage, effectiveVitality) - armorBonus));

      const turnResult = resolveBossTurn(enemyTemplate.mechanics, bossState, enemyHp, enemyMaxHp, baseEnemyDamage, effectiveMaxHp);

      if (turnResult.bossHeal > 0) {
        // Предел самоисцеления врага (depth-silence и аналоги) — врагов, кроме босса, не лечат вообще.
        const healCap = enemyHealCapPercent(playerPassives);
        if (healCap !== null) turnResult.bossHeal = Math.round(turnResult.bossHeal * healCap);
        enemyHp = Math.min(enemyMaxHp, enemyHp + turnResult.bossHeal);
      }

      if (turnResult.healToPlayer > 0) {
        playerHp = Math.min(effectiveMaxHp, playerHp + turnResult.healToPlayer);
        combatLog.push({ text: `${enemyTemplate.nameRu} исцеляет вас на ${turnResult.healToPlayer} ХП!`, turn: currentTurn + 1 });
      } else {
        let incomingDamage = turnResult.damageToPlayer;
        if (isDefending) {
          incomingDamage = Math.round(incomingDamage * 0.5);
        }

        const totalDodgeChance = Math.min(0.9, dodgeChancePercent(playerPassives) + activeEffectBonus(bossState, 'player_dodge_buff'));
        const dodged = fullyBlocked || Math.random() < totalDodgeChance;
        if (dodged) {
          combatLog.push({
            text: fullyBlocked
              ? `${enemyTemplate.nameRu} атакует! Заряженная защита полностью блокирует удар!`
              : `${enemyTemplate.nameRu} атакует! Вы полностью уклонились!`,
            turn: currentTurn + 1,
          });
        } else {
          const reflected = Math.random() < reflectChancePercent(playerPassives);
          if (reflected) {
            const { hpDamage: reflectedDmg, messages } = applyDamageToBoss(enemyTemplate.mechanics, bossState, incomingDamage);
            enemyHp = Math.max(0, enemyHp - reflectedDmg);
            combatLog.push({ text: `${enemyTemplate.nameRu} атакует! Вы отражаете удар — враг получает ${reflectedDmg} урона!`, turn: currentTurn + 1 });
            for (const m of messages) combatLog.push({ text: m, turn: currentTurn + 1 });
          } else {
            // Контр-пассивки срабатывают только когда игрок реально получил удар (не увернулся, не отразил).
            for (const burn of counterBurnChances(playerPassives)) {
              if (Math.random() < burn.chancePercent) {
                addActiveEffect(bossState, 'enemy_dot', burn.dotPercent, burn.turns);
                combatLog.push({ text: `Враг подожжён ответным пламенем!`, turn: currentTurn + 1 });
              }
            }
            const counterFlatPercent = counterDamageFlatPercent(playerPassives);
            if (counterFlatPercent > 0) {
              const counterDmg = Math.round(incomingDamage * counterFlatPercent);
              if (counterDmg > 0) {
                const { hpDamage: counterHpDmg, messages } = applyDamageToBoss(enemyTemplate.mechanics, bossState, counterDmg);
                enemyHp = Math.max(0, enemyHp - counterHpDmg);
                combatLog.push({ text: `Вы наносите ${counterHpDmg} урона в ответ!`, turn: currentTurn + 1 });
                for (const m of messages) combatLog.push({ text: m, turn: currentTurn + 1 });
              }
            }

            const { hpDamage: shieldedDamage, absorbed: shieldAbsorbed } = applyDamageToPlayerShield(bossState, incomingDamage);
            playerHp = Math.max(0, playerHp - shieldedDamage);
            bossState.playerHitsTakenCount += 1;
            combatLog.push({
              text: shieldAbsorbed
                ? (shieldedDamage > 0 ? `${enemyTemplate.nameRu} атакует! Щит поглощает часть урона, вы получаете ${shieldedDamage}!` : `${enemyTemplate.nameRu} атакует! Урон полностью поглощён щитом!`)
                : `${enemyTemplate.nameRu} атакует! Урон: ${shieldedDamage}`,
              turn: currentTurn + 1,
            });

            for (const heal of hitsTakenEveryNHeal(playerPassives)) {
              if (bossState.playerHitsTakenCount % heal.n === 0) {
                const healAmount = Math.round(effectiveMaxHp * heal.healPercent);
                playerHp = Math.min(effectiveMaxHp, playerHp + healAmount);
                combatLog.push({ text: `Рунная броня восстанавливает вам ${healAmount} ХП!`, turn: currentTurn + 1 });
              }
            }

            // "При блокировании удара" — реальной механики блока нет, ближайший аналог — защитная стойка (tornak-foundation, bone-spike).
            if (isDefending) {
              const blockHealPercent = onBlockHealPercent(playerPassives);
              if (blockHealPercent > 0) {
                const healAmount = Math.round(effectiveMaxHp * blockHealPercent);
                playerHp = Math.min(effectiveMaxHp, playerHp + healAmount);
                combatLog.push({ text: `Блокирование восстанавливает вам ${healAmount} ХП!`, turn: currentTurn + 1 });
              }
              // Пассивный контрудар после блока (tornak-foundation, bone-spike) + активированный кастом
              // (retaliation-hammer, counter-blow, см. lib/combat/conditional-ability-engine.ts) складываются.
              const blockCounterPercent = onBlockCounterPercent(playerPassives) + activeEffectBonus(bossState, 'on_block_counter_active');
              if (blockCounterPercent > 0) {
                const counterDmg = Math.round(incomingDamage * blockCounterPercent);
                if (counterDmg > 0) {
                  const { hpDamage: counterHpDmg, messages } = applyDamageToBoss(enemyTemplate.mechanics, bossState, counterDmg);
                  enemyHp = Math.max(0, enemyHp - counterHpDmg);
                  combatLog.push({ text: `Шипы наносят ${counterHpDmg} урона в ответ на блокированный удар!`, turn: currentTurn + 1 });
                  for (const m of messages) combatLog.push({ text: m, turn: currentTurn + 1 });
                }
              }
            }
          }
        }
      }

      if (turnResult.dotDamageToPlayer > 0 && !bossState.poisonCured) {
        const { hpDamage: dotShielded } = applyDamageToPlayerShield(bossState, turnResult.dotDamageToPlayer);
        playerHp = Math.max(0, playerHp - dotShielded);
        combatLog.push({ text: `Вы получаете ${dotShielded} урона от продолжающегося эффекта!`, turn: currentTurn + 1 });
      }

      for (const m of turnResult.messages) combatLog.push({ text: m, turn: currentTurn + 1 });

      tickActiveEffects(bossState);
      tickCooldowns(bossState);
      tickBlockedMechanics(bossState);
    }

    // Mana regen each round (Фаза 1.3: +10 маны за ход)
    if (!combatOver) {
      playerMp = Math.min(effectiveMaxMp, playerMp + 10);
    }

    // Check if player is dead (с учётом одноразового воскрешения — Феникс-пассивка ИЛИ активный
    // оберег от смерти вроде "Последней воли"/"Несокрушимого", см. lib/combat/conditional-ability-engine.ts —
    // оба делят один и тот же bossState.deathSaveUsed: одно "последнее слово" за бой на персонажа).
    if (playerHp <= 0) {
      const reviveHealPercent = deathSaveHealPercent(playerPassives);
      const classWard: DeathWardEffect | undefined = player.class.abilities
        .filter(a => a.type === 'active' && player.level >= stageUnlockLevel(a.stage))
        .map(a => parseDeathWard(a.description))
        .find((w): w is DeathWardEffect => w !== null) ?? undefined;
      // Клык Пепельной Верности (аудит 3, C2) — тот же оберег от смерти, что и у "Несокрушимого",
      // но как экипируемый предмет: parseDeathWard узнаёт эффект по тому же тексту, sharing
      // тот же bossState.deathSaveUsed, поэтому класс+предмет не складываются в две жизни разом.
      const equippedFang = player.inventory.some(i => i.equipped && i.itemId === 'ashen_loyalty_fang');
      const itemWard: DeathWardEffect | undefined = equippedFang
        ? (parseDeathWard(ITEMS.find(i => i.id === 'ashen_loyalty_fang')?.descriptionRu ?? '') ?? undefined)
        : undefined;
      const activeWard = classWard ?? itemWard;

      if (!bossState.deathSaveUsed && activeWard) {
        bossState.deathSaveUsed = true;
        playerHp = 1;
        if (activeWard.healPercent > 0) playerHp = Math.min(effectiveMaxHp, playerHp + Math.round(effectiveMaxHp * activeWard.healPercent));
        if (activeWard.shieldPercent > 0) bossState.playerShieldHp += Math.round(effectiveMaxHp * activeWard.shieldPercent);
        combatLog.push({ text: `Вы выживаете на грани смерти с ${playerHp} ХП!`, turn: currentTurn + 2 });
      } else if (!bossState.deathSaveUsed && reviveHealPercent !== null) {
        bossState.deathSaveUsed = true;
        playerHp = Math.max(1, Math.round(effectiveMaxHp * reviveHealPercent));
        combatLog.push({ text: `Вы возрождаетесь из пепла с ${playerHp} ХП!`, turn: currentTurn + 2 });
      } else {
        combatOver = true;
        combatLog.push({ text: deathMessage(), turn: currentTurn + 2 });
      }
    }

    // Data (комната данжа) — переиспользует обычный движок одиночного боя целиком (см.
    // lib/combat/dungeons.ts): если игрок выиграл бой И в данже есть ещё комнаты, следующий враг
    // спавнится сразу вместо завершения боя (combatOver остаётся true — этот КОНКРЕТНЫЙ бой
    // с этим врагом окончен, — но inCombat ниже выставится обратно в true с новым врагом).
    // Финальная комната (босс) даёт бонусную награду поверх обычной, забег завершается штатно.
    let dungeonNextEnemy: typeof ENEMIES[0] | null = null;
    let dungeonNextEnemyHp = 0;
    let dungeonJustCompleted = false;
    if (player.dungeonId && combatOver) {
      const dungeon = findDungeon(player.dungeonId);
      if (dungeon) {
        if (playerWon) {
          const nextRoomIndex = player.dungeonRoom + 1;
          if (nextRoomIndex < dungeon.roomCount) {
            const isBossRoom = nextRoomIndex === dungeon.roomCount - 1;
            const nextEnemyId = isBossRoom ? dungeon.bossEnemyId : dungeon.regularEnemyIds[nextRoomIndex % dungeon.regularEnemyIds.length];
            dungeonNextEnemy = ENEMIES.find(e => e.id === nextEnemyId) ?? null;
            if (dungeonNextEnemy) {
              dungeonNextEnemyHp = Math.round((dungeonNextEnemy.hp + Math.floor(Math.random() * 5)) * dungeonEffect.enemyHpMult);
              const bossLine = bossIntroLine(dungeonNextEnemy.id);
              const enemyLine = bossLine ?? `${dungeonNextEnemy.nameRu} появляется!`;
              combatLog.push({ text: `Комната ${nextRoomIndex + 1}/${dungeon.roomCount}: ${enemyLine}`, turn: currentTurn + 3 });
            }
          } else {
            dungeonJustCompleted = true;
            xpGained += Math.round(dungeon.completionReward.xp * dungeonEffect.xpMult * xpMultTotal * guildXpMult);
            goldGained += Math.round(dungeon.completionReward.gold * dungeonEffect.goldMult * fortressGoldMult * premiumMult * guildGoldMult);
            for (const rewardItemId of dungeon.completionReward.items ?? []) {
              const rewardItemData = ITEMS.find(i => i.id === rewardItemId);
              if (rewardItemData) {
                lootItems.push({ itemData: rewardItemData, quantity: 1 });
                droppedItems.push(rewardItemId);
                combatLog.push({ text: `Найдено: ${rewardItemData.nameRu}!`, turn: currentTurn + 3 });
              }
            }
            combatLog.push({ text: dungeon.completionLoreRu, turn: currentTurn + 3 });
            combatLog.push({ text: `Данж «${dungeon.nameRu}» пройден! Бонус: +${dungeon.completionReward.xp} XP, +${dungeon.completionReward.gold} золота`, turn: currentTurn + 3 });
          }
        } else {
          combatLog.push({ text: `Забег по данжу «${dungeon.nameRu}» прерван.`, turn: currentTurn + 3 });
        }
      }
    }

    // Испытания (lib/combat/trials.ts) — ветвящийся аналог данжей выше. Отличие от линейной ветки:
    // при победе в комнате-развилке НЕ спавним следующего врага автоматически — если развилок
    // ещё осталось, отдаём варианты направлений во фронт (trialNextJunctionOptions), а бой
    // не продолжается (inCombat=false), пока игрок не выберет через /api/trial/choose. Комната
    // с индексом trial.junctions.length — это всегда гарантированный босс, без выбора.
    let trialNextJunctionIndex: number | null = null;
    let trialNextJunctionOptions: TrialRoomOption[] | null = null;
    let trialBossEnemy: typeof ENEMIES[0] | null = null;
    let trialBossEnemyHp = 0;
    let trialJustCompleted = false;
    if (player.dungeonId && combatOver && !findDungeon(player.dungeonId)) {
      const trial = findTrial(player.dungeonId);
      if (trial) {
        if (playerWon) {
          const nextRoomIndex = player.dungeonRoom + 1;
          if (nextRoomIndex < trial.junctions.length) {
            trialNextJunctionIndex = nextRoomIndex;
            trialNextJunctionOptions = trial.junctions[nextRoomIndex].options;
            combatLog.push({ text: `Развилка ${nextRoomIndex + 1}/${trial.junctions.length}: выберите путь.`, turn: currentTurn + 3 });
          } else if (nextRoomIndex === trial.junctions.length) {
            trialBossEnemy = ENEMIES.find(e => e.id === trial.bossEnemyId) ?? null;
            if (trialBossEnemy) {
              trialBossEnemyHp = trialBossEnemy.hp + Math.floor(Math.random() * 5);
              const bossLine = bossIntroLine(trialBossEnemy.id);
              combatLog.push({ text: bossLine ?? `${trialBossEnemy.nameRu} появляется!`, turn: currentTurn + 3 });
            }
          } else {
            trialJustCompleted = true;
            xpGained += Math.round(trial.completionReward.xp * xpMultTotal * guildXpMult);
            goldGained += Math.round(trial.completionReward.gold * fortressGoldMult * premiumMult * guildGoldMult);
            for (const rewardItemId of trial.completionReward.items ?? []) {
              const rewardItemData = ITEMS.find(i => i.id === rewardItemId);
              if (rewardItemData) {
                lootItems.push({ itemData: rewardItemData, quantity: 1 });
                droppedItems.push(rewardItemId);
                combatLog.push({ text: `Найдено: ${rewardItemData.nameRu}!`, turn: currentTurn + 3 });
              }
            }
            combatLog.push({ text: trial.completionLoreRu, turn: currentTurn + 3 });
            combatLog.push({ text: `Испытание «${trial.nameRu}» пройдено! Бонус: +${trial.completionReward.xp} XP, +${trial.completionReward.gold} золота`, turn: currentTurn + 3 });
          }
        } else {
          combatLog.push({ text: `Испытание «${trial.nameRu}» прервано.`, turn: currentTurn + 3 });
        }
      }
    }

    // Бездонный Разлом (lib/combat/abyss.ts) — тот же паттерн, что и у данжей выше, но без конца:
    // при победе всегда спавнится следующая, более глубокая комната, пока игрок не сбежит
    // или не погибнет. bestAbyssDepth обновляется отдельно ниже, в updateData.
    let abyssNextEnemy: typeof ENEMIES[0] | null = null;
    let abyssNextEnemyHp = 0;
    let abyssNextDepth = 0;
    if (player.abyssDepth > 0 && combatOver) {
      if (playerWon) {
        abyssNextDepth = player.abyssDepth + 1;
        const nextEnemyId = abyssEnemyIdForDepth(abyssNextDepth);
        abyssNextEnemy = nextEnemyId ? ENEMIES.find(e => e.id === nextEnemyId) ?? null : null;
        if (abyssNextEnemy) {
          const nextScaling = abyssScaling(abyssNextDepth);
          abyssNextEnemyHp = Math.round((abyssNextEnemy.hp + Math.floor(Math.random() * 5)) * nextScaling.hpMult);
          const eliteTag = isEliteDepth(abyssNextDepth) ? ' ⚠️ Элитный противник!' : '';
          const bossLine = bossIntroLine(abyssNextEnemy.id);
          const enemyLine = bossLine ?? `${abyssNextEnemy.nameRu} появляется!`;
          combatLog.push({ text: `Глубина ${abyssNextDepth}: ${enemyLine}${eliteTag}`, turn: currentTurn + 3 });
        }
      } else {
        combatLog.push({ text: `Спуск в Бездонный Разлом прерван на глубине ${player.abyssDepth}.`, turn: currentTurn + 3 });
      }
    }

    // Check level up
    let leveledUp = false;
    let newXp = player.xp + xpGained;
    let newLevel = player.level;
    let newXpToNext = player.xpToNext;
    let newStatPoints = player.statPoints;
    while (newXp >= newXpToNext) {
      newXp -= newXpToNext;
      newLevel++;
      newXpToNext = newLevel * 100;
      newStatPoints += 2;
      leveledUp = true;
    }

    // Update player
    const updateData: Prisma.PlayerUpdateInput = {
      hp: playerHp,
      mp: playerMp,
      combatLog: JSON.stringify(combatLog),
      bossState: combatOver && !dungeonNextEnemy && !abyssNextEnemy && !trialBossEnemy ? null : JSON.stringify(bossState),
      xp: newXp,
      gold: { increment: goldGained },
      ...(playerWon ? { totalKills: { increment: 1 } } : {}),
      ...(battlePassXpGained > 0 ? {
        battlePassXp: effectiveBattlePassXp(player.battlePassSeasonId, player.battlePassXp, currentSeasonId()) + battlePassXpGained,
        battlePassSeasonId: currentSeasonId(),
      } : {}),
    };

    if (leveledUp) {
      updateData.level = newLevel;
      updateData.xpToNext = newXpToNext;
      updateData.statPoints = newStatPoints;
      const newMaxHp = player.maxHp + 10;
      updateData.maxHp = newMaxHp;
      updateData.hp = newMaxHp + equipBonuses.hp; // Full heal on level up (с учётом бонуса экипировки)
    }

    if (dungeonNextEnemy) {
      // Комната пройдена, но данж продолжается — следующий враг спавнится сразу.
      updateData.inCombat = true;
      updateData.enemyId = dungeonNextEnemy.id;
      updateData.enemyHp = dungeonNextEnemyHp;
      updateData.enemyMaxHp = dungeonNextEnemyHp;
      updateData.bossState = JSON.stringify(initBossState(dungeonNextEnemy.mechanics));
      updateData.dungeonRoom = player.dungeonRoom + 1;
    } else if (abyssNextEnemy) {
      // Враг повержен, спуск в Разлом продолжается — следующая, более глубокая комната сразу.
      updateData.inCombat = true;
      updateData.enemyId = abyssNextEnemy.id;
      updateData.enemyHp = abyssNextEnemyHp;
      updateData.enemyMaxHp = abyssNextEnemyHp;
      updateData.bossState = JSON.stringify(initBossState(abyssNextEnemy.mechanics));
      updateData.abyssDepth = abyssNextDepth;
      if (abyssNextDepth > player.bestAbyssDepth) updateData.bestAbyssDepth = abyssNextDepth;
    } else if (trialBossEnemy) {
      // Все развилки испытания пройдены — гарантированный босс спавнится сразу, без выбора.
      updateData.inCombat = true;
      updateData.enemyId = trialBossEnemy.id;
      updateData.enemyHp = trialBossEnemyHp;
      updateData.enemyMaxHp = trialBossEnemyHp;
      updateData.bossState = JSON.stringify(initBossState(trialBossEnemy.mechanics));
      updateData.dungeonRoom = player.dungeonRoom + 1;
    } else if (trialNextJunctionIndex !== null) {
      // Комната-развилка пройдена, но следующая комната ещё не выбрана — бой не продолжается,
      // игрок должен сходить в /api/trial/choose прежде чем бой начнётся снова.
      updateData.inCombat = false;
      updateData.enemyId = null;
      updateData.enemyHp = null;
      updateData.enemyMaxHp = null;
      updateData.dungeonRoom = trialNextJunctionIndex;
    } else if (combatOver) {
      updateData.inCombat = false;
      updateData.enemyId = null;
      updateData.enemyHp = null;
      updateData.enemyMaxHp = null;

      if (player.dungeonId) {
        // Забег окончен (пройден полностью, провален побегом или смертью) — сбрасываем.
        updateData.dungeonId = null;
        updateData.dungeonRoom = 0;
        updateData.dungeonModifierId = null;
        updateData.dungeonHeatLevel = 0;
      }

      if (player.abyssDepth > 0) {
        // Спуск окончен (побег или смерть — победа никогда не завершает Разлом, см. блок выше) —
        // рекорд глубины уже мог быть посчитан в бранче abyssNextEnemy на предыдущих ходах и
        // сохранён в player.bestAbyssDepth, здесь просто сбрасываем текущий забег.
        updateData.abyssDepth = 0;
      }

      if (playerHp <= 0) {
        // Смерть теперь имеет реальную цену — 10% текущего золота (не только сброс прогресса
        // забега в данже выше). goldGained в этой ветке всегда 0 (playerWon=false), поэтому
        // безопасно заменить increment на decrement для того же поля.
        const goldLoss = Math.min(player.gold, Math.round(player.gold * 0.1));
        updateData.gold = { decrement: goldLoss };
        if (goldLoss > 0) {
          combatLog.push({ text: `Вы потеряли ${goldLoss} золота при смерти.`, turn: currentTurn + 2 });
        }
        // Дебафф -15% опыта на 24 часа (lib/premium/premium-shop.ts) — премиум полностью иммунен, ставить
        // дебафф ему бессмысленно (isDeathDebuffActive всё равно проигнорирует поле из-за премиума).
        if (!isPremiumActive(player.premiumUntil)) {
          updateData.deathDebuffUntil = new Date(Date.now() + DEATH_DEBUFF_HOURS * 60 * 60 * 1000);
          combatLog.push({ text: `Опыт снижен на 15% на ${DEATH_DEBUFF_HOURS} часов.`, turn: currentTurn + 2 });
        }
        updateData.combatLog = JSON.stringify(combatLog);
        // Player died - teleport to town with 1 HP
        updateData.hp = 1;
        updateData.locationId = 'town';
      }
    } else {
      updateData.enemyHp = enemyHp;
    }

    // Эликсир Мощи и аналоги: если использован в этом запросе — записываем новые значения; если бой
    // при этом заканчивается — сразу списываем один бой (считая и тот, что только что завершился).
    if (consumableBuffUpdate) {
      updateData.consumableAttackBonus = consumableBuffUpdate.attackBonus;
      updateData.consumableFightsLeft = consumableBuffUpdate.fightsLeft;
    }
    if (combatOver) {
      const currentFightsLeft = consumableBuffUpdate ? consumableBuffUpdate.fightsLeft : player.consumableFightsLeft;
      if (currentFightsLeft > 0) {
        const remaining = currentFightsLeft - 1;
        updateData.consumableFightsLeft = remaining;
        if (remaining <= 0) updateData.consumableAttackBonus = 0;
      }
    }

    // Очки сезонной лиги за PvE (lib/social/pvp-season.ts) — данж и испытание дают одинаковый
    // бонус, чтобы не создавать перекос "какой из двух видов забега выгоднее фармить ради лиги".
    if (dungeonJustCompleted || trialJustCompleted) {
      updateData.leagueBonusScore = { increment: LEAGUE_POINTS.dungeonOrTrialCompleted };
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
        const rolled = rollGearInstance(loot.itemData, player.level);
        await addItemToInventory({
          playerId: player.id,
          itemId: loot.itemData.id,
          name: rolled.name,
          type: loot.itemData.type,
          rarity: loot.itemData.rarity,
          stats: JSON.stringify(rolled.stats),
          icon: loot.itemData.icon,
          quantity: loot.quantity,
          itemLevel: rolled.itemLevel,
          affixTier: rolled.affixTier,
          affixes: rolled.affixes.length > 0 ? JSON.stringify(rolled.affixes) : null,
        }, tx);
      }

      if (playerWon) {
        await incrementQuestProgress(tx, player.id, 'kill');
      }
      if (bossTrophyGained) {
        await tx.playerBossTrophy.upsert({
          where: { playerId_enemyId: { playerId: player.id, enemyId: bossTrophyGained } },
          create: { playerId: player.id, enemyId: bossTrophyGained, killCount: 1, pityCounter: trophyPityCounter ?? 0 },
          update: {
            killCount: { increment: 1 },
            lastDefeatedAt: new Date(),
            ...(trophyPityCounter !== null ? { pityCounter: trophyPityCounter } : {}),
          },
        });
      }
      if (dungeonJustCompleted || trialJustCompleted) {
        await incrementQuestProgress(tx, player.id, 'dungeon');
      }

      // Update player state
      return tx.player.update({
        where: { telegramId },
        data: updateData,
        include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
      });
    });

    return NextResponse.json({
      combatLog: combatLog.slice(-8), // Last 8 entries
      player: updatedPlayer,
      combatOver,
      playerWon,
      playerFled,
      enemyHp,
      enemyMaxHp: player.enemyMaxHp,
      bossPhase: enemyTemplate.mechanics ? bossState.phase : undefined,
      bossShieldHp: enemyTemplate.mechanics?.shieldMax ? bossState.shieldHp : undefined,
      bossShieldMax: enemyTemplate.mechanics?.shieldMax,
      xpGained,
      goldGained,
      bossTrophyGained,
      droppedItems,
      leveledUp,
      dungeonRoomCleared: !!dungeonNextEnemy,
      dungeonCompleted: dungeonJustCompleted,
      trialJunction: trialNextJunctionOptions
        ? { options: trialNextJunctionOptions.map(o => ({ direction: o.direction, type: o.type, label: o.label })) }
        : undefined,
      trialCompleted: trialJustCompleted,
    });
  } catch (error) {
    if (error instanceof ActionCooldownError) {
      return NextResponse.json({ error: 'Слишком быстро — подождите немного.' }, { status: 429 });
    }
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
