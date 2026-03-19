import { PrismaClient, CEFR_LEVEL, SCENARIO_CATEGORY } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  const passwordHash = await bcrypt.hash('Password123!', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      passwordHash,
      displayName: 'Demo User',
      nativeLanguage: 'zh-CN',
      currentProficiency: CEFR_LEVEL.B1,
      emailVerified: true,
    },
  });

  console.log(`Created user: ${user.email}`);

  const demoScenario = await prisma.scenario.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      title: 'At the Restaurant',
      description: 'Practice ordering food and making reservations at a restaurant',
      category: SCENARIO_CATEGORY.DAILY_CONVERSATION,
      difficulty: CEFR_LEVEL.A2,
      locale: 'en-US',
      estimatedMinutes: 15,
    },
  });

  console.log(`Created scenario: ${demoScenario.title}`);

  const dialogue = await prisma.dialogue.upsert({
    where: { id: '00000000-0000-0000-0000-000000000011' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      scenarioId: demoScenario.id,
      title: 'Ordering Food',
      displayOrder: 1,
    },
  });

  const waiterCharacter = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000000021' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000021',
      name: 'Waiter',
      role: 'staff',
    },
  });

  const customerCharacter = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000000022' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000022',
      name: 'Customer',
      role: 'customer',
    },
  });

  await prisma.dialogueTurn.createMany({
    skipDuplicates: true,
    data: [
      {
        dialogueId: dialogue.id,
        turnOrder: 1,
        speakerType: 'ai',
        characterId: waiterCharacter.id,
        content: 'Good evening! Welcome to La Bella Italia. Do you have a reservation?',
        hints: ['reservation', 'booking'],
        idealResponse: "Yes, I have a reservation for two under the name Smith.",
      },
      {
        dialogueId: dialogue.id,
        turnOrder: 2,
        speakerType: 'user',
        characterId: customerCharacter.id,
        content: "Yes, I have a reservation for two under the name Smith.",
        contentType: 'expected',
        hints: ['reservation', 'name'],
      },
      {
        dialogueId: dialogue.id,
        turnOrder: 3,
        speakerType: 'ai',
        characterId: waiterCharacter.id,
        content: "Perfect! Right this way, please. Here's your menu. Can I start you off with something to drink?",
        hints: ['drink', 'beverage'],
        idealResponse: "We'll have a glass of red wine, please.",
      },
      {
        dialogueId: dialogue.id,
        turnOrder: 4,
        speakerType: 'user',
        characterId: customerCharacter.id,
        content: "We'll have a glass of red wine, please.",
        contentType: 'expected',
        hints: ['wine', 'drink'],
      },
    ],
  });

  console.log('Created dialogue and turns');

  await prisma.vocabulary.createMany({
    skipDuplicates: true,
    data: [
      {
        scenarioId: demoScenario.id,
        word: 'reservation',
        phonetic: '/ˌrezərˈveɪʃən/',
        translation: '预约',
        difficulty: CEFR_LEVEL.A2,
      },
      {
        scenarioId: demoScenario.id,
        word: 'menu',
        phonetic: '/ˈmenjuː/',
        translation: '菜单',
        difficulty: CEFR_LEVEL.A1,
      },
      {
        scenarioId: demoScenario.id,
        word: 'appetizer',
        phonetic: '/ˈæpətaɪzər/',
        translation: '开胃菜',
        difficulty: CEFR_LEVEL.B1,
      },
      {
        scenarioId: demoScenario.id,
        word: 'main course',
        phonetic: '/meɪn kɔːrs/',
        translation: '主菜',
        difficulty: CEFR_LEVEL.A2,
      },
      {
        scenarioId: demoScenario.id,
        word: 'dessert',
        phonetic: '/dɪˈzɜːrt/',
        translation: '甜点',
        difficulty: CEFR_LEVEL.A2,
      },
    ],
  });

  console.log('Created vocabulary');

  await prisma.achievement.createMany({
    skipDuplicates: true,
    data: [
      {
        code: 'FIRST_STEPS',
        title: 'First Steps',
        description: 'Complete your first scenario',
        points: 10,
        criteria: { scenariosCompleted: 1 },
      },
      {
        code: 'WEEK_STREAK',
        title: 'Week Streak',
        description: 'Practice for 7 days in a row',
        points: 50,
        criteria: { streakDays: 7 },
      },
      {
        code: 'PERFECT_SCORE',
        title: 'Perfect Score',
        description: 'Get a perfect score on any scenario',
        points: 25,
        criteria: { perfectScore: true },
      },
    ],
  });

  console.log('Created achievements');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
