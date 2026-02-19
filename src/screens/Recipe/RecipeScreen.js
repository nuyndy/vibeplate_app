import React, { useLayoutEffect, useState, useEffect, useCallback, useMemo, memo } from "react";
import { 
  View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator, 
  StyleSheet, StatusBar, Dimensions, RefreshControl, Alert, Modal
} from "react-native";
import { 
  collection, query, where, onSnapshot, doc, getDoc, setDoc, 
  deleteDoc, serverTimestamp, addDoc 
} from "firebase/firestore";
import Carousel from 'react-native-reanimated-carousel';

import { getCategoryById, getAllIngredients } from "../../data/MockDataAPI"; 
import BackButton from "../../components/BackButton/BackButton";
import { auth, db } from '../../firebase/firebaseConfig';

const { width: viewportWidth, height: viewportHeight } = Dimensions.get("window");

// --- COMPONENT CON ---
const IngredientItem = memo(({ data, qty, isAvailable, onPress }) => (
  <TouchableOpacity style={ui.ingCard} onPress={onPress}>
    <View style={[ui.ingCircle, isAvailable && ui.ingCircleActive]}>
      <Image source={{ uri: data?.photo_url }} style={ui.ingImage} />
      {isAvailable && (
        <View style={ui.checkBadge}>
          <Text style={ui.checkText}>✓</Text>
        </View>
      )}
    </View>
    <Text style={[ui.ingName, isAvailable && ui.textSuccess]} numberOfLines={1}>
      {data?.name}
    </Text>
    <Text style={ui.ingQty}>{qty}</Text>
  </TouchableOpacity>
));

