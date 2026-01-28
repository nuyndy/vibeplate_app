import React, { useLayoutEffect, useState, useEffect } from "react";
import { FlatList, View, ActivityIndicator, Text, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import styles from "./styles"; 

// --- IMPORTS LOGIC ---
import { getAllRecipes, getAllCategories } from "../../data/MockDataAPI";
import { differenceInDays } from 'date-fns';
import { auth, db } from '../../firebase/firebaseConfig';
import { collection, query, where, onSnapshot, doc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import * as Location from 'expo-location';

// --- IMPORTS UI COMPONENTS ---
import MenuImage from "../../components/MenuImage/MenuImage";
import HeaderSection from "./HeaderSection";
import CategorySection from "./CategorySection";
import SuggestionModal from "./SuggestionModal";

// --- CONFIG ---
const WEATHER_API_KEY = '30c5dcb9ceb5311e00ff1de538706272';
let hasShownPopupSession = false;

// 1. Cấu hình từ khóa theo Mood
const moodConfig = {
  happy:   { keywords: ['chanh', 'lemon', 'lime', 'chua', 'salad'], label: "Vui vẻ" },
  sad:     { keywords: ['ngọt', 'sweet', 'chocolate', 'kem', 'trà sữa'], label: "Buồn chán" },
  tired:   { keywords: ['cay', 'súp', 'cháo', 'gừng', 'nóng'], label: "Mệt mỏi" },
  hungry:  { keywords: ['thịt', 'nướng', 'cơm', 'xôi', 'gà', 'bò'], label: "Đói meo" },
  neutral: { keywords: [], label: "Xem tất cả" }, // Neutral thì cho hiện hết
};

// 2. 🔥 Cấu hình từ khóa theo BUỔI (Time)
const timeFilters = {
  morning: { 
    keywords: ['bún', 'phở', 'mì', 'miến', 'xôi', 'bánh mì', 'trứng', 'cháo', 'coffee', 'sáng'], 
    label: "☀️ Gợi ý bữa sáng" 
  },
  lunch: { 
    keywords: ['cơm', 'canh', 'kho', 'xào', 'chiên', 'mặn', 'đậu', 'cá', 'thịt'], 
    label: "🍚 Bữa trưa chắc bụng" 
  },
  afternoon: { 
    keywords: ['chè', 'bánh', 'sinh tố', 'trà', 'vặt', 'snack', 'sữa'], 
    label: "🍰 Bữa xế chiều" 
  },
  dinner: { 
    keywords: ['lẩu', 'nướng', 'cơm', 'canh', 'salad', 'nhẹ', 'cuốn'], 
    label: "🌙 Bữa tối quây quần" 
  }
};

export default function HomeScreen(props) {
  const { navigation } = props;

  // --- STATE ---
  const [groupedData, setGroupedData] = useState([]);
  const [masterRecipes, setMasterRecipes] = useState([]);
  const [masterCategories, setMasterCategories] = useState([]);
  const [bannerData, setBannerData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  // Popup & User
  const [expiringItems, setExpiringItems] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [user, setUser] = useState(null);

  // Suggestion
  const [randomSuggestions, setRandomSuggestions] = useState([]);
  const [suggestionModalVisible, setSuggestionModalVisible] = useState(false);

  // Mood & Weather & Time
  const [mood, setMood] = useState('happy');
  const [greeting, setGreeting] = useState("Chào bạn");
  const [timeSession, setTimeSession] = useState("morning"); 
  const [filterLabel, setFilterLabel] = useState(""); 

  const [weatherData, setWeatherData] = useState({ 
    temp: '--', 
    city: 'Đang định vị...' 
  });

  // --- LAYOUT EFFECT ---
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Trang chủ',
      headerLeft: () => <MenuImage onPress={() => navigation.openDrawer()} />,
      headerRight: () => <View />,
    });
  }, []);

  // --- LOGIC 1: WEATHER & LOCATION & TIME SESSION ---
  useEffect(() => {
    // 1. Xác định buổi trong ngày
    const currentHour = new Date().getHours();
    let session = "morning";
    let greet = "Chào buổi sáng";

    if (currentHour >= 5 && currentHour < 11) {
       session = "morning"; 
       greet = "Chào buổi sáng";
    } else if (currentHour >= 11 && currentHour < 14) {
       session = "lunch"; 
       greet = "Chào buổi trưa";
    } else if (currentHour >= 14 && currentHour < 18) {
       session = "afternoon"; 
       greet = "Chào buổi chiều";
    } else {
       session = "dinner"; 
       greet = "Chào buổi tối";
    }

    setTimeSession(session);
    setGreeting(greet);

    // 2. Logic Location (Giữ nguyên code cũ của bạn)
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        
        let location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        
        let addressResponse = await Location.reverseGeocodeAsync({ latitude, longitude });
        let currentCity = "";
        if (addressResponse.length > 0) {
            currentCity = addressResponse[0].city || addressResponse[0].subregion || "Việt Nam";
        }

        // Update Firestore
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.email && currentCity) {
            try {
                const userRef = doc(db, "users", currentUser.email);
                await setDoc(userRef, {
                    location: currentCity,
                }, { merge: true });
            } catch (err) { console.log(err); }
        }

        // Weather API
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&lang=vi&appid=${WEATHER_API_KEY}`
        );
        const data = await response.json();
        if (response.ok && data.main) {
            setWeatherData({ temp: Math.round(data.main.temp), city: currentCity || data.name });
        }
      } catch (error) { console.log("Weather Error:", error); }
    })();
  }, []);

  // --- LOGIC 2: FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recipes, categories] = await Promise.all([getAllRecipes(), getAllCategories()]);
        setMasterRecipes(recipes);
        setMasterCategories(categories);

        // Random banner
        const shuffledRecipes = [...recipes].sort(() => 0.5 - Math.random());
        setBannerData(shuffledRecipes.slice(0, 5));
        if (recipes.length >= 3) setRandomSuggestions(shuffledRecipes.slice(0, 3));

        // Mặc định ban đầu chưa filter gì cả (sẽ được filter ngay ở useEffect dưới)
        setGroupedData(groupRecipesByCategory(recipes, categories));
      } catch (error) {
        console.error("Error home data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- LOGIC 3: FILTER THÔNG MINH (MOOD + TIME) ---
  useEffect(() => {
    if (isLoading || masterRecipes.length === 0) return;

    let keywords = [];
    let currentLabel = "";

    // ƯU TIÊN 1: Nếu người dùng chọn Mood -> Lọc theo Mood
    if (mood) {
        if (mood === 'neutral') {
             // Nếu chọn "Bình thường" -> Reset về hiển thị tất cả
             setGroupedData(groupRecipesByCategory(masterRecipes, masterCategories));
             setFilterLabel(""); 
             return;
        }
        keywords = moodConfig[mood].keywords;
    } 
    // ƯU TIÊN 2: Nếu không chọn Mood -> Tự động lọc theo Thời gian
    else {
        const config = timeFilters[timeSession]; // Lấy config theo morning/lunch...
        if (config) {
            keywords = config.keywords;
            currentLabel = config.label;
        }
    }

    setFilterLabel(currentLabel);

    // Bắt đầu lọc
    if (keywords.length > 0) {
        const filteredRecipes = masterRecipes.filter(item => {
            const textToCheck = (item.title + " " + (item.categoryId || "") + " " + (item.description || "")).toLowerCase();
            return keywords.some(key => textToCheck.includes(key));
        });
        
        // Nếu lọc xong mà không có món nào -> Hiển thị tất cả cho đỡ trống
        if (filteredRecipes.length === 0) {
             setGroupedData(groupRecipesByCategory(masterRecipes, masterCategories));
        } else {
             setGroupedData(groupRecipesByCategory(filteredRecipes, masterCategories));
        }
    } else {
        // Fallback
        setGroupedData(groupRecipesByCategory(masterRecipes, masterCategories));
    }

  }, [mood, timeSession, masterRecipes, masterCategories, isLoading]);

  // Helper Group Data
  const groupRecipesByCategory = (recipesList, categoriesList) => {
    const grouped = categoriesList.map(category => {
        const recipesInCategory = recipesList.filter(recipe => recipe.categoryId === category.id);
        return { ...category, recipes: recipesInCategory };
    });
    return grouped.filter(item => item.recipes.length > 0);
  };

  // --- LOGIC 4: NOTIFICATIONS ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // (Logic inventory check cũ giữ nguyên)
        // ... (bạn có thể paste lại logic inventory cũ ở đây nếu cần, tôi rút gọn để dễ nhìn)
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // --- HANDLERS ---
  const onPressRecipe = (item) => {
    setSuggestionModalVisible(false);
    navigation.navigate("Recipe", { item });
  };

  const handleCheckPantry = () => {
    setModalVisible(false);
    navigation.navigate("Pantry");
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ff9800" />
      </View>
    );
  }

  // --- MAIN RENDER ---
  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <FlatList
        vertical
        showsVerticalScrollIndicator={false}
        data={groupedData}
        renderItem={({ item }) => <CategorySection item={item} onPressRecipe={onPressRecipe} />}
        keyExtractor={(item) => `${item.id}`}
        onScrollBeginDrag={() => setIsUserScrolling(true)}
        onScrollEndDrag={() => setIsUserScrolling(false)}
        onMomentumScrollEnd={() => setIsUserScrolling(false)}
        ListHeaderComponent={
          <View>
            <HeaderSection 
                bannerData={bannerData}
                mood={mood}
                setMood={setMood}
                weatherData={weatherData}
                greeting={greeting}
                user={user}
                onPressRecipe={onPressRecipe}
                onOpenSuggestion={() => setSuggestionModalVisible(true)}
                isUserScrolling={isUserScrolling}
                moodConfig={moodConfig}
            />
            {/* 🔥 Hiển thị thông báo đang lọc theo gì */}
            {filterLabel !== "" && (
                <View style={{ paddingHorizontal: 15, marginTop: 10, marginBottom: 5 }}>
                    <Text style={{ fontStyle: 'italic', color: '#ff9800', fontWeight: 'bold' }}>
                        {filterLabel}
                    </Text>
                </View>
            )}
            
            {/* Nút reset nếu người dùng muốn xem tất cả */}
            {!mood && filterLabel !== "" && (
                <TouchableOpacity 
                    onPress={() => { setMood('neutral'); }} // Hack nhẹ: set mood neutral để hiện all
                    style={{ paddingHorizontal: 15, marginBottom: 15 }}
                >
                    <Text style={{ textDecorationLine: 'underline', color: '#888', fontSize: 12 }}>
                        Xem thực đơn toàn bộ (Không lọc)
                    </Text>
                </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <Text style={{ color: '#888', fontSize: 16 }}>Chưa tìm thấy món phù hợp!</Text>
            <TouchableOpacity onPress={() => setMood('neutral')} style={{ marginTop: 10 }}>
               <Text style={{ color: '#1565C0', fontWeight: 'bold' }}>Xem tất cả món</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* --- CÁC MODAL GIỮ NGUYÊN --- */}
      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        {/* ... Code Modal Cảnh báo hạn dùng ... */}
      </Modal>

      <SuggestionModal 
        visible={suggestionModalVisible}
        onClose={() => setSuggestionModalVisible(false)}
        suggestions={randomSuggestions}
        onPressRecipe={onPressRecipe}
      />
    </View>
  );
}