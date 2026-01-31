import React, { useLayoutEffect, useState, useEffect, useCallback } from "react";
import { 
  FlatList, 
  Text, 
  View, 
  Image, 
  TouchableHighlight, 
  ActivityIndicator, 
  RefreshControl // <--- 1. Thêm RefreshControl
} from "react-native";
import styles from "./styles";
import { getRecipesByIngredient, getAllCategories } from "../../data/MockDataAPI"; 

export default function IngredientScreen(props) {
  const { navigation, route } = props;

  const ingredientData = route.params?.ingredient; 
  const ingredientId = ingredientData?.ingredientId || ingredientData?.id; 
  const ingredientName = ingredientData?.name;
  const ingredientPhoto = ingredientData?.photo_url;

  // --- STATES ---
  const [recipesData, setRecipesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); // <--- 2. State reload

  useLayoutEffect(() => {
    navigation.setOptions({
      title: ingredientName,
    });
  }, [navigation, ingredientName]);

  // --- 3. HÀM FETCH DỮ LIỆU ---
  const fetchData = useCallback(async () => {
    if (!ingredientId) return;

    try {
      const [recipes, categories] = await Promise.all([
          getRecipesByIngredient(ingredientId),
          getAllCategories()
      ]);

      const categoryMap = {};
      categories.forEach(cat => {
          categoryMap[cat.id] = cat.name;
      });

      const mergedRecipes = recipes.map(recipe => ({
          ...recipe,
          categoryName: categoryMap[recipe.categoryId] || "Khác"
      }));

      setRecipesData(mergedRecipes);
    } catch (error) {
      console.error("Error fetching ingredient details:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false); // Tắt hiệu ứng xoay
    }
  }, [ingredientId]);

  // --- 4. XỬ LÝ RELOAD ---
  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          <ActivityIndicator size="large" color="#FF6347" />
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
        keyExtractor={(item) => `${item.recipeId || item.id}`}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: 20 }}
        // --- 5. THÊM REFRESH CONTROL ---
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh} 
            tintColor="#000"   // iOS spinner màu đen
            colors={["#000"]}  // Android spinner màu đen
          />
        }
      />
    </View>
  );
}