export default function RecipeScreen(props) {
  const { navigation, route } = props;
  const item = route.params?.item || {}; 

  const [activeCategory, setActiveCategory] = useState(null);
  const [ingredientsData, setIngredientsData] = useState([]); 
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(true);
  const [isSaved, setIsSaved] = useState(false); 
  const [pantryData, setPantryData] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [missingItems, setMissingItems] = useState([]);

  // --- 1. TỐI ƯU CALORIES ---
  const displayCalories = useMemo(() => {
    const dbCalo = item?.calories || item?.kcal || item?.calorie || item?.energy;
    if (dbCalo) return dbCalo;
    if (item?.time && item?.ingredients) {
      return parseInt(item.time) * 5 + item.ingredients.length * 25;
    }
    return "--";
  }, [item]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerTransparent: true, headerLeft: () => null, headerTitle: "" });
  }, [navigation]);

  // --- 2. TỐI ƯU PANTRY SEARCH ---
  const pantryNamesSet = useMemo(() => {
    return new Set(pantryData.map(p => p.name.toLowerCase().trim()));
  }, [pantryData]);

  const checkAvailable = useCallback((recipeIngName) => {
    if (!recipeIngName) return false;
    const name = recipeIngName.toLowerCase().trim();
    return pantryNamesSet.has(name);
  }, [pantryNamesSet]);

  // --- 3. FIREBASE LISTENERS ---
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, "inventory"), where("email", "==", user.email));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ 
        name: doc.data().name?.toLowerCase().trim() || "" 
      }));
      setPantryData(items);
    });
    return () => unsubscribe();
  }, []);

  // --- 4. LOAD CHI TIẾT DỮ LIỆU ---
  const loadAllData = useCallback(async () => {
    if (!item?.id) return;
    try {
      const [catData, ingredientsDetail] = await Promise.all([
        item.categoryId ? getCategoryById(item.categoryId) : Promise.resolve(null),
        item.ingredients ? getAllIngredients(item.ingredients) : Promise.resolve([])
      ]);
      setActiveCategory(catData);
      setIngredientsData(ingredientsDetail);
      
      const user = auth.currentUser;
      if (user) {
        const docSnap = await getDoc(doc(db, "favorites", `${user.uid}_${item.id}`));
        setIsSaved(docSnap.exists());
      }
    } catch (e) { 
      console.error("Load Error:", e); 
    } finally { 
      setIsLoadingIngredients(false); 
      setIsRefreshing(false); 
    }
  }, [item.id]);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  // --- 5. LOGIC XỬ LÝ ---
  const handleSaveRecipe = async () => {
    const user = auth.currentUser;
    if (!user) return Alert.alert("Thông báo", "Vui lòng đăng nhập!");
    const currentId = item?.id || item?.recipeId;
    const docRef = doc(db, "favorites", `${user.uid}_${currentId}`);
    try {
      if (isSaved) { 
        await deleteDoc(docRef); setIsSaved(false); 
      } else { 
        await setDoc(docRef, { ...item, recipeId: currentId, email: user.email, savedAt: serverTimestamp() }); 
        setIsSaved(true); 
      }
    } catch (e) { console.error(e); }
  };

  const handleStartCooking = () => {
    const missing = ingredientsData.filter(ingArr => !checkAvailable(ingArr[0]?.name));
    if (missing.length === 0) {
      navigation.navigate("CookAI", { 
        steps: item.description?.split('\n'), 
        title: item.title,
        ingredients: ingredientsData.map(ing => ({
          name: ing[0]?.name, quantity: ing[1], photo_url: ing[0]?.photo_url
        }))
      });
    } else {
      setMissingItems(missing);
      setShowConfirmModal(true);
    }
  };

  const addToShoppingList = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const promises = missingItems.map(ing => {
        const data = ing[0];
        const qtyStr = ing[1];
        return addDoc(collection(db, "shoppingList"), {
          email: user.email,
          name: data.name,
          photo_url: data.photo_url || "https://cdn-icons-png.flaticon.com/512/2927/2927347.png",
          quantity: qtyStr.replace(/[^0-9]/g, '') || 1,
          unit: qtyStr.replace(/[0-9]/g, '').trim() || "đv",
          status: "pending",
          type: "missing_from_recipe",
          sourceRecipe: item.title,
          updatedAt: serverTimestamp()
        });
      });
      await Promise.all(promises);
      setShowConfirmModal(false);
      navigation.navigate("ShoppingList");
    } catch (e) { Alert.alert("Lỗi", "Không thể thêm vào giỏ hàng."); }
  };

  return (
    <View style={ui.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        removeClippedSubviews={true} // TỐI ƯU: Tự động xóa các view bị khuất
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadAllData} />}
      >
        <View style={ui.heroWrap}>
          <Carousel 
            loop
            width={viewportWidth} 
            height={viewportHeight * 0.3} 
            autoPlay={false}
            data={item.photosArray || [item.photo_url]} 
            scrollAnimationDuration={1000}
            renderItem={({ item: url }) => (
              <Image source={{ uri: url }} style={ui.mainPhoto} />
            )} 
          />
          <View style={ui.navOverlay}>
            <View style={ui.backBtnWrapper}><BackButton onPress={() => navigation.goBack()} /></View>
            <TouchableOpacity style={ui.actionCircle} onPress={handleSaveRecipe}>
              <Text style={{fontSize: 24, color: isSaved ? '#FF3B30' : '#FFF'}}>{isSaved ? '♥' : '♡'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={ui.contentBody}>
          <Text style={ui.mainTitle}>{item?.title}</Text>
          <View style={ui.quickInfoBar}>
            <View style={ui.infoTag}><Text style={ui.infoTagText}>{activeCategory?.name || 'Món ăn'}</Text></View>
            <View style={ui.vDivider} /><Text style={ui.infoItem}>⏱ {item?.time}</Text>
            <View style={ui.vDivider} /><Text style={ui.infoItem}>👥 {item?.servings}</Text>
            <View style={ui.vDivider} /><Text style={ui.infoItem}>🔥 {displayCalories} kcal</Text>
          </View>

          <View style={ui.sectionDivider} />
          
          <View style={ui.section}>
            <View style={ui.sectionHeader}>
              <Text style={ui.sectionTitle}>Nguyên liệu</Text>
              <Text style={ui.sectionSub}>{ingredientsData.length} món</Text>
            </View>
            {isLoadingIngredients ? <ActivityIndicator color="#000" /> : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ui.ingListWrap}>
                {ingredientsData.map((ing, idx) => (
                  <IngredientItem 
                    key={`${item.id}-ing-${idx}`}
                    data={ing[0]}
                    qty={ing[1]}
                    isAvailable={checkAvailable(ing[0]?.name)}
                    onPress={() => navigation.navigate("Ingredient", { ingredient: ing[0] })}
                  />
                ))}
              </ScrollView>
            )}
          </View>

          <View style={ui.sectionDivider} />
          <View style={ui.section}>
            <Text style={ui.sectionTitle}>Hướng dẫn</Text>
            <Text style={ui.descText}>{item?.description}</Text>
          </View>
          <View style={{ height: 140 }} />
        </View>
      </ScrollView>

      <View style={ui.footer}>
        <TouchableOpacity style={ui.primaryBtn} onPress={handleStartCooking}>
          <Text style={ui.primaryBtnText}>BẮT ĐẦU NẤU 👩‍🍳</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={ui.modalOverlay}>
          <View style={ui.modalContainer}>
            <View style={ui.modalIconBg}><Text style={{fontSize: 30}}>🛒</Text></View>
            <Text style={ui.modalTitle}>Thiếu nguyên liệu!</Text>
            <Text style={ui.modalContentText}>
              Bạn còn thiếu {missingItems.length} món. Bạn muốn thêm vào giỏ hay vẫn tiếp tục nấu?
            </Text>
            <View style={ui.btnRow}>
              <TouchableOpacity style={[ui.dialogBtn, {backgroundColor: '#F3F4F6'}]} onPress={() => setShowConfirmModal(false)}>
                <Text style={[ui.dialogBtnText, {color: '#4B5563'}]}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[ui.dialogBtn, {backgroundColor: '#FEF3C7'}]} onPress={addToShoppingList}>
                <Text style={[ui.dialogBtnText, {color: '#D97706'}]}>+ Giỏ</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[ui.dialogBtn, {backgroundColor: '#D1FAE5'}]} 
                onPress={() => {
                  setShowConfirmModal(false);
                  navigation.navigate("CookAI", { steps: item.description?.split('\n'), title: item.title });
                }}
              >
                <Text style={[ui.dialogBtnText, {color: '#059669'}]}>Vẫn nấu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ... styles (giữ nguyên ui StyleSheet từ code trước của bạn)
