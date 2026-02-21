import { db, auth } from '../../firebase/firebaseConfig';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';

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

    const byEmailRef = doc(db, 'user_preferences', user.email);
    const byEmailSnap = await getDoc(byEmailRef);
    if (byEmailSnap.exists()) return byEmailSnap.data();

    if (user.uid) {
      const byUidRef = doc(db, 'user_preferences', user.uid);
      const byUidSnap = await getDoc(byUidRef);
      if (byUidSnap.exists()) return byUidSnap.data();
    }

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

const normalizeRecipePayload = (payload, userRequest = '') => {
  if (!payload || typeof payload !== 'object') return null;

  const ingredients = Array.isArray(payload.ingredients)
    ? payload.ingredients
      .map(item => ({
        name: String(item?.name || '').trim(),
        amount: String(item?.amount || '').trim() || 'vừa đủ'
      }))
      .filter(item => item.name.length > 0)
    : [];

  const steps = Array.isArray(payload.steps)
    ? payload.steps.map(step => String(step || '').trim()).filter(Boolean)
    : String(payload.description || '')
      .split('\n')
      .map(step => step.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);

  return {
    title: String(payload.title || userRequest || 'Món gợi ý').trim(),
    time: Number(payload.time) > 0 ? Number(payload.time) : 25,
    servings: Number(payload.servings) > 0 ? Number(payload.servings) : 2,
    photo_url: String(payload.photo_url || '').trim(),
    ingredients: ingredients.length ? ingredients : [{ name: 'Gia vị cơ bản', amount: 'vừa đủ' }],
    steps: steps.length ? steps : ['Sơ chế nguyên liệu.', 'Nấu chín món và nêm nếm vừa ăn.', 'Dùng nóng.']
  };
};

export const generatePersonalizedRecipeJSON = async ({ userRequest, mood = 'neutral' }) => {
  try {
    const [fridgeItems, preferences] = await Promise.all([
      getUserFridge(),
      getUserPreferences()
    ]);

    const allergies = preferences?.allergies || [];
    const dislikedIngredients = preferences?.dislikedIngredients || [];
    const favoriteTastes = preferences?.favoriteTastes || [];

    if (!hasValidAIConfig()) {
      return normalizeRecipePayload({
        title: userRequest || 'Cơm chiên trứng',
        time: 20,
        servings: 2,
        ingredients: [
          { name: 'Nguyên liệu sẵn trong tủ', amount: fridgeItems[0] || 'vừa đủ' },
          { name: 'Gia vị', amount: 'vừa đủ' }
        ],
        steps: [
          'Sơ chế toàn bộ nguyên liệu.',
          'Làm nóng chảo, xào nguyên liệu chính rồi nêm gia vị.',
          'Nấu chín, trình bày ra đĩa và dùng nóng.'
        ]
      }, userRequest);
    }

    const prompt = `Bạn là đầu bếp AI của VibePlate.
Hãy sinh đúng 1 công thức món ăn cá nhân hóa theo yêu cầu.
Yêu cầu người dùng: ${userRequest}
Tâm trạng hiện tại: ${mood}
Nguyên liệu có sẵn: ${fridgeItems.length ? fridgeItems.join(', ') : 'không có dữ liệu'}
allergies: ${allergies.length ? allergies.join(', ') : 'không có'}
dislikedIngredients: ${dislikedIngredients.length ? dislikedIngredients.join(', ') : 'không có'}
favoriteTastes: ${favoriteTastes.length ? favoriteTastes.join(', ') : 'không có'}

BẮT BUỘC:
- Trả về JSON hợp lệ duy nhất, không markdown, không giải thích.
- JSON phải có các khóa: title, time, servings, ingredients, steps.
- time là số phút, servings là số người.
- ingredients là mảng object {"name":"...","amount":"..."}.
- steps là mảng chuỗi mô tả từng bước.
- Không dùng nguyên liệu nằm trong allergies hoặc dislikedIngredients.`;

    const data = await requestOpenRouter({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.25,
      maxTokens: 650,
    });

    const resContent = data?.choices?.[0]?.message?.content || '';
    const jsonSlice = resContent.includes('{')
      ? resContent.substring(resContent.indexOf('{'), resContent.lastIndexOf('}') + 1)
      : '';

    if (!jsonSlice) {
      return normalizeRecipePayload({
        title: userRequest,
        time: 25,
        servings: 2,
        ingredients: [{ name: 'Nguyên liệu sẵn có', amount: 'vừa đủ' }],
        steps: ['Sơ chế nguyên liệu.', 'Nấu chín và nêm nếm.', 'Dùng nóng.']
      }, userRequest);
    }

    const parsed = JSON.parse(jsonSlice);
    return normalizeRecipePayload(parsed, userRequest);
  } catch (_error) {
    return normalizeRecipePayload({
      title: userRequest,
      time: 25,
      servings: 2,
      ingredients: [{ name: 'Nguyên liệu sẵn có', amount: 'vừa đủ' }],
      steps: ['Sơ chế nguyên liệu.', 'Nấu chín và nêm nếm.', 'Dùng nóng.']
    }, userRequest);
  }
};

