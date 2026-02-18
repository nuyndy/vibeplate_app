import { db, auth } from '../../firebase/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OPENROUTER_API_KEY = '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'; 
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_NAME = "arcee-ai/trinity-large-preview:free"; 

// --- 1. LẤY TỦ LẠNH ---
export const getUserFridge = async () => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) return [];
    const q = query(collection(db, "inventory"), where("email", "==", user.email));
    const snap = await getDocs(q);
    return snap.docs.map(doc => `${doc.data().name} (${doc.data().quantity} ${doc.data().unit})`);
  } catch (e) { return []; }
};

// --- 2. LẤY DỊ ỨNG ---
export const getUserPreferences = async () => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) return null;
    const q = query(collection(db, "user_preferences"), where("email", "==", user.email));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data();
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

// --- 5. LẤY DANH SÁCH MÓN ĂN TỪ DATABASE CỦA APP ---
export const getAppRecipes = async () => {
  try {
    const snap = await getDocs(collection(db, "recipes"));
    return snap.docs.map(doc => {
      const data = doc.data();
      // Chỉ lấy các trường cần thiết để tiết kiệm token cho AI
      return {
        recipeId: data.recipeId,
        title: data.title,
        photo_url: data.photo_url || "",
        time: data.time || 30,
        servings: data.servings || 2
      };
    });
  } catch (e) { 
    console.log("Lỗi tải database món ăn:", e);
    return []; 
  }
};

// --- 6. HÀM TẠO CÔNG THỨC THÔNG MINH (KẾT HỢP DB + AI) ---
export const generateRecipeJSON = async (userRequest) => {
  try {
    const [fridge, prefs, favorites, mood, appRecipes] = await Promise.all([
      getUserFridge(), getUserPreferences(), getUserFavorites(), getUserMood(), getAppRecipes()
    ]);

    const strFridge = fridge.length > 0 ? fridge.join(", ") : "Trống";
    const strAllergies = prefs?.allergies?.join(", ") || "Không có";
    const strFavorites = favorites.length > 0 ? favorites.join(", ") : "Chưa có";
    
    // Thu gọn list database để đưa cho AI
    const strAppRecipes = JSON.stringify(appRecipes);

    const systemInstruction = `
    Bạn là đầu bếp AI VibePlate. 
    Vấn đề DỊ ỨNG là ƯU TIÊN SỐ 1, tuyệt đối không vi phạm.

    [THÔNG TIN HIỆN TẠI]:
    - Yêu cầu món: "${userRequest}"
    - DỊ ỨNG (CẤM TUYỆT ĐỐI): [${strAllergies}]
    - Tủ lạnh có: [${strFridge}]
    - DATABASE ỨNG DỤNG: ${strAppRecipes}

    [QUY TRÌNH XỬ LÝ - PHẢI TUÂN THỦ NGHIÊM NGẶT]:
    1. KIỂM TRA DỊ ỨNG: Món "${userRequest}" có dính dị ứng không? Nếu CÓ, TỪ CHỐI đổi món khác an toàn.
    2. TÌM TRONG DATABASE ỨNG DỤNG (ƯU TIÊN): 
       - Tìm xem trong DATABASE ỨNG DỤNG có món nào giống hoặc gần giống với "${userRequest}" không.
       - NẾU CÓ TRONG DATABASE: 
         + Bắt buộc dùng \`recipeId\`, \`photo_url\`, \`time\`, \`title\` của món đó trong Database.
         + KIỂM TRA TỦ LẠNH THAY THẾ: Nghĩ xem món đó bình thường nấu cần gì. Nếu tủ lạnh [${strFridge}] có đồ thay thế được (Ví dụ: thiếu Chanh thì dùng Sấu, thiếu Đường dùng Mật ong...), hãy ghi rõ vào \`description\` và \`ingredients\`.
         + \`warningMessage\` phải báo: "Mình tìm thấy trong tủ lạnh có: [Nguyên liệu tủ lạnh]. Mình đã điều chỉnh công thức để phù hợp với những nguyên liệu này, bạn xem nhé!"
       - NẾU KHÔNG CÓ TRONG DATABASE:
         + Bạn được phép tự sáng tạo công thức mới.
         + BẮT BUỘC gán \`recipeId\` = "none"
         + BẮT BUỘC gán \`photo_url\` = ""
         + \`warningMessage\` báo: "Hệ thống chưa có món này, nhưng mình đã tự sáng tạo một công thức riêng kết hợp với đồ trong tủ lạnh cho bạn đây!"
    3. KHÔNG dùng dấu **. Trả về đúng TÊN nguyên liệu bằng chữ.

    [FORMAT JSON]:
    {
      "recipeId": "ID từ Database HOẶC 'none'",
      "warningMessage": "Thông báo dựa theo quy trình trên",
      "title": "Tên món ăn",
      "time": 30,
      "servings": 2,
      "ingredients": [{"name": "Tên nguyên liệu", "amount": "Lượng"}],
      "description": "Hướng dẫn chi tiết (bao gồm cả cách xử lý nguyên liệu thay thế nếu có)",
      "photo_url": "URL từ Database HOẶC ''"
    }`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [{ role: "user", content: systemInstruction }],
        temperature: 0.2
      })
    });

    const data = await response.json();
    let resContent = data.choices[0].message.content;
    const parsed = JSON.parse(resContent.substring(resContent.indexOf('{'), resContent.lastIndexOf('}') + 1));

    // ========================================================
    // LOG RA TERMINAL ĐỂ BẠN KIỂM TRA
    console.log("\n===========================================");
    console.log("🤖 AI TRẢ VỀ DỮ LIỆU JSON CHO MÓN:", userRequest);
    console.log("Trạng thái nguồn:", parsed.recipeId === "none" ? "AI TỰ NGHĨ" : `TỪ DATABASE (ID: ${parsed.recipeId})`);
    console.log(JSON.stringify(parsed, null, 2));
    console.log("===========================================\n");
    // ========================================================

    // Xử lý logic photo_url: Nếu AI tự nghĩ (none) thì ép bằng null để không lỗi giao diện
    const finalPhotoUrl = (parsed.recipeId !== "none" && parsed.photo_url && parsed.photo_url !== "") 
                          ? parsed.photo_url 
                          : null;

    return {
      ...parsed,
      photo_url: finalPhotoUrl,
      warningMessage: (parsed.warningMessage || "").replace(/\*\*/g, ""),
      description: (parsed.description || "").replace(/\*\*/g, ""),
      // Nếu là AI tự nghĩ, tạo ID ảo tạm thời cho React FlatList key, nếu là DB thì giữ nguyên ID
      recipeId: parsed.recipeId === "none" ? "ai_gen_" + Date.now() : parsed.recipeId
    };

  } catch (error) {
    console.error("AI Error:", error);
    return null;
  }
};

// --- 7. HÀM CHAT TỰ DO ---
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
                ]
            })
        });
        const data = await response.json();
        return data.choices[0].message.content.replace(/\*\*/g, "");
    } catch (e) { return "Hệ thống bận, thử lại sau nhé!"; }
};