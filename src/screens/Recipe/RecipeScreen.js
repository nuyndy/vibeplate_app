import React, { useLayoutEffect, useRef, useState, useEffect, useCallback } from "react";
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  StyleSheet, 
  StatusBar, 
  Alert, 
  Dimensions,
  RefreshControl
} from "react-native";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp, 
  writeBatch 
} from "firebase/firestore";
import { useSharedValue } from 'react-native-reanimated';
import Carousel, { Pagination } from 'react-native-reanimated-carousel';

import { getCategoryById, getAllIngredients } from "../../data/MockDataAPI"; 
import BackButton from "../../components/BackButton/BackButton";
import styles from "./styles"; 
import { auth, db } from '../../firebase/firebaseConfig';

const { width: viewportWidth, height: viewportHeight } = Dimensions.get("window");

// MÃ API KEY
const OPENROUTER_API_KEY = "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"; 

export default function RecipeScreen(props) {
  const { navigation, route } = props;
  const item = route.params?.item; 

  // --- STATES ---
  const [activeCategory, setActiveCategory] = useState(null);
  const [ingredientsData, setIngredientsData] = useState([]); 
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(true);
  const [isSaved, setIsSaved] = useState(false); 
  const [pantryData, setPantryData] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🔥 STATE CHO AI TÍNH CALO
  const [aiCalories, setAiCalories] = useState(null);
  const [isCalculatingCalories, setIsCalculatingCalories] = useState(false);

  const slider1Ref = useRef(null);
  const progress = useSharedValue(0);

  const normalizeName = (name) => name ? name.toLowerCase().trim() : "";

  // --- HÀM TẢI DỮ LIỆU TỔNG HỢP ---
  const loadAllData = useCallback(async () => {
    if (!item) return;
    try {
      const [catData, ingredientsDetail] = await Promise.all([
        item.categoryId ? getCategoryById(item.categoryId) : Promise.resolve(null),
        item.ingredients ? getAllIngredients(item.ingredients) : Promise.resolve([])
      ]);

      setActiveCategory(catData);
      setIngredientsData(ingredientsDetail);

      const user = auth.currentUser;
      if (user) {
        const docId = `${user.uid}_${item.recipeId}`;
        const docSnap = await getDoc(doc(db, "favorites", docId));
        setIsSaved(docSnap.exists());
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setIsLoadingIngredients(false);
      setIsRefreshing(false);
    }
  }, [item]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadAllData();
  };

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // --- REALTIME PANTRY ---
  useEffect(() => {
    const user = auth.currentUser;
    if (user && user.email) {
      const q = query(collection(db, "inventory"), where("email", "==", user.email));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPantryData(items);
      });
      return () => unsubscribe();
    }
  }, []);

  // 🤖 GỌI AI ĐỂ TÍNH CALO
  const calculateCaloriesWithAI = useCallback(async () => {
    if (!ingredientsData || ingredientsData.length === 0) return;
    
    setIsCalculatingCalories(true);
    try {
      // 1. Gộp mảng nguyên liệu thành 1 chuỗi văn bản (VD: "500g thịt bò, 2 muỗng đường")
      const ingredientsListStr = ingredientsData.map(ingArray => {
        const data = ingArray[0];
        const qty = ingArray[1];
        return `${qty} ${data?.name || ''}`;
      }).join(", ");

      const servingsCount = item.servings || 2;

      // 2. Viết Prompt gắt gao ép AI chỉ nhả ra số
      const prompt = `Tính tổng lượng Calo (Kcal) xấp xỉ cho danh sách nguyên liệu nấu ăn sau: ${ingredientsListStr}.
      Sau đó chia cho ${servingsCount} người ăn.
      Tuyệt đối chỉ trả về 1 con số nguyên duy nhất (là lượng Kcal cho 1 người ăn).
      Không thêm chữ Kcal, không giải thích, không dấu câu.`;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:8081",
          "X-Title": "RecipeApp",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          models: [
            "google/gemma-2-9b-it:free",
            "mistralai/mistral-7b-instruct:free",
            "openrouter/free"
          ],
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content?.trim();
      
      // 3. Dùng Regex lọc lấy đúng con số từ kết quả AI trả về (phòng khi AI nói lan man)
      const match = aiResponse?.match(/\d+/);
      if (match) {
        setAiCalories(match[0]);
      } else {
        setAiCalories("--");
      }
    } catch (error) {
      console.error("Lỗi AI tính calo:", error);
      setAiCalories("--");
    } finally {
      setIsCalculatingCalories(false);
    }
  }, [ingredientsData, item.servings]);

  // Gọi hàm AI tự động ngay khi dữ liệu nguyên liệu vừa tải xong
  useEffect(() => {
    if (ingredientsData.length > 0) {
      calculateCaloriesWithAI();
    }
  }, [ingredientsData, calculateCaloriesWithAI]);

  // --- CÁC HÀM XỬ LÝ SỰ KIỆN KHÁC ---
  const handleSaveRecipe = async () => {
    const user = auth.currentUser;
    if (!user) {
        Alert.alert("Yêu cầu đăng nhập", "Bạn cần đăng nhập để lưu món ăn.");
        return;
    }
    const docId = `${user.uid}_${item.recipeId}`;
    const docRef = doc(db, "favorites", docId);
    try {
        if (isSaved) {
            await deleteDoc(docRef);
            setIsSaved(false);
        } else {
            const favoriteData = {
                recipeId: item.recipeId,
                title: item.title,
                photo_url: item.photo_url,
                time: item.time,
                servings: item.servings,
                categoryId: item.categoryId,
                userId: user.uid,
                addedAt: serverTimestamp()
            };
            await setDoc(docRef, favoriteData);
            setIsSaved(true);
            Alert.alert("Đã lưu", "Đã thêm vào danh sách món ăn yêu thích!");
        }
    } catch (error) { console.error(error); }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: true,
      headerTitle: "",
      headerTintColor: "#fff",
      headerLeft: () => <View style={styles.backButtonWrapper}><BackButton onPress={() => navigation.goBack()} /></View>,
      headerRight: () => (
        <TouchableOpacity style={styles.saveButtonWrapper} onPress={handleSaveRecipe}>
            <Image 
                source={{ uri: isSaved ? 'https://cdn-icons-png.flaticon.com/512/833/833472.png' : 'https://cdn-icons-png.flaticon.com/512/1077/1077035.png' }} 
                style={[styles.saveIcon, isSaved ? { tintColor: '#FF4757' } : { tintColor: '#FFF' }]} 
            />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isSaved]);

  const checkIngredientAvailable = (recipeIngName, pantryList) => {
    const normalizedRecipeName = normalizeName(recipeIngName);
    return pantryList.some(pantryItem => {
        const normalizedPantryName = normalizeName(pantryItem.name);
        return normalizedPantryName.includes(normalizedRecipeName) || normalizedRecipeName.includes(normalizedPantryName);
    });
  };

  const parseQuantity = (quantityString) => {
    if (!quantityString) return { qty: 1, unit: 'cái' };
    const regex = /^(\d+(?:[.,]\d+)?)\s*(.*)$/;
    const match = quantityString.toString().trim().match(regex);
    if (match) return { qty: parseFloat(match[1].replace(',', '.')), unit: match[2].trim() || 'cái' };
    return { qty: 1, unit: quantityString };
  };

  const addToShoppingList = async (missingItems) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
        const batch = writeBatch(db);
        missingItems.forEach((item) => {
            const { qty, unit } = parseQuantity(item[1]);
            const newDocRef = doc(collection(db, "shoppingList"));
            batch.set(newDocRef, {
                email: user.email,
                name: item[0].name,
                quantity: qty,
                unit: unit,
                status: 'pending',
                photo_url: item[0].photo_url || null,
                updatedAt: new Date()
            });
        });
        await batch.commit();
        Alert.alert("Thành công", `Đã thêm ${missingItems.length} món vào giỏ!`);
    } catch (error) { console.error(error); }
  };

  const handleStartCooking = () => {
    const missing = ingredientsData.filter(ri => !checkIngredientAvailable(ri[0]?.name, pantryData));
    if (missing.length === 0) Alert.alert("Tuyệt vời!", "Đã đủ nguyên liệu! 🍳");
    else {
      Alert.alert("Thiếu nguyên liệu", `Bạn thiếu: ${missing.map(m => m[0].name).join(", ")}`, [
          { text: "Hủy", style: "cancel" },
          { text: "Tiếp tục nấu", onPress: () => console.log("Cooking") },
          { text: "Thêm vào giỏ", onPress: () => addToShoppingList(missing) }
      ]);
    }
  };

  const renderHorizontalIngredient = (ingredientArr, index) => {
    const data = ingredientArr[0]; 
    const quantity = ingredientArr[1]; 
    if (!data) return null;
    const isAvailable = checkIngredientAvailable(data.name, pantryData);

    return (
        <View key={index} style={customStyles.ingredientItemContainer}>
            <TouchableOpacity onPress={() => navigation.navigate("Ingredient", { ingredient: data })}>
                <View style={[
                    customStyles.ingredientCircle, 
                    isAvailable ? { borderColor: '#32ba7c', borderWidth: 2 } : { borderColor: '#F0F0F0', borderWidth: 1 }
                ]}>
                    <Image source={{ uri: data.photo_url || 'https://cdn-icons-png.flaticon.com/512/706/706164.png' }} style={customStyles.ingredientImage} />
                    {isAvailable && (
                        <View style={customStyles.statusBadge}>
                             <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/190/190411.png'}} style={{width: 10, height: 10, tintColor: 'white'}} />
                        </View>
                    )}
                </View>
            </TouchableOpacity>
            <Text style={[customStyles.ingredientNameText, isAvailable && { fontWeight: '800', color: '#32ba7c' }]} numberOfLines={2}>{data.name}</Text>
            <Text style={customStyles.ingredientQtyText}>{quantity}</Text>
        </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
            <RefreshControl 
                refreshing={isRefreshing} 
                onRefresh={onRefresh} 
                tintColor="#000"   
                colors={['#000']}  
                progressBackgroundColor="#FFF" 
            />
        }
      >
        <View style={styles.carouselWrapper}>
          <Carousel
            width={viewportWidth} height={viewportHeight * 0.45}
            data={(item.photosArray?.length > 0) ? item.photosArray : [item.photo_url]}
            renderItem={({ item }) => (
                <View style={styles.imageContainer}>
                  <Image style={styles.image} source={{ uri: item }} resizeMode="cover" />
                  <View style={styles.imageOverlay} />
                </View>
            )}
            onProgressChange={progress}
          />
          <View style={styles.paginationWrapper}>
            <Pagination.Basic progress={progress} data={(item.photosArray?.length > 0) ? item.photosArray : [item.photo_url]} dotStyle={styles.paginationDot} activeDotStyle={styles.paginationActiveDot} />
          </View>
        </View>

        <View style={styles.infoRecipeContainer}>
          <View style={styles.indicatorBar} />
          <Text style={styles.recipeTitle}>{item.title}</Text>
          <View style={styles.metaContainer}>
            <TouchableOpacity style={styles.categoryTag}><Text style={styles.categoryText}>{activeCategory?.name.toUpperCase() || "LOADING..."}</Text></TouchableOpacity>
            
            <View style={styles.metaItem}>
              <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/2088/2088617.png'}} style={styles.metaIcon} />
              <Text style={styles.metaText}>{item.time} phút</Text>
            </View>
            
            <View style={[styles.metaItem, { marginLeft: 15 }]}>
              <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/1250/1250689.png'}} style={styles.metaIcon} />
              <Text style={styles.metaText}>{item.servings || "2"} người</Text>
            </View>

            {/* 🔥 KHU VỰC HIỂN THỊ CALO DO AI TÍNH */}
            <View style={[styles.metaItem, { marginLeft: 15 }]}>
              <Text style={{ fontSize: 14, marginRight: 4 }}>🔥</Text>
              {isCalculatingCalories ? (
                <ActivityIndicator size="small" color="#ff9800" />
              ) : (
                <Text style={styles.metaText}>{aiCalories ? `${aiCalories} Kcal` : '-- Kcal'}</Text>
              )}
            </View>

          </View>
          <View style={styles.divider} />

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Nguyên liệu cần thiết</Text>
            {isLoadingIngredients ? <ActivityIndicator size="small" color="#32ba7c" /> : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10, paddingRight: 20 }}>
                    {ingredientsData.map((ing, index) => renderHorizontalIngredient(ing, index))}
                </ScrollView>
            )}
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Cách làm</Text>
            <Text style={styles.descriptionText}>{item.description || "Chưa có hướng dẫn."}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.stickyFooter}>
        <TouchableOpacity style={styles.startCookingBtn} onPress={handleStartCooking}>
          <Text style={styles.startCookingText}>Bắt đầu nấu ngay</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const customStyles = StyleSheet.create({
    ingredientItemContainer: { alignItems: 'center', marginRight: 20, width: 75 },
    ingredientCircle: { width: 65, height: 65, borderRadius: 32.5, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', marginBottom: 8, elevation: 3, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 3 },
    ingredientImage: { width: 35, height: 35, resizeMode: 'contain' },
    ingredientNameText: { fontSize: 11, color: '#333', textAlign: 'center', height: 30 },
    ingredientQtyText: { fontSize: 10, color: '#888', marginTop: 2 },
    statusBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#32ba7c', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' }
});