import React, { useLayoutEffect, useState, useEffect } from "react";
import { FlatList, Text, View, Image, TouchableHighlight, ActivityIndicator } from "react-native";
import styles from "./styles";
// Import các hàm từ Service mới
import { getIngredientUrl, getRecipesByIngredient, getAllCategories } from "../../data/MockDataAPI";

export default function IngredientScreen(props) {
  const { navigation, route } = props;

  const ingredientId = route.params?.ingredient;
  const ingredientName = route.params?.name;

  // 1. Khai báo State để lưu dữ liệu
  const [recipesData, setRecipesData] = useState([]);
  const [ingredientImgUrl, setIngredientImgUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: route.params?.name,
    });
  }, []);

  // 2. Fetch dữ liệu từ Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Gọi 3 API cùng lúc: Lấy ảnh nguyên liệu, Lấy món ăn, Lấy danh mục (để ghép tên)
        const [url, recipes, categories] = await Promise.all([
            getIngredientUrl(ingredientId),
            getRecipesByIngredient(ingredientId),
            getAllCategories()
        ]);

        setIngredientImgUrl(url);

        // Tạo Map Category để tra cứu nhanh
        const categoryMap = {};
        categories.forEach(cat => {
            categoryMap[cat.id] = cat.name;
        });

        // Ghép tên Category vào từng Recipe
        const mergedRecipes = recipes.map(recipe => ({
            ...recipe,
            categoryName: categoryMap[recipe.categoryId] || "Unknown Category"
        }));

        setRecipesData(mergedRecipes);

      } catch (error) {
        console.error("Error fetching ingredient details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [ingredientId]); // Chạy lại nếu ingredientId thay đổi

  const onPressRecipe = (item) => {
    navigation.navigate("Recipe", { item });
  };

  const renderRecipes = ({ item }) => (
    <TouchableHighlight underlayColor="rgba(73,182,77,0.9)" onPress={() => onPressRecipe(item)}>
      <View style={styles.container}>
        <Image style={styles.photo} source={{ uri: item.photo_url }} />
        <Text style={styles.title}>{item.title}</Text>
        {/* Hiển thị tên category đã xử lý */}
        <Text style={styles.category}>{item.categoryName}</Text>
      </View>
    </TouchableHighlight>
  );

  const ListHeader = () => (
    <>
      <View style={{ borderBottomWidth: 0.4, marginBottom: 10, borderBottomColor: "grey" }}>
        {/* Kiểm tra nếu có url thì mới hiện ảnh */}
        {ingredientImgUrl ? (
             <Image style={styles.photoIngredient} source={{ uri: ingredientImgUrl }} />
        ) : (
            // Có thể hiển thị ảnh placeholder nếu không tìm thấy ảnh
            <View style={[styles.photoIngredient, { backgroundColor: '#ccc' }]} /> 
        )}
      </View>
      <Text style={styles.ingredientInfo}>Recipes with {ingredientName}:</Text>
    </>
  );

  if (isLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2cd18a" />
        </View>
      );
  }

  return (
    <View style={styles.mainContainer}>
      <FlatList
        ListHeaderComponent={ListHeader}
        vertical
        showsVerticalScrollIndicator={false}
        numColumns={2}
        data={recipesData} // Dùng state
        renderItem={renderRecipes}
        keyExtractor={(item) => `${item.id}`} // Đổi recipeId thành item.id (theo Firebase)
      />
    </View>
  );
}
