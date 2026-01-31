import React, { useLayoutEffect, useState, useEffect } from "react";
import { 
  FlatList, View, ActivityIndicator, Text, TouchableOpacity, Modal, StyleSheet
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { getAllRecipes, getAllCategories } from "../../data/MockDataAPI";
import { differenceInDays, startOfDay } from 'date-fns'; // Thêm startOfDay để chuẩn hóa
import { auth, db } from '../../firebase/firebaseConfig';
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import * as Location from 'expo-location';

import MenuImage from "../../components/MenuImage/MenuImage";
import HeaderSection from "./HeaderSection";
import CategorySection from "./CategorySection";
import SuggestionModal from "./SuggestionModal";

const WEATHER_API_KEY = '30c5dcb9ceb5311e00ff1de538706272';
let hasShownPopupSession = false; 

const moodConfig = {
  happy:   { keywords: ['chanh', 'lemon', 'lime', 'chua', 'salad'], label: "Vui vẻ" },
  sad:     { keywords: ['ngọt', 'sweet', 'chocolate', 'kem', 'trà sữa'], label: "Buồn chán" },
  tired:   { keywords: ['cay', 'súp', 'cháo', 'gừng', 'nóng'], label: "Mệt mỏi" },
  hungry:  { keywords: ['thịt', 'nướng', 'cơm', 'xôi', 'gà', 'bò'], label: "Đói meo" },
  neutral: { keywords: [], label: "Xem tất cả" },
};

const timeFilters = {
  morning:   { keywords: ['bún', 'phở', 'mì', 'xôi', 'bánh mì', 'trứng'], label: "☀️ Gợi ý bữa sáng" },
  lunch:     { keywords: ['cơm', 'canh', 'kho', 'xào', 'chiên', 'mặn'], label: "🍚 Bữa trưa chắc bụng" },
  afternoon: { keywords: ['chè', 'bánh', 'sinh tố', 'trà', 'vặt'], label: "🍰 Bữa xế chiều" },
  dinner:    { keywords: ['lẩu', 'nướng', 'canh', 'salad', 'nhẹ'], label: "🌙 Bữa tối quây quần" }
};

export default function HomeScreen(props) {
  const { navigation } = props;
  const [groupedData, setGroupedData] = useState([]);
  const [masterRecipes, setMasterRecipes] = useState([]);
  const [masterCategories, setMasterCategories] = useState([]);
  const [bannerData, setBannerData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  const [user, setUser] = useState(null);
  const [expiringItems, setExpiringItems] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  const [randomSuggestions, setRandomSuggestions] = useState([]);
  const [suggestionModalVisible, setSuggestionModalVisible] = useState(false);
  const [mood, setMood] = useState('happy');
  const [greeting, setGreeting] = useState("Chào bạn");
  const [timeSession, setTimeSession] = useState("morning"); 
  const [filterLabel, setFilterLabel] = useState(""); 
  const [weatherData, setWeatherData] = useState({ temp: '--', city: 'Đang định vị...' });

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'TRANG CHỦ',
      headerTitleStyle: { fontWeight: '900', letterSpacing: 1, fontSize: 14 },
      headerLeft: () => <MenuImage onPress={() => navigation.openDrawer()} />,
      headerRight: () => <View style={{ marginRight: 15 }} />,
      headerStyle: { elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }
    });
  }, []);

  // --- LOGIC 1: WEATHER & TIME ---
  useEffect(() => {
    const currentHour = new Date().getHours();
    let session = "morning";
    let greet = "Chào buổi sáng";
    if (currentHour >= 5 && currentHour < 11) session = "morning";
    else if (currentHour >= 11 && currentHour < 14) session = "lunch";
    else if (currentHour >= 14 && currentHour < 18) session = "afternoon";
    else { session = "dinner"; greet = "Chào buổi tối"; }
    setTimeSession(session);
    setGreeting(greet);

    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        let location = await Location.getCurrentPositionAsync({});
        let address = await Location.reverseGeocodeAsync(location.coords);
        let currentCity = address[0]?.city || address[0]?.subregion || "Việt Nam";
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${location.coords.latitude}&lon=${location.coords.longitude}&units=metric&lang=vi&appid=${WEATHER_API_KEY}`);
        const data = await res.json();
        if (data.main) setWeatherData({ temp: Math.round(data.main.temp), city: currentCity });
      } catch (e) { console.log(e); }
    })();
  }, []);

  // --- LOGIC 2: DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recipes, categories] = await Promise.all([getAllRecipes(), getAllCategories()]);
        setMasterRecipes(recipes);
        setMasterCategories(categories);
        setBannerData([...recipes].sort(() => 0.5 - Math.random()).slice(0, 5));
        setRandomSuggestions([...recipes].sort(() => 0.5 - Math.random()).slice(0, 3));
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };
    fetchData();
  }, []);

  // --- LOGIC 3: FIX CẢNH BÁO HẠN DÙNG ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Kiểm tra đồ hết hạn
        const q = query(collection(db, "inventory"), where("email", "==", currentUser.email));
        const unsubscribePantry = onSnapshot(q, (snapshot) => {
          const today = startOfDay(new Date());
          const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          const warningItems = items.filter(item => {
            if (!item.expiryDate) return false;
            
            let expDate;
            // Handle Firebase Timestamp (.toDate()) hoặc String (new Date())
            if (typeof item.expiryDate.toDate === 'function') {
                expDate = startOfDay(item.expiryDate.toDate());
            } else {
                expDate = startOfDay(new Date(item.expiryDate));
            }

            const diff = differenceInDays(expDate, today);
            return diff <= 3; 
          });

          // Chỉ hiện Popup nếu tìm thấy đồ và chưa hiện trong phiên này
          if (warningItems.length > 0 && !hasShownPopupSession) {
            setExpiringItems(warningItems);
            setModalVisible(true);
            hasShownPopupSession = true; 
          }
        });
        return () => unsubscribePantry();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // --- LOGIC 4: FILTER ---
  useEffect(() => {
    if (isLoading || masterRecipes.length === 0) return;
    let keywords = mood !== 'neutral' ? moodConfig[mood].keywords : [];
    if (!mood || mood === 'neutral') {
      keywords = timeFilters[timeSession].keywords;
      setFilterLabel(timeFilters[timeSession].label);
    } else {
      setFilterLabel("");
    }
    const filtered = masterRecipes.filter(item => {
      const text = (item.title + " " + (item.description || "")).toLowerCase();
      return keywords.some(key => text.includes(key.toLowerCase()));
    });
    const finalData = filtered.length > 0 ? filtered : masterRecipes;
    const grouped = masterCategories.map(cat => ({
      ...cat,
      recipes: finalData.filter(r => r.categoryId === cat.id)
    })).filter(c => c.recipes.length > 0);
    setGroupedData(grouped);
  }, [mood, timeSession, masterRecipes, masterCategories, isLoading]);

  const onPressRecipe = (item) => {
    setSuggestionModalVisible(false);
    navigation.navigate("Recipe", { item });
  };

  if (isLoading) return <View style={localStyles.center}><ActivityIndicator size="small" color="#000" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <FlatList
        data={groupedData}
        keyExtractor={(item) => `${item.id}`}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <CategorySection item={item} onPressRecipe={onPressRecipe} />}
        ListHeaderComponent={
          <View>
            <HeaderSection 
                bannerData={bannerData} mood={mood} setMood={setMood}
                weatherData={weatherData} greeting={greeting} user={user}
                onPressRecipe={onPressRecipe} isUserScrolling={isUserScrolling}
                onOpenSuggestion={() => setSuggestionModalVisible(true)}
                moodConfig={moodConfig}
            />
            {filterLabel !== "" && <Text style={localStyles.filterText}>{filterLabel}</Text>}
          </View>
        }
      />

      <Modal animationType="fade" transparent visible={modalVisible}>
        <View style={localStyles.modalOverlay}>
          <View style={localStyles.modalContent}>
            <View style={localStyles.iconCircle}><Ionicons name="time-outline" size={30} color="#000" /></View>
            <Text style={localStyles.modalTitle}>CÓ THỰC PHẨM CẦN XỬ LÝ</Text>
            <Text style={localStyles.modalSub}>Đừng để lãng phí nhé!</Text>
            <TouchableOpacity style={localStyles.btnPrimary} onPress={() => { setModalVisible(false); navigation.navigate("Pantry"); }}>
              <Text style={localStyles.btnText}>KIỂM TRA KHO BẾP</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={{ marginTop: 15 }}>
              <Text style={{ color: '#999', fontWeight: '700', fontSize: 12 }}>ĐỂ SAU</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SuggestionModal 
        visible={suggestionModalVisible} onClose={() => setSuggestionModalVisible(false)}
        suggestions={randomSuggestions} onPressRecipe={onPressRecipe}
      />
    </View>
  );
}

const localStyles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterText: { paddingHorizontal: 20, marginTop: 15, fontWeight: '800', color: '#000', fontSize: 14, letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 30, padding: 30, alignItems: 'center' },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontWeight: '900', fontSize: 16, letterSpacing: 1, color: '#000' },
  modalSub: { textAlign: 'center', color: '#666', marginTop: 10, lineHeight: 20, fontSize: 13 },
  btnPrimary: { backgroundColor: '#000', width: '100%', padding: 16, borderRadius: 15, marginTop: 25, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 1 }
});