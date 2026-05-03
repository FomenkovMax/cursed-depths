import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json({ error: 'telegramId is required' }, { status: 400 });
    }

    const player = await db.player.findUnique({
      where: { telegramId },
      include: {
        race: true,
        class: { include: { abilities: true } },
        location: true,
      },
    });

    if (!player) {
      return NextResponse.json(null);
    }

    return NextResponse.json(player);
  } catch (error) {
    console.error('Failed to fetch player:', error);
    return NextResponse.json({ error: 'Failed to fetch player' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegramId, name, raceId, classId } = body;

    if (!telegramId || !name || !raceId || !classId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if player already exists
    const existing = await db.player.findUnique({
      where: { telegramId },
    });

    if (existing) {
      return NextResponse.json({ error: 'Player already exists' }, { status: 409 });
    }

    // Get race and class for base stats
    const race = await db.race.findUnique({ where: { id: raceId } });
    const gameClass = await db.gameClass.findUnique({ where: { id: classId } });

    if (!race || !gameClass) {
      return NextResponse.json({ error: 'Invalid race or class' }, { status: 400 });
    }

    // Calculate stats
    const str = Math.round(race.baseStr * gameClass.strMod);
    const dex = Math.round(race.baseDex * gameClass.dexMod);
    const int = Math.round(race.baseInt * gameClass.intMod);
    const wis = Math.round(race.baseWis * gameClass.wisMod);
    const con = Math.round(race.baseCon * gameClass.conMod);
    const maxHp = Math.round(race.baseHp * gameClass.hpMod);
    const maxMana = Math.round(race.baseMana * gameClass.manaMod);

    const player = await db.player.create({
      data: {
        telegramId,
        name,
        raceId,
        classId,
        level: 1,
        xp: 0,
        hp: maxHp,
        maxHp,
        mana: maxMana,
        maxMana,
        str,
        dex,
        int,
        wis,
        con,
        gold: 10,
      },
      include: {
        race: true,
        class: { include: { abilities: true } },
        location: true,
      },
    });

    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    console.error('Failed to create player:', error);
    return NextResponse.json({ error: 'Failed to create player' }, { status: 500 });
  }
}
