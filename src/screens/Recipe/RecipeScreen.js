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
  ActivityIndicator
} from "react-native";
import styles from "./styles";
import { useSharedValue } from 'react-native-reanimated';
import Carousel, { Pagination } from 'react-native-reanimated-carousel';

// --- IMPORT API MỚI ---
// Hãy đổi đường dẫn '../data/MockDataAPI' thành nơi bạn lưu file API mới (ví dụ FirestoreAPI)
import { getCategoryById, getAllIngredients } from "../../data/MockDataAPI"; 
import BackButton from "../../components/BackButton/BackButton";

const { width: viewportWidth, height: viewportHeight } = Dimensions.get("window");

export default function RecipeScreen(props) {
  const { navigation, route } = props;
  const item = route.params?.item; // Dữ liệu món ăn được truyền từ màn hình trước

  // --- STATES ---
  const [activeCategory, setActiveCategory] = useState(null);
  const [ingredientsData, setIngredientsData] = useState([]); // Chứa list [[Data, Qty], [Data, Qty]...]
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(true);
  const [isSaved, setIsSaved] = useState(false); 

  const slider1Ref = useRef(null);
  const progress = useSharedValue(0);

  // --- CONFIG HEADER (Nút Back & Save) ---
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

  // --- FETCH DATA TỪ FIRESTORE ---

  // 1. Lấy thông tin Category (Async)
  useEffect(() => {
    const fetchCategory = async () => {
      if (item.categoryId) {
        // Gọi hàm từ API mới
        const catData = await getCategoryById(item.categoryId);
        setActiveCategory(catData);
      }
    };
    fetchCategory();
  }, [item]);

  // 2. Lấy thông tin chi tiết Nguyên liệu (Async)
  // Đây là phần quan trọng nhất khớp với hàm getAllIngredients mới của bạn
  useEffect(() => {
    const fetchIngredients = async () => {
      setIsLoadingIngredients(true);
      
      // Kiểm tra xem món ăn có danh sách nguyên liệu không
      if (item.ingredients) {
        try {
            // Hàm getAllIngredients trong API mới của bạn trả về:
            // [[{name: 'Thịt', ...}, '200g'], [{name: 'Muối', ...}, '1 thìa']]
            const ingredientsDetail = await getAllIngredients(item.ingredients);
            setIngredientsData(ingredientsDetail);
        } catch (error) {
            console.error("Lỗi tải nguyên liệu:", error);
        }
      }
      
      setIsLoadingIngredients(false);
    };

    fetchIngredients();
  }, [item]);

  // --- HANDLERS ---
  
  const handleSaveRecipe = () => {
    setIsSaved(!isSaved);
    if (!isSaved) {
        Alert.alert("Đã lưu", "Món ăn đã được thêm vào danh sách yêu thích!");
    }
  };

  const handleStartCooking = () => {
    Alert.alert("Bắt đầu", "Chúc bạn nấu ăn thành công!");
  };

  const renderImage = ({ item }) => (
    <View style={styles.imageContainer}>
      <Image style={styles.image} source={{ uri: item }} resizeMode="cover" />
      <View style={styles.imageOverlay} />
    </View>
  );

  // Render từng dòng nguyên liệu
  const renderIngredientItem = (ingredientArr, index) => {
    // API mới trả về dạng mảng: [ObjectData, QuantityString]
    // Nên ta truy xuất bằng index 0 và 1
    const data = ingredientArr[0];    
    const quantity = ingredientArr[1]; 

    // Kiểm tra an toàn: Nếu data bị null (do lỗi ID bên firebase) thì không render
    if (!data) return null;

    return (
      <View key={index} style={styles.ingredientRow}>
        {/* Icon nguyên liệu */}
        <View style={styles.iconWrapper}>
            {data.photo_url ? (
                <Image source={{ uri: data.photo_url }} style={styles.ingredientIcon} />
            ) : (
                <Image 
                    source={{uri: 'https://cdn-icons-png.flaticon.com/512/446/446163.png'}} 
                    style={styles.checkIcon} 
                />
            )}
        </View>
        
        {/* Tên */}
        <Text style={styles.ingredientName}>{data.name}</Text>
        
        {/* Số lượng */}
        <Text style={styles.ingredientQuantity}>
            {quantity ? quantity : ""}
        </Text>
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
        {/* 1. CAROUSEL ẢNH */}
        <View style={styles.carouselWrapper}>
          <Carousel
            ref={slider1Ref}
            loop={false}
            width={viewportWidth}
            height={viewportHeight * 0.45}
            autoPlay={false}
            // Xử lý fallback nếu mảng ảnh bị null
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

        {/* 2. BODY INFO */}
        <View style={styles.infoRecipeContainer}>
          <View style={styles.indicatorBar} />
          <Text style={styles.recipeTitle}>{item.title}</Text>

          {/* META DATA: Category | Time | Servings */}
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

            {/* Thời gian */}
            <View style={styles.metaItem}>
              <Image source={require("../../../assets/icons/time.png")} style={styles.metaIcon} />
              <Text style={styles.metaText}>{item.time} phút</Text>
            </View>

            {/* Số người ăn */}
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

      {/* 3. STICKY FOOTER */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity style={styles.startCookingBtn} onPress={handleStartCooking}>
          <Text style={styles.startCookingText}>Bắt đầu nấu ngay</Text>
          <Image 
            source={{ uri: "https://cdn-icons-png.flaticon.com/512/2928/2928883.png" }} 
            style={styles.btnIcon}
          />
        </TouchableOpacity>
      </View>

    </View>
  );
}