const ui = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  heroWrap: { height: viewportHeight * 0.3 },
  mainPhoto: { width: '100%', height: '100%', resizeMode: 'cover' },
  navOverlay: { position: 'absolute', top: 35, left: 10, right: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
  actionCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  contentBody: { paddingHorizontal: 20, paddingTop: 20, alignItems: 'center' },
  mainTitle: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', marginBottom: 15, textAlign: 'center', width: '100%' },
  quickInfoBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F8F8', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, width: '95%' },
  infoTag: { backgroundColor: '#000', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  infoTagText: { color: '#FFF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  vDivider: { width: 1, height: 12, backgroundColor: '#DDD', marginHorizontal: 12 },
  infoItem: { fontSize: 13, fontWeight: '600', color: '#555' },
  sectionDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 20, width: '100%' },
  section: { marginVertical: 0, width: '100%' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  sectionSub: { fontSize: 12, color: '#999' },
  ingListWrap: { paddingRight: 20 },
  ingCard: { alignItems: 'center', marginRight: 18, width: 70 },
  ingCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F9F9F9', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#F0F0F0' },
  ingCircleActive: { borderColor: '#32ba7c', backgroundColor: '#F0F9F4' },
  ingImage: { width: 32, height: 32, resizeMode: 'contain' },
  checkBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#32ba7c', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  checkText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  ingName: { fontSize: 11, color: '#444', fontWeight: '500', textAlign: 'center' },
  textSuccess: { color: '#32ba7c', fontWeight: '700' }, 
  ingQty: { fontSize: 10, color: '#999', marginTop: 2 },
  descText: { fontSize: 15, lineHeight: 24, color: '#666', textAlign: 'left', width: '100%' },
  footer: { position: 'absolute', bottom: 0, width: '100%', paddingHorizontal: 20, paddingBottom: 30, paddingTop: 15, backgroundColor: 'rgba(255,255,255,0.98)' },
  primaryBtn: { backgroundColor: '#1A1A1A', height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '88%', backgroundColor: 'white', borderRadius: 30, padding: 25, alignItems: 'center' },
  modalIconBg: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 10 },
  modalContentText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 25, lineHeight: 20 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 8 },
  dialogBtn: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  dialogBtnText: { fontSize: 13, fontWeight: 'bold' }
});