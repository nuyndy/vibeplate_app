import { db, auth } from '../../firebase/firebaseConfig';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';

// 1. CẤU HÌNH API GEMINI
const API_KEY = 'AIzaSyCf1LurfdtV6bsa36GEwmrh9mpZNOyqiRw'; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

// 2. HÀM LẤY TỦ LẠNH (Truy xuất qua Email)
export const getUserFridge = async () => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) return [];

    const inventoryRef = collection(db, "inventory");
    const q = query(inventoryRef, where("email", "==", user.email));
    const querySnapshot = await getDocs(q);
    
    let userIngredients = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.name) {
        userIngredients.push(`${data.name} (${data.quantity || ''} ${data.unit || ''})`.trim());
      }
    });
    return userIngredients;
  } catch (error) {
    console.error("Lỗi lấy Tủ lạnh:", error);
    return []; 
  }
};


// 3. HÀM LẤY HỒ SƠ USER (Truy xuất Sở thích & Món yêu thích qua Email)
export const getUserProfile = async () => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) return null;

    let profileData = { allergies: [], dislikedIngredients: [], favoriteTastes: [], favoriteRecipes: [] };

    // 3.1. Truy xuất Dị ứng & Sở thích
    const prefsRef = collection(db, "user_preferences");
    const qPrefs = query(prefsRef, where("email", "==", user.email));
    const prefsSnap = await getDocs(qPrefs);
    
    if (!prefsSnap.empty) {
      const pData = prefsSnap.docs[0].data();
      profileData.allergies = pData.allergies || [];
      profileData.dislikedIngredients = pData.dislikedIngredients || [];
      profileData.favoriteTastes = pData.favoriteTastes || [];
    }

    // 3.2. Truy xuất Các món ăn đã thả tim
    const favRef = collection(db, "favorites");
    const qFav = query(favRef, where("email", "==", user.email));
    const favSnap = await getDocs(qFav);
    
    favSnap.forEach((doc) => {
      const fData = doc.data();
      if (fData.title) {
        profileData.favoriteRecipes.push(fData.title);
      }
    });

    return profileData;
  } catch (error) {
    console.error("Lỗi lấy User Profile:", error);
    return null;
  }
};

// 4. HÀM LẤY KHO CÔNG THỨC APP (Dữ liệu gốc của App)
const getAppRecipesContext = async () => {
  try {
    const recipesRef = collection(db, "recipes");
    // Lấy 30 món để AI có nhiều "vốn liếng" dò tìm hơn
    const q = query(recipesRef, limit(30)); 
    const querySnapshot = await getDocs(q);
    
    let recipesData = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      recipesData.push({
        recipeId: data.recipeId, categoryId: data.categoryId, 
        title: data.title, time: data.time, servings: data.servings,
        ingredients: data.ingredients, description: data.description,
        photo_url: data.photo_url 
      });
    });
    
    return recipesData.length === 0 ? "[]" : JSON.stringify(recipesData);
  } catch (error) {
    console.error("Lỗi lấy Recipe Context:", error);
    return "[]";
  }
};

