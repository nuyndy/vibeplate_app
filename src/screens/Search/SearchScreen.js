import React, { useEffect, useLayoutEffect, useState, useRef, useCallback } from "react";
import { 
  FlatList, 
  Text, 
  View, 
  Image, 
  TouchableHighlight, 
  Pressable, 
  Keyboard, 
  TextInput, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl 
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import styles from "./styles"; 
import MenuImage from "../../components/MenuImage/MenuImage";
import { Ionicons } from '@expo/vector-icons';

import { 
  getRecipesByRecipeName, 
  getRecipesByCategoryName, 
  getRecipesByIngredientName,
  getAllCategories,
  getRecipes 
} from "../../data/MockDataAPI";

const HISTORY_KEY = '@search_history';

export default function SearchScreen(props) {
  const { navigation } = props;

  const [value, setValue] = useState("");
  const [data, setData] = useState([]);
  const [history, setHistory] = useState([]);
  const [defaultRecipes, setDefaultRecipes] = useState([]);
  const [categoryMap, setCategoryMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null); // Ref để xử lý debounce

  // --- 1. KHỞI TẠO DỮ LIỆU BAN ĐẦU ---
  const initialize = async () => {
    try {
        const cats = await getAllCategories();
        const map = {};
        cats.forEach(c => { map[c.id] = c.name; });
        setCategoryMap(map);

        const savedHistory = await AsyncStorage.getItem(HISTORY_KEY);
        if (savedHistory) setHistory(JSON.parse(savedHistory));

        const all = await getRecipes(); 
        setDefaultRecipes(all.slice(0, 9)); 
    } catch (e) {
        console.error("Lỗi khởi tạo:", e);
    }
  };

  useEffect(() => {
    initialize();
  }, []);

  // --- 2. XỬ LÝ REFRESH (VUỐT XUỐNG ĐỂ TẢI LẠI) ---
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (value === "") {
        await initialize();
    } else {
        await performSearch(value); 
    }
    setRefreshing(false);
  }, [value]);

  // --- 3. CẤU HÌNH HEADER NAVIGATION ---
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Tìm kiếm',
      headerLeft: () => <MenuImage onPress={() => navigation.openDrawer()} />,
      headerTitle: () => (
        <View style={styles.searchContainer}>
          <Image style={styles.searchIcon} source={require("../../../assets/icons/search.png")} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            onChangeText={onChangeText} // Gọi hàm trung gian
            placeholder="Tìm món ăn, nguyên liệu..." 
            placeholderTextColor="grey"
            onSubmitEditing={() => saveHistory(value)} 
            value={value}
          />
          {value !== "" && (
            <Pressable onPress={handleClearText}>
              <Image style={styles.searchIcon} source={require("../../../assets/icons/close.png")} />
            </Pressable>
          )}
        </View>
      ),
      headerRight: () => <View />,
    });
  }, [value]); 

  // --- 4. LOGIC TÌM KIẾM VÀ DEBOUNCE ---
  const onChangeText = (text) => {
    setValue(text);
    
    // Xóa timeout cũ nếu người dùng vẫn đang gõ
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Thiết lập timeout mới (đợi 500ms sau khi ngừng gõ mới tìm)
    typingTimeoutRef.current = setTimeout(() => {
        performSearch(text);
    }, 500);
  };

  const performSearch = async (text) => {
    if (!text || text.trim() === "") {
      setData([]);
      return;
    }

    setLoading(true);
    try {
      const queryText = text.trim();
      const [byName, byCategory, byIngredient] = await Promise.all([
        getRecipesByRecipeName(queryText),
        getRecipesByCategoryName(queryText),
        getRecipesByIngredientName(queryText)
      ]);
      
      const combined = [...byName, ...byCategory, ...byIngredient];
      const uniqueIds = new Set();
      const uniqueRecipes = combined.filter(element => {
        const isDuplicate = uniqueIds.has(element.id);
        uniqueIds.add(element.id);
        return !isDuplicate;
      });
      
      setData(uniqueRecipes);
    } catch (error) {
      console.error("Lỗi tìm kiếm:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 5. QUẢN LÝ LỊCH SỬ ---
  const saveHistory = async (text) => {
    const trimmedText = text.trim();
    if (!trimmedText) return;
    const newHistory = [trimmedText, ...history.filter(item => item !== trimmedText)].slice(0, 5);
    setHistory(newHistory);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  };

  const deleteHistory = async (text) => {
    const newHistory = history.filter(item => item !== text);
    setHistory(newHistory);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  };

  const handleClearText = () => {
    setValue("");
    setData([]);
    if (inputRef.current) {
        inputRef.current.clear();
        inputRef.current.focus();
    }
  };

  const onPressRecipe = (item) => {
    saveHistory(item.title); 
    navigation.navigate("Recipe", { item });
  };

  // --- 6. RENDER GIAO DIỆN ITEM ---
  const renderRecipes = ({ item }) => (
    <TouchableHighlight 
      underlayColor="rgba(0,0,0,0.05)" 
      onPress={() => onPressRecipe(item)}
      style={{ marginBottom: 12, borderRadius: 12, backgroundColor: '#fff' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10 }}>
        <Image 
          style={{ width: 70, height: 70, borderRadius: 10, backgroundColor: '#f0f0f0' }} 
          source={{ uri: item.photo_url }} 
        />
        <View style={{ marginLeft: 15, flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {categoryMap[item.categoryId] || "Món ngon"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#CCC" />
      </View>
    </TouchableHighlight>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f8f8' }}>
      {value === "" ? (
        <ScrollView 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
          {/* PHẦN LỊCH SỬ TÌM KIẾM */}
          {history.length > 0 && (
            <View style={{ padding: 15 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 15, color: '#333', fontSize: 16 }}>Gần đây</Text>
                {history.map((item, index) => (
                    <View key={`hist-${index}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                        <Pressable 
                            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} 
                            onPress={() => {
                                setValue(item);
                                performSearch(item);
                            }}
                        >
                            <Ionicons name="time-outline" size={20} color="#999" />
                            <Text style={{ marginLeft: 10, color: '#555', fontSize: 15 }}>{item}</Text>
                        </Pressable>
                        <Pressable onPress={() => deleteHistory(item)} hitSlop={10}>
                            <Ionicons name="close-outline" size={20} color="#ccc" />
                        </Pressable>
                    </View>
                ))}
            </View>
          )}
          
          {/* PHẦN GỢI Ý MẶC ĐỊNH */}
          <Text style={{ fontWeight: 'bold', marginLeft: 15, marginTop: 10, color: '#333', fontSize: 16, marginBottom: 10 }}>Gợi ý cho bạn</Text>
          <FlatList
            key="suggested-list"
            data={defaultRecipes}
            renderItem={renderRecipes}
            keyExtractor={(item) => `sug-${item.id}`}
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 20 }}
          />
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
            {loading && !refreshing ? (
                <View style={{ marginTop: 30, alignItems: 'center' }}>
                    <ActivityIndicator color="#000" size="large" />
                    <Text style={{ marginTop: 10, color: '#999' }}>Đang tìm kiếm...</Text>
                </View>
            ) : (
                <FlatList
                    key="search-results-list"
                    data={data}
                    renderItem={renderRecipes}
                    keyExtractor={(item) => `res-${item.id}`}
                    showsVerticalScrollIndicator={false}
                    onScrollBeginDrag={() => Keyboard.dismiss()}
                    contentContainerStyle={{ paddingHorizontal: 15, paddingTop: 10 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 80 }}>
                            <Ionicons name="search-outline" size={60} color="#ddd" />
                            <Text style={{ color: '#999', marginTop: 15, fontSize: 15 }}>
                                Không tìm thấy món "{value}"
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
      )}
    </View>
  );
}