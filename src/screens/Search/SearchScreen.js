import React, { useEffect, useLayoutEffect, useState, useRef } from "react";
import { FlatList, Text, View, Image, TouchableHighlight, Pressable, Keyboard, TextInput } from "react-native";
import styles from "./styles";
import MenuImage from "../../components/MenuImage/MenuImage";

// Import API
import { 
  getRecipesByRecipeName, 
  getRecipesByCategoryName, 
  getRecipesByIngredientName,
  getAllCategories
} from "../../data/MockDataAPI";

export default function SearchScreen(props) {
  const { navigation } = props;

  const [value, setValue] = useState("");
  const [data, setData] = useState([]);
  
  // State lưu danh sách Category để tra cứu tên
  const [categoryMap, setCategoryMap] = useState({});

  // 1. Dùng useRef để điều khiển ô Input mà không cần render lại giao diện
  const inputRef = useRef(null);

  // Load danh mục một lần duy nhất
  useEffect(() => {
    const loadCategories = async () => {
        const cats = await getAllCategories();
        const map = {};
        cats.forEach(c => { map[c.id] = c.name; });
        setCategoryMap(map);
    };
    loadCategories();
  }, []);

  // Cấu hình Header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Tìm kiếm',
      headerLeft: () => (
        <MenuImage
          onPress={() => {
            navigation.openDrawer();
          }}
        />
      ),
      headerTitle: () => (
        <View style={styles.searchContainer}>
          <Image style={styles.searchIcon} source={require("../../../assets/icons/search.png")} />
          <TextInput
            ref={inputRef} // <--- GẮN REF
            style={styles.searchInput}
            onChangeText={handleSearch} // Hàm xử lý khi gõ
            placeholder="Search..." 
            placeholderTextColor="grey"
            // QUAN TRỌNG: Không truyền props value={value} vào đây để tránh mất focus
          />
          <Pressable onPress={handleClearText}>
            <Image style={styles.searchIcon} source={require("../../../assets/icons/close.png")} />
          </Pressable>
        </View>
      ),
      headerRight: () => <View />,
    });
  }, []); // <--- QUAN TRỌNG: Để mảng rỗng [], Header chỉ render 1 lần duy nhất lúc đầu

  // Hàm xử lý nút Xóa (X)
  const handleClearText = () => {
    setValue("");
    handleSearch(""); // Xóa kết quả tìm kiếm
    // Xóa chữ hiển thị trên ô input bằng lệnh trực tiếp
    if (inputRef.current) {
        inputRef.current.clear(); 
        inputRef.current.focus(); // Focus lại để gõ tiếp
    }
  };

  // Logic tìm kiếm
  const handleSearch = async (text) => {
    setValue(text);

    if (text === "") {
      setData([]);
      return;
    }

    // Có thể bỏ qua nếu ít hơn 2 ký tự (tùy chọn)
    // if (text.length < 2) return; 

    try {
      const [byName, byCategory, byIngredient] = await Promise.all([
        getRecipesByRecipeName(text),
        getRecipesByCategoryName(text),
        getRecipesByIngredientName(text)
      ]);

      const combined = [...byName, ...byCategory, ...byIngredient];

      // Lọc trùng lặp
      const uniqueIds = new Set();
      const uniqueRecipes = combined.filter(element => {
        const isDuplicate = uniqueIds.has(element.id);
        uniqueIds.add(element.id);
        return !isDuplicate;
      });

      setData(uniqueRecipes);
    } catch (error) {
      console.error("Search Error:", error);
    }
  };

  const onPressRecipe = (item) => {
    navigation.navigate("Recipe", { item });
  };

  const renderRecipes = ({ item }) => (
    <TouchableHighlight underlayColor="rgba(73,182,77,0.9)" onPress={() => onPressRecipe(item)}>
      <View style={styles.container}>
        <Image style={styles.photo} source={{ uri: item.photo_url }} />
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.category}>
            {categoryMap[item.categoryId] || "Unknown Category"}
        </Text>
      </View>
    </TouchableHighlight>
  );

  return (
    <View style={{flex: 1}}> 
      <FlatList 
        vertical 
        showsVerticalScrollIndicator={false} 
        numColumns={2} 
        data={data} 
        renderItem={renderRecipes} 
        keyExtractor={(item) => `${item.id}`} 
        // Tắt bàn phím khi vuốt danh sách
        onScrollBeginDrag={() => Keyboard.dismiss()} 
      />
    </View>
  );
}