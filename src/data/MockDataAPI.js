import { db } from '../firebase/firebaseConfig';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  limit 
} from 'firebase/firestore';

// Tên các Collection trong Firestore
const COLL_RECIPES = 'recipes';
const COLL_CATEGORIES = 'categories';
const COLL_INGREDIENTS = 'ingredients';

// --- HÀM HELPER: Format dữ liệu trả về ---
const formatDoc = (docSnap) => {
  return { id: docSnap.id, ...docSnap.data() };
};

// ==========================================
// 1. CÁC HÀM LẤY DANH SÁCH (LISTS)
// ==========================================

// Lấy tất cả danh mục (Dùng cho CategoriesScreen)
export async function getAllCategories() {
  try {
    const snapshot = await getDocs(collection(db, COLL_CATEGORIES));
    const data = [];
    snapshot.forEach((doc) => data.push(formatDoc(doc)));
    return data;
  } catch (error) {
    console.error("Error getAllCategories:", error);
    return [];
  }
}

// Lấy tất cả công thức (Dùng cho HomeScreen)
export async function getAllRecipes() {
  try {
    const snapshot = await getDocs(collection(db, COLL_RECIPES));
    const data = [];
    snapshot.forEach((doc) => data.push(formatDoc(doc)));
    return data;
  } catch (error) {
    console.error("Error getAllRecipes:", error);
    return [];
  }
}

// ==========================================
// 2. CÁC HÀM GET CHI TIẾT (DETAILS)
// ==========================================

