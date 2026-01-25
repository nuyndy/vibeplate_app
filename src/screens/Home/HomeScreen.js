import React, { useLayoutEffect, useState, useEffect, useMemo } from "react";
import { FlatList, Text, View, TouchableHighlight, Image, ActivityIndicator, TouchableOpacity, Modal, Dimensions } from "react-native";
import styles from "./styles";
import { getAllRecipes, getAllCategories } from "../../data/MockDataAPI";
import MenuImage from "../../components/MenuImage/MenuImage";
import HomeBanner from './HomeBanner';

// --- CÁC IMPORT LOGIC ---
import { differenceInDays } from 'date-fns';
import { auth, db } from '../../firebase/firebaseConfig';
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// --- IMPORT ICON ---
import { Ionicons } from '@expo/vector-icons';

// Lấy chiều rộng màn hình để tính toán kích thước thẻ
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 🔥 BIẾN TOÀN CỤC: Đảm bảo popup chỉ hiện 1 lần mỗi lần mở app
let hasShownPopupSession = false;

export default function HomeScreen(props) {
  const { navigation } = props;

  // State dữ liệu món ăn
  const [groupedData, setGroupedData] = useState([]);
  const [bannerData, setBannerData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  // --- STATE CHO THÔNG BÁO POPUP CẢNH BÁO ---
  const [expiringItems, setExpiringItems] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [user, setUser] = useState(null);

  // --- STATE CHO GỢI Ý MÓN ĂN (MỚI) ---
  const [randomSuggestions, setRandomSuggestions] = useState([]); // Chứa 3 món
  const [suggestionModalVisible, setSuggestionModalVisible] = useState(false); // Modal gợi ý

  // State Mood + Weather
  const [mood, setMood] = useState(null);
  const [weather, setWeather] = useState({ temp: 27, description: "Nắng nhẹ" });

  const moodOptions = [
    { key: "happy", label: "Vui vẻ", icon: "https://cdn-icons-png.flaticon.com/512/742/742920.png" },
    { key: "sad", label: "Buồn chán", icon: "https://cdn-icons-png.flaticon.com/512/742/742927.png" },
    { key: "tired", label: "Mệt", icon: "https://cdn-icons-png.flaticon.com/512/742/742760.png" },
    { key: "hungry", label: "Đói meo", icon: "https://cdn-icons-png.flaticon.com/512/1048/1048941.png" },
    { key: "neutral", label: "Bình thường", icon: "https://cdn-icons-png.flaticon.com/512/742/742831.png" },
  ];

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Trang chủ',
      headerLeft: () => (
        <MenuImage onPress={() => navigation.openDrawer()} />
      ),
      headerRight: () => <View />,
    });
  }, []);

  // --- 1. LOGIC LẤY DỮ LIỆU & KIỂM SOÁT POPUP 1 LẦN ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const q = query(collection(db, "inventory"), where("email", "==", currentUser.email));

        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const items = [];

          snapshot.docs.forEach(doc => {
            const data = doc.data();
            const expDate = data.expiryDate ? data.expiryDate.toDate() : new Date();
            expDate.setHours(0, 0, 0, 0);

            const diff = differenceInDays(expDate, today);

            if (diff >= 0 && diff <= 3) {
              items.push({
                id: doc.id,
                ...data,
                diffDays: diff
              });
            }
          });

          items.sort((a, b) => a.diffDays - b.diffDays);
          setExpiringItems(items);

          // Chỉ hiện Popup nếu chưa hiện trong phiên này
          if (items.length > 0 && !hasShownPopupSession) {
            setModalVisible(true);
            hasShownPopupSession = true;
          }
        });
        return () => unsubscribeSnapshot();
      } else {
        setExpiringItems([]);
        hasShownPopupSession = false;
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Logic lấy MockData (Recipes)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recipes, categories] = await Promise.all([
          getAllRecipes(),
          getAllCategories()
        ]);
        
        // Random banner items
        const shuffledRecipes = [...recipes].sort(() => 0.5 - Math.random());
        setBannerData(shuffledRecipes.slice(0, 5));

        // Group data for categories
        const grouped = categories.map(category => {
          const recipesInCategory = recipes.filter(recipe => recipe.categoryId === category.id);
          return { ...category, recipes: recipesInCategory };
        });
        const validCategories = grouped.filter(item => item.recipes.length > 0);
        setGroupedData(validCategories);

        // --- LẤY 3 GỢI Ý NGẪU NHIÊN ---
        if (recipes.length >= 3) {
           // Lấy 3 món đầu tiên từ danh sách đã xáo trộn
           setRandomSuggestions(shuffledRecipes.slice(0, 3));
        }

      } catch (error) {
        console.error("Error home data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const onPressRecipe = (item) => {
    // Nếu đang mở modal gợi ý thì đóng lại trước khi chuyển trang
    setSuggestionModalVisible(false);
    navigation.navigate("Recipe", { item });
  };

  const handleCheckPantry = () => {
    setModalVisible(false);
    navigation.navigate("Pantry");
  };

  const renderRecipeItem = ({ item }) => (
    <TouchableHighlight underlayColor="rgba(73,182,77,0.9)" onPress={() => onPressRecipe(item)}>
      <View style={{ marginRight: 15, width: 140 }}>
        <Image style={{ width: 140, height: 140, borderRadius: 15 }} source={{ uri: item.photo_url }} />
        <Text style={{ marginTop: 8, fontSize: 14, fontWeight: 'bold', color: '#333', textAlign: 'center' }} numberOfLines={2}>
          {item.title}
        </Text>
      </View>
    </TouchableHighlight>
  );

  const renderCategoryItem = ({ item }) => (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginLeft: 15, marginBottom: 10, color: '#333' }}>{item.name}</Text>
      <FlatList
        horizontal
        data={item.recipes}
        renderItem={renderRecipeItem}
        keyExtractor={(recipe) => `${recipe.id}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 15, paddingRight: 15 }}
      />
    </View>
  );

  const memoizedHeader = useMemo(() => {
    return (
      <View style={styles.headerContainer}>
        <HomeBanner
          bannerData={bannerData}
          onPressRecipe={onPressRecipe}
          isUserScrolling={isUserScrolling}
        />

        {/* Mood Selector */}
        <View style={{ marginTop: 20, paddingHorizontal: 15 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Hôm nay bạn cảm thấy?</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {moodOptions.map(m => (
              <TouchableOpacity
                key={m.key}
                onPress={() => setMood(m.key)}
                style={{
                  alignItems: 'center', justifyContent: 'center', marginRight: 12, padding: 6, borderRadius: 12,
                  backgroundColor: mood === m.key ? "#ffe0b2" : "#fff",
                  borderWidth: 1, borderColor: mood === m.key ? "#ff9800" : "#d0d0d0",
                }}
              >
                <Image source={{ uri: m.icon }} style={{ width: 34, height: 34, marginBottom: 4 }} resizeMode="contain" />
                <Text style={{ fontSize: 12, color: "#333" }}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Weather Box */}
        <View style={{ marginTop: 20, marginHorizontal: 15, padding: 15, borderRadius: 12, backgroundColor: '#e3f2fd' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Thời tiết hôm nay</Text>
          <Text style={{ marginTop: 8, fontSize: 15 }}>Nhiệt độ: {weather.temp}°C</Text>
          <Text style={{ fontSize: 15 }}>Trạng thái: {weather.description}</Text>
        </View>

        {/* --- KHU VỰC GỢI Ý --- */}
        <TouchableOpacity
            style={{ 
              marginTop: 20, 
              marginHorizontal: 15, 
              padding: 15, 
              borderRadius: 12, 
              backgroundColor: '#fff3e0', 
              borderWidth: 1, 
              borderColor: '#ffb74d',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
            // Thay vì navigate, ta bật Modal gợi ý
            onPress={() => setSuggestionModalVisible(true)}
          >
            <View>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Gợi ý nấu gì hôm nay?</Text>
              <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>Nhấn để xem 3 món ngon đề xuất</Text>
            </View>
            <Ionicons name="restaurant" size={30} color="#ff9800" />
          </TouchableOpacity>
      </View>
    );
  }, [bannerData, mood, weather, randomSuggestions, isUserScrolling]); // Thêm randomSuggestions vào dependency

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <FlatList
        vertical
        showsVerticalScrollIndicator={false}
        data={groupedData}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => `${item.id}`}
        onScrollBeginDrag={() => setIsUserScrolling(true)}
        onScrollEndDrag={() => setIsUserScrolling(false)}
        onMomentumScrollEnd={() => setIsUserScrolling(false)}
        ListHeaderComponent={memoizedHeader}
      />

      {/* --- POPUP CẢNH BÁO HẠN DÙNG (CŨ) --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)'}}>
          <View style={{width: '85%', backgroundColor: 'white', borderRadius: 30, padding: 25, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10}}>
            <View style={{ marginBottom: 20 }}>
              <Ionicons name="warning" size={70} color="#D32F2F" />
            </View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#000', marginBottom: 10, textAlign: 'center' }}>Cảnh báo hạn dùng</Text>
            <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 20, color: '#666', lineHeight: 24 }}>
              Bạn có <Text style={{ fontWeight: 'bold', color: '#000' }}>{expiringItems.length} nguyên liệu</Text> cần chú ý trong tủ lạnh.
            </Text>
            {/* ... Phần danh sách hạn dùng giữ nguyên ... */}
             <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', gap: 15 }}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{flex: 1, backgroundColor: '#F0F0F0', paddingVertical: 15, borderRadius: 15, alignItems: 'center'}}>
                <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 16 }}>Đóng lại</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCheckPantry} style={{flex: 1, backgroundColor: '#000000', paddingVertical: 15, borderRadius: 15, alignItems: 'center'}}>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Kiểm tra</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- MODAL GỢI Ý 3 MÓN ĂN (MỚI) --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={suggestionModalVisible}
        onRequestClose={() => setSuggestionModalVisible(false)}
      >
        <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'flex-end', // Hiện từ dưới lên
        }}>
            {/* Container trắng */}
            <View style={{
                height: '75%', // Chiếm 75% màn hình
                backgroundColor: '#F5F7FA',
                borderTopLeftRadius: 30,
                borderTopRightRadius: 30,
                padding: 20,
            }}>
                {/* Header Modal */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <Text style={{ fontSize: 22, fontWeight: 'bold' }}>Hôm nay ăn gì?</Text>
                    <TouchableOpacity onPress={() => setSuggestionModalVisible(false)}>
                        <Ionicons name="close-circle" size={30} color="#ccc" />
                    </TouchableOpacity>
                </View>

                {/* Danh sách 3 món */}
                <View style={{flex: 1}}>
                    {/* Sử dụng ScrollView hoặc View thường vì chỉ có 3 món */}
                    {randomSuggestions.map((item, index) => (
                        <TouchableOpacity 
                            key={index}
                            activeOpacity={0.9}
                            onPress={() => onPressRecipe(item)}
                            style={{
                                marginBottom: 20,
                                backgroundColor: 'white',
                                borderRadius: 20,
                                // Style giống Pantry (Thẻ dọc)
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.1,
                                shadowRadius: 8,
                                elevation: 5,
                                flexDirection: 'column', // Dọc
                                overflow: 'hidden',
                                height: 160, // Chiều cao cố định cho đẹp
                            }}
                        >
                            {/* Ảnh món ăn (chiếm phần lớn hoặc 1 nửa) */}
                            <View style={{ flex: 2, width: '100%' }}>
                                <Image 
                                    source={{ uri: item.photo_url }} 
                                    style={{ width: '100%', height: '100%', resizeMode: 'cover' }} 
                                />
                                {/* Overlay gradient hoặc tối để làm nổi bật text nếu cần, ở đây để clean */}
                            </View>

                            {/* Thông tin (chiếm phần dưới) */}
                            <View style={{ 
                                flex: 1, 
                                paddingHorizontal: 15, 
                                flexDirection: 'row', 
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }} numberOfLines={1}>
                                        {item.title}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                        <Ionicons name="time-outline" size={14} color="#888" />
                                        <Text style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>
                                            {item.time ? item.time + " phút" : "30 phút"}
                                        </Text>
                                    </View>
                                </View>
      
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
                
                {/* Nút random lại nếu muốn (Option) */}
                <TouchableOpacity 
                  onPress={() => {
                     // Logic random lại (cần recipes gốc, ở đây tạm thời đóng modal)
                     setSuggestionModalVisible(false);
                  }}
                  style={{ alignSelf: 'center', marginTop: 10 }}
                >

                </TouchableOpacity>

            </View>
        </View>
      </Modal>
    </View>
  );
}