import React, { useEffect, useLayoutEffect, useState } from "react";
import { FlatList, Text, View, Image, TouchableHighlight, Pressable, Keyboard } from "react-native";
import styles from "./styles";
import MenuImage from "../../components/MenuImage/MenuImage";
import { TextInput } from "react-native-gesture-handler";
// Import Service mới
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
  
  // State lưu danh sách Category để tra cứu tên nhanh
  const [categoryMap, setCategoryMap] = useState({});

  // 1. Load danh mục một lần duy nhất khi vào màn hình
  useEffect(() => {
    const loadCategories = async () => {
        const cats = await getAllCategories();
        const map = {};
        cats.forEach(c => { map[c.id] = c.name; });
        setCategoryMap(map);
    };
    loadCategories();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
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
            style={styles.searchInput}
            onChangeText={handleSearch} // Hàm xử lý khi gõ phím
            value={value}
            placeholder="Search..." // Thêm placeholder cho đẹp
            placeholderTextColor="grey"
          />
          <Pressable onPress={() => handleSearch("")}>
            <Image style={styles.searchIcon} source={require("../../../assets/icons/close.png")} />
          </Pressable>
        </View>
      ),
      headerRight: () => <View />,
    });
  }, [value]); // Render lại header khi value thay đổi để update input

  // 2. Hàm xử lý tìm kiếm (Logic chính)
  const handleSearch = async (text) => {
    setValue(text);

    if (text === "") {
      setData([]);
      return;
    }

    // Tối ưu: Chỉ tìm kiếm khi gõ nhiều hơn 1 ký tự để đỡ tốn tài nguyên Firebase
    // Bạn có thể bỏ dòng if này nếu muốn tìm ngay lập tức
    if (text.length < 2) return; 

    try {
      // Gọi 3 hàm tìm kiếm song song (Promise.all)
      const [byName, byCategory, byIngredient] = await Promise.all([
        getRecipesByRecipeName(text),
        getRecipesByCategoryName(text),
        getRecipesByIngredientName(text)
      ]);

      // Gộp kết quả lại
      const combined = [...byName, ...byCategory, ...byIngredient];

      // Lọc trùng lặp (Dedup) dựa trên ID
      // Vì Object trả về từ Firebase là các instance khác nhau, ta không dùng Set trực tiếp được
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
        {/* Tra cứu tên Category từ Map đã load ở bước 1 */}
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
        // Thêm tính năng tắt bàn phím khi cuộn danh sách
        onScroll={() => Keyboard.dismiss()} 
      />
    </View>
  );
}
