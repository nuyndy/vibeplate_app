import React, { useLayoutEffect, useRef, useState, useEffect } from "react";
import {
  ScrollView,
  Text,
  View,
  Image,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import styles from "./styles";
import { useSharedValue } from 'react-native-reanimated';
import Carousel, { Pagination } from 'react-native-reanimated-carousel';

// --- API & COMPONENTS ---
import { getCategoryById, getAllIngredients } from "../../data/MockDataAPI"; 
import BackButton from "../../components/BackButton/BackButton";

// --- FIREBASE IMPORTS ---
import { auth, db } from '../../firebase/firebaseConfig';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc } from "firebase/firestore";

const { width: viewportWidth, height: viewportHeight } = Dimensions.get("window");

export default function RecipeScreen(props) {
  const { navigation, route } = props;
  const item = route.params?.item; 

  // --- STATES ---
  const [activeCategory, setActiveCategory] = useState(null);
  const [ingredientsData, setIngredientsData] = useState([]); 
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(true);
  const [isSaved, setIsSaved] = useState(false); 
  
  // State: Kho bếp
  const [pantryData, setPantryData] = useState([]);

  // --- STATE MODAL GHI CHÚ MỚI ---
  const [isNoteModalVisible, setNoteModalVisible] = useState(false);
  const [missingIngredientsList, setMissingIngredientsList] = useState([]); // Danh sách các món bị thiếu để hiện trong modal
  const [substitutionNotes, setSubstitutionNotes] = useState({}); // Object lưu: { "Tên món thiếu": "Tên món thay thế" }

  const slider1Ref = useRef(null);
  const progress = useSharedValue(0);

  // --- HELPER: Chuẩn hóa tên ---
  const normalizeName = (name) => {
    return name ? name.toLowerCase().trim() : "";
  };

  // --- 1. CONFIG HEADER ---
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: true,
      headerTitle: "",
      headerTintColor: "#fff",
      headerLeft: () => (
        <View style={styles.backButtonWrapper}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
      ),
      headerRight: () => (
        <TouchableOpacity 
            style={styles.saveButtonWrapper} 
            onPress={handleSaveRecipe}
        >
            <Image 
                source={{ 
                    uri: isSaved 
                    ? 'https://cdn-icons-png.flaticon.com/512/833/833472.png' 
                    : 'https://cdn-icons-png.flaticon.com/512/1077/1077035.png' 
                }} 
                style={[styles.saveIcon, isSaved ? { tintColor: '#FF4757' } : { tintColor: '#FFF' }]} 
            />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isSaved]);

  // --- 2. FETCH DATA (MÓN ĂN) ---
  useEffect(() => {
    const fetchCategory = async () => {
      if (item.categoryId) {
        const catData = await getCategoryById(item.categoryId);
        setActiveCategory(catData);
      }
    };
    fetchCategory();
  }, [item]);

  useEffect(() => {
    const fetchIngredients = async () => {
      setIsLoadingIngredients(true);
      if (item.ingredients) {
        try {
           const ingredientsDetail = await getAllIngredients(item.ingredients);
           setIngredientsData(ingredientsDetail);
        } catch (error) {
           console.error("Lỗi tải nguyên liệu món ăn:", error);
        }
      }
      setIsLoadingIngredients(false);
    };
    fetchIngredients();
  }, [item]);

  // --- 3. FETCH DATA KHO BẾP ---
  useEffect(() => {
    const user = auth.currentUser;
    if (user && user.email) {
      const q = query(collection(db, "inventory"), where("email", "==", user.email));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPantryData(items);
      });
      return () => unsubscribe();
    }
  }, []);

  // --- HÀM SO SÁNH NGUYÊN LIỆU ---
  const checkIngredientAvailable = (recipeIngName, pantryList) => {
    const normalizedRecipeName = normalizeName(recipeIngName);
    return pantryList.some(pantryItem => {
        const normalizedPantryName = normalizeName(pantryItem.name);
        return normalizedPantryName.includes(normalizedRecipeName) || 
               normalizedRecipeName.includes(normalizedPantryName);
    });
  };

  // --- HÀM THÊM VÀO GIỎ ĐI CHỢ ---
  const addToShoppingList = async (missingItems) => {
    const user = auth.currentUser;
    if (!user) {
        Alert.alert("Lỗi", "Bạn cần đăng nhập để dùng tính năng này");
        return;
    }

    try {
        const userDocRef = doc(db, 'shoppingList', user.uid);
        const docSnap = await getDoc(userDocRef);
        let currentList = [];
        if (docSnap.exists()) {
            currentList = docSnap.data().myList || [];
        }

        const newItemsToAdd = missingItems.map((item, index) => ({
            itemId: Date.now().toString() + index, 
            name: item[0].name,
            quantity: 1,      
            unit: 'cái',      
            status: 'pending', 
            updatedAt: new Date()
        }));

        const updatedList = [...currentList, ...newItemsToAdd];
        await setDoc(userDocRef, { myList: updatedList });

        Alert.alert(
            "Thành công", 
            `Đã thêm ${missingItems.length} món vào danh sách đi chợ!\nBạn muốn làm gì tiếp theo?`,
            [
                { text: "Ở lại đây", style: "cancel" },
                { text: "Đến Giỏ hàng", onPress: () => navigation.navigate("ShoppingList") }
            ]
        );
    } catch (error) {
        console.error("Lỗi thêm giỏ hàng:", error);
        Alert.alert("Lỗi", "Không thể thêm vào giỏ hàng lúc này.");
    }
  };

  // --- HANDLERS ---
  const handleSaveRecipe = () => {
    setIsSaved(!isSaved);
    if (!isSaved) {
        Alert.alert("Đã lưu", "Món ăn đã được thêm vào danh sách yêu thích!");
    }
  };

  // --- XỬ LÝ NÚT BẮT ĐẦU NẤU ---
  const handleStartCooking = () => {
    // 1. Tìm các nguyên liệu thiếu
    const missingIngredients = ingredientsData.filter((recipeIng) => {
      const recipeItemName = recipeIng[0]?.name; 
      const isAvailable = checkIngredientAvailable(recipeItemName, pantryData);
      return !isAvailable;
    });

    if (missingIngredients.length === 0) {
      Alert.alert("Tuyệt vời!", "Bạn đã có đủ mọi nguyên liệu. Bắt đầu nấu thôi! 🍳");
    } else {
      // Lưu danh sách thiếu vào state để Modal dùng
      setMissingIngredientsList(missingIngredients);
      
      const missingNames = missingIngredients.map(ing => ing[0].name).join(", ");
      
      Alert.alert(
        "Thiếu nguyên liệu", 
        `Bạn đang thiếu: ${missingNames}.\nBạn muốn làm gì?`,
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Ghi chú thay thế",
            // Mở Modal thay thế
            onPress: () => setNoteModalVisible(true) 
          },
          {
            text: "Thêm vào giỏ đi chợ",
            onPress: () => addToShoppingList(missingIngredients) 
          }
        ]
      );
    }
  };

  // --- Xử lý nhập liệu trong Modal ---
  const handleInputChange = (missingName, text) => {
    setSubstitutionNotes(prev => ({
        ...prev,
        [missingName]: text // Lưu dạng: "Thịt gà": "Thịt vịt"
    }));
  };

  // --- Xử lý Lưu ghi chú ---
  const handleSaveNotes = () => {
    // Lọc ra những món user thực sự đã nhập
    const finalNotes = Object.entries(substitutionNotes).filter(([key, value]) => value.trim() !== "");
    
    if (finalNotes.length === 0) {
        Alert.alert("Thông báo", "Bạn chưa nhập món thay thế nào.");
        return;
    }

    // Xử lý logic lưu vào DB hoặc Local ở đây (tùy bạn)
    // Ví dụ: In ra console
    console.log("Danh sách thay thế user đã nhập:", finalNotes);
    
    let message = "Đã lưu thay thế:\n";
    finalNotes.forEach(([missing, sub]) => {
        message += `• ${missing} ➡️ ${sub}\n`;
    });

    Alert.alert("Đã lưu ghi chú", message);
    setNoteModalVisible(false);
    setSubstitutionNotes({}); // Reset
  };

  const renderImage = ({ item }) => (
    <View style={styles.imageContainer}>
      <Image style={styles.image} source={{ uri: item }} resizeMode="cover" />
      <View style={styles.imageOverlay} />
    </View>
  );

  const renderIngredientItem = (ingredientArr, index) => {
    const data = ingredientArr[0];    
    const quantity = ingredientArr[1]; 
    if (!data) return null;

    const isAvailable = checkIngredientAvailable(data.name, pantryData);

    return (
      <View key={index} style={styles.ingredientRow}>
        <View style={styles.iconWrapper}>
            {data.photo_url ? (
                <Image source={{ uri: data.photo_url }} style={styles.ingredientIcon} />
            ) : (
                <Image 
                    source={{uri: 'https://cdn-icons-png.flaticon.com/512/446/446163.png'}} 
                    style={[styles.checkIcon, isAvailable ? {tintColor: '#2cd18a'} : {tintColor: '#ccc'}]} 
                />
            )}
        </View>
        <Text style={[styles.ingredientName, isAvailable && {color: '#2cd18a', fontWeight: 'bold'}]}>
            {data.name} {isAvailable ? "(Có sẵn)" : ""}
        </Text>
        <Text style={styles.ingredientQuantity}>{quantity ? quantity : ""}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }} 
      >
        {/* CAROUSEL */}
        <View style={styles.carouselWrapper}>
          <Carousel
            ref={slider1Ref}
            loop={false}
            width={viewportWidth}
            height={viewportHeight * 0.45}
            autoPlay={false}
            data={(item.photosArray && item.photosArray.length > 0) ? item.photosArray : [item.photo_url]}
            renderItem={renderImage}
            onProgressChange={progress}
          />
          <View style={styles.paginationWrapper}>
            <Pagination.Basic
              progress={progress}
              data={(item.photosArray && item.photosArray.length > 0) ? item.photosArray : [item.photo_url]}
              dotStyle={styles.paginationDot}
              activeDotStyle={styles.paginationActiveDot}
              containerStyle={{ gap: 5 }}
            />
          </View>
        </View>

        {/* BODY INFO */}
        <View style={styles.infoRecipeContainer}>
          <View style={styles.indicatorBar} />
          <Text style={styles.recipeTitle}>{item.title}</Text>

          <View style={styles.metaContainer}>
            <TouchableOpacity 
              disabled={!activeCategory}
              onPress={() => activeCategory && navigation.navigate("RecipesList", { category: activeCategory, title: activeCategory.name })}
              style={styles.categoryTag}
            >
              <Text style={styles.categoryText}>
                {activeCategory ? activeCategory.name.toUpperCase() : "LOADING..."}
              </Text>
            </TouchableOpacity>

            <View style={styles.metaItem}>
              <Image source={require("../../../assets/icons/time.png")} style={styles.metaIcon} />
              <Text style={styles.metaText}>{item.time} phút</Text>
            </View>

            <View style={[styles.metaItem, { marginLeft: 15 }]}>
               <Image 
                  source={{uri: 'https://cdn-icons-png.flaticon.com/512/1250/1250689.png'}} 
                  style={styles.metaIcon} 
               />
               <Text style={styles.metaText}>
                  {item.servings ? `${item.servings} người` : "2 người"}
               </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* LIST NGUYÊN LIỆU */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Nguyên liệu cần thiết</Text>
            <View style={styles.ingredientsBox}>
                {isLoadingIngredients ? (
                    <View style={{padding: 20}}>
                        <ActivityIndicator size="small" color="#000000" />
                        <Text style={{textAlign:'center', color:'#888', marginTop: 5}}>Đang tải nguyên liệu...</Text>
                    </View>
                ) : (
                    ingredientsData.map((ing, index) => renderIngredientItem(ing, index))
                )}

                {!isLoadingIngredients && ingredientsData.length === 0 && (
                    <Text style={{textAlign:'center', color:'#999', fontStyle:'italic', padding: 10}}>
                        Không tìm thấy thông tin nguyên liệu.
                    </Text>
                )}
            </View>
          </View>

          {/* CÁCH LÀM */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Cách làm</Text>
            <Text style={styles.descriptionText}>
                {item.description ? item.description : "Chưa có hướng dẫn chi tiết."}
            </Text>
          </View>

        </View>
      </ScrollView>

      {/* FOOTER BUTTON */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity style={styles.startCookingBtn} onPress={handleStartCooking}>
          <Text style={styles.startCookingText}>Bắt đầu nấu ngay</Text>
          <Image 
            source={{ uri: "https://cdn-icons-png.flaticon.com/512/2928/2928883.png" }} 
            style={styles.btnIcon}
          />
        </TouchableOpacity>
      </View>

      {/* --- MODAL GHI CHÚ THAY THẾ (GIAO DIỆN MỚI) --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isNoteModalVisible}
        onRequestClose={() => setNoteModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center', 
            backgroundColor: 'rgba(0,0,0,0.6)' // Nền tối mờ đậm hơn chút cho đẹp
          }}
        >
          <View style={{
              width: '90%', 
              backgroundColor: 'white', 
              borderRadius: 20, 
              padding: 20, 
              maxHeight: '80%', // Không chiếm hết màn hình
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 }, 
              shadowOpacity: 0.3, 
              shadowRadius: 5,
              elevation: 10
          }}>
            {/* Header Modal */}
            <Text style={{fontSize: 20, fontWeight: 'bold', marginBottom: 5, color: '#333', textAlign:'center'}}>
                Ghi chú thay thế
            </Text>
            <Text style={{fontSize: 14, color: '#666', marginBottom: 20, textAlign:'center'}}>
                Nhập nguyên liệu bạn muốn dùng để thay thế cho món còn thiếu:
            </Text>

            {/* List món thiếu */}
            <ScrollView showsVerticalScrollIndicator={false} style={{marginBottom: 20}}>
                {missingIngredientsList.map((ingItem, index) => {
                    const missingName = ingItem[0].name;
                    return (
                        <View key={index} style={{
                            marginBottom: 15,
                            backgroundColor: '#F7F8FA', // Nền xám nhẹ cho từng khối
                            borderRadius: 12,
                            padding: 12,
                            borderWidth: 1,
                            borderColor: '#EEE'
                        }}>
                            {/* Dòng hiển thị: Tên món thiếu */}
                            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                                <Image 
                                    source={{uri: 'https://cdn-icons-png.flaticon.com/512/1828/1828843.png'}} 
                                    style={{width: 18, height: 18, tintColor: '#FF4757', marginRight: 8}}
                                />
                                <Text style={{fontWeight: 'bold', color: '#FF4757', fontSize: 16}}>
                                    Thiếu: {missingName}
                                </Text>
                            </View>

                            {/* Dòng nhập liệu: Mũi tên -> Input */}
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <Text style={{fontSize: 20, color: '#999', marginRight: 10}}>↳</Text>
                                <TextInput 
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#FFF',
                                        borderWidth: 1,
                                        borderColor: '#DDD',
                                        borderRadius: 8,
                                        paddingHorizontal: 12,
                                        paddingVertical: 8,
                                        color: '#333',
                                        fontSize: 15
                                    }}
                                    placeholder={`Thay bằng... (VD: ${missingName} loại khác)`}
                                    placeholderTextColor="#BBB"
                                    value={substitutionNotes[missingName] || ""}
                                    onChangeText={(text) => handleInputChange(missingName, text)}
                                />
                            </View>
                        </View>
                    );
                })}
            </ScrollView>

            {/* Buttons */}
            <View style={{flexDirection: 'row', gap: 15, justifyContent: 'center'}}>
              <TouchableOpacity 
                onPress={() => setNoteModalVisible(false)}
                style={{
                    paddingVertical: 12, paddingHorizontal: 25, 
                    borderRadius: 12, backgroundColor: '#EEE', 
                    alignItems: 'center'
                }}
              >
                <Text style={{color: '#555', fontWeight: '600'}}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleSaveNotes}
                style={{
                    paddingVertical: 12, paddingHorizontal: 25, 
                    borderRadius: 12, backgroundColor: '#2cd18a', 
                    alignItems: 'center',
                    flexDirection: 'row'
                }}
              >
                <Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}