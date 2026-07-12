/**
 * Питомцы-компаньоны — коллекционная премиум-механика: каждый даёт небольшой пассивный
 * бонус к статам, пока активен (Player.activePetId), но владеть можно многими сразу
 * (PlayerPet) ради самого коллекционирования, а не только ради самого сильного бонуса.
 * Покупаются исключительно за Осколки Короны — тот же курс на премиум-контент, что и
 * колесо фортуны/смена расы. Цены и бонусы растут по редкости так же круто, как шанс
 * дропа лучших предметов урезан в game-data.ts — тот же хардкорный принцип.
 */

export type PetStatBonus = Partial<Record<
  'strength' | 'dexterity' | 'vitality' | 'intellect' | 'willpower' | 'instinct' | 'attack' | 'defense' | 'hp' | 'mp',
  number
>>;

export interface Pet {
  id: string;
  nameRu: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  descriptionRu: string;
  costShards: number;
  bonus: PetStatBonus;
}

export const PET_CATALOG: Pet[] = [
  { id: 'ash_kitten', nameRu: 'Пепельный котёнок', icon: '🐱', rarity: 'common', costShards: 100,
    descriptionRu: 'Родился уже в пепле — не знает, что мир когда-то выглядел иначе.', bonus: { hp: 5 } },
  { id: 'rusty_crow', nameRu: 'Ржавый ворон', icon: '🐦‍⬛', rarity: 'common', costShards: 100,
    descriptionRu: 'Кружит над Пепельным Краем так долго, что помнит дорогу лучше многих проводников.', bonus: { instinct: 1 } },

  { id: 'root_sprite', nameRu: 'Дух корня', icon: '🌱', rarity: 'uncommon', costShards: 250,
    descriptionRu: 'Осколок Корневой Рощи, ещё живой вопреки всему — цепляется за плечо, как за последнюю почву.', bonus: { vitality: 2 } },
  { id: 'ember_moth', nameRu: 'Огненная моль', icon: '🦋', rarity: 'uncommon', costShards: 250,
    descriptionRu: 'Летит на голос Карсуса так же, как остальные летят на свет.', bonus: { intellect: 2 } },

  { id: 'void_hare', nameRu: 'Заяц Пустоты', icon: '🐇', rarity: 'rare', costShards: 600,
    descriptionRu: 'Прыгает чуть быстрее, чем должен успевать глаз — Пустота срезает для него лишний кадр.', bonus: { dexterity: 3, mp: 5 } },
  { id: 'bone_hound', nameRu: 'Костяной пёс', icon: '🐕', rarity: 'rare', costShards: 600,
    descriptionRu: 'Издох в Гнилых Топях и не заметил разницы — служит так же исправно.', bonus: { strength: 3, hp: 10 } },

  { id: 'kessara_owl', nameRu: 'Сова Кессары', icon: '🦉', rarity: 'epic', costShards: 1400,
    descriptionRu: 'Видит не глазами — тем же Шёпотом, каким Кессара когда-то видела насквозь целые армии.', bonus: { willpower: 4, instinct: 4 } },
  { id: 'molten_salamander', nameRu: 'Расплавленная саламандра', icon: '🦎', rarity: 'epic', costShards: 1400,
    descriptionRu: 'Вылупилась в Драконьем Горниле — холод снаружи ей только на пользу.', bonus: { attack: 5 } },

  { id: 'ailet_fawn', nameRu: 'Оленёнок Айлет', icon: '🦌', rarity: 'legendary', costShards: 3000,
    descriptionRu: 'Живой отголосок богини-целительницы — там, где он проходит, раны затягиваются чуть быстрее.', bonus: { hp: 20, vitality: 3, willpower: 2 } },
  { id: 'tornak_golemling', nameRu: 'Каменный голем-детёныш', icon: '🗿', rarity: 'legendary', costShards: 3000,
    descriptionRu: 'Осколок Окаменевшего Закона, ещё не выросший в полноценного стража — но уже держит удар.', bonus: { defense: 8, strength: 3 } },

  { id: 'karsus_wyrmling', nameRu: 'Дракончик Карсуса', icon: '🐲', rarity: 'mythic', costShards: 8000,
    descriptionRu: 'Голос Карсуса иногда шепчет и через него — ооочень редкая находка, почти легенда среди собирателей.', bonus: { strength: 5, vitality: 5, attack: 5 } },
  { id: 'cursed_shade_cub', nameRu: 'Тень Проклятого Короля', icon: '👑', rarity: 'mythic', costShards: 8000,
    descriptionRu: 'Крошечный осколок того, кто отказался умирать по правилам Столпов — самый редкий питомец игры.', bonus: { attack: 10, defense: 10, hp: 30 } },
];

export function findPet(id: string): Pet | null {
  return PET_CATALOG.find(p => p.id === id) ?? null;
}
