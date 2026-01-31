import React, { useLayoutEffect, useRef, useState, useEffect } from "react";
// 1. Thêm dòng này để dùng được View, Text, Alert...
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
  Dimensions 
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
  writeBatch // <--- Nhớ thêm cái này
} from "firebase/firestore";
import { useSharedValue } from 'react-native-reanimated';
import Carousel, { Pagination } from 'react-native-reanimated-carousel';

// --- API & COMPONENTS ---
import { getCategoryById, getAllIngredients } from "../../data/MockDataAPI"; 
import BackButton from "../../components/BackButton/BackButton";
import styles from "./styles"; // Import styles gốc (bạn có thể giữ file styles cũ)

// --- FIREBASE IMPORTS ---
import { auth, db } from '../../firebase/firebaseConfig';

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

  const slider1Ref = useRef(null);
  const progress = useSharedValue(0);

  // --- HELPER: Chuẩn hóa tên ---
  const normalizeName = (name) => {
    return name ? name.toLowerCase().trim() : "";
  };

  // --- 1. FETCH DATA (MÓN ĂN & DANH MỤC) ---
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

  // --- 2. FETCH DATA KHO BẾP ---
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

  // --- 3. CHECK FAVORITE STATUS (FIREBASE) ---
  useEffect(() => {
    const checkFavoriteStatus = async () => {
        const user = auth.currentUser;
        if (!user) return;
        
        // ID document là sự kết hợp giữa userId và recipeId để đảm bảo duy nhất
        const docId = `${user.uid}_${item.recipeId}`;
        const docRef = doc(db, "favorites", docId);
        
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setIsSaved(true);
            } else {
                setIsSaved(false);
            }
        } catch (error) {
            console.log("Error checking favorite:", error);
        }
    };
    checkFavoriteStatus();
  }, [item.recipeId]);

  // --- HÀM XỬ LÝ LƯU YÊU THÍCH (FIREBASE) ---
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
            // Nếu đang lưu -> Xóa khỏi favorites
            await deleteDoc(docRef);
            setIsSaved(false);
            // Alert.alert("Đã bỏ lưu", "Đã xóa khỏi danh sách yêu thích.");
        } else {
            // Nếu chưa lưu -> Thêm vào favorites
            const favoriteData = {
                recipeId: item.recipeId, // ID món ăn
                title: item.title,
                photo_url: item.photo_url,
                time: item.time,
                servings: item.servings,
                categoryId: item.categoryId,
                userId: user.uid, // Lưu thêm userId để lọc nếu cần
                addedAt: serverTimestamp() // Thời gian thêm
            };
            await setDoc(docRef, favoriteData);
            setIsSaved(true);
            Alert.alert("Đã lưu", "Đã thêm vào danh sách món ăn yêu thích!");
        }
    } catch (error) {
        console.error("Lỗi lưu yêu thích:", error);
        Alert.alert("Lỗi", "Không thể cập nhật danh sách yêu thích.");
    }
  };

  // --- CONFIG HEADER ---
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
                    ? 'https://cdn-icons-png.flaticon.com/512/833/833472.png' // Tim đỏ
                    : 'https://cdn-icons-png.flaticon.com/512/1077/1077035.png' // Tim trắng
                }} 
                style={[styles.saveIcon, isSaved ? { tintColor: '#FF4757' } : { tintColor: '#FFF' }]} 
            />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isSaved, item]); // Thêm dependencies item

  // --- HÀM KIỂM TRA NGUYÊN LIỆU ---
  const checkIngredientAvailable = (recipeIngName, pantryList) => {
    const normalizedRecipeName = normalizeName(recipeIngName);
    return pantryList.some(pantryItem => {
        const normalizedPantryName = normalizeName(pantryItem.name);
        return normalizedPantryName.includes(normalizedRecipeName) || 
               normalizedRecipeName.includes(normalizedPantryName);
    });
  };

 // --- HÀM HELPER: Tách chuỗi định lượng (VD: "300g" -> sl: 300, đv: g) ---
  const parseQuantity = (quantityString) => {
    if (!quantityString) return { qty: 1, unit: 'cái' };

    // Regex tìm số ở đầu chuỗi (hỗ trợ số thập phân dấu chấm hoặc phẩy)
    // VD: "300 g", "1.5 kg", "1,2 lit"
    const regex = /^(\d+(?:[.,]\d+)?)\s*(.*)$/;
    const match = quantityString.toString().trim().match(regex);

    if (match) {
      return {
        // Chuyển dấu phẩy thành chấm để ép kiểu số chuẩn
        qty: parseFloat(match[1].replace(',', '.')), 
        // Phần còn lại là đơn vị (bỏ khoảng trắng thừa)
        unit: match[2].trim() || 'cái' 
      };
    }
    
    // Trường hợp không tìm thấy số (VD: "Một ít", "Vừa đủ")
    // Thì giữ nguyên chuỗi đó làm đơn vị, số lượng để là 1
    return { qty: 1, unit: quantityString };
  };

  // Đừng quên import writeBatch và collection ở trên cùng file RecipeScreen.js nhé:
