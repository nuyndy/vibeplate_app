import React, { useLayoutEffect, useEffect, useState } from "react";
import { FlatList, Text, View, TouchableHighlight, Image, ActivityIndicator } from "react-native";
import styles from "./styles";
// Import service mới
import { getRecipes } from "../../data/MockDataAPI";

export default function RecipesListScreen(props) {
  const { navigation, route } = props;

  // Lấy thông tin Category được truyền từ màn hình trước
  const categoryItem = route?.params?.category;
  const categoryTitle = route?.params?.title;

  // 1. Khai báo State
  const [recipesData, setRecipesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: route.params?.title,
      headerRight: () => <View />,
    });
  }, []);

  // 2. Fetch dữ liệu từ Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Lấy danh sách recipe thuộc categoryId này
        const recipes = await getRecipes(categoryItem.id);
        
        // Vì màn hình này chuyên hiển thị món của 1 Category cụ thể,
        // ta lấy luôn title được truyền qua params gán vào từng món để hiển thị.
        // Không cần gọi API getCategoryName nữa (tiết kiệm tài nguyên).
        const mappedRecipes = recipes.map(item => ({
            ...item,
            categoryName: categoryTitle 
        }));

        setRecipesData(mappedRecipes);
      } catch (error) {
        console.error("Error fetching recipes list:", error);
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
        {/* Hiển thị tên category đã được gán ở trên */}
        <Text style={styles.category}>{item.categoryName}</Text>
      </View>
    </TouchableHighlight>
  );

  // 3. Loading View
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
        data={recipesData} // Dùng state
        renderItem={renderRecipes} 
        keyExtractor={(item) => `${item.id}`} // Sửa keyExtractor theo id của Firebase
      />
    </View>
  );
}