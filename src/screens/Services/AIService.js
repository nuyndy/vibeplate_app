import { db, auth } from '../../firebase/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';

const OPENROUTER_API_KEY =
  process.env.EXPO_PUBLIC_OPENROUTER_API_KEY_CHAT || process.env.EXPO_PUBLIC_OPENROUTER_KEY;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_FREE_MODEL = 'arcee-ai/trinity-large-preview:free';
const MODEL_NAME = process.env.EXPO_PUBLIC_MODEL_NAME || DEFAULT_FREE_MODEL;

const hasValidAIConfig = () => Boolean(API_URL && OPENROUTER_API_KEY);


const getConfigIssueMessage = () => {
  if (!OPENROUTER_API_KEY) {
    return 'Thiếu EXPO_PUBLIC_OPENROUTER_API_KEY_CHAT (hoặc EXPO_PUBLIC_OPENROUTER_KEY) trong .env.';
  }
  return '';
};

const getLocalKitchenReply = (text, context = {}) => {
  const input = (text || '').toLowerCase();
  const { currentStep = 1, stepContent = '' } = context;

  if (input.match(/(tiếp theo|qua bước|bước tiếp)/)) {
    return 'Bạn bấm nút tiếp theo hoặc nói "tiếp theo" để mình chuyển bước ngay nhé.';
  }

  if (input.match(/(nguyên liệu|cần gì|thiếu gì)/)) {
    return 'Bạn mở phần nguyên liệu của món để đối chiếu tủ lạnh, mình có thể gợi ý món thay thế nếu thiếu đồ.';
  }

  if (input.match(/(bao lâu|mất bao nhiêu|thời gian)/)) {
    return 'Mỗi bước nên canh khoảng 3 đến 7 phút tùy lửa. Mình có thể nhắc timer theo từng bước cho bạn.';
  }

  if (stepContent) {
    return `Mình đang ở bước ${currentStep}: ${stepContent}. Bạn cần mình giải thích kỹ hơn chỗ nào?`;
  }

  return 'Mình vẫn đang ở đây. Bạn nói lại yêu cầu ngắn gọn hơn để mình hỗ trợ ngay nhé.';
};

const getCandidateModels = () => {
  const fallbackModels = [
    MODEL_NAME,
    DEFAULT_FREE_MODEL,
    'google/gemma-2-9b-it:free',
    'meta-llama/llama-3.1-8b-instruct:free',
  ];
  return [...new Set(fallbackModels.filter(Boolean))];
};

const requestOpenRouter = async ({ messages, temperature = 0.4, maxTokens = 200 }) => {
  const models = getCandidateModels();

  for (let i = 0; i < models.length; i += 1) {
    const model = models[i];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          messages,
        }),
        signal: controller.signal,
      });

      if (response.ok) {
        clearTimeout(timeout);
        return response.json();
      }

      // Sai key/quyền thì dừng sớm, thử model khác sẽ không có tác dụng.
      if (response.status === 401 || response.status === 403) {
        clearTimeout(timeout);
        return null;
      }

      // Nếu model không tồn tại/quá tải thì thử model free khác.
      if (response.status === 404 || response.status === 429 || response.status >= 500) {
        clearTimeout(timeout);
        continue;
      }
    } catch (_e) {
      // timeout/network -> thử model tiếp theo
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
};

export const getUserFridge = async () => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) return [];
    const q = query(collection(db, 'inventory'), where('email', '==', user.email));
    const snap = await getDocs(q);
    return snap.docs.map(doc => `${doc.data().name} (${doc.data().quantity} ${doc.data().unit})`);
  } catch (_e) { return []; }
};

export const getUserPreferences = async () => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) return null;
    const q = query(collection(db, 'user_preferences'), where('email', '==', user.email));
    const snap = await getDocs(q);
    return snap.empty ? null : snap.docs[0].data();
  } catch (_e) { return null; }
};

export const getAppRecipes = async () => {
  try {
    const snap = await getDocs(collection(db, 'recipes'));
    return snap.docs.map(doc => ({
      recipeId: doc.data().recipeId || doc.id,
      title: doc.data().title,
      photo_url: doc.data().photo_url || '',
      steps: doc.data().description ? doc.data().description.split('\n') : []
    }));
  } catch (_e) { return []; }
};

export const generateRecipeJSON = async (userRequest) => {
  try {
    if (!hasValidAIConfig()) return null;

    await Promise.all([getUserFridge(), getUserPreferences(), getAppRecipes()]);

    const systemInstruction = `Bạn là đầu bếp AI. Trả về JSON cho món: ${userRequest}. 
    Description phải là các bước nấu ăn nối nhau bằng dấu xuống dòng \\n. 
    KHÔNG dùng dấu **, KHÔNG để dòng trống.`;

    const data = await requestOpenRouter({
      messages: [{ role: 'user', content: systemInstruction }],
      temperature: 0.3,
      maxTokens: 700,
    });

    const resContent = data?.choices?.[0]?.message?.content;
    if (!resContent) return null;

    const jsonSlice = resContent.substring(resContent.indexOf('{'), resContent.lastIndexOf('}') + 1);
    if (!jsonSlice) return null;

    const parsed = JSON.parse(jsonSlice);

    const cleanDescription = (parsed.description || '')
      .split('\n')
      .map(line => line.replace(/\\n/g, '').trim())
      .filter(line => line.length > 2)
      .join('\n');

    return {
      ...parsed,
      description: cleanDescription,
      recipeId: parsed.recipeId === 'none' ? `ai_gen_${Date.now()}` : parsed.recipeId
    };
  } catch (_error) { return null; }
};

export const sendMessageToGemini = async (
  text,
  history,
  context = {}
) => {
  try {
    const {
      title = 'Món ăn',
      currentStep = 1,
      stepContent = ''
    } = context;

    if (!hasValidAIConfig()) {
      return `AI chưa được cấu hình đầy đủ: ${getConfigIssueMessage()}`.trim();
    }

    const data = await requestOpenRouter({
      temperature: 0.4,
      maxTokens: 150,
      messages: [
        {
          role: 'system',
          content: `Bạn là một đầu bếp ảo đang nấu ăn cùng người dùng.

          Món ăn: ${title}
          Bước hiện tại (Bước ${currentStep}): ${stepContent}

          QUY TẮC:
          - Chỉ trả lời dựa trên món ăn và bước hiện tại.
          - Ngắn gọn 1-3 câu.
          - Tự nhiên như đang đứng cạnh trong bếp.
          - Thuần tiếng Việt.
          - Không markdown.
          - Không ký tự đặc biệt.
          - Không xuống dòng.
          - Nếu hỏi ngoài nấu ăn, trả lời:
          "Tôi đang tập trung hướng dẫn nấu món này, bạn cần giúp gì trong bếp không?"`
        },
        ...history.map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        })),
        { role: 'user', content: text }
      ]
    });

    if (!data) {
      return getLocalKitchenReply(text, context);
    }

    const raw = data?.choices?.[0]?.message?.content || '';

    let clean = raw
      .replace(/^(Đầu bếp|Chef|AI|Bot|Trợ lý)(\s*):/gi, '')
      .replace(/[*#_~`\[\]"']/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\.\s*\./g, '.')
      .trim();

    if (clean.length < 5) {
      clean = getLocalKitchenReply(text, context);
    }

    return clean;
  } catch (_e) {
    return 'Xin lỗi, mình chưa nghe rõ.';
  }
};
