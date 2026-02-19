import { db, auth } from '../../firebase/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OPENROUTER_API_KEY = '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'; 
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_NAME = "google/gemini-2.0-flash-lite-preview-02-05:free"; 

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

export const getAppRecipes = async () => {
  try {
    const snap = await getDocs(collection(db, "recipes"));
    return snap.docs.map(doc => ({
      recipeId: doc.data().recipeId || doc.id,
      title: doc.data().title,
      photo_url: doc.data().photo_url || "",
      steps: doc.data().description ? doc.data().description.split('\n') : [] // Tách sẵn steps
    }));
  } catch (e) { return []; }
};

export const generateRecipeJSON = async (userRequest) => {
  try {
    const [fridge, prefs, appRecipes] = await Promise.all([
      getUserFridge(), getUserPreferences(), getAppRecipes()
    ]);

    const systemInstruction = `Bạn là đầu bếp AI. Trả về JSON cho món: ${userRequest}. 
    Description phải là các bước nấu ăn nối nhau bằng dấu xuống dòng \\n. 
    KHÔNG dùng dấu **, KHÔNG để dòng trống.`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [{ role: "user", content: systemInstruction }],
        temperature: 0.3
      })
    });

    const data = await response.json();
    let resContent = data.choices[0].message.content;
    const parsed = JSON.parse(resContent.substring(resContent.indexOf('{'), resContent.lastIndexOf('}') + 1));

    // --- LỌC BƯỚC TRỐNG VÀ KÝ TỰ \N THỪA ---
    const cleanDescription = (parsed.description || "")
      .split('\n')
      .map(line => line.replace(/\\n/g, '').trim()) // Xóa chữ \n và khoảng trắng
      .filter(line => line.length > 2) // Chỉ lấy dòng có nghĩa (trên 2 ký tự)
      .join('\n');

    return {
      ...parsed,
      description: cleanDescription,
      recipeId: parsed.recipeId === "none" ? "ai_gen_" + Date.now() : parsed.recipeId
    };
  } catch (error) { return null; }
};

export const sendMessageToGemini = async (text, history) => {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: "Bạn là trợ lý VibePlate. Trả lời cực ngắn." },
          ...history.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
          { role: "user", content: text }
        ]
      })
    });
    const data = await response.json();
    return data.choices[0].message.content.replace(/\*\*/g, "").trim();
  } catch (e) { return "Hệ thống bận!"; }
};