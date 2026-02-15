import React, { useLayoutEffect, useState, useEffect, useCallback, useMemo } from "react";
import { 
  FlatList, View, ActivityIndicator, StyleSheet, RefreshControl, 
  Vibration, Text, Image, TouchableOpacity, Dimensions 
} from "react-native";
import { Accelerometer } from 'expo-sensors'; 
import { getAllRecipes, getIngredientName } from "../../data/MockDataAPI"; 
import { auth, db } from '../../firebase/firebaseConfig';
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

import MenuImage from "../../components/MenuImage/MenuImage";
import HeaderSection from "./HeaderSection";
import SuggestionModal from "./SuggestionModal";

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 40) / 2; 

const WEATHER_API_KEY = '30c5dcb9ceb5311e00ff1de538706272';
const OPENROUTER_API_KEY = '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';

export default function HomeScreen({ navigation }) {
  const [displayedRecipes, setDisplayedRecipes] = useState([]); 
  const [masterRecipes, setMasterRecipes] = useState([]);      
  const [bannerData, setBannerData] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [user, setUser] = useState(null);
  const [pantryItems, setPantryItems] = useState([]); 
  const [randomSuggestions, setRandomSuggestions] = useState([]);
  const [suggestionModalVisible, setSuggestionModalVisible] = useState(false);
  
  const [mood, setMood] = useState('neutral');
  const [greeting, setGreeting] = useState("Chào bạn");
  const [weatherData, setWeatherData] = useState({ temp: '--', city: 'Đang định vị...' });
  const [isShaking, setIsShaking] = useState(false);
  useEffect(() => {
    const loadSavedMood = async () => {
      try {
        const savedMood = await AsyncStorage.getItem('user_current_mood');
        if (savedMood) setMood(savedMood);
      } catch (e) { console.log("Lỗi load mood:", e); }
    };
    loadSavedMood();
  }, []);

  // --- INDEXING DATA ---
  const indexedRecipes = useMemo(() => {
    const index = { happy: [], sad: [], tired: [], hungry: [] };
    const keywords = {
      sad: ["bánh", "kem", "chè", "ngọt", "trà sữa", "socola", "snack"],
      happy: ["lẩu", "nướng", "pizza", "gà", "bia", "tiệc", "steak", "sườn"],
      tired: ["cháo", "súp", "canh", "phở", "mì", "thanh đạm", "yến", "nước"],
      hungry: ["cơm", "thịt", "bún", "bò", "gà", "kho", "xào", "nội tạng"]
    };

    masterRecipes.forEach(r => {
      const title = r.title.toLowerCase();
      if (keywords.sad.some(k => title.includes(k))) index.sad.push(r);
      if (keywords.happy.some(k => title.includes(k))) index.happy.push(r);
      if (keywords.tired.some(k => title.includes(k))) index.tired.push(r);
      if (keywords.hungry.some(k => title.includes(k))) index.hungry.push(r);
    });
    return index;
  }, [masterRecipes]);

  const fastShuffle = (array) => {
    let arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'TRANG CHỦ',
      headerTitleStyle: { fontWeight: '900', letterSpacing: 1, fontSize: 13 },
      headerLeft: () => <MenuImage onPress={() => navigation.openDrawer()} />,
    });
  }, [navigation]);

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const recipes = await getAllRecipes();
      setMasterRecipes(recipes || []);
      // Không setDisplayedRecipes trực tiếp ở đây nữa, để useEffect xử lý theo mood
      setBannerData(fastShuffle(recipes || []).slice(0, 5));
      
      const hour = new Date().getHours();
      setGreeting(hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối");
      fetchWeather();
    } catch (e) { console.log(e); } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // --- LOGIC QUAN TRỌNG: TỰ ĐỘNG LỌC KHI DATA HOẶC MOOD THAY ĐỔI ---
  useEffect(() => {
    if (masterRecipes.length === 0) return;

    if (mood === 'neutral') {
      setDisplayedRecipes(masterRecipes);
    } else {
      // Tự động áp dụng bộ lọc từ Index ngay cả khi vừa tải lại data
      const filtered = indexedRecipes[mood] || [];
      setDisplayedRecipes(filtered.length > 0 ? filtered : masterRecipes);
    }
  }, [masterRecipes, mood, indexedRecipes]);

  const fetchWeather = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${loc.coords.latitude}&lon=${loc.coords.longitude}&units=metric&lang=vi&appid=${WEATHER_API_KEY}`);
      const data = await res.json();
      if (data?.main) setWeatherData({ temp: Math.round(data.main.temp), city: data.name });
    } catch (e) {}
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        const q = query(collection(db, "inventory"), where("email", "==", u.email));
        return onSnapshot(q, (snap) => {
          setPantryItems(snap.docs.map(doc => doc.data().name) || []);
        });
      }
      setUser(null);
      setPantryItems([]);
    });
    return unsub;
  }, []);

  const handleMoodFilter = async (selectedMood) => {
    setMood(selectedMood); // Khi đổi mood, useEffect ở trên sẽ tự chạy lọc Offline trước
    
    try {
        await AsyncStorage.setItem('user_current_mood', selectedMood);
    } catch (e) { console.log("Lỗi lưu mood:", e); }

    if (selectedMood === 'neutral') return;

    // AI thẩm định chuyên sâu (chạy ngầm)
    setIsLoadingAI(true);
    const preFiltered = indexedRecipes[selectedMood] || [];
    const titlesForAI = preFiltered.slice(0, 12).map(r => r.title).join(", ");
    
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "google/gemma-2-9b-it:free",
          messages: [{ role: "user", content: `JSON: { "recipes": ["Tên"] }. Chọn từ: [${titlesForAI}]` }]
        })
      });
      const data = await response.json();
      const res = data?.choices?.[0]?.message?.content;
      
      if (res) {
        const cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanJson);
        const aiRecipes = parsedData.recipes || [];

        if (aiRecipes.length > 0) {
          const finalFilter = masterRecipes.filter(r => 
            aiRecipes.some(aiName => r.title.toLowerCase().includes(aiName.toLowerCase().trim()))
          );
          if (finalFilter.length > 0) setDisplayedRecipes(finalFilter);
        }
      }
    } catch (e) { console.log("AI Offline fallback used"); }
    setIsLoadingAI(false);
  };

  const handleShakeAI = useCallback(() => {
    if (isShaking || masterRecipes.length === 0) return;
    setIsShaking(true);
    Vibration.vibrate(100);
    setRandomSuggestions(fastShuffle(masterRecipes).slice(0, 3));
    setSuggestionModalVisible(true);
    setTimeout(() => setIsShaking(false), 2000);
  }, [isShaking, masterRecipes]);

  useEffect(() => {
    let sub;
    Accelerometer.isAvailableAsync().then(avail => {
      if (avail) {
        sub = Accelerometer.addListener(data => {
          const acc = Math.sqrt(data.x**2 + data.y**2 + data.z**2);
          if (acc > 2.8) handleShakeAI();
        });
      }
    });
    return () => sub && sub.remove();
  }, [handleShakeAI]);

  const renderGridItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.gridItemContainer} 
      onPress={() => navigation.navigate("Recipe", { item })}
    >
      <Image source={{ uri: item.photo_url }} style={styles.gridImage} />
      <View style={styles.gridTextContainer}>
        <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#000000" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: '#f9f9f9' }}>
      {isLoadingAI && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#000000" />
          <Text style={styles.loadingText}>Đang tìm kiếm...</Text>
        </View>
      )}

      <FlatList
        data={displayedRecipes}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderGridItem}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={fetchData} />}
        ListHeaderComponent={
          <View>
            <HeaderSection 
              bannerData={bannerData} 
              mood={mood} 
              setMood={handleMoodFilter} 
              weatherData={weatherData} 
              greeting={greeting} 
              user={user}
              onPressRecipe={(r) => navigation.navigate("Recipe", { item: r })} 
              onOpenSuggestion={() => {
                setRandomSuggestions(fastShuffle(masterRecipes).slice(0, 3));
                setSuggestionModalVisible(true);
              }}
            />
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>
                {mood === 'neutral' ? "Thực đơn hôm nay" : `Tìm thấy ${displayedRecipes.length} món dành cho bạn`}
              </Text>
            </View>
          </View>
        }
      />

      <SuggestionModal 
        visible={suggestionModalVisible} 
        onClose={() => setSuggestionModalVisible(false)}
        suggestions={randomSuggestions} 
        onPressRecipe={(r) => { setSuggestionModalVisible(false); navigation.navigate("Recipe", { item: r }); }}
        pantryItems={pantryItems} 
        getIngredientName={getIngredientName} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingOverlay: {
    position: 'absolute', top: 120, alignSelf: 'center', backgroundColor: 'white',
    paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, zIndex: 99, 
    flexDirection: 'row', alignItems: 'center', elevation: 4, borderWidth: 1, borderColor: '#eee'
  },
  loadingText: { marginLeft: 10, fontSize: 12, fontWeight: '600' },
  listContent: { paddingBottom: 20 },
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: 15 },
  sectionTitleContainer: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 18, marginTop: 25, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#1A1A1A' },
  recipeCount: { fontSize: 14, color: '#838383', fontWeight: 'bold', marginLeft: 6 },
  gridItemContainer: { width: ITEM_WIDTH, marginBottom: 15, backgroundColor: 'white', borderRadius: 18, elevation: 2, overflow: 'hidden', borderWidth: 1, borderColor: '#F0F0F0' },
  gridImage: { width: '100%', height: ITEM_WIDTH },
  gridTextContainer: { padding: 10, alignItems: 'center' },
  gridTitle: { fontSize: 13, fontWeight: '700', textAlign: 'center', color: '#333' }
});