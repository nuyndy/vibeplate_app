import { db, auth } from '../../firebase/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OPENROUTER_API_KEY = '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'; 
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_NAME = "arcee-ai/trinity-large-preview:free"; 

// --- HÀM TRỢ GIÚP: LÀM SẠCH VÀ PARSE JSON AN TOÀN ---
const safeParseJSON = (str) => {
  try {
    // Tìm vị trí của dấu { đầu tiên và dấu } cuối cùng để tách JSON
    const start = str.indexOf('{');
    const end = str.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    
    const jsonStr = str.substring(start, end + 1);
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Lỗi Parse JSON thủ công:", e);
    return null;
  }
};

export const getUserFridge = async () => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) return [];
    const q = query(collection(db, "inventory"), where("email", "==", user.email));
    const snap = await getDocs(q);
    return snap.docs.map(doc => `${doc.data().name} (${doc.data().quantity} ${doc.data().unit})`);
  } catch (e) { return []; }
};

export const getUserPreferences = async () => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) return null;
    const q = query(collection(db, "user_preferences"), where("email", "==", user.email));
    const snap = await getDocs(q);
    return snap.empty ? null : snap.docs[0].data();
  } catch (e) { return null; }
};

// --- 3. LẤY MÓN YÊU THÍCH ---
export const getUserFavorites = async () => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) return [];
    const q = query(collection(db, "favorites"), where("email", "==", user.email));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data().title);
  } catch (e) { return []; }
};

// --- 4. LẤY TÂM TRẠNG ---
export const getUserMood = async () => {
  try {
    const mood = await AsyncStorage.getItem('user_current_mood');
    const map = { happy: "Vui vẻ", sad: "Buồn chán", tired: "Mệt mỏi", hungry: "Đói meo", neutral: "Bình thường" };
    return map[mood] || "Bình thường";
  } catch (e) { return "Bình thường"; }
};

// --- 5. LẤY DANH SÁCH MÓN ĂN TỪ DATABASE ---
export const getAppRecipes = async () => {
  try {
    const snap = await getDocs(collection(db, "recipes"));
    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        recipeId: doc.id, // Dùng doc.id thay vì data.recipeId để chính xác hơn
        title: data.title,
        photo_url: data.photo_url || "",
        time: data.time || 30,
        servings: data.servings || 2
      };
    });
  } catch (e) { return []; }
};

// --- 6. HÀM TẠO CÔNG THỨC THÔNG MINH ---
export const generateRecipeJSON = async (userRequest) => {
  try {
    const [fridge, prefs, appRecipes] = await Promise.all([
      getUserFridge(), getUserPreferences(), getAppRecipes()
    ]);

    const strFridge = fridge.length > 0 ? fridge.join(", ") : "Trống";
    const strAllergies = prefs?.allergies?.join(", ") || "Không có";
    const strAppRecipes = JSON.stringify(appRecipes);

    // Cải tiến System Instruction để AI trả về JSON chuẩn hơn
    const systemInstruction = `Bạn là đầu bếp AI VibePlate. CHỈ TRẢ VỀ JSON, KHÔNG GIẢI THÍCH.
    DỊ ỨNG ƯU TIÊN 1: [${strAllergies}].
    TỦ LẠNH: [${strFridge}].
    DATABASE: ${strAppRecipes}.

    QUY TRÌNH:
    1. Nếu dính dị ứng, đổi món an toàn.
    2. Tìm trong DATABASE nếu có món gần giống "${userRequest}", dùng \`recipeId\`, \`photo_url\`, \`time\`. 
       Ghi chú thay thế nguyên liệu vào \`description\`.
    3. Nếu không có trong DATABASE, gán \`recipeId\`: "none", \`photo_url\`: "".

    FORMAT JSON MẪU (KHÔNG DÙNG DẤU SAO **):
    {
      "recipeId": "ID",
      "warningMessage": "Thông báo",
      "title": "Tên món",
      "time": 30,
      "servings": 2,
      "ingredients": [{"name": "A", "amount": "1kg"}],
      "description": "B1... B2..."
    }`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [{ role: "user", content: systemInstruction + `\n\nYêu cầu người dùng: ${userRequest}` }],
        temperature: 0.1, // Thấp hơn để ổn định cấu trúc JSON
        max_tokens: 1000
      })
    });

    const data = await response.json();
    if (!data.choices || data.choices.length === 0) return null;

    let resContent = data.choices[0].message.content;
    
    // Dùng hàm an toàn để parse
    const parsed = safeParseJSON(resContent);
    if (!parsed) return null;

    // Hậu xử lý dữ liệu
    const finalPhotoUrl = (parsed.recipeId !== "none" && parsed.photo_url) ? parsed.photo_url : null;

    return {
      ...parsed,
      photo_url: finalPhotoUrl,
      warningMessage: (parsed.warningMessage || "").replace(/\*/g, ""),
      description: (parsed.description || "").replace(/\*/g, ""),
      recipeId: parsed.recipeId === "none" ? "ai_gen_" + Date.now() : parsed.recipeId
    };

  } catch (error) {
    console.error("Lỗi AI Service:", error);
    return null;
  }
};

export const sendMessageToGemini = async (text, history) => {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: "Bạn là trợ lý VibePlate, thân thiện, không dùng dấu **." },
          ...history.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
          { role: "user", content: text }
        ],
        temperature: 0.7
      })
    });
    const data = await response.json();
    return data.choices[0].message.content.replace(/\*/g, "");
  } catch (e) { return "Hệ thống bận, thử lại sau nhé!"; }
};