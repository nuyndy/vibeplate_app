import React, { useLayoutEffect, useState, useEffect } from "react";
import { FlatList, Text, View, TouchableHighlight, Image, ActivityIndicator } from "react-native";
import styles from "./styles";
// Bỏ import dữ liệu tĩnh
// import { recipes } from "../../data/dataArrays"; 
// import { getCategoryName } from "../../data/MockDataAPI";

// Import Service mới
import { getAllRecipes, getAllCategories } from "../../data/MockDataAPI";
import MenuImage from "../../components/MenuImage/MenuImage";

export default function HomeScreen(props) {
  const { navigation } = props;
  
  // 1. Khai báo State
  const [recipesData, setRecipesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <MenuImage
          onPress={() => {
            navigation.openDrawer();
          }}
        />
      ),
      headerRight: () => <View />,
    });
  }, []);

  // 2. Load dữ liệu từ Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Gọi song song cả 2 API để tiết kiệm thời gian
        const [recipes, categories] = await Promise.all([
          getAllRecipes(),
          getAllCategories()
        ]);

        // 3. Xử lý logic ghép tên Category vào Recipe (Data Mapping)
        // Tạo một Map để tra cứu nhanh: { "catId1": "Pizza", "catId2": "Soup" }
        const categoryMap = {};
        categories.forEach(cat => {
            categoryMap[cat.id] = cat.name;
        });

        // Duyệt qua từng recipe và gắn thêm field 'categoryName'
        const mergedRecipes = recipes.map(recipe => ({
            ...recipe,
            // Tra cứu tên từ Map, nếu không thấy thì để "Unknown"
            categoryName: categoryMap[recipe.categoryId] || "Unknown Category"
        }));

        setRecipesData(mergedRecipes);

      } catch (error) {
        console.error("Error fetching home data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const onPressRecipe = (item) => {
    navigation.navigate("Recipe", { item });
  };

  const renderRecipes = ({ item }) => (
    <TouchableHighlight underlayColor="rgba(73,182,77,0.9)" onPress={() => onPressRecipe(item)}>
      <View style={styles.container}>
        <Image style={styles.photo} source={{ uri: item.photo_url }} />
        <Text style={styles.title}>{item.title}</Text>
        {/* 4. Hiển thị tên category đã được xử lý ở trên */}
        <Text style={styles.category}>{item.categoryName}</Text>
      </View>
    </TouchableHighlight>
  );

  // 5. Loading View
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2cd18a" />
      </View>
    );
  }

  return (
    <View>
      <FlatList 
        vertical 
        showsVerticalScrollIndicator={false} 
        numColumns={2} 
        data={recipesData} // Dùng state recipesData
        renderItem={renderRecipes} 
        // Lưu ý: Firebase dùng 'id', còn data mẫu cũ của bạn dùng 'recipeId'. 
        // Hãy kiểm tra lại database, code này đang giả định bạn dùng field mặc định là 'id'
        keyExtractor={(item) => `${item.id}`} 
      />
    </View>
  );
}