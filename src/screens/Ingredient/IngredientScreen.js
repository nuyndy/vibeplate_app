import React, { useLayoutEffect, useState, useEffect } from "react";
import { FlatList, Text, View, Image, TouchableHighlight, ActivityIndicator, Dimensions } from "react-native";
import styles from "./styles";
// Import API
import { getRecipesByIngredient, getAllCategories } from "../../data/MockDataAPI"; 

export default function IngredientScreen(props) {
  const { navigation, route } = props;

  // --- 1. NHẬN DỮ LIỆU TỪ NAVIGATION ---
  // Lấy object 'ingredient' được truyền từ RecipeScreen
  const ingredientData = route.params?.ingredient; 
  
  // Trích xuất thông tin an toàn
  const ingredientId = ingredientData?.ingredientId || ingredientData?.id; 
  const ingredientName = ingredientData?.name;
  const ingredientPhoto = ingredientData?.photo_url;

  // --- 2. STATES ---
  const [recipesData, setRecipesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Set Title cho Header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: ingredientName,
    });
  }, [navigation, ingredientName]);

  // --- 3. FETCH DỮ LIỆU (MÓN ĂN & DANH MỤC) ---
  useEffect(() => {
    const fetchData = async () => {
      if (!ingredientId) return;

      setIsLoading(true);
      try {
        // Gọi 2 API: Lấy món ăn theo nguyên liệu & Lấy tất cả danh mục
        const [recipes, categories] = await Promise.all([
            getRecipesByIngredient(ingredientId),
            getAllCategories()
        ]);

        // Tạo Map Category để tra cứu nhanh (ID -> Name)
        const categoryMap = {};
        categories.forEach(cat => {
            categoryMap[cat.id] = cat.name;
        });

        // Ghép tên Category vào từng Recipe
        const mergedRecipes = recipes.map(recipe => ({
            ...recipe,
            categoryName: categoryMap[recipe.categoryId] || "Khác"
        }));

        setRecipesData(mergedRecipes);

      } catch (error) {
        console.error("Error fetching ingredient details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [ingredientId]); 

  // --- HANDLERS ---
  const onPressRecipe = (item) => {
    navigation.push("Recipe", { item });
  };

  const renderRecipes = ({ item }) => (
    <TouchableHighlight underlayColor="rgba(255, 255, 255, 0.9)" onPress={() => onPressRecipe(item)}>
      <View style={styles.container}>
        <Image style={styles.photo} source={{ uri: item.photo_url }} />
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.category}>{item.categoryName}</Text>
      </View>
    </TouchableHighlight>
  );

  // --- HEADER CỦA LIST ---
  const ListHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.imageContainer}>
        {ingredientPhoto ? (
             <Image style={styles.photoIngredient} source={{ uri: ingredientPhoto }} />
        ) : (
             <Image 
                style={[styles.photoIngredient, { tintColor: '#ccc' }]} 
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/706/706164.png' }} 
             /> 
        )}
      </View>
    </View>
  );

  if (isLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#a0a3a2" />
        </View>
      );
  }

  return (
    <View style={styles.mainContainer}>
      <FlatList
        vertical
        showsVerticalScrollIndicator={false}
        numColumns={2}
        data={recipesData}
        renderItem={renderRecipes}
        keyExtractor={(item) => `${item.recipeId || item.id}`} // Đảm bảo key duy nhất
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}