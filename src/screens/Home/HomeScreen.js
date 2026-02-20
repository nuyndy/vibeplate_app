import React, { useLayoutEffect, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { 
  FlatList, View, ActivityIndicator, StyleSheet, RefreshControl, 
  Vibration, Text, Image, TouchableOpacity, Dimensions, Modal,
  Animated 
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

const WEATHER_API_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY;
let hasShownPantryAlertGlobal = false;

export default function HomeScreen({ navigation }) {
  const [displayedRecipes, setDisplayedRecipes] = useState([]); 
  const [masterRecipes, setMasterRecipes] = useState([]);      
  const [bannerData, setBannerData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [pantryItems, setPantryItems] = useState([]); 
  const [randomSuggestions, setRandomSuggestions] = useState([]);
  const [suggestionModalVisible, setSuggestionModalVisible] = useState(false);
  const [mood, setMood] = useState('neutral');
  const [greeting, setGreeting] = useState("Chào bạn");
  const [weatherData, setWeatherData] = useState({ temp: '--', city: 'Đang định vị...' });
  const [isShaking, setIsShaking] = useState(false);
  const [pantryAlertVisible, setPantryAlertVisible] = useState(false);

  // --- LOGIC HIỆU ỨNG NHẢY CỦA FAB AI (ANIMATION) ---
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -8, 
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0, 
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    bounce.start();
    return () => bounce.stop();
  }, []);

  useEffect(() => {
    const loadSavedMood = async () => {
      try {
        const savedMood = await AsyncStorage.getItem('user_current_mood');
        if (savedMood) setMood(savedMood);
      } catch (e) { console.log(e); }
    };
    loadSavedMood();
  }, []);

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
      setBannerData(fastShuffle(recipes || []).slice(0, 5));
      const hour = new Date().getHours();
      setGreeting(hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối");
      fetchWeather();
    } catch (e) { console.log(e); } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (masterRecipes.length === 0) return;
    if (mood === 'neutral') {
      setDisplayedRecipes(masterRecipes);
    } else {
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

  // --- LOGIC KIỂM TRA ĐỒ HẾT HẠN GẤP ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        const q = query(collection(db, "inventory"), where("email", "==", u.email));
        return onSnapshot(q, (snap) => {
          const allItems = snap.docs.map(doc => doc.data()) || [];
          setPantryItems(allItems.map(i => i.name)); 

          // Logic lọc đồ gấp: Cận hạn trong 3 ngày hoặc đã hết hạn
          const now = new Date();
          const limitDate = new Date();
          limitDate.setDate(now.getDate() + 3);

          const urgentItems = allItems.filter(item => {
            if (!item.expiryDate) return false;
            const expiry = item.expiryDate.toDate ? item.expiryDate.toDate() : new Date(item.expiryDate);
            return expiry <= limitDate;
          });

          // Chỉ hiện thông báo nếu có ít nhất 1 món gấp
          if (!hasShownPantryAlertGlobal && urgentItems.length > 0) {
            hasShownPantryAlertGlobal = true; 
            setTimeout(() => setPantryAlertVisible(true), 2000); 
          }
        });
      }
      setUser(null);
      setPantryItems([]);
    });
    return unsub;
  }, []);

  const handleMoodFilter = async (selectedMood) => {
    setMood(selectedMood); 
    try { await AsyncStorage.setItem('user_current_mood', selectedMood); } catch (e) {}
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
                {mood === 'neutral' ? "Thực đơn hôm nay" : `Danh sách các món gợi ý`}
              </Text>
            </View>
          </View>
        }
      />

      <Animated.View 
        style={[
          styles.fabWrapper, 
          { transform: [{ translateY }] }
        ]}
      >
        <TouchableOpacity 
          style={styles.fabChat} 
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Chat")}
        >
          <Image 
            source={require("../../../assets/avatarAI.jpg")} 
            style={styles.fabIcon} 
            resizeMode="cover"
          />
        </TouchableOpacity>
        <View style={styles.onlineBadge} />
      </Animated.View>

      <SuggestionModal 
        visible={suggestionModalVisible} 
        onClose={() => setSuggestionModalVisible(false)}
        suggestions={randomSuggestions} 
        onPressRecipe={(r) => { setSuggestionModalVisible(false); navigation.navigate("Recipe", { item: r }); }}
        pantryItems={pantryItems} 
        getIngredientName={getIngredientName} 
      />

      <Modal transparent visible={pantryAlertVisible} animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={styles.alertIconBg}><Text style={{fontSize: 32}}>⚠️</Text></View>
            <Text style={styles.alertTitle}>Cần xử lý gấp!</Text>
            <Text style={styles.alertMessage}>Bạn có thực phẩm sắp hết hạn hoặc đã quá hạn trong tủ lạnh.</Text>
            <TouchableOpacity 
                style={styles.alertBtnPrimary} 
                onPress={() => { setPantryAlertVisible(false); navigation.navigate("Pantry"); }}
            >
              <Text style={styles.alertBtnTextPrimary}>Kiểm tra ngay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 110 }, 
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: 15 },
  sectionTitleContainer: { paddingHorizontal: 18, marginTop: 25, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#1A1A1A' },
  gridItemContainer: { width: ITEM_WIDTH, marginBottom: 15, backgroundColor: 'white', borderRadius: 18, elevation: 2, overflow: 'hidden', borderWidth: 1, borderColor: '#F0F0F0' },
  gridImage: { width: '100%', height: ITEM_WIDTH },
  gridTextContainer: { padding: 10, alignItems: 'center' },
  gridTitle: { fontSize: 13, fontWeight: '700', textAlign: 'center', color: '#333' },
  fabWrapper: { position: 'absolute', bottom: 30, right: 25, width: 66, height: 66, zIndex: 999 },
  fabChat: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#FFF', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, overflow: 'hidden' },
  fabIcon: { width: '100%', height: '100%' },
  onlineBadge: { position: 'absolute', top: 1, right: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: '#4CAF50', borderWidth: 3, borderColor: '#FFF', zIndex: 1000 },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  alertBox: { width: width * 0.85, backgroundColor: 'white', borderRadius: 28, padding: 25, alignItems: 'center' },
  alertIconBg: { width: 80, height: 80, backgroundColor: '#FFF5F5', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  alertTitle: { fontSize: 22, fontWeight: '900', color: '#1A1A1A', marginBottom: 12 },
  alertMessage: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  alertBtnPrimary: { backgroundColor: '#000', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 15 },
  alertBtnTextPrimary: { color: 'white', fontWeight: '800' },
});