import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  audioUrl: z.string().optional(),
});

function formatZodError(error: z.ZodError): string {
  return error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
}

router.use(authenticate);

router.post('/conversations', async (req: AuthRequest, res, next) => {
  try {
    const { scenarioId, title } = req.body;

    const conversation = await prisma.chatbotConversation.create({
      data: {
        userId: req.userId!,
        scenarioId,
        title: title || 'New Conversation',
        context: {
          difficulty: 'B1',
          interests: [],
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: conversation,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/conversations', async (req: AuthRequest, res, next) => {
  try {
    const conversations = await prisma.chatbotConversation.findMany({
      where: { userId: req.userId, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({
      status: 'success',
      data: conversations,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/conversations/:id', async (req: AuthRequest, res, next) => {
  try {
    const conversation = await prisma.chatbotConversation.findUnique({
      where: { id: req.params.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    });

    if (!conversation || conversation.userId !== req.userId) {
      throw new AppError('Conversation not found', 404);
    }

    res.json({
      status: 'success',
      data: conversation,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/conversations/:id/messages', async (req: AuthRequest, res, next) => {
  try {
    const data = sendMessageSchema.parse(req.body);

    const conversation = await prisma.chatbotConversation.findUnique({
      where: { id: req.params.id },
    });

    if (!conversation || conversation.userId !== req.userId) {
      throw new AppError('Conversation not found', 404);
    }

    const userMessage = await prisma.chatbotMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: data.content,
        audioUrl: data.audioUrl,
      },
    });

    await prisma.chatbotConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    const aiResponses = generateAIResponse(data.content, conversation.context as any);

    const aiMessages = [];
    for (const response of aiResponses) {
      const aiMessage = await prisma.chatbotMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: response.content,
        },
      });
      aiMessages.push(aiMessage);
    }

    res.status(201).json({
      status: 'success',
      data: {
        userMessage,
        aiMessages,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(formatZodError(err), 400));
    } else {
      next(err);
    }
  }
});

function generateAIResponse(userMessage: string, context: any) {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('help')) {
    return [
      {
        content: "I'm here to help you practice English! You can:\n\n1. Role-play conversations\n2. Practice pronunciation\n3. Ask grammar questions\n4. Get vocabulary tips\n\nWhat would you like to work on?",
      },
    ];
  }

  if (lowerMessage.includes('vocabulary') || lowerMessage.includes('word')) {
    return [
      {
        content: "Great topic! To expand your vocabulary:\n\n1. Read daily in English\n2. Use flashcards (Anki is great)\n3. Learn words in context, not just definitions\n4. Practice using new words in sentences\n\nWould you like me to suggest some useful words for your level?",
      },
    ];
  }

  if (lowerMessage.includes('grammar')) {
    return [
      {
        content: "I can help with grammar! Common areas:\n\n- Verb tenses\n- Articles (a, an, the)\n- Prepositions\n- Sentence structure\n\nWhich area would you like to practice?",
      },
    ];
  }

  return [
    {
      content: "That's interesting! Let me help you practice. Could you tell me more about what you want to learn? You can:\n\n- Practice a dialogue\n- Ask me to correct your sentences\n- Request vocabulary for a specific topic\n\nWhat interests you most?",
    },
  ];
}

router.delete('/conversations/:id', async (req: AuthRequest, res, next) => {
  try {
    const conversation = await prisma.chatbotConversation.findUnique({
      where: { id: req.params.id },
    });

    if (!conversation || conversation.userId !== req.userId) {
      throw new AppError('Conversation not found', 404);
    }

    await prisma.chatbotConversation.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({
      status: 'success',
      message: 'Conversation deleted',
    });
  } catch (err) {
    next(err);
  }
});

export { router as chatbotRouter };
