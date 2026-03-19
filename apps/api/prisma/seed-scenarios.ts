import { PrismaClient, CEFR_LEVEL, SCENARIO_CATEGORY } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting scenario seed...');

  // ============================================================
  // SCENARIO 1: At the Restaurant (A2) - Extended version
  // ============================================================
  
  const restaurantScenario = await prisma.scenario.upsert({
    where: { id: '00000000-0000-0000-0000-000000000101' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000101',
      title: 'At the Restaurant',
      description: 'Practice ordering food, making reservations, and interacting with restaurant staff',
      category: SCENARIO_CATEGORY.DAILY_CONVERSATION,
      difficulty: CEFR_LEVEL.A2,
      locale: 'en-US',
      estimatedMinutes: 15,
    },
  });

  // Characters for Restaurant
  const waiter = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000000111' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000111',
      name: 'Waiter',
      role: 'staff',
    },
  });

  const customer = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000000112' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000112',
      name: 'Customer',
      role: 'customer',
    },
  });

  // Dialogue 1: Making a Reservation
  const reservationDialogue = await prisma.dialogue.upsert({
    where: { id: '00000000-0000-0000-0000-000000000121' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000121',
      scenarioId: restaurantScenario.id,
      title: 'Making a Reservation',
      displayOrder: 1,
    },
  });

  await prisma.dialogueTurn.createMany({
    skipDuplicates: true,
    data: [
      {
        dialogueId: reservationDialogue.id,
        turnOrder: 1,
        speakerType: 'ai',
        characterId: waiter.id,
        content: 'Good afternoon, Italian Garden Restaurant. How can I help you?',
        hints: ['help', 'assist'],
        idealResponse: 'Hello, I would like to make a reservation for dinner.',
      },
      {
        dialogueId: reservationDialogue.id,
        turnOrder: 2,
        speakerType: 'user',
        characterId: customer.id,
        content: 'Hello, I would like to make a reservation for dinner.',
        contentType: 'expected',
        hints: ['reservation', 'dinner'],
      },
      {
        dialogueId: reservationDialogue.id,
        turnOrder: 3,
        speakerType: 'ai',
        characterId: waiter.id,
        content: 'Certainly! For how many people and what date?',
        hints: ['people', 'date'],
        idealResponse: 'For two people, this Saturday at 7 PM.',
      },
      {
        dialogueId: reservationDialogue.id,
        turnOrder: 4,
        speakerType: 'user',
        characterId: customer.id,
        content: 'For two people, this Saturday at 7 PM.',
        contentType: 'expected',
        hints: ['two', 'Saturday', '7 PM'],
      },
      {
        dialogueId: reservationDialogue.id,
        turnOrder: 5,
        speakerType: 'ai',
        characterId: waiter.id,
        content: 'Perfect! A table for two on Saturday at 7 PM. May I have your name?',
        hints: ['name'],
        idealResponse: 'The name is Johnson.',
      },
      {
        dialogueId: reservationDialogue.id,
        turnOrder: 6,
        speakerType: 'user',
        characterId: customer.id,
        content: 'The name is Johnson.',
        contentType: 'expected',
        hints: ['name', 'Johnson'],
      },
    ],
  });

  // Dialogue 2: Ordering Food
  const orderingDialogue = await prisma.dialogue.upsert({
    where: { id: '00000000-0000-0000-0000-000000000131' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000131',
      scenarioId: restaurantScenario.id,
      title: 'Ordering Food',
      displayOrder: 2,
    },
  });

  await prisma.dialogueTurn.createMany({
    skipDuplicates: true,
    data: [
      {
        dialogueId: orderingDialogue.id,
        turnOrder: 1,
        speakerType: 'ai',
        characterId: waiter.id,
        content: 'Good evening! Are you ready to order, or do you need more time?',
        hints: ['order', 'ready'],
        idealResponse: 'We are ready to order, thank you.',
      },
      {
        dialogueId: orderingDialogue.id,
        turnOrder: 2,
        speakerType: 'user',
        characterId: customer.id,
        content: 'We are ready to order, thank you.',
        contentType: 'expected',
        hints: ['ready', 'order'],
      },
      {
        dialogueId: orderingDialogue.id,
        turnOrder: 3,
        speakerType: 'ai',
        characterId: waiter.id,
        content: 'Wonderful! What would you like for your starter?',
        hints: ['starter', 'appetizer'],
        idealResponse: 'We will have the tomato soup and the bruschetta.',
      },
      {
        dialogueId: orderingDialogue.id,
        turnOrder: 4,
        speakerType: 'user',
        characterId: customer.id,
        content: 'We will have the tomato soup and the bruschetta.',
        contentType: 'expected',
        hints: ['tomato soup', 'bruschetta'],
      },
      {
        dialogueId: orderingDialogue.id,
        turnOrder: 5,
        speakerType: 'ai',
        characterId: waiter.id,
        content: 'And for the main course?',
        hints: ['main course', 'entree'],
        idealResponse: 'I will have the spaghetti carbonara, and my friend will have the grilled salmon.',
      },
      {
        dialogueId: orderingDialogue.id,
        turnOrder: 6,
        speakerType: 'user',
        characterId: customer.id,
        content: 'I will have the spaghetti carbonara, and my friend will have the grilled salmon.',
        contentType: 'expected',
        hints: ['spaghetti carbonara', 'grilled salmon'],
      },
    ],
  });

  // Vocabulary for Restaurant
  await prisma.vocabulary.createMany({
    skipDuplicates: true,
    data: [
      { scenarioId: restaurantScenario.id, word: 'reservation', phonetic: '/ˌrezərˈveɪʃən/', translation: '预约', difficulty: CEFR_LEVEL.A2 },
      { scenarioId: restaurantScenario.id, word: 'menu', phonetic: '/ˈmenjuː/', translation: '菜单', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: restaurantScenario.id, word: 'appetizer', phonetic: '/ˈæpətaɪzər/', translation: '开胃菜', difficulty: CEFR_LEVEL.B1 },
      { scenarioId: restaurantScenario.id, word: 'main course', phonetic: '/meɪn kɔːrs/', translation: '主菜', difficulty: CEFR_LEVEL.A2 },
      { scenarioId: restaurantScenario.id, word: 'dessert', phonetic: '/dɪˈzɜːrt/', translation: '甜点', difficulty: CEFR_LEVEL.A2 },
      { scenarioId: restaurantScenario.id, word: 'bill', phonetic: '/bɪl/', translation: '账单', difficulty: CEFR_LEVEL.A2 },
      { scenarioId: restaurantScenario.id, word: 'tip', phonetic: '/tɪp/', translation: '小费', difficulty: CEFR_LEVEL.A2 },
      { scenarioId: restaurantScenario.id, word: 'starter', phonetic: '/ˈstɑːrtər/', translation: '前菜', difficulty: CEFR_LEVEL.A2 },
    ],
  });

  console.log(`Created scenario: ${restaurantScenario.title}`);

  // ============================================================
  // SCENARIO 2: Booking a Hotel (A2)
  // ============================================================

  const hotelScenario = await prisma.scenario.upsert({
    where: { id: '00000000-0000-0000-0000-000000000201' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000201',
      title: 'Booking a Hotel',
      description: 'Learn how to book a hotel room, ask about amenities, and check in',
      category: SCENARIO_CATEGORY.TRAVEL,
      difficulty: CEFR_LEVEL.A2,
      locale: 'en-US',
      estimatedMinutes: 15,
    },
  });

  const receptionist = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000000211' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000211',
      name: 'Receptionist',
      role: 'staff',
    },
  });

  const traveler = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000000212' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000212',
      name: 'Traveler',
      role: 'customer',
    },
  });

  // Dialogue 1: Booking by Phone
  const hotelBookingDialogue = await prisma.dialogue.upsert({
    where: { id: '00000000-0000-0000-0000-000000000221' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000221',
      scenarioId: hotelScenario.id,
      title: 'Booking by Phone',
      displayOrder: 1,
    },
  });

  await prisma.dialogueTurn.createMany({
    skipDuplicates: true,
    data: [
      {
        dialogueId: hotelBookingDialogue.id,
        turnOrder: 1,
        speakerType: 'ai',
        characterId: receptionist.id,
        content: 'Grand Hotel, reception. How may I assist you?',
        hints: ['reception', 'assist'],
        idealResponse: 'Hello, I would like to book a room for next weekend.',
      },
      {
        dialogueId: hotelBookingDialogue.id,
        turnOrder: 2,
        speakerType: 'user',
        characterId: traveler.id,
        content: 'Hello, I would like to book a room for next weekend.',
        contentType: 'expected',
        hints: ['book', 'room', 'weekend'],
      },
      {
        dialogueId: hotelBookingDialogue.id,
        turnOrder: 3,
        speakerType: 'ai',
        characterId: receptionist.id,
        content: 'Of course! What type of room would you prefer - single or double?',
        hints: ['single', 'double', 'room type'],
        idealResponse: 'A double room, please.',
      },
      {
        dialogueId: hotelBookingDialogue.id,
        turnOrder: 4,
        speakerType: 'user',
        characterId: traveler.id,
        content: 'A double room, please.',
        contentType: 'expected',
        hints: ['double room'],
      },
      {
        dialogueId: hotelBookingDialogue.id,
        turnOrder: 5,
        speakerType: 'ai',
        characterId: receptionist.id,
        content: 'Great! How many nights will you be staying?',
        hints: ['nights', 'staying'],
        idealResponse: 'We will stay for three nights, from Friday to Monday.',
      },
      {
        dialogueId: hotelBookingDialogue.id,
        turnOrder: 6,
        speakerType: 'user',
        characterId: traveler.id,
        content: 'We will stay for three nights, from Friday to Monday.',
        contentType: 'expected',
        hints: ['three nights', 'Friday', 'Monday'],
      },
    ],
  });

  // Dialogue 2: Check-in
  const checkinDialogue = await prisma.dialogue.upsert({
    where: { id: '00000000-0000-0000-0000-000000000231' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000231',
      scenarioId: hotelScenario.id,
      title: 'Hotel Check-in',
      displayOrder: 2,
    },
  });

  await prisma.dialogueTurn.createMany({
    skipDuplicates: true,
    data: [
      {
        dialogueId: checkinDialogue.id,
        turnOrder: 1,
        speakerType: 'ai',
        characterId: receptionist.id,
        content: 'Good afternoon! Do you have a reservation?',
        hints: ['reservation'],
        idealResponse: 'Yes, I have a reservation under the name Smith.',
      },
      {
        dialogueId: checkinDialogue.id,
        turnOrder: 2,
        speakerType: 'user',
        characterId: traveler.id,
        content: 'Yes, I have a reservation under the name Smith.',
        contentType: 'expected',
        hints: ['reservation', 'Smith'],
      },
      {
        dialogueId: checkinDialogue.id,
        turnOrder: 3,
        speakerType: 'ai',
        characterId: receptionist.id,
        content: 'Perfect! I have your booking here. Could I see your passport, please?',
        hints: ['passport', 'ID'],
        idealResponse: 'Here is my passport.',
      },
      {
        dialogueId: checkinDialogue.id,
        turnOrder: 4,
        speakerType: 'user',
        characterId: traveler.id,
        content: 'Here is my passport.',
        contentType: 'expected',
        hints: ['passport'],
      },
      {
        dialogueId: checkinDialogue.id,
        turnOrder: 5,
        speakerType: 'ai',
        characterId: receptionist.id,
        content: 'Thank you. Your room is on the fifth floor. Here is your key card. Breakfast is served from 7 to 10 AM.',
        hints: ['key card', 'breakfast', 'floor'],
        idealResponse: 'Thank you. Does the room have WiFi?',
      },
      {
        dialogueId: checkinDialogue.id,
        turnOrder: 6,
        speakerType: 'user',
        characterId: traveler.id,
        content: 'Thank you. Does the room have WiFi?',
        contentType: 'expected',
        hints: ['WiFi', 'internet'],
      },
    ],
  });

  // Vocabulary for Hotel
  await prisma.vocabulary.createMany({
    skipDuplicates: true,
    data: [
      { scenarioId: hotelScenario.id, word: 'reservation', phonetic: '/ˌrezərˈveɪʃən/', translation: '预约', difficulty: CEFR_LEVEL.A2 },
      { scenarioId: hotelScenario.id, word: 'reception', phonetic: '/rɪˈsepʃən/', translation: '前台', difficulty: CEFR_LEVEL.A2 },
      { scenarioId: hotelScenario.id, word: 'check-in', phonetic: '/ˈtʃekɪn/', translation: '入住', difficulty: CEFR_LEVEL.A2 },
      { scenarioId: hotelScenario.id, word: 'check-out', phonetic: '/ˈtʃekaʊt/', translation: '退房', difficulty: CEFR_LEVEL.A2 },
      { scenarioId: hotelScenario.id, word: 'double room', phonetic: '/ˈdʌbəl ruːm/', translation: '双人间', difficulty: CEFR_LEVEL.A2 },
      { scenarioId: hotelScenario.id, word: 'single room', phonetic: '/ˈsɪŋɡəl ruːm/', translation: '单人间', difficulty: CEFR_LEVEL.A2 },
      { scenarioId: hotelScenario.id, word: 'key card', phonetic: '/kiː kɑːrd/', translation: '房卡', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: hotelScenario.id, word: 'breakfast', phonetic: '/ˈbrekfəst/', translation: '早餐', difficulty: CEFR_LEVEL.A1 },
    ],
  });

  console.log(`Created scenario: ${hotelScenario.title}`);

  // ============================================================
  // SCENARIO 3: Job Interview (B1)
  // ============================================================

  const interviewScenario = await prisma.scenario.upsert({
    where: { id: '00000000-0000-0000-0000-000000000301' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000301',
      title: 'Job Interview',
      description: 'Practice answering common interview questions and discussing your experience',
      category: SCENARIO_CATEGORY.INTERVIEW,
      difficulty: CEFR_LEVEL.B1,
      locale: 'en-US',
      estimatedMinutes: 20,
    },
  });

  const interviewer = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000000311' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000311',
      name: 'Interviewer',
      role: 'employer',
    },
  });

  const applicant = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000000312' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000312',
      name: 'Applicant',
      role: 'candidate',
    },
  });

  // Dialogue 1: Introduction
  const introDialogue = await prisma.dialogue.upsert({
    where: { id: '00000000-0000-0000-0000-000000000321' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000321',
      scenarioId: interviewScenario.id,
      title: 'Interview Introduction',
      displayOrder: 1,
    },
  });

  await prisma.dialogueTurn.createMany({
    skipDuplicates: true,
    data: [
      {
        dialogueId: introDialogue.id,
        turnOrder: 1,
        speakerType: 'ai',
        characterId: interviewer.id,
        content: 'Good morning! Thank you for coming in. Please have a seat. How are you today?',
        hints: ['seat', 'morning'],
        idealResponse: 'Good morning! I am doing well, thank you. Nice to meet you.',
      },
      {
        dialogueId: introDialogue.id,
        turnOrder: 2,
        speakerType: 'user',
        characterId: applicant.id,
        content: 'Good morning! I am doing well, thank you. Nice to meet you.',
        contentType: 'expected',
        hints: ['nice to meet you'],
      },
      {
        dialogueId: introDialogue.id,
        turnOrder: 3,
        speakerType: 'ai',
        characterId: interviewer.id,
        content: 'Nice to meet you too. I am Sarah, the hiring manager. Can you tell me a little about yourself?',
        hints: ['hiring manager', 'yourself'],
        idealResponse: 'Of course! I graduated from university three years ago, and I have been working in marketing since then.',
      },
      {
        dialogueId: introDialogue.id,
        turnOrder: 4,
        speakerType: 'user',
        characterId: applicant.id,
        content: 'Of course! I graduated from university three years ago, and I have been working in marketing since then.',
        contentType: 'expected',
        hints: ['graduated', 'marketing'],
      },
      {
        dialogueId: introDialogue.id,
        turnOrder: 5,
        speakerType: 'ai',
        characterId: interviewer.id,
        content: 'That sounds interesting. What motivated you to apply for this position?',
        hints: ['motivated', 'position'],
        idealResponse: 'I have been following your company for a while, and I believe my skills in digital marketing would be a great fit.',
      },
      {
        dialogueId: introDialogue.id,
        turnOrder: 6,
        speakerType: 'user',
        characterId: applicant.id,
        content: 'I have been following your company for a while, and I believe my skills in digital marketing would be a great fit.',
        contentType: 'expected',
        hints: ['digital marketing', 'great fit'],
      },
    ],
  });

  // Dialogue 2: Experience and Skills
  const experienceDialogue = await prisma.dialogue.upsert({
    where: { id: '00000000-0000-0000-0000-000000000331' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000331',
      scenarioId: interviewScenario.id,
      title: 'Discussing Experience',
      displayOrder: 2,
    },
  });

  await prisma.dialogueTurn.createMany({
    skipDuplicates: true,
    data: [
      {
        dialogueId: experienceDialogue.id,
        turnOrder: 1,
        speakerType: 'ai',
        characterId: interviewer.id,
        content: 'Can you describe your previous work experience in more detail?',
        hints: ['previous', 'experience'],
        idealResponse: 'Certainly! In my last job, I managed social media accounts and created content for three major brands.',
      },
      {
        dialogueId: experienceDialogue.id,
        turnOrder: 2,
        speakerType: 'user',
        characterId: applicant.id,
        content: 'Certainly! In my last job, I managed social media accounts and created content for three major brands.',
        contentType: 'expected',
        hints: ['social media', 'content'],
      },
      {
        dialogueId: experienceDialogue.id,
        turnOrder: 3,
        speakerType: 'ai',
        characterId: interviewer.id,
        content: 'That is impressive! What would you say is your greatest strength?',
        hints: ['strength', 'greatest'],
        idealResponse: 'I would say my greatest strength is my creativity. I always try to come up with innovative ideas.',
      },
      {
        dialogueId: experienceDialogue.id,
        turnOrder: 4,
        speakerType: 'user',
        characterId: applicant.id,
        content: 'I would say my greatest strength is my creativity. I always try to come up with innovative ideas.',
        contentType: 'expected',
        hints: ['creativity', 'innovative'],
      },
      {
        dialogueId: experienceDialogue.id,
        turnOrder: 5,
        speakerType: 'ai',
        characterId: interviewer.id,
        content: 'And what about your weaknesses? How do you work on improving them?',
        hints: ['weaknesses', 'improving'],
        idealResponse: 'Sometimes I take on too many projects at once. I am learning to prioritize and delegate tasks better.',
      },
      {
        dialogueId: experienceDialogue.id,
        turnOrder: 6,
        speakerType: 'user',
        characterId: applicant.id,
        content: 'Sometimes I take on too many projects at once. I am learning to prioritize and delegate tasks better.',
        contentType: 'expected',
        hints: ['prioritize', 'delegate'],
      },
    ],
  });

  // Vocabulary for Interview
  await prisma.vocabulary.createMany({
    skipDuplicates: true,
    data: [
      { scenarioId: interviewScenario.id, word: 'interview', phonetic: '/ˈɪntəvjuː/', translation: '面试', difficulty: CEFR_LEVEL.A2 },
      { scenarioId: interviewScenario.id, word: 'hiring manager', phonetic: '/ˈhaɪərɪŋ ˈmænɪdʒər/', translation: '招聘经理', difficulty: CEFR_LEVEL.B1 },
      { scenarioId: interviewScenario.id, word: 'position', phonetic: '/pəˈzɪʃən/', translation: '职位', difficulty: CEFR_LEVEL.B1 },
      { scenarioId: interviewScenario.id, word: 'experience', phonetic: '/ɪkˈspɪriəns/', translation: '经验', difficulty: CEFR_LEVEL.A2 },
      { scenarioId: interviewScenario.id, word: 'strength', phonetic: '/streŋθ/', translation: '优势', difficulty: CEFR_LEVEL.B1 },
      { scenarioId: interviewScenario.id, word: 'weakness', phonetic: '/ˈwiːknəs/', translation: '弱点', difficulty: CEFR_LEVEL.B1 },
      { scenarioId: interviewScenario.id, word: 'qualifications', phonetic: '/ˌkwɒlɪfɪˈkeɪʃənz/', translation: '资格', difficulty: CEFR_LEVEL.B1 },
      { scenarioId: interviewScenario.id, word: 'salary', phonetic: '/ˈsæləri/', translation: '工资', difficulty: CEFR_LEVEL.B1 },
    ],
  });

  console.log(`Created scenario: ${interviewScenario.title}`);

  // ============================================================
  // SCENARIO 4: At the Airport (A2)
  // ============================================================

  const airportScenario = await prisma.scenario.upsert({
    where: { id: '00000000-0000-0000-0000-000000000401' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000401',
      title: 'At the Airport',
      description: 'Practice checking in, going through security, and making announcements',
      category: SCENARIO_CATEGORY.TRAVEL,
      difficulty: CEFR_LEVEL.A2,
      locale: 'en-US',
      estimatedMinutes: 15,
    },
  });

  const airportStaff = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000000411' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000411',
      name: 'Airport Staff',
      role: 'staff',
    },
  });

  const passenger = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000000412' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000412',
      name: 'Passenger',
      role: 'traveler',
    },
  });

  // Dialogue 1: Check-in
  const airportCheckinDialogue = await prisma.dialogue.upsert({
    where: { id: '00000000-0000-0000-0000-000000000421' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000421',
      scenarioId: airportScenario.id,
      title: 'Airport Check-in',
      displayOrder: 1,
    },
  });

  await prisma.dialogueTurn.createMany({
    skipDuplicates: true,
    data: [
      {
        dialogueId: airportCheckinDialogue.id,
        turnOrder: 1,
        speakerType: 'ai',
        characterId: airportStaff.id,
        content: 'Good morning! May I see your passport and ticket?',
        hints: ['passport', 'ticket'],
        idealResponse: 'Good morning! Here you go. I am flying to London.',
      },
      {
        dialogueId: airportCheckinDialogue.id,
        turnOrder: 2,
        speakerType: 'user',
        characterId: passenger.id,
        content: 'Good morning! Here you go. I am flying to London.',
        contentType: 'expected',
        hints: ['passport', 'London'],
      },
      {
        dialogueId: airportCheckinDialogue.id,
        turnOrder: 3,
        speakerType: 'ai',
        characterId: airportStaff.id,
        content: 'Thank you. Do you have any bags to check in?',
        hints: ['bags', 'check in'],
        idealResponse: 'Yes, I have one suitcase to check in.',
      },
      {
        dialogueId: airportCheckinDialogue.id,
        turnOrder: 4,
        speakerType: 'user',
        characterId: passenger.id,
        content: 'Yes, I have one suitcase to check in.',
        contentType: 'expected',
        hints: ['suitcase', 'check in'],
      },
      {
        dialogueId: airportCheckinDialogue.id,
        turnOrder: 5,
        speakerType: 'ai',
        characterId: airportStaff.id,
        content: 'Here is your boarding pass. Your flight is boarding at gate B12. Please be there 30 minutes before departure.',
        hints: ['boarding pass', 'gate', 'departure'],
        idealResponse: 'Thank you! Where is gate B12?',
      },
      {
        dialogueId: airportCheckinDialogue.id,
        turnOrder: 6,
        speakerType: 'user',
        characterId: passenger.id,
        content: 'Thank you! Where is gate B12?',
        contentType: 'expected',
        hints: ['gate', 'B12'],
      },
    ],
  });

  // Dialogue 2: Security Check
  const securityDialogue = await prisma.dialogue.upsert({
    where: { id: '00000000-0000-0000-0000-000000000431' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000431',
      scenarioId: airportScenario.id,
      title: 'Security Check',
      displayOrder: 2,
    },
  });

  await prisma.dialogueTurn.createMany({
    skipDuplicates: true,
    data: [
      {
        dialogueId: securityDialogue.id,
        turnOrder: 1,
        speakerType: 'ai',
        characterId: airportStaff.id,
        content: 'Please remove your laptop and any electronic devices from your bag.',
        hints: ['laptop', 'electronic'],
        idealResponse: 'Okay, I will take out my laptop now.',
      },
      {
        dialogueId: securityDialogue.id,
        turnOrder: 2,
        speakerType: 'user',
        characterId: passenger.id,
        content: 'Okay, I will take out my laptop now.',
        contentType: 'expected',
        hints: ['laptop', 'take out'],
      },
      {
        dialogueId: securityDialogue.id,
        turnOrder: 3,
        speakerType: 'ai',
        characterId: airportStaff.id,
        content: 'Do you have any liquids in your bag? They must be in a plastic bag under 100ml.',
        hints: ['liquids', 'plastic bag', '100ml'],
        idealResponse: 'I have a small bottle of water. Should I throw it away?',
      },
      {
        dialogueId: securityDialogue.id,
        turnOrder: 4,
        speakerType: 'user',
        characterId: passenger.id,
        content: 'I have a small bottle of water. Should I throw it away?',
        contentType: 'expected',
        hints: ['water', 'throw away'],
      },
      {
        dialogueId: securityDialogue.id,
        turnOrder: 5,
        speakerType: 'ai',
        characterId: airportStaff.id,
        content: 'Yes, I am afraid so. You cannot bring liquids over 100ml through security. The plastic bag is only for toiletries.',
        hints: ['toiletries', 'security'],
        idealResponse: 'I understand. Here is my boarding pass and passport.',
      },
      {
        dialogueId: securityDialogue.id,
        turnOrder: 6,
        speakerType: 'user',
        characterId: passenger.id,
        content: 'I understand. Here is my boarding pass and passport.',
        contentType: 'expected',
        hints: ['boarding pass', 'passport'],
      },
    ],
  });

  // Vocabulary for Airport
  await prisma.vocabulary.createMany({
    skipDuplicates: true,
    data: [
      { scenarioId: airportScenario.id, word: 'boarding pass', phonetic: '/ˈbɔːrdɪŋ pæs/', translation: '登机牌', difficulty: CEFR_LEVEL.A2 },
      { scenarioId: airportScenario.id, word: 'passport', phonetic: '/ˈpæspɔːrt/', translation: '护照', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: airportScenario.id, word: 'gate', phonetic: '/ɡeɪt/', translation: '登机口', difficulty: CEFR_LEVEL.A2 },
      { scenarioId: airportScenario.id, word: 'departure', phonetic: '/dɪˈpɑːrtʃər/', translation: '出发', difficulty: CEFR_LEVEL.B1 },
      { scenarioId: airportScenario.id, word: 'security', phonetic: '/sɪˈkjʊərəti/', translation: '安检', difficulty: CEFR_LEVEL.A2 },
      { scenarioId: airportScenario.id, word: 'suitcase', phonetic: '/ˈsuːtkeɪs/', translation: '行李箱', difficulty: CEFR_LEVEL.A2 },
      { scenarioId: airportScenario.id, word: 'flight', phonetic: '/flaɪt/', translation: '航班', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: airportScenario.id, word: 'terminal', phonetic: '/ˈtɜːrmɪnl/', translation: '航站楼', difficulty: CEFR_LEVEL.B1 },
    ],
  });

  console.log(`Created scenario: ${airportScenario.title}`);

  // ============================================================
  // SCENARIO 5: Shopping for Clothes (A1)
  // ============================================================

  const shoppingScenario = await prisma.scenario.upsert({
    where: { id: '00000000-0000-0000-0000-000000000501' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000501',
      title: 'Shopping for Clothes',
      description: 'Learn to ask for sizes, try on clothes, and make purchases',
      category: SCENARIO_CATEGORY.DAILY_CONVERSATION,
      difficulty: CEFR_LEVEL.A1,
      locale: 'en-US',
      estimatedMinutes: 12,
    },
  });

  const shopAssistant = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000000511' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000511',
      name: 'Shop Assistant',
      role: 'staff',
    },
  });

  const shopper = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000000512' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000512',
      name: 'Shopper',
      role: 'customer',
    },
  });

  // Dialogue 1: Asking for Help
  const shoppingHelpDialogue = await prisma.dialogue.upsert({
    where: { id: '00000000-0000-0000-0000-000000000521' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000521',
      scenarioId: shoppingScenario.id,
      title: 'Asking for Help',
      displayOrder: 1,
    },
  });

  await prisma.dialogueTurn.createMany({
    skipDuplicates: true,
    data: [
      {
        dialogueId: shoppingHelpDialogue.id,
        turnOrder: 1,
        speakerType: 'ai',
        characterId: shopAssistant.id,
        content: 'Hello! Can I help you with anything?',
        hints: ['help'],
        idealResponse: 'Hello! Yes, I am looking for a t-shirt.',
      },
      {
        dialogueId: shoppingHelpDialogue.id,
        turnOrder: 2,
        speakerType: 'user',
        characterId: shopper.id,
        content: 'Hello! Yes, I am looking for a t-shirt.',
        contentType: 'expected',
        hints: ['t-shirt', 'looking for'],
      },
      {
        dialogueId: shoppingHelpDialogue.id,
        turnOrder: 3,
        speakerType: 'ai',
        characterId: shopAssistant.id,
        content: 'Sure! What size are you looking for?',
        hints: ['size'],
        idealResponse: 'I am looking for a medium size.',
      },
      {
        dialogueId: shoppingHelpDialogue.id,
        turnOrder: 4,
        speakerType: 'user',
        characterId: shopper.id,
        content: 'I am looking for a medium size.',
        contentType: 'expected',
        hints: ['medium', 'size'],
      },
      {
        dialogueId: shoppingHelpDialogue.id,
        turnOrder: 5,
        speakerType: 'ai',
        characterId: shopAssistant.id,
        content: 'We have some nice t-shirts over here. Do you like this blue one?',
        hints: ['blue', 'nice'],
        idealResponse: 'It looks nice! Can I try it on?',
      },
      {
        dialogueId: shoppingHelpDialogue.id,
        turnOrder: 6,
        speakerType: 'user',
        characterId: shopper.id,
        content: 'It looks nice! Can I try it on?',
        contentType: 'expected',
        hints: ['try it on'],
      },
    ],
  });

  // Dialogue 2: Paying
  const payingDialogue = await prisma.dialogue.upsert({
    where: { id: '00000000-0000-0000-0000-000000000531' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000531',
      scenarioId: shoppingScenario.id,
      title: 'Paying for Items',
      displayOrder: 2,
    },
  });

  await prisma.dialogueTurn.createMany({
    skipDuplicates: true,
    data: [
      {
        dialogueId: payingDialogue.id,
        turnOrder: 1,
        speakerType: 'ai',
        characterId: shopAssistant.id,
        content: 'Did you find everything okay?',
        hints: ['everything'],
        idealResponse: 'Yes, I like this t-shirt. How much is it?',
      },
      {
        dialogueId: payingDialogue.id,
        turnOrder: 2,
        speakerType: 'user',
        characterId: shopper.id,
        content: 'Yes, I like this t-shirt. How much is it?',
        contentType: 'expected',
        hints: ['how much'],
      },
      {
        dialogueId: payingDialogue.id,
        turnOrder: 3,
        speakerType: 'ai',
        characterId: shopAssistant.id,
        content: 'It is twenty-five dollars. Would you like a bag?',
        hints: ['dollars', 'bag'],
        idealResponse: 'Yes, please. Can I pay by card?',
      },
      {
        dialogueId: payingDialogue.id,
        turnOrder: 4,
        speakerType: 'user',
        characterId: shopper.id,
        content: 'Yes, please. Can I pay by card?',
        contentType: 'expected',
        hints: ['pay', 'card'],
      },
      {
        dialogueId: payingDialogue.id,
        turnOrder: 5,
        speakerType: 'ai',
        characterId: shopAssistant.id,
        content: 'Of course! Here is your receipt. Thank you and have a nice day!',
        hints: ['receipt', 'thank you'],
        idealResponse: 'Thank you! You too!',
      },
      {
        dialogueId: payingDialogue.id,
        turnOrder: 6,
        speakerType: 'user',
        characterId: shopper.id,
        content: 'Thank you! You too!',
        contentType: 'expected',
        hints: ['thank you'],
      },
    ],
  });

  // Vocabulary for Shopping
  await prisma.vocabulary.createMany({
    skipDuplicates: true,
    data: [
      { scenarioId: shoppingScenario.id, word: 'size', phonetic: '/saɪz/', translation: '尺寸', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: shoppingScenario.id, word: 't-shirt', phonetic: '/ˈtiːʃɜːrt/', translation: 'T恤', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: shoppingScenario.id, word: 'try on', phonetic: '/traɪ ɒn/', translation: '试穿', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: shoppingScenario.id, word: 'fit', phonetic: '/fɪt/', translation: '合适', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: shoppingScenario.id, word: 'price', phonetic: '/praɪs/', translation: '价格', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: shoppingScenario.id, word: 'receipt', phonetic: '/rɪˈsiːt/', translation: '收据', difficulty: CEFR_LEVEL.A2 },
      { scenarioId: shoppingScenario.id, word: 'cash', phonetic: '/kæʃ/', translation: '现金', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: shoppingScenario.id, word: 'card', phonetic: '/kɑːrd/', translation: '卡', difficulty: CEFR_LEVEL.A1 },
    ],
  });

  console.log(`Created scenario: ${shoppingScenario.title}`);

  // ============================================================
  // SCENARIO 6: Making Friends (A1)
  // ============================================================

  const friendsScenario = await prisma.scenario.upsert({
    where: { id: '00000000-0000-0000-0000-000000000601' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000601',
      title: 'Making Friends',
      description: 'Practice introducing yourself and starting conversations',
      category: SCENARIO_CATEGORY.SOCIAL,
      difficulty: CEFR_LEVEL.A1,
      locale: 'en-US',
      estimatedMinutes: 10,
    },
  });

  const newPerson = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000000611' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000611',
      name: 'New Person',
      role: 'stranger',
    },
  });

  const you = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000000612' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000612',
      name: 'You',
      role: 'learner',
    },
  });

  // Dialogue 1: Introduction
  const introductionDialogue = await prisma.dialogue.upsert({
    where: { id: '00000000-0000-0000-0000-000000000621' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000621',
      scenarioId: friendsScenario.id,
      title: 'Introducing Yourself',
      displayOrder: 1,
    },
  });

  await prisma.dialogueTurn.createMany({
    skipDuplicates: true,
    data: [
      {
        dialogueId: introductionDialogue.id,
        turnOrder: 1,
        speakerType: 'ai',
        characterId: newPerson.id,
        content: 'Hi there! I am Alex. Are you new here?',
        hints: ['new', 'here'],
        idealResponse: 'Hi Alex! Yes, I just moved to this city.',
      },
      {
        dialogueId: introductionDialogue.id,
        turnOrder: 2,
        speakerType: 'user',
        characterId: you.id,
        content: 'Hi Alex! Yes, I just moved to this city.',
        contentType: 'expected',
        hints: ['moved', 'city'],
      },
      {
        dialogueId: introductionDialogue.id,
        turnOrder: 3,
        speakerType: 'ai',
        characterId: newPerson.id,
        content: 'Nice to meet you! Where are you from?',
        hints: ['from', 'nice to meet you'],
        idealResponse: 'Nice to meet you too! I am from China.',
      },
      {
        dialogueId: introductionDialogue.id,
        turnOrder: 4,
        speakerType: 'user',
        characterId: you.id,
        content: 'Nice to meet you too! I am from China.',
        contentType: 'expected',
        hints: ['from', 'China'],
      },
      {
        dialogueId: introductionDialogue.id,
        turnOrder: 5,
        speakerType: 'ai',
        characterId: newPerson.id,
        content: 'That is great! Would you like to grab a coffee sometime?',
        hints: ['coffee', 'sometime'],
        idealResponse: 'That sounds nice! I would love to.',
      },
      {
        dialogueId: introductionDialogue.id,
        turnOrder: 6,
        speakerType: 'user',
        characterId: you.id,
        content: 'That sounds nice! I would love to.',
        contentType: 'expected',
        hints: ['love to'],
      },
    ],
  });

  // Dialogue 2: Continuing Conversation
  const continueDialogue = await prisma.dialogue.upsert({
    where: { id: '00000000-0000-0000-0000-000000000631' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000631',
      scenarioId: friendsScenario.id,
      title: 'Continuing the Conversation',
      displayOrder: 2,
    },
  });

  await prisma.dialogueTurn.createMany({
    skipDuplicates: true,
    data: [
      {
        dialogueId: continueDialogue.id,
        turnOrder: 1,
        speakerType: 'ai',
        characterId: newPerson.id,
        content: 'So, what do you do for work?',
        hints: ['work', 'do'],
        idealResponse: 'I work as a teacher. And you?',
      },
      {
        dialogueId: continueDialogue.id,
        turnOrder: 2,
        speakerType: 'user',
        characterId: you.id,
        content: 'I work as a teacher. And you?',
        contentType: 'expected',
        hints: ['teacher', 'you'],
      },
      {
        dialogueId: continueDialogue.id,
        turnOrder: 3,
        speakerType: 'ai',
        characterId: newPerson.id,
        content: 'I work at a software company. Do you like this city so far?',
        hints: ['software', 'company', 'like'],
        idealResponse: 'Yes, I like it a lot! People are very friendly.',
      },
      {
        dialogueId: continueDialogue.id,
        turnOrder: 4,
        speakerType: 'user',
        characterId: you.id,
        content: 'Yes, I like it a lot! People are very friendly.',
        contentType: 'expected',
        hints: ['like', 'friendly'],
      },
      {
        dialogueId: continueDialogue.id,
        turnOrder: 5,
        speakerType: 'ai',
        characterId: newPerson.id,
        content: 'That is good to hear! Let me give you my phone number. We should definitely hang out.',
        hints: ['phone number', 'hang out'],
        idealResponse: 'That would be great! Here is my number too.',
      },
      {
        dialogueId: continueDialogue.id,
        turnOrder: 6,
        speakerType: 'user',
        characterId: you.id,
        content: 'That would be great! Here is my number too.',
        contentType: 'expected',
        hints: ['great', 'number'],
      },
    ],
  });

  // Vocabulary for Making Friends
  await prisma.vocabulary.createMany({
    skipDuplicates: true,
    data: [
      { scenarioId: friendsScenario.id, word: 'nice to meet you', phonetic: '/naɪs tə miːt juː/', translation: '很高兴认识你', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: friendsScenario.id, word: 'from', phonetic: '/frɒm/', translation: '来自', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: friendsScenario.id, word: 'coffee', phonetic: '/ˈkɒfi/', translation: '咖啡', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: friendsScenario.id, word: 'friend', phonetic: '/frend/', translation: '朋友', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: friendsScenario.id, word: 'work', phonetic: '/wɜːrk/', translation: '工作', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: friendsScenario.id, word: 'phone number', phonetic: '/foʊn ˈnʌmbər/', translation: '电话号码', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: friendsScenario.id, word: 'hang out', phonetic: '/hæŋ aʊt/', translation: '出去玩', difficulty: CEFR_LEVEL.A2 },
    ],
  });

  console.log(`Created scenario: ${friendsScenario.title}`);

  // ============================================================
  // SCENARIO 7: Business Meeting (B2)
  // ============================================================

  const businessScenario = await prisma.scenario.upsert({
    where: { id: '00000000-0000-0000-0000-000000000701' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000701',
      title: 'Business Meeting',
      description: 'Practice professional communication, presentations, and negotiations',
      category: SCENARIO_CATEGORY.BUSINESS,
      difficulty: CEFR_LEVEL.B2,
      locale: 'en-US',
      estimatedMinutes: 20,
    },
  });

  const manager = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000000711' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000711',
      name: 'Manager',
      role: 'executive',
    },
  });

  const employee = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000000712' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000712',
      name: 'Employee',
      role: 'staff',
    },
  });

  // Dialogue 1: Project Update
  const projectDialogue = await prisma.dialogue.upsert({
    where: { id: '00000000-0000-0000-0000-000000000721' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000721',
      scenarioId: businessScenario.id,
      title: 'Project Update',
      displayOrder: 1,
    },
  });

  await prisma.dialogueTurn.createMany({
    skipDuplicates: true,
    data: [
      {
        dialogueId: projectDialogue.id,
        turnOrder: 1,
        speakerType: 'ai',
        characterId: manager.id,
        content: 'Good morning! Thank you for joining us. Let us start by reviewing the quarterly results. What are your thoughts on the current progress?',
        hints: ['quarterly', 'results', 'progress'],
        idealResponse: 'Thank you for having me. I believe we have made significant progress, though we still face some challenges with the new market launch.',
      },
      {
        dialogueId: projectDialogue.id,
        turnOrder: 2,
        speakerType: 'user',
        characterId: employee.id,
        content: 'Thank you for having me. I believe we have made significant progress, though we still face some challenges with the new market launch.',
        contentType: 'expected',
        hints: ['significant', 'challenges', 'market'],
      },
      {
        dialogueId: projectDialogue.id,
        turnOrder: 3,
        speakerType: 'ai',
        characterId: manager.id,
        content: 'Could you elaborate on those challenges? I would like to understand how we can better support your team.',
        hints: ['elaborate', 'support', 'team'],
        idealResponse: 'Certainly. The main issue is resource allocation. We need additional developers to meet the deadline.',
      },
      {
        dialogueId: projectDialogue.id,
        turnOrder: 4,
        speakerType: 'user',
        characterId: employee.id,
        content: 'Certainly. The main issue is resource allocation. We need additional developers to meet the deadline.',
        contentType: 'expected',
        hints: ['resource allocation', 'developers', 'deadline'],
      },
      {
        dialogueId: projectDialogue.id,
        turnOrder: 5,
        speakerType: 'ai',
        characterId: manager.id,
        content: 'I see. Have you considered outsourcing some of the work? That might be a more cost-effective solution.',
        hints: ['outsourcing', 'cost-effective'],
        idealResponse: 'That is an interesting suggestion. However, I am concerned about quality control. Perhaps we could discuss this further.',
      },
      {
        dialogueId: projectDialogue.id,
        turnOrder: 6,
        speakerType: 'user',
        characterId: employee.id,
        content: 'That is an interesting suggestion. However, I am concerned about quality control. Perhaps we could discuss this further.',
        contentType: 'expected',
        hints: ['quality control', 'discuss further'],
      },
    ],
  });

  // Dialogue 2: Decision Making
  const decisionDialogue = await prisma.dialogue.upsert({
    where: { id: '00000000-0000-0000-0000-000000000731' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000731',
      scenarioId: businessScenario.id,
      title: 'Making Decisions',
      displayOrder: 2,
    },
  });

  await prisma.dialogueTurn.createMany({
    skipDuplicates: true,
    data: [
      {
        dialogueId: decisionDialogue.id,
        turnOrder: 1,
        speakerType: 'ai',
        characterId: manager.id,
        content: 'Based on the data, we need to make a decision about the budget allocation. What is your recommendation?',
        hints: ['budget', 'allocation', 'recommendation'],
        idealResponse: 'Based on my analysis, I would recommend investing more in marketing rather than product development at this stage.',
      },
      {
        dialogueId: decisionDialogue.id,
        turnOrder: 2,
        speakerType: 'user',
        characterId: employee.id,
        content: 'Based on my analysis, I would recommend investing more in marketing rather than product development at this stage.',
        contentType: 'expected',
        hints: ['analysis', 'investing', 'marketing'],
      },
      {
        dialogueId: decisionDialogue.id,
        turnOrder: 3,
        speakerType: 'ai',
        characterId: manager.id,
        content: 'That is a valid point. However, I am worried that reducing the product development budget might affect our competitiveness.',
        hints: ['valid point', 'competitiveness'],
        idealResponse: 'I understand your concern. But if we do not increase brand awareness now, the product launch will not be successful regardless of its quality.',
      },
      {
        dialogueId: decisionDialogue.id,
        turnOrder: 4,
        speakerType: 'user',
        characterId: employee.id,
        content: 'I understand your concern. But if we do not increase brand awareness now, the product launch will not be successful regardless of its quality.',
        contentType: 'expected',
        hints: ['brand awareness', 'product launch'],
      },
      {
        dialogueId: decisionDialogue.id,
        turnOrder: 5,
        speakerType: 'ai',
        characterId: manager.id,
        content: 'You make a fair point. Let us compromise and allocate 60% to marketing and 40% to product development. Does that work for you?',
        hints: ['compromise', 'allocate'],
        idealResponse: 'That sounds reasonable. I believe we can work with that allocation.',
      },
      {
        dialogueId: decisionDialogue.id,
        turnOrder: 6,
        speakerType: 'user',
        characterId: employee.id,
        content: 'That sounds reasonable. I believe we can work with that allocation.',
        contentType: 'expected',
        hints: ['reasonable', 'work with'],
      },
    ],
  });

  // Vocabulary for Business
  await prisma.vocabulary.createMany({
    skipDuplicates: true,
    data: [
      { scenarioId: businessScenario.id, word: 'quarterly', phonetic: '/ˈkwɔːrtərli/', translation: '季度的', difficulty: CEFR_LEVEL.B2 },
      { scenarioId: businessScenario.id, word: 'budget', phonetic: '/ˈbʌdʒɪt/', translation: '预算', difficulty: CEFR_LEVEL.B1 },
      { scenarioId: businessScenario.id, word: 'allocation', phonetic: '/ˌæləˈkeɪʃən/', translation: '分配', difficulty: CEFR_LEVEL.B2 },
      { scenarioId: businessScenario.id, word: 'outsourcing', phonetic: '/ˈaʊtsɔːrsɪŋ/', translation: '外包', difficulty: CEFR_LEVEL.B2 },
      { scenarioId: businessScenario.id, word: 'competitiveness', phonetic: '/kəmˈpetɪtɪvnəs/', translation: '竞争力', difficulty: CEFR_LEVEL.B2 },
      { scenarioId: businessScenario.id, word: 'compromise', phonetic: '/ˈkɒmpromaɪz/', translation: '妥协', difficulty: CEFR_LEVEL.B2 },
      { scenarioId: businessScenario.id, word: 'stakeholder', phonetic: '/ˈsteɪkhoʊldər/', translation: '利益相关者', difficulty: CEFR_LEVEL.B2 },
      { scenarioId: businessScenario.id, word: 'deadline', phonetic: '/ˈdedlaɪn/', translation: '截止日期', difficulty: CEFR_LEVEL.B1 },
    ],
  });

  console.log(`Created scenario: ${businessScenario.title}`);

  // ============================================================
  // SCENARIO 8: Doctor's Appointment (B1)
  // ============================================================

  const doctorScenario = await prisma.scenario.upsert({
    where: { id: '00000000-0000-0000-0000-000000000801' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000801',
      title: "Doctor's Appointment",
      description: 'Practice describing symptoms and understanding medical advice',
      category: SCENARIO_CATEGORY.DAILY_CONVERSATION,
      difficulty: CEFR_LEVEL.B1,
      locale: 'en-US',
      estimatedMinutes: 15,
    },
  });

  const doctor = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000000811' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000811',
      name: 'Doctor',
      role: 'medical professional',
    },
  });

  const patient = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000000812' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000812',
      name: 'Patient',
      role: 'patient',
    },
  });

  // Dialogue 1: Describing Symptoms
  const symptomsDialogue = await prisma.dialogue.upsert({
    where: { id: '00000000-0000-0000-0000-000000000821' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000821',
      scenarioId: doctorScenario.id,
      title: 'Describing Symptoms',
      displayOrder: 1,
    },
  });

  await prisma.dialogueTurn.createMany({
    skipDuplicates: true,
    data: [
      {
        dialogueId: symptomsDialogue.id,
        turnOrder: 1,
        speakerType: 'ai',
        characterId: doctor.id,
        content: 'Good morning. Please have a seat. What brings you in today?',
        hints: ['brings you in', 'today'],
        idealResponse: 'Good morning, doctor. I have been feeling unwell for the past few days.',
      },
      {
        dialogueId: symptomsDialogue.id,
        turnOrder: 2,
        speakerType: 'user',
        characterId: patient.id,
        content: 'Good morning, doctor. I have been feeling unwell for the past few days.',
        contentType: 'expected',
        hints: ['unwell', 'past few days'],
      },
      {
        dialogueId: symptomsDialogue.id,
        turnOrder: 3,
        speakerType: 'ai',
        characterId: doctor.id,
        content: 'I see. Can you describe what symptoms you are experiencing?',
        hints: ['symptoms', 'experiencing'],
        idealResponse: 'I have a sore throat, a runny nose, and I feel very tired.',
      },
      {
        dialogueId: symptomsDialogue.id,
        turnOrder: 4,
        speakerType: 'user',
        characterId: patient.id,
        content: 'I have a sore throat, a runny nose, and I feel very tired.',
        contentType: 'expected',
        hints: ['sore throat', 'runny nose', 'tired'],
      },
      {
        dialogueId: symptomsDialogue.id,
        turnOrder: 5,
        speakerType: 'ai',
        characterId: doctor.id,
        content: 'How long have you had these symptoms? Have you taken any medication?',
        hints: ['medication', 'how long'],
        idealResponse: 'I have had them for about three days. I took some aspirin, but it did not help much.',
      },
      {
        dialogueId: symptomsDialogue.id,
        turnOrder: 6,
        speakerType: 'user',
        characterId: patient.id,
        content: 'I have had them for about three days. I took some aspirin, but it did not help much.',
        contentType: 'expected',
        hints: ['three days', 'aspirin'],
      },
    ],
  });

  // Dialogue 2: Medical Advice
  const adviceDialogue = await prisma.dialogue.upsert({
    where: { id: '00000000-0000-0000-0000-000000000831' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000831',
      scenarioId: doctorScenario.id,
      title: 'Receiving Medical Advice',
      displayOrder: 2,
    },
  });

  await prisma.dialogueTurn.createMany({
    skipDuplicates: true,
    data: [
      {
        dialogueId: adviceDialogue.id,
        turnOrder: 1,
        speakerType: 'ai',
        characterId: doctor.id,
        content: 'Based on your symptoms, it appears you have a common cold. I am going to prescribe some medication.',
        hints: ['common cold', 'prescribe'],
        idealResponse: 'Thank you, doctor. Should I stay home from work?',
      },
      {
        dialogueId: adviceDialogue.id,
        turnOrder: 2,
        speakerType: 'user',
        characterId: patient.id,
        content: 'Thank you, doctor. Should I stay home from work?',
        contentType: 'expected',
        hints: ['stay home', 'work'],
      },
      {
        dialogueId: adviceDialogue.id,
        turnOrder: 3,
        speakerType: 'ai',
        characterId: doctor.id,
        content: 'I recommend taking a few days off to rest. Make sure to drink plenty of fluids and get enough sleep.',
        hints: ['fluids', 'rest', 'sleep'],
        idealResponse: 'I will. Are there any foods I should avoid?',
      },
      {
        dialogueId: adviceDialogue.id,
        turnOrder: 4,
        speakerType: 'user',
        characterId: patient.id,
        content: 'I will. Are there any foods I should avoid?',
        contentType: 'expected',
        hints: ['foods', 'avoid'],
      },
      {
        dialogueId: adviceDialogue.id,
        turnOrder: 5,
        speakerType: 'ai',
        characterId: doctor.id,
        content: 'Try to avoid dairy products for now, as they can increase mucus production. Also, limit your caffeine intake.',
        hints: ['dairy', 'mucus', 'caffeine'],
        idealResponse: 'Got it. When should I come back if I do not feel better?',
      },
      {
        dialogueId: adviceDialogue.id,
        turnOrder: 6,
        speakerType: 'user',
        characterId: patient.id,
        content: 'Got it. When should I come back if I do not feel better?',
        contentType: 'expected',
        hints: ['come back', 'feel better'],
      },
    ],
  });

  // Vocabulary for Doctor
  await prisma.vocabulary.createMany({
    skipDuplicates: true,
    data: [
      { scenarioId: doctorScenario.id, word: 'symptom', phonetic: '/ˈsɪmptəm/', translation: '症状', difficulty: CEFR_LEVEL.B1 },
      { scenarioId: doctorScenario.id, word: 'prescribe', phonetic: '/prɪˈskraɪb/', translation: '开处方', difficulty: CEFR_LEVEL.B1 },
      { scenarioId: doctorScenario.id, word: 'medication', phonetic: '/ˌmedɪˈkeɪʃən/', translation: '药物', difficulty: CEFR_LEVEL.B1 },
      { scenarioId: doctorScenario.id, word: 'fluids', phonetic: '/ˈfluːɪdz/', translation: '液体', difficulty: CEFR_LEVEL.B1 },
      { scenarioId: doctorScenario.id, word: 'sore throat', phonetic: '/sɔːr θroʊt/', translation: '喉咙痛', difficulty: CEFR_LEVEL.A2 },
      { scenarioId: doctorScenario.id, word: 'runny nose', phonetic: '/ˈrʌni noʊz/', translation: '流鼻涕', difficulty: CEFR_LEVEL.A2 },
      { scenarioId: doctorScenario.id, word: 'appointment', phonetic: '/əˈpɔɪntmənt/', translation: '预约', difficulty: CEFR_LEVEL.A2 },
    ],
  });

  console.log(`Created scenario: ${doctorScenario.title}`);

  // ============================================================
  // SCENARIO 9: Ordering Coffee (A1)
  // ============================================================

  const coffeeScenario = await prisma.scenario.upsert({
    where: { id: '00000000-0000-0000-0000-000000000901' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000901',
      title: 'Ordering Coffee',
      description: 'Learn to order drinks at a cafe and customize your order',
      category: SCENARIO_CATEGORY.DAILY_CONVERSATION,
      difficulty: CEFR_LEVEL.A1,
      locale: 'en-US',
      estimatedMinutes: 10,
    },
  });

  const barista = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000000911' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000911',
      name: 'Barista',
      role: 'staff',
    },
  });

  const coffeeCustomer = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000000912' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000912',
      name: 'Customer',
      role: 'customer',
    },
  });

  // Dialogue 1: Basic Order
  const coffeeOrderDialogue = await prisma.dialogue.upsert({
    where: { id: '00000000-0000-0000-0000-000000000921' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000921',
      scenarioId: coffeeScenario.id,
      title: 'Ordering a Coffee',
      displayOrder: 1,
    },
  });

  await prisma.dialogueTurn.createMany({
    skipDuplicates: true,
    data: [
      {
        dialogueId: coffeeOrderDialogue.id,
        turnOrder: 1,
        speakerType: 'ai',
        characterId: barista.id,
        content: 'Hi there! What can I get for you today?',
        hints: ['get', 'today'],
        idealResponse: 'Hi! I would like a coffee, please.',
      },
      {
        dialogueId: coffeeOrderDialogue.id,
        turnOrder: 2,
        speakerType: 'user',
        characterId: coffeeCustomer.id,
        content: 'Hi! I would like a coffee, please.',
        contentType: 'expected',
        hints: ['coffee', 'please'],
      },
      {
        dialogueId: coffeeOrderDialogue.id,
        turnOrder: 3,
        speakerType: 'ai',
        characterId: barista.id,
        content: 'Sure! What size would you like - small, medium, or large?',
        hints: ['size', 'small', 'medium', 'large'],
        idealResponse: 'I will have a medium, please.',
      },
      {
        dialogueId: coffeeOrderDialogue.id,
        turnOrder: 4,
        speakerType: 'user',
        characterId: coffeeCustomer.id,
        content: 'I will have a medium, please.',
        contentType: 'expected',
        hints: ['medium'],
      },
      {
        dialogueId: coffeeOrderDialogue.id,
        turnOrder: 5,
        speakerType: 'ai',
        characterId: barista.id,
        content: 'Would you like that for here or to go?',
        hints: ['here', 'to go'],
        idealResponse: 'For here, please.',
      },
      {
        dialogueId: coffeeOrderDialogue.id,
        turnOrder: 6,
        speakerType: 'user',
        characterId: coffeeCustomer.id,
        content: 'For here, please.',
        contentType: 'expected',
        hints: ['for here'],
      },
    ],
  });

  // Dialogue 2: Customizing Order
  const customDialogue = await prisma.dialogue.upsert({
    where: { id: '00000000-0000-0000-0000-000000000931' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000931',
      scenarioId: coffeeScenario.id,
      title: 'Customizing Your Drink',
      displayOrder: 2,
    },
  });

  await prisma.dialogueTurn.createMany({
    skipDuplicates: true,
    data: [
      {
        dialogueId: customDialogue.id,
        turnOrder: 1,
        speakerType: 'ai',
        characterId: barista.id,
        content: 'Hi! What can I get started for you?',
        hints: ['get started'],
        idealResponse: 'Hi! Can I have a latte?',
      },
      {
        dialogueId: customDialogue.id,
        turnOrder: 2,
        speakerType: 'user',
        characterId: coffeeCustomer.id,
        content: 'Hi! Can I have a latte?',
        contentType: 'expected',
        hints: ['latte'],
      },
      {
        dialogueId: customDialogue.id,
        turnOrder: 3,
        speakerType: 'ai',
        characterId: barista.id,
        content: 'Of course! Would you like that with dairy milk or oat milk?',
        hints: ['dairy milk', 'oat milk'],
        idealResponse: 'Oat milk, please.',
      },
      {
        dialogueId: customDialogue.id,
        turnOrder: 4,
        speakerType: 'user',
        characterId: coffeeCustomer.id,
        content: 'Oat milk, please.',
        contentType: 'expected',
        hints: ['oat milk'],
      },
      {
        dialogueId: customDialogue.id,
        turnOrder: 5,
        speakerType: 'ai',
        characterId: barista.id,
        content: 'Sure! Would you like any sugar or flavor?',
        hints: ['sugar', 'flavor'],
        idealResponse: 'No sugar, but can you add vanilla?',
      },
      {
        dialogueId: customDialogue.id,
        turnOrder: 6,
        speakerType: 'user',
        characterId: coffeeCustomer.id,
        content: 'No sugar, but can you add vanilla?',
        contentType: 'expected',
        hints: ['no sugar', 'vanilla'],
      },
    ],
  });

  // Vocabulary for Coffee
  await prisma.vocabulary.createMany({
    skipDuplicates: true,
    data: [
      { scenarioId: coffeeScenario.id, word: 'coffee', phonetic: '/ˈkɒfi/', translation: '咖啡', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: coffeeScenario.id, word: 'latte', phonetic: '/ˈlɑːteɪ/', translation: '拿铁', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: coffeeScenario.id, word: 'size', phonetic: '/saɪz/', translation: '大小', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: coffeeScenario.id, word: 'milk', phonetic: '/mɪlk/', translation: '牛奶', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: coffeeScenario.id, word: 'sugar', phonetic: '/ˈʃʊɡər/', translation: '糖', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: coffeeScenario.id, word: 'to go', phonetic: '/tuː ɡoʊ/', translation: '外带', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: coffeeScenario.id, word: 'for here', phonetic: '/fɔːr hɪr/', translation: '堂食', difficulty: CEFR_LEVEL.A1 },
    ],
  });

  console.log(`Created scenario: ${coffeeScenario.title}`);

  // ============================================================
  // SCENARIO 10: Asking for Directions (A1)
  // ============================================================

  const directionsScenario = await prisma.scenario.upsert({
    where: { id: '00000000-0000-0000-0000-000000001001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000001001',
      title: 'Asking for Directions',
      description: 'Learn to ask for and understand directions to various places',
      category: SCENARIO_CATEGORY.TRAVEL,
      difficulty: CEFR_LEVEL.A1,
      locale: 'en-US',
      estimatedMinutes: 10,
    },
  });

  const local = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000001011' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000001011',
      name: 'Local Resident',
      role: 'helper',
    },
  });

  const tourist = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000001012' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000001012',
      name: 'Tourist',
      role: 'traveler',
    },
  });

  // Dialogue 1: Basic Directions
  const basicDirectionsDialogue = await prisma.dialogue.upsert({
    where: { id: '00000000-0000-0000-0000-000000001021' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000001021',
      scenarioId: directionsScenario.id,
      title: 'Asking for Directions',
      displayOrder: 1,
    },
  });

  await prisma.dialogueTurn.createMany({
    skipDuplicates: true,
    data: [
      {
        dialogueId: basicDirectionsDialogue.id,
        turnOrder: 1,
        speakerType: 'ai',
        characterId: local.id,
        content: 'Hello! Do you need help with something?',
        hints: ['help'],
        idealResponse: 'Hello! Excuse me, is there a supermarket near here?',
      },
      {
        dialogueId: basicDirectionsDialogue.id,
        turnOrder: 2,
        speakerType: 'user',
        characterId: tourist.id,
        content: 'Hello! Excuse me, is there a supermarket near here?',
        contentType: 'expected',
        hints: ['supermarket', 'near here'],
      },
      {
        dialogueId: basicDirectionsDialogue.id,
        turnOrder: 3,
        speakerType: 'ai',
        characterId: local.id,
        content: 'Yes, there is one just around the corner. Go straight and turn left.',
        hints: ['straight', 'turn left', 'corner'],
        idealResponse: 'Thank you! Is it far from here?',
      },
      {
        dialogueId: basicDirectionsDialogue.id,
        turnOrder: 4,
        speakerType: 'user',
        characterId: tourist.id,
        content: 'Thank you! Is it far from here?',
        contentType: 'expected',
        hints: ['far', 'thank you'],
      },
      {
        dialogueId: basicDirectionsDialogue.id,
        turnOrder: 5,
        speakerType: 'ai',
        characterId: local.id,
        content: 'No, it is very close. Only about a two-minute walk. You cannot miss it!',
        hints: ['close', 'two-minute walk'],
        idealResponse: 'Great! Thank you for your help!',
      },
      {
        dialogueId: basicDirectionsDialogue.id,
        turnOrder: 6,
        speakerType: 'user',
        characterId: tourist.id,
        content: 'Great! Thank you for your help!',
        contentType: 'expected',
        hints: ['thank you', 'help'],
      },
    ],
  });

  // Dialogue 2: More Detailed Directions
  const detailedDirectionsDialogue = await prisma.dialogue.upsert({
    where: { id: '00000000-0000-0000-0000-000000001031' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000001031',
      scenarioId: directionsScenario.id,
      title: 'Getting More Details',
      displayOrder: 2,
    },
  });

  await prisma.dialogueTurn.createMany({
    skipDuplicates: true,
    data: [
      {
        dialogueId: detailedDirectionsDialogue.id,
        turnOrder: 1,
        speakerType: 'ai',
        characterId: local.id,
        content: 'Hi! Can I help you?',
        hints: ['help'],
        idealResponse: 'Yes, please. How do I get to the train station?',
      },
      {
        dialogueId: detailedDirectionsDialogue.id,
        turnOrder: 2,
        speakerType: 'user',
        characterId: tourist.id,
        content: 'Yes, please. How do I get to the train station?',
        contentType: 'expected',
        hints: ['train station', 'how do I get'],
      },
      {
        dialogueId: detailedDirectionsDialogue.id,
        turnOrder: 3,
        speakerType: 'ai',
        characterId: local.id,
        content: 'Go down this street and turn right at the traffic lights. Then walk for about five minutes.',
        hints: ['down', 'turn right', 'traffic lights'],
        idealResponse: 'Is it on the left or right side of the street?',
      },
      {
        dialogueId: detailedDirectionsDialogue.id,
        turnOrder: 4,
        speakerType: 'user',
        characterId: tourist.id,
        content: 'Is it on the left or right side of the street?',
        contentType: 'expected',
        hints: ['left', 'right', 'side'],
      },
      {
        dialogueId: detailedDirectionsDialogue.id,
        turnOrder: 5,
        speakerType: 'ai',
        characterId: local.id,
        content: 'It is on the right side. You will see a big sign that says "Train Station".',
        hints: ['right side', 'sign'],
        idealResponse: 'Perfect! Thank you so much!',
      },
      {
        dialogueId: detailedDirectionsDialogue.id,
        turnOrder: 6,
        speakerType: 'user',
        characterId: tourist.id,
        content: 'Perfect! Thank you so much!',
        contentType: 'expected',
        hints: ['thank you', 'so much'],
      },
    ],
  });

  // Vocabulary for Directions
  await prisma.vocabulary.createMany({
    skipDuplicates: true,
    data: [
      { scenarioId: directionsScenario.id, word: 'straight', phonetic: '/streɪt/', translation: '直走', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: directionsScenario.id, word: 'turn left', phonetic: '/tɜːrn left/', translation: '左转', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: directionsScenario.id, word: 'turn right', phonetic: '/tɜːrn raɪt/', translation: '右转', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: directionsScenario.id, word: 'corner', phonetic: '/ˈkɔːrnər/', translation: '拐角', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: directionsScenario.id, word: 'traffic lights', phonetic: '/ˈtræfɪk laɪts/', translation: '红绿灯', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: directionsScenario.id, word: 'near', phonetic: '/nɪr/', translation: '附近', difficulty: CEFR_LEVEL.A1 },
      { scenarioId: directionsScenario.id, word: 'far', phonetic: '/fɑːr/', translation: '远', difficulty: CEFR_LEVEL.A1 },
    ],
  });

  console.log(`Created scenario: ${directionsScenario.title}`);

  console.log('All 10 scenarios seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