const MOOD_KEYWORDS = {
  happy: ['lẩu', 'nướng', 'pizza', 'gà nướng', 'bbq'],
  sad: ['chè', 'súp', 'cháo', 'bánh', 'mì'],
  tired: ['cháo', 'súp', 'canh', 'phở', 'mì'],
  hungry: ['cơm', 'bún', 'phở', 'xào', 'kho'],
  neutral: ['cơm', 'canh', 'xào', 'mì']
};

const scoreRecipeForUser = (recipe, profile) => {
  const {
    mood = 'neutral',
    favoriteTastes = [],
    allergies = [],
    dislikedIngredients = []
  } = profile;

  const title = (recipe?.title || '').toLowerCase();
  if (!title) return -999;

  const blockedWords = [...allergies, ...dislikedIngredients].map(i => String(i || '').toLowerCase());
  if (blockedWords.some(w => w && title.includes(w))) return -999;

  let score = 0;
  if ((MOOD_KEYWORDS[mood] || []).some(k => title.includes(k))) score += 3;
  if (favoriteTastes.some(t => title.includes(String(t || '').toLowerCase()))) score += 2;
  if (title.includes('chay') && blockedWords.some(w => ['thịt', 'hải sản', 'gà', 'bò'].includes(w))) score += 1;

  return score;
};

export const suggestDishesForUser = async ({ userRequest, mood = 'neutral' }) => {
  try {
    const [fridgeItems, preferences, appRecipes] = await Promise.all([
      getUserFridge(),
      getUserPreferences(),
      getAppRecipes()
    ]);

    const allergies = preferences?.allergies || [];
    const dislikedIngredients = preferences?.dislikedIngredients || [];
    const favoriteTastes = preferences?.favoriteTastes || [];

    const fallbackTitles = (appRecipes || [])
      .map(recipe => ({ recipe, score: scoreRecipeForUser(recipe, { mood, favoriteTastes, allergies, dislikedIngredients }) }))
      .filter(item => item.score > -999)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(item => item.recipe.title)
      .filter(Boolean);

    if (!hasValidAIConfig()) {
      return fallbackTitles.length > 0
        ? fallbackTitles.join('\n')
        : 'Cơm chiên trứng\nCanh rau củ\nMì xào rau';
    }

    const systemInstruction = `Bạn là AI gợi ý món ăn cho app VibePlate.
Nhiệm vụ: chỉ đưa ra tên món ăn, không công thức, không giải thích, không markdown.
Chỉ dựa vào:
- Nguyên liệu hiện có: ${fridgeItems.length ? fridgeItems.join(', ') : 'không có dữ liệu'}
- Tâm trạng hiện tại: ${mood}
- Hồ sơ cá nhân hóa user_preferences:
  + allergies: ${allergies.length ? allergies.join(', ') : 'không có'}
  + dislikedIngredients: ${dislikedIngredients.length ? dislikedIngredients.join(', ') : 'không có'}
  + favoriteTastes: ${favoriteTastes.length ? favoriteTastes.join(', ') : 'không có'}
- Người dùng yêu cầu: ${userRequest}

Ràng buộc:
- Loại bỏ món có chứa nguyên liệu thuộc allergies hoặc dislikedIngredients.
- Ưu tiên món phù hợp favoriteTastes và tâm trạng.
- Chỉ trả về tối đa 6 dòng, mỗi dòng đúng 1 tên món.
- Không thêm ký tự đầu dòng, không số thứ tự, không lời mở đầu/kết thúc.`;

    const data = await requestOpenRouter({
      messages: [{ role: 'user', content: systemInstruction }],
      temperature: 0.2,
      maxTokens: 180,
    });

    const resContent = data?.choices?.[0]?.message?.content || '';
    const cleanedLines = resContent
      .split('\n')
      .map(line => line.replace(/^\s*[-*\d.)]+\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 6);

    if (cleanedLines.length > 0) {
      return cleanedLines.join('\n');
    }

    return fallbackTitles.length > 0
      ? fallbackTitles.join('\n')
      : 'Cơm chiên trứng\nCanh rau củ\nMì xào rau';
  } catch (_error) {
    return 'Cơm chiên trứng\nCanh rau củ\nMì xào rau';
  }
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