// import { ..., writeBatch, collection, doc } from "firebase/firestore";

const addToShoppingList = async (missingItems) => {
    const user = auth.currentUser;
    if (!user) {
        Alert.alert("Lỗi", "Bạn cần đăng nhập để dùng tính năng này");
        return;
    }

    try {
        // 1. Khởi tạo một batch (lô hàng) để gửi đi một lần
        const batch = writeBatch(db);

        missingItems.forEach((item, index) => {
            // item[1] chứa chuỗi định lượng (VD: "300g")
            const rawQuantity = item[1];
            
            // Tách số lượng và đơn vị
            const { qty, unit } = parseQuantity(rawQuantity);

            // 2. Tạo reference cho document mới (tự sinh ID)
            // Lưu ý: collection phải đúng tên là 'shoppingList' như bên file kia
            const newDocRef = doc(collection(db, "shoppingList"));

            // 3. Chuẩn bị dữ liệu y hệt cấu trúc bên ShoppingListScreen.js
            const newItemData = {
                email: user.email,       // Quan trọng: để lọc đúng user
                userId: user.email,      // Thêm trường này nếu bên kia query theo 'userId'
                name: item[0].name,      // Tên nguyên liệu
                quantity: qty,           // Số lượng (số)
                unit: unit,              // Đơn vị (chuỗi)
                status: 'pending',       // Trạng thái mặc định
                updatedAt: new Date()    // Thời gian
            };

            // 4. Thêm lệnh tạo document vào batch
            batch.set(newDocRef, newItemData);
        });

        // 5. Gửi toàn bộ dữ liệu đi (Commit)
        await batch.commit();

        Alert.alert("Thành công", `Đã thêm ${missingItems.length} món vào giỏ đi chợ!`);
        
    } catch (error) {
        console.error("Lỗi thêm giỏ hàng:", error);
        Alert.alert("Lỗi", "Không thể thêm vào giỏ hàng lúc này.");
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
      // Có thể navigate sang màn hình hướng dẫn từng bước nếu có
    } else {
      const missingNames = missingIngredients.map(ing => ing[0].name).join(", ");
      
      Alert.alert(
        "Thiếu nguyên liệu", 
        `Bạn đang thiếu: ${missingNames}.\nBạn muốn xử lý thế nào?`,
        [
          { 
              text: "Hủy", 
              style: "cancel",
              onPress: () => console.log("Đã hủy")
          },
          {
            text: "Tiếp tục nấu",
            onPress: () => {
                Alert.alert("Bắt đầu!", "Chúc bạn nấu ăn ngon miệng dù thiếu chút nguyên liệu! 🔥");
                // Navigate logic here
            }
          },
          {
            text: "Thêm vào giỏ",
            onPress: () => addToShoppingList(missingIngredients) 
          }
        ]
      );
    }
  };

  const renderImage = ({ item }) => (
    <View style={styles.imageContainer}>
      <Image style={styles.image} source={{ uri: item }} resizeMode="cover" />
      <View style={styles.imageOverlay} />
    </View>
  );

  // --- RENDER NGUYÊN LIỆU HÌNH TRÒN (Horizontal Item) ---
  const renderHorizontalIngredient = (ingredientArr, index) => {
    const data = ingredientArr[0]; 
    const quantity = ingredientArr[1]; 
    
    if (!data) return null;

    const isAvailable = checkIngredientAvailable(data.name, pantryData);

    return (
        <TouchableOpacity 
            key={index} 
            style={customStyles.ingredientItemContainer}
            onPress={() => navigation.navigate("Ingredient", { ingredient: data })}
        >
            {/* Vòng tròn ảnh: Nền TRẮNG hoàn toàn */}
            <View style={[
                customStyles.ingredientCircle, 
                // Sử dụng viền đen dày hơn một chút nếu có sẵn thay vì dùng màu xanh
                isAvailable ? { borderColor: '#000', borderWidth: 1.5 } : { borderColor: '#F0F0F0', borderWidth: 1 }
            ]}>
                {data.photo_url ? (
                    <Image source={{ uri: data.photo_url }} style={customStyles.ingredientImage} />
                ) : (
                    <Image 
                        source={{uri: 'https://cdn-icons-png.flaticon.com/512/706/706164.png'}} 
                        style={[customStyles.ingredientImage, { tintColor: '#EEE' }]} 
                    />
                )}
                
                {/* Badge trạng thái: Đen trắng */}
                {isAvailable && (
                    <View style={customStyles.statusBadge}>
                         <Image 
                            source={{uri: 'https://cdn-icons-png.flaticon.com/512/190/190411.png'}} 
                            style={{width: 10, height: 10, tintColor: '#FFF'}} 
                         />
                    </View>
                )}
            </View>

            <Text style={[customStyles.ingredientNameText, isAvailable && { fontWeight: '800' }]} numberOfLines={2}>
                {data.name}
            </Text>
            
            <Text style={customStyles.ingredientQtyText}>
                {quantity}
            </Text>
        </TouchableOpacity>
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

          {/* LIST NGUYÊN LIỆU (HORIZONTAL SCROLL) */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Nguyên liệu cần thiết</Text>
            
            {isLoadingIngredients ? (
                <ActivityIndicator size="small" color="#ff9800" style={{marginTop: 20}} />
            ) : ingredientsData.length === 0 ? (
                <Text style={{ fontStyle: 'italic', color: '#999', marginTop: 10 }}>Chưa có thông tin nguyên liệu</Text>
            ) : (
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 10, paddingRight: 20 }}
                >
                    {ingredientsData.map((ing, index) => renderHorizontalIngredient(ing, index))}
                </ScrollView>
            )}
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
        </TouchableOpacity>
      </View>

    </View>
  );
}

// --- STYLE BỔ SUNG CHO NGUYÊN LIỆU TRÒN ---
const customStyles = StyleSheet.create({
    ingredientItemContainer: {
        alignItems: 'center',
        marginRight: 20, // Khoảng cách giữa các vòng tròn
        width: 70, 
    },
    ingredientCircle: {
        width: 65,
        height: 65,
        borderRadius: 32.5, // Bo tròn tuyệt đối
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        // Shadow nhẹ cho đẹp
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    ingredientImage: {
        width: 35,
        height: 35,
        resizeMode: 'contain',
    },
    ingredientNameText: {
        fontSize: 12,
        color: '#333',
        textAlign: 'center',
        fontWeight: '500',
        height: 32, // Giới hạn chiều cao text để thẳng hàng
    },
    ingredientQtyText: {
        fontSize: 11,
        color: '#888',
        marginTop: 2
    },
    statusBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#32ba7c',
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'white'
    }
});