// 5. HÀM CHAT THÔNG THƯỜNG (Có nhớ Lịch sử + Bắt Dị Ứng)
export const sendMessageToGemini = async (userMessage, history = []) => {
  try {
    const [recipeContext, userIngredients, userProfile] = await Promise.all([
        getAppRecipesContext(), getUserFridge(), getUserProfile() 
    ]);

    const strUserFridge = userIngredients.length > 0 ? userIngredients.join(", ") : "Tủ lạnh trống";
    const strAllergies = userProfile?.allergies?.length > 0 ? userProfile.allergies.join(", ") : "Không có";
    const strDislikes = userProfile?.dislikedIngredients?.length > 0 ? userProfile.dislikedIngredients.join(", ") : "Không có";
    const strTastes = userProfile?.favoriteTastes?.length > 0 ? userProfile.favoriteTastes.join(", ") : "Ăn gì cũng được";
    const strFavs = userProfile?.favoriteRecipes?.length > 0 ? userProfile.favoriteRecipes.join(", ") : "Chưa có dữ liệu";

    const formattedHistory = history.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const systemInstruction = `
    [VAI TRÒ]: Trợ lý đầu bếp thông minh VibePlate.
    
    [HỒ SƠ USER]:
    - Tủ lạnh: ${strUserFridge}
    - DỊ ỨNG (CẤM KỴ): ${strAllergies}
    - Ghét ăn: ${strDislikes}
    - Khẩu vị: ${strTastes}
    - Gu món ăn yêu thích: ${strFavs}
    
    [DỮ LIỆU APP]: ${recipeContext}

    [NGUYÊN TẮC QUAN TRỌNG]:
    1. TUYỆT ĐỐI KHÔNG gợi ý món có chứa nguyên liệu User bị DỊ ỨNG.
    2. Hạn chế nguyên liệu User ghét, ưu tiên nêm nếm theo Khẩu vị.
    3. Ưu tiên hướng dẫn nấu các món từ nguyên liệu trong tủ lạnh và [DỮ LIỆU APP].
    4. Ghi nhớ lịch sử trò chuyện.

    // 🔥 [SỬA Ở ĐÂY]: Thêm luật cấm dùng dấu ** trong chat thường
    5. TUYỆT ĐỐI KHÔNG sử dụng ký tự Markdown như ** để in đậm văn bản. Khi nhắc đến tên món ăn, hãy để trong ngoặc kép "". Ví dụ: "Sườn Xào Chua Ngọt".

    [CÂU HỎI MỚI]: "${userMessage}"
    `;

    const payload = {
      contents: [...formattedHistory, { role: "user", parts: [{ text: systemInstruction }] }]
    };

    const response = await fetch(API_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Xin lỗi, tôi chưa hiểu ý bạn.";
  } catch (error) {
    console.error("Lỗi AI Chat:", error);
    return "Hệ thống đang bận, vui lòng thử lại sau!";
  }
};

// 6. HÀM TẠO CÔNG THỨC CHUẨN JSON (ĐÃ TÍCH HỢP TÌM KIẾM NGỮ NGHĨA)
// =========================================================================
export const generateRecipeJSON = async (userRequest) => {
  try {
    // Lọc text
    const cleanRequest = userRequest.toLowerCase().trim();

    const [recipeContext, userIngredients, userProfile] = await Promise.all([
        getAppRecipesContext(), getUserFridge(), getUserProfile() 
    ]);

    const strUserFridge = userIngredients.length > 0 ? userIngredients.join(", ") : "Tủ lạnh trống";
    const strAllergies = userProfile?.allergies?.length > 0 ? userProfile.allergies.join(", ") : "Không có";
    const strDislikes = userProfile?.dislikedIngredients?.length > 0 ? userProfile.dislikedIngredients.join(", ") : "Không có";
    const strTastes = userProfile?.favoriteTastes?.length > 0 ? userProfile.favoriteTastes.join(", ") : "Ăn gì cũng được";
    const strFavs = userProfile?.favoriteRecipes?.length > 0 ? userProfile.favoriteRecipes.join(", ") : "Chưa có dữ liệu";

    // 🔥 PROMPT ĐÃ ĐƯỢC HUẤN LUYỆN ĐỂ TÌM KIẾM NGỮ NGHĨA (SEMANTIC SEARCH)
    const systemInstruction = `
    Bạn là siêu đầu bếp AI của ứng dụng VibePlate.
    
    [THÔNG TIN NGƯỜI DÙNG]:
    - Yêu cầu món ăn/nguyên liệu: "${cleanRequest}"
    - Tủ lạnh: ${strUserFridge}
    - DỊ ỨNG (CẤM KỴ): ${strAllergies}
    - Ghét ăn (Hạn chế): ${strDislikes}
    - Khẩu vị: ${strTastes}
    - Gu món ăn: ${strFavs}
    
    - Kho công thức App: ${recipeContext}

    [LOGIC XỬ LÝ]:
    BƯỚC 1: Kiểm tra DỊ ỨNG. NẾU bất kỳ món nào trong [Kho công thức App] chứa nguyên liệu dị ứng -> BỎ QUA MÓN ĐÓ NGAY LẬP TỨC. 
    BƯỚC 2: TÌM KIẾM NGỮ NGHĨA (QUAN TRỌNG NHẤT). Tuyệt đối KHÔNG tìm kiếm máy móc khớp từng chữ. 
      - Ví dụ: Nếu người dùng nhập "thịt bò" hoặc "bò", bạn PHẢI TỰ HIỂU nó khớp với "Thịt bò xay", "Bò bít tết"... trong [Kho công thức App]. 
      - Ưu tiên cao nhất là trả về món ĐÃ CÓ trong App nếu nguyên liệu có liên quan mật thiết. Chỉ tự chế món mới khi thực sự không có món nào liên quan.
    BƯỚC 3: Quyết định ID và Ảnh:
      - TRƯỜNG HỢP A (Dùng món trong App): Giữ nguyên CHÍNH XÁC 'recipeId', 'categoryId' VÀ 'photo_url' gốc của món đó trong App. (Được phép tự động sửa mảng 'ingredients' bằng đồ thay thế từ tủ lạnh VÀ thêm dòng "Đã thay thế..." vào 'description').
      - TRƯỜNG HỢP B (Tự chế món mới): Gán giá trị "none" cho 'recipeId' và 'categoryId'. Gán "https://via.placeholder.com/300?text=Mon+Moi" cho 'photo_url'.
    
    BƯỚC 4: FORMAT TEXT:KHÔNG sử dụng ký tự Markdown như **.

    [YÊU CẦU ĐẦU RA]: BẮT BUỘC TRẢ VỀ 1 JSON OBJECT THUẦN TÚY:
    {
      "warningMessage": "Nếu user yêu cầu món có chứa nguyên liệu dị ứng, hãy giải thích và gợi ý món khác,
      "recipeId": <ID gốc từ App HOẶC "none">,
      "categoryId": "<ID gốc từ App HOẶC "none">",
      "title": "<Tên món>",
      "servings": <Số người ăn - Kiểu Number>,
      "photo_url": "<URL ảnh gốc từ App HOẶC URL placeholder nếu tự chế>",
      "photosArray": [],
      "time": <Thời gian nấu (phút) - Kiểu Number>,
      "description": "CHỈ GHI CÁC BƯỚC NẤU ĂN VÀO ĐÂY.",
      "ingredients": [
        { "name": "<Tên nguyên liệu>", "amount": "<Số lượng>" }
      ]
    }
    `;

    const payload = {
      contents: [{ role: "user", parts: [{ text: systemInstruction }] }],
      generationConfig: { responseMimeType: "application/json" }
    };

    const response = await fetch(API_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    return JSON.parse(data.candidates[0].content.parts[0].text); 

  } catch (error) {
    console.error("Lỗi gen JSON:", error);
    return {
      warningMessage: "", 
      recipeId: "none", categoryId: "none", title: "Món ăn tạm thời (Do lỗi mạng)", servings: 1,
      photo_url: "https://via.placeholder.com/300?text=Error", photosArray: [], time: 15,
      description: "Hệ thống AI đang bận hoặc quá tải. Vui lòng thử lại sau.", ingredients: []
    };
  }
};