export async function getCategoryById(categoryId) {
  // Fix: Dù dữ liệu vào là Số hay Chuỗi, ta đều ép về String để tìm Document
  const strId = String(categoryId);

  try {
    const docRef = doc(db, COLL_CATEGORIES, strId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? formatDoc(docSnap) : null;
  } catch (error) {
    console.error("Error getCategoryById:", error);
    return null;
  }
}

export async function getIngredientName(ingredientID) {
  try {
    // Fix: Luôn ép về String
    const docRef = doc(db, COLL_INGREDIENTS, String(ingredientID)); 
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data().name : "";
  } catch (error) {
    console.error("Error getIngredientName:", error);
    return "";
  }
}

export async function getIngredientUrl(ingredientID) {
  try {
    // Fix: Luôn ép về String
    const docRef = doc(db, COLL_INGREDIENTS, String(ingredientID));
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data().photo_url : null;
  } catch (error) {
    console.error("Error getIngredientUrl:", error);
    return null;
  }
}

export async function getCategoryName(categoryId) {
  try {
    // Fix: Luôn ép về String
    const docRef = doc(db, COLL_CATEGORIES, String(categoryId));
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data().name : "";
  } catch (error) {
    console.error("Error getCategoryName:", error);
    return "";
  }
}

// ==========================================
// 3. CÁC HÀM QUERY & FILTER
// ==========================================

// Lấy danh sách món ăn thuộc 1 Category
export async function getRecipes(categoryId) {
  try {
    // Fix: Ép kiểu categoryId về Number để so sánh với dữ liệu trong Firebase (vì schema bạn lưu là Number)
    const numId = Number(categoryId); 
    
    // Nếu ép kiểu thất bại (NaN), ta dùng nguyên giá trị gốc
    const queryId = isNaN(numId) ? categoryId : numId;

    const q = query(collection(db, COLL_RECIPES), where('categoryId', '==', queryId));
    const snapshot = await getDocs(q);
    const data = [];
    snapshot.forEach((doc) => data.push(formatDoc(doc)));
    return data;
  } catch (error) {
    console.error("Error getRecipes:", error);
    return [];
  }
}

// Đếm số lượng món trong 1 Category
export async function getNumberOfRecipes(categoryId) {
  try {
    // Fix: Ép kiểu sang Number để khớp với dữ liệu Firebase
    const numId = Number(categoryId);
    const queryId = isNaN(numId) ? categoryId : numId;

    const q = query(collection(db, COLL_RECIPES), where('categoryId', '==', queryId));
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error("Error getNumberOfRecipes:", error);
    return 0;
  }
}

// Lấy các món ăn chứa nguyên liệu cụ thể (Logic: Client-side filtering)
export async function getRecipesByIngredient(ingredientId) {
  const recipesArray = [];
  try {
    const snapshot = await getDocs(collection(db, COLL_RECIPES));
    
    snapshot.forEach((docSnap) => {
      const data = formatDoc(docSnap);
      
      if (data.ingredients) {
        // Fix: Kiểm tra linh hoạt cả Array cũ [id, qty] và Object mới { ingredientId, ... }
        const hasIngredient = data.ingredients.some(item => {
          // Case 1: Dữ liệu cũ dạng mảng [15, "200g"]
          if (Array.isArray(item)) {
            return item[0] == ingredientId;
          }
          // Case 2: Dữ liệu mới dạng Object { ingredientId: 15 }
          if (typeof item === 'object' && item !== null) {
            const id = item.ingredientId || item.id;
            return id == ingredientId;
          }
          return false;
        });

        if (hasIngredient) {
          recipesArray.push(data);
        }
      }
    });
    return recipesArray;
  } catch (error) {
    console.error("Error getRecipesByIngredient:", error);
    return [];
  }
}

// Hàm lấy chi tiết nguyên liệu cho màn hình Recipe Detail
// Input: idArray = [[id1, quantity1], [id2, quantity2]...]
// Thay thế hàm getAllIngredients cũ bằng hàm này:

export async function getAllIngredients(ingredientsArray) {
  // 1. Kiểm tra đầu vào: Nếu không có mảng nguyên liệu -> trả về rỗng
  if (!ingredientsArray || !Array.isArray(ingredientsArray)) {
    return [];
  }

  try {
    const promises = ingredientsArray.map(async (item) => {
      let ingId, quantity;

      // --- XỬ LÝ ĐA DẠNG DỮ LIỆU ---
      
      // TRƯỜNG HỢP 1: Dữ liệu kiểu Mảng cũ [ID, Quantity]
      if (Array.isArray(item)) {
        ingId = item[0];
        quantity = item[1];
      } 
      // TRƯỜNG HỢP 2: Dữ liệu kiểu Object mới { ingredientId: ID, quantity: "..." }
      else if (typeof item === 'object' && item !== null) {
        // Lấy ID từ key 'ingredientId' hoặc 'id' (phòng hờ)
        ingId = item.ingredientId || item.id;
        
        // Lấy số lượng, nếu không có thì gán chuỗi rỗng
        quantity = item.quantity || ""; 
        
        // Nếu trong object không có field quantity, kiểm tra xem có field nào khác chứa số lượng không
        // (Tùy thuộc vào cách bạn nhập data trên Firebase)
      }

      // Nếu không tìm thấy ID hợp lệ -> Bỏ qua món này
      if (!ingId) return null;

      // Quan trọng: Ép kiểu ID về String để gọi Firebase (vì schema bạn lưu là Number)
      const strId = String(ingId);

      try {
        const docRef = doc(db, COLL_INGREDIENTS, strId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          // Trả về đúng định dạng mà IngredientsDetailsScreen cần: [DATA_OBJECT, QUANTITY_STRING]
          return [formatDoc(docSnap), quantity];
        }
      } catch (err) {
        console.warn(`Skipping ingredient ${strId} due to error:`, err);
      }
      return null;
    });

    // Chờ tất cả các promise chạy xong
    const results = await Promise.all(promises);
    
    // Lọc bỏ các giá trị null (các nguyên liệu bị lỗi hoặc không tìm thấy)
    return results.filter(r => r !== null);

  } catch (error) {
    console.error("Error getAllIngredients:", error);
    return [];
  }
}

// ==========================================
// 4. CÁC HÀM TÌM KIẾM (SEARCH)
// Lưu ý: Tìm kiếm chuỗi trong Firestore khá hạn chế, 
// nên ta dùng cách lấy về Client rồi lọc (chấp nhận được với quy mô App nhỏ/vừa).
// ==========================================

// Tìm món ăn theo tên nguyên liệu
export async function getRecipesByIngredientName(ingredientName) {
  const nameUpper = ingredientName.toUpperCase();
  const recipesResult = [];

  try {
    // B1: Tìm các Ingredient có tên khớp
    const ingSnapshot = await getDocs(collection(db, COLL_INGREDIENTS));
    const matchedIngIds = [];

    ingSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.name && data.name.toUpperCase().includes(nameUpper)) {
        matchedIngIds.push(doc.id);
      }
    });

    // B2: Tìm Recipe chứa các Ingredient ID đó
    // (Dùng lại hàm getRecipesByIngredient ở trên)
    for (const ingId of matchedIngIds) {
      const recipes = await getRecipesByIngredient(ingId);
      recipesResult.push(...recipes);
    }

    // B3: Lọc trùng lặp
    const uniqueRecipes = Array.from(new Map(recipesResult.map(item => [item.id, item])).values());
    return uniqueRecipes;

  } catch (error) {
    console.error("Error getRecipesByIngredientName:", error);
    return [];
  }
}

// Tìm món ăn theo tên Category
export async function getRecipesByCategoryName(categoryName) {
  const nameUpper = categoryName.toUpperCase();
  const recipesResult = [];

  try {
    // B1: Tìm Category ID khớp tên
    const catSnapshot = await getDocs(collection(db, COLL_CATEGORIES));
    const matchedCatIds = [];

    catSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.name && data.name.toUpperCase().includes(nameUpper)) {
        matchedCatIds.push(doc.id);
      }
    });

    // B2: Lấy Recipe theo Category ID
    const promises = matchedCatIds.map(id => getRecipes(id));
    const results = await Promise.all(promises);
    
    results.forEach(arr => recipesResult.push(...arr));
    
    return recipesResult;
  } catch (error) {
    console.error("Error getRecipesByCategoryName:", error);
    return [];
  }
}

// Tìm món ăn theo tên món
export async function getRecipesByRecipeName(recipeName) {
  const nameUpper = recipeName.toUpperCase();
  const recipesResult = [];

  try {
    const snapshot = await getDocs(collection(db, COLL_RECIPES));
    snapshot.forEach(doc => {
      const data = formatDoc(doc);
      if (data.title && data.title.toUpperCase().includes(nameUpper)) {
        recipesResult.push(data);
      }
    });
    return recipesResult;
  } catch (error) {
    console.error("Error getRecipesByRecipeName:", error);
    return [];
  }
}