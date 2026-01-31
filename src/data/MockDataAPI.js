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

// Lấy tất cả danh mục
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

// Lấy tất cả công thức (Dùng cho HomeScreen và Gợi ý Search)
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

/**
 * QUAN TRỌNG: Hàm này giúp SearchScreen.js không bị lỗi khi gọi getRecipes() không tham số
 */
export const getRecipes = async (categoryId = null) => {
  if (!categoryId) {
    return await getAllRecipes();
  }
  return await getRecipesByCategoryId(categoryId);
};

// ==========================================
// 2. CÁC HÀM GET CHI TIẾT (DETAILS)
// ==========================================

export async function getCategoryById(categoryId) {
  if (!categoryId) return null;
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
  if (!ingredientID) return "";
  try {
    const docRef = doc(db, COLL_INGREDIENTS, String(ingredientID)); 
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data().name : "";
  } catch (error) {
    return "";
  }
}

export async function getIngredientUrl(ingredientID) {
  if (!ingredientID) return null;
  try {
    const docRef = doc(db, COLL_INGREDIENTS, String(ingredientID));
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data().photo_url : null;
  } catch (error) {
    return null;
  }
}

// ==========================================
// 3. CÁC HÀM QUERY & FILTER
// ==========================================

// Lấy danh sách món ăn thuộc 1 Category cụ thể
export async function getRecipesByCategoryId(categoryId) {
  if (categoryId === undefined || categoryId === null) return [];
  
  try {
    const numId = Number(categoryId); 
    const queryId = isNaN(numId) ? categoryId : numId;

    const q = query(collection(db, COLL_RECIPES), where('categoryId', '==', queryId));
    const snapshot = await getDocs(q);
    const data = [];
    snapshot.forEach((doc) => data.push(formatDoc(doc)));
    return data;
  } catch (error) {
    console.error("Error getRecipesByCategoryId:", error);
    return [];
  }
}

// Tìm món ăn theo tên món (Search logic)
export async function getRecipesByRecipeName(recipeName) {
  if (!recipeName || recipeName.trim() === "") return [];
  const nameUpper = recipeName.toUpperCase();
  
  try {
    const snapshot = await getDocs(collection(db, COLL_RECIPES));
    const recipesResult = [];
    snapshot.forEach(doc => {
      const data = formatDoc(doc);
      if (data.title && data.title.toUpperCase().includes(nameUpper)) {
        recipesResult.push(data);
      }
    });
    return recipesResult;
  } catch (error) {
    return [];
  }
}

// Tìm món ăn theo tên Category
export async function getRecipesByCategoryName(categoryName) {
  if (!categoryName || categoryName.trim() === "") return [];
  const nameUpper = categoryName.toUpperCase();

  try {
    // 1. Tìm IDs của các Category có tên khớp
    const catSnapshot = await getDocs(collection(db, COLL_CATEGORIES));
    const matchedCatIds = [];
    catSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.name && data.name.toUpperCase().includes(nameUpper)) {
        // Lưu cả dạng String và Number vì Firestore ID có thể là chuỗi nhưng field categoryId là số
        matchedCatIds.push(doc.id);
        if (!isNaN(Number(doc.id))) matchedCatIds.push(Number(doc.id));
      }
    });

    if (matchedCatIds.length === 0) return [];

    // 2. Lọc Recipes có categoryId nằm trong list matchedCatIds
    const recipeSnapshot = await getDocs(collection(db, COLL_RECIPES));
    const results = [];
    recipeSnapshot.forEach(doc => {
      const data = formatDoc(doc);
      if (matchedCatIds.includes(data.categoryId)) {
        results.push(data);
      }
    });
    return results;
  } catch (error) {
    return [];
  }
}

// Tìm món ăn theo tên nguyên liệu
export async function getRecipesByIngredientName(ingredientName) {
  if (!ingredientName || ingredientName.trim() === "") return [];
  const nameUpper = ingredientName.toUpperCase();

  try {
    // 1. Tìm IDs của các Ingredient khớp tên
    const ingSnapshot = await getDocs(collection(db, COLL_INGREDIENTS));
    const matchedIngIds = [];
    ingSnapshot.forEach(doc => {
      if (doc.data().name?.toUpperCase().includes(nameUpper)) {
        matchedIngIds.push(doc.id);
        if (!isNaN(Number(doc.id))) matchedIngIds.push(Number(doc.id));
      }
    });

    if (matchedIngIds.length === 0) return [];

    // 2. Lọc Recipes có chứa ingredientId đó
    const recipeSnapshot = await getDocs(collection(db, COLL_RECIPES));
    const results = [];
    recipeSnapshot.forEach(doc => {
      const data = formatDoc(doc);
      if (data.ingredients) {
        const hasIng = data.ingredients.some(item => {
          const id = Array.isArray(item) ? item[0] : (item.ingredientId || item.id);
          return matchedIngIds.includes(id) || matchedIngIds.includes(String(id)) || matchedIngIds.includes(Number(id));
        });
        if (hasIng) results.push(data);
      }
    });
    return results;
  } catch (error) {
    return [];
  }
}

// Hàm lấy chi tiết nguyên liệu
export async function getAllIngredients(ingredientsArray) {
  if (!ingredientsArray || !Array.isArray(ingredientsArray)) return [];

  try {
    const promises = ingredientsArray.map(async (item) => {
      let ingId, quantity;
      if (Array.isArray(item)) {
        ingId = item[0]; quantity = item[1];
      } else if (typeof item === 'object' && item !== null) {
        ingId = item.ingredientId || item.id;
        quantity = item.quantity || ""; 
      }

      if (!ingId) return null;
      const docSnap = await getDoc(doc(db, COLL_INGREDIENTS, String(ingId)));
      return docSnap.exists() ? [formatDoc(docSnap), quantity] : null;
    });

    const results = await Promise.all(promises);
    return results.filter(r => r !== null);
  } catch (error) {
    return [];
  }
}