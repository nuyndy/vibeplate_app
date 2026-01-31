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
  RefreshControl // 1. Thêm RefreshControl
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
  const [refreshing, setRefreshing] = useState(false); // 2. State quản lý reload
  const inputRef = useRef(null);

  // Hàm load dữ liệu chính
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

  // 3. Logic xử lý khi người dùng vuốt xuống để Reload
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (value === "") {
        await initialize(); // Load lại gợi ý nếu đang ở màn hình chính
    } else {
        await handleSearch(value); // Search lại từ khóa hiện tại
    }
    setRefreshing(false);
  }, [value]);

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
            onChangeText={handleSearch}
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

  const handleSearch = async (text) => {
    setValue(text);
    if (!text || text.trim() === "") {
      setData([]);
      return;
    }

    setLoading(true);
    try {
      const [byName, byCategory, byIngredient] = await Promise.all([
        getRecipesByRecipeName(text.trim()),
        getRecipesByCategoryName(text.trim()),
        getRecipesByIngredientName(text.trim())
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
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onPressRecipe = (item) => {
    saveHistory(item.title); 
    navigation.navigate("Recipe", { item });
  };

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
          <Text style={{ fontSize: 14, color: '#000000', marginTop: 4 }}>
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
            // 4. Thêm RefreshControl cho ScrollView
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
          {history.length > 0 && (
            <View style={{ padding: 15 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 15, color: '#333', fontSize: 16 }}>Gần đây</Text>
                {history.map((item, index) => (
                    <View key={`hist-${index}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                        <Pressable 
                            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} 
                            onPress={() => handleSearch(item)}
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
          
          <Text style={{ fontWeight: 'bold', marginLeft: 15, marginTop: 10, color: '#333', fontSize: 16, marginBottom: 10 }}>Gợi ý cho bạn</Text>
          <FlatList
            key="suggested-list"
            numColumns={1}
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
                <ActivityIndicator color="#000000" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    key="search-results-list"
                    numColumns={1}
                    data={data}
                    renderItem={renderRecipes}
                    keyExtractor={(item) => `res-${item.id}`}
                    showsVerticalScrollIndicator={false}
                    onScrollBeginDrag={() => Keyboard.dismiss()}
                    contentContainerStyle={{ paddingHorizontal: 15, paddingTop: 10 }}
                    // 5. Thêm RefreshControl cho FlatList kết quả
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                            <Ionicons name="search-outline" size={50} color="#eee" />
                            <Text style={{ color: '#999', marginTop: 10 }}>Không tìm thấy món ăn nào</Text>
                        </View>
                    }
                />
            )}
        </View>
      )}
    </View>
  );
}