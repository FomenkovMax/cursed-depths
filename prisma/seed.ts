import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed enemies from game data
  const enemies = [
    { id: 'goblin', nameRu: 'Гоблин', nameEn: 'Goblin', hp: 12, ac: 8, attack: 3, damage: '1d4+1', xp: 15, gold: 5, lootTable: '[{"itemId":"rusty_sword","chance":0.2},{"itemId":"health_potion","chance":0.3}]', locationId: 'forest', isBoss: false, icon: '👺' },
    { id: 'wolf', nameRu: 'Лютоволк', nameEn: 'Dire Wolf', hp: 18, ac: 10, attack: 4, damage: '1d6+2', xp: 20, gold: 3, lootTable: '[{"itemId":"leather_armor","chance":0.15}]', locationId: 'forest', isBoss: false, icon: '🐺' },
    { id: 'spider', nameRu: 'Гигантский паук', nameEn: 'Giant Spider', hp: 15, ac: 9, attack: 4, damage: '1d4+2', xp: 18, gold: 4, lootTable: '[{"itemId":"antidote","chance":0.4}]', locationId: 'forest', isBoss: false, icon: '🕷️' },
    { id: 'forest_witch', nameRu: 'Лесная ведьма', nameEn: 'Forest Witch', hp: 25, ac: 11, attack: 6, damage: '1d8+3', xp: 50, gold: 20, lootTable: '[{"itemId":"mana_potion","chance":0.5}]', locationId: 'forest', isBoss: true, icon: '🧙‍♀️' },
    { id: 'bat_swarm', nameRu: 'Стая летучих мышей', nameEn: 'Bat Swarm', hp: 14, ac: 9, attack: 3, damage: '1d4+1', xp: 12, gold: 2, lootTable: '[]', locationId: 'caves', isBoss: false, icon: '🦇' },
    { id: 'cave_troll', nameRu: 'Пещерный тролль', nameEn: 'Cave Troll', hp: 35, ac: 10, attack: 6, damage: '1d8+4', xp: 35, gold: 15, lootTable: '[{"itemId":"iron_ore","chance":0.4}]', locationId: 'caves', isBoss: false, icon: '🧌' },
    { id: 'slime', nameRu: 'Кислотный слизень', nameEn: 'Acid Slime', hp: 20, ac: 6, attack: 4, damage: '1d6+2', xp: 15, gold: 8, lootTable: '[{"itemId":"antidote","chance":0.3}]', locationId: 'caves', isBoss: false, icon: '🟢' },
    { id: 'rock_golem', nameRu: 'Каменный голем', nameEn: 'Rock Golem', hp: 45, ac: 14, attack: 7, damage: '1d10+5', xp: 60, gold: 30, lootTable: '[{"itemId":"iron_ore","chance":0.6}]', locationId: 'caves', isBoss: true, icon: '🗿' },
    { id: 'skeleton', nameRu: 'Скелет-воин', nameEn: 'Skeleton Warrior', hp: 22, ac: 11, attack: 5, damage: '1d6+3', xp: 25, gold: 10, lootTable: '[{"itemId":"chainmail","chance":0.1}]', locationId: 'crypt', isBoss: false, icon: '💀' },
    { id: 'zombie', nameRu: 'Гниющий зомби', nameEn: 'Rotting Zombie', hp: 30, ac: 8, attack: 5, damage: '1d8+2', xp: 22, gold: 5, lootTable: '[{"itemId":"health_potion","chance":0.3}]', locationId: 'crypt', isBoss: false, icon: '🧟' },
    { id: 'wraith', nameRu: 'Призрак', nameEn: 'Wraith', hp: 28, ac: 13, attack: 7, damage: '1d8+4', xp: 35, gold: 15, lootTable: '[{"itemId":"shadow_essence","chance":0.4}]', locationId: 'crypt', isBoss: false, icon: '👻' },
    { id: 'lich', nameRu: 'Лич', nameEn: 'Lich', hp: 60, ac: 15, attack: 10, damage: '2d6+5', xp: 100, gold: 50, lootTable: '[{"itemId":"void_crystal","chance":0.3}]', locationId: 'crypt', isBoss: true, icon: '☠️' },
    { id: 'minotaur', nameRu: 'Минотавр', nameEn: 'Minotaur', hp: 45, ac: 12, attack: 8, damage: '1d10+6', xp: 45, gold: 20, lootTable: '[{"itemId":"steel_sword","chance":0.15}]', locationId: 'labyrinth', isBoss: false, icon: '🐂' },
    { id: 'medusa', nameRu: 'Медуза', nameEn: 'Medusa', hp: 40, ac: 14, attack: 9, damage: '1d8+5', xp: 50, gold: 25, lootTable: '[{"itemId":"shadow_dagger","chance":0.1}]', locationId: 'labyrinth', isBoss: false, icon: '🐍' },
    { id: 'dark_mage', nameRu: 'Тёмный маг', nameEn: 'Dark Mage', hp: 35, ac: 11, attack: 12, damage: '2d6+4', xp: 55, gold: 30, lootTable: '[{"itemId":"scroll_fireball","chance":0.2}]', locationId: 'labyrinth', isBoss: false, icon: '🧙' },
    { id: 'shadow_lord', nameRu: 'Повелитель Теней', nameEn: 'Shadow Lord', hp: 80, ac: 16, attack: 12, damage: '2d8+6', xp: 150, gold: 80, lootTable: '[{"itemId":"shadow_cloak","chance":0.2}]', locationId: 'labyrinth', isBoss: true, icon: '🌑' },
    { id: 'fire_elemental', nameRu: 'Огненный элементаль', nameEn: 'Fire Elemental', hp: 50, ac: 13, attack: 10, damage: '2d6+5', xp: 55, gold: 25, lootTable: '[{"itemId":"flame_blade","chance":0.08}]', locationId: 'forge', isBoss: false, icon: '🔥' },
    { id: 'demon_forge', nameRu: 'Демон-кузнец', nameEn: 'Forge Demon', hp: 55, ac: 14, attack: 11, damage: '2d8+4', xp: 60, gold: 30, lootTable: '[{"itemId":"dragon_scale","chance":0.1}]', locationId: 'forge', isBoss: false, icon: '😈' },
    { id: 'inferno_dragon', nameRu: 'Инфернальный дракон', nameEn: 'Inferno Dragon', hp: 100, ac: 17, attack: 14, damage: '3d6+8', xp: 200, gold: 100, lootTable: '[{"itemId":"dragonscale_armor","chance":0.15}]', locationId: 'forge', isBoss: true, icon: '🐲' },
    { id: 'void_walker', nameRu: 'Ходок Пустоты', nameEn: 'Void Walker', hp: 60, ac: 15, attack: 13, damage: '2d8+6', xp: 70, gold: 35, lootTable: '[{"itemId":"void_crystal","chance":0.2}]', locationId: 'abyss', isBoss: false, icon: '🕳️' },
    { id: 'abyss_horror', nameRu: 'Ужас Бездны', nameEn: 'Abyss Horror', hp: 70, ac: 16, attack: 15, damage: '3d6+7', xp: 85, gold: 40, lootTable: '[{"itemId":"crown_shard","chance":0.05}]', locationId: 'abyss', isBoss: false, icon: '👁️' },
    { id: 'cursed_king', nameRu: 'Проклятый Король', nameEn: 'Cursed King', hp: 200, ac: 20, attack: 18, damage: '3d10+10', xp: 500, gold: 300, lootTable: '[{"itemId":"cursed_king_blade","chance":0.1},{"itemId":"crown_fragment","chance":0.15}]', locationId: 'throne', isBoss: true, icon: '👑' },
  ];

  for (const enemy of enemies) {
    await prisma.enemy.upsert({
      where: { id: enemy.id },
      update: enemy,
      create: enemy,
    });
  }

  console.log(`Seeded ${enemies.length} enemies`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
