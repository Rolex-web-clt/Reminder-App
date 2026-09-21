import { GoogleGenAI, Type } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export interface ParsedReminderResult {
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: string;
  recurrence: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  tags: string[];
  rawText: string;
}

export async function parseNaturalLanguageReminder(text: string, userTimezone: string = 'UTC'): Promise<ParsedReminderResult> {
  const ai = getAiClient();
  const todayStr = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toTimeString().slice(0, 5);

  if (!ai) {
    // Graceful smart heuristic fallback if GEMINI_API_KEY is not configured yet
    return fallbackParser(text);
  }

  try {
    const prompt = `You are an expert AI assistant that extracts structured reminder details from conversational text or speech transcripts.
Current date reference is: ${todayStr} (user local time approximately ${nowTime}, timezone: ${userTimezone}).
User said/wrote: "${text}"

Extract the following information carefully:
1. title: A clear, concise title of the reminder task.
2. description: Any additional context, details, or empty string if none.
3. date: ISO date string in "YYYY-MM-DD" format. If relative (e.g. "tomorrow", "next Monday", "in 3 days"), calculate based on today ${todayStr}. If no date specified, default to today or tomorrow depending on time.
4. time: 24-hour time string in "HH:mm" format (e.g. "09:00", "19:00"). If time not explicitly mentioned, default to a sensible time like "09:00" or "18:00".
5. priority: One of "LOW", "MEDIUM", "HIGH", "URGENT".
6. category: One of "Personal", "Work", "Study", "Health", "Finance", "Meeting", "Shopping", "Travel", "Other".
7. recurrence: One of "NONE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY". (e.g. "every Monday" -> WEEKLY, "daily" -> DAILY).
8. tags: Array of clean lowercase hashtag keywords without '#' symbol (e.g. ["javascript", "study"]).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            date: { type: Type.STRING },
            time: { type: Type.STRING },
            priority: {
              type: Type.STRING,
              enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
            },
            category: { type: Type.STRING },
            recurrence: {
              type: Type.STRING,
              enum: ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'],
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['title', 'date', 'time', 'priority', 'category', 'recurrence', 'tags'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      title: parsed.title || text.slice(0, 50),
      description: parsed.description || '',
      date: parsed.date || todayStr,
      time: parsed.time || '09:00',
      priority: parsed.priority || 'MEDIUM',
      category: parsed.category || 'Personal',
      recurrence: parsed.recurrence || 'NONE',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      rawText: text,
    };
  } catch (error) {
    console.error('Gemini parsing error, falling back to heuristic:', error);
    return fallbackParser(text);
  }
}

function fallbackParser(text: string): ParsedReminderResult {
  const lower = text.toLowerCase();
  const today = new Date();
  let targetDate = new Date();
  let time = '09:00';
  let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM';
  let category = 'Personal';
  let recurrence: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' = 'NONE';
  const tags: string[] = [];

  // Recurrence detection
  if (lower.includes('every day') || lower.includes('daily')) recurrence = 'DAILY';
  else if (lower.includes('every week') || lower.includes('weekly') || lower.includes('every monday') || lower.includes('every sunday')) recurrence = 'WEEKLY';
  else if (lower.includes('every month') || lower.includes('monthly')) recurrence = 'MONTHLY';
  else if (lower.includes('every year') || lower.includes('yearly') || lower.includes('birthday')) recurrence = 'YEARLY';

  // Date detection
  if (lower.includes('tomorrow')) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (lower.includes('day after tomorrow')) {
    targetDate.setDate(targetDate.getDate() + 2);
  } else if (lower.includes('next week')) {
    targetDate.setDate(targetDate.getDate() + 7);
  }

  // Time detection: e.g. "7 pm", "19:00", "9 am"
  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (timeMatch) {
    let h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const isPm = timeMatch[3].toLowerCase() === 'pm';
    if (isPm && h < 12) h += 12;
    if (!isPm && h === 12) h = 0;
    time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  // Priority
  if (lower.includes('urgent') || lower.includes('asap')) priority = 'URGENT';
  else if (lower.includes('important') || lower.includes('high priority')) priority = 'HIGH';
  else if (lower.includes('low priority')) priority = 'LOW';

  // Category
  if (lower.includes('study') || lower.includes('exam') || lower.includes('homework') || lower.includes('class')) {
    category = 'Study';
    tags.push('study');
  } else if (lower.includes('work') || lower.includes('meeting') || lower.includes('client') || lower.includes('project')) {
    category = 'Work';
    tags.push('work');
  } else if (lower.includes('doctor') || lower.includes('medicine') || lower.includes('workout') || lower.includes('gym')) {
    category = 'Health';
    tags.push('health');
  } else if (lower.includes('buy') || lower.includes('shop') || lower.includes('grocery') || lower.includes('order')) {
    category = 'Shopping';
    tags.push('shopping');
  } else if (lower.includes('bill') || lower.includes('pay') || lower.includes('bank') || lower.includes('tax')) {
    category = 'Finance';
    tags.push('finance');
  }

  // Title cleanup
  let cleanTitle = text
    .replace(/^remind me to /i, '')
    .replace(/^remind me /i, '')
    .replace(/^please remind me to /i, '')
    .replace(/\s+(tomorrow|today|at \d+.*|next week|every.*)$/i, '')
    .trim();

  if (!cleanTitle) cleanTitle = text;
  cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

  return {
    title: cleanTitle,
    description: `Created via natural language assistant: "${text}"`,
    date: targetDate.toISOString().split('T')[0],
    time,
    priority,
    category,
    recurrence,
    tags,
    rawText: text,
  };
}
