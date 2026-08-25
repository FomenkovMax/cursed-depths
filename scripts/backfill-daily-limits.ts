/**
 * Разовый бэкфилл PlayerDailyLimits из уже существующих строк Player (миграция Player, этап
 * 2/5, аудит 2 волна 2B п.4) — копирует 11 полей дневных лимитов (Мировой босс/Крепость/
 * Гильд-рейд-босс/Колесо фортуны/Доска контрактов) в новую 1:1-таблицу. Старые колонки Player
 * НЕ трогает и не удаляет — это чисто чтение + запись новой таблицы.
 *
 * Идемпотентен (upsert по playerId) — безопасно перезапускать сколько угодно раз, в том числе
 * если часть игроков уже была засеяна в прошлом запуске.
 *
 * Использование: npx tsx scripts/backfill-daily-limits.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const players = await prisma.player.findMany({
    select: {
      id: true,
      worldBossAttacksToday: true,
      worldBossAttackDate: true,
      fortressAssaultsToday: true,
      fortressAssaultDate: true,
      raidBossAttacksToday: true,
      raidBossAttackDate: true,
      fortuneSpinsToday: true,
      fortuneSpinDate: true,
      bountyEnemyId: true,
      bountyDate: true,
      bountyAttempted: true,
    },
  });

  console.log(`Бэкфилл PlayerDailyLimits для ${players.length} игроков...`);

  let count = 0;
  for (const p of players) {
    const data = {
      worldBossAttacksToday: p.worldBossAttacksToday,
      worldBossAttackDate: p.worldBossAttackDate,
      fortressAssaultsToday: p.fortressAssaultsToday,
      fortressAssaultDate: p.fortressAssaultDate,
      raidBossAttacksToday: p.raidBossAttacksToday,
      raidBossAttackDate: p.raidBossAttackDate,
      fortuneSpinsToday: p.fortuneSpinsToday,
      fortuneSpinDate: p.fortuneSpinDate,
      bountyEnemyId: p.bountyEnemyId,
      bountyDate: p.bountyDate,
      bountyAttempted: p.bountyAttempted,
    };
    await prisma.playerDailyLimits.upsert({
      where: { playerId: p.id },
      create: { playerId: p.id, ...data },
      update: data,
    });
    count++;
  }

  console.log(`Готово: ${count} строк создано/обновлено в PlayerDailyLimits.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
