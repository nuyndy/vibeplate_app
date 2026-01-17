import React, { useLayoutEffect, useState, useEffect, useMemo } from "react"; 
import { FlatList, Text, View, TouchableHighlight, Image, ActivityIndicator } from "react-native";
import styles from "./styles";
import { getAllRecipes, getAllCategories } from "../../data/MockDataAPI";
import MenuImage from "../../components/MenuImage/MenuImage";
import HomeBanner from './HomeBanner'; 

export default function HomeScreen(props) {
  const { navigation } = props;
  
  const [recipesData, setRecipesData] = useState([]);
  const [bannerData, setBannerData] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);

  // 1. Thêm biến state để theo dõi hành động cuộn của người dùng
  const [isUserScrolling, setIsUserScrolling] = useState(false); // <--- MỚI

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Home',
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

  // --- LẤY DỮ LIỆU ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recipes, categories] = await Promise.all([
          getAllRecipes(),
          getAllCategories()
        ]);

        const categoryMap = {};
        categories.forEach(cat => {
            categoryMap[cat.id] = cat.name;
        });

        const mergedRecipes = recipes.map(recipe => ({
            ...recipe,
            categoryName: categoryMap[recipe.categoryId] || "Unknown Category"
        }));

        const shuffledRecipes = [...mergedRecipes].sort(() => 0.5 - Math.random());
        
        setBannerData(shuffledRecipes.slice(0, 5));
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
        <Text style={styles.category}>{item.categoryName}</Text>
      </View>
    </TouchableHighlight>
  );

  // 2. Cập nhật useMemo để truyền trạng thái cuộn xuống Banner
  const memoizedHeader = useMemo(() => {
    return (
      <View style={styles.headerContainer}>
         <HomeBanner 
            bannerData={bannerData} 
            onPressRecipe={onPressRecipe} 
            isUserScrolling={isUserScrolling} // <--- TRUYỀN XUỐNG: Báo cho banner biết user đang cuộn hay không
         />
      </View>
    );
  // Quan trọng: Thêm isUserScrolling vào mảng phụ thuộc để Header cập nhật khi state này đổi
  }, [bannerData, isUserScrolling]); 

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2cd18a" />
      </View>
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: 'white'}}>
      <FlatList
        vertical
        showsVerticalScrollIndicator={false}
        numColumns={2}
        data={recipesData}
        renderItem={renderRecipes}
        keyExtractor={(item) => `${item.id}`}
        
        // 3. Thêm các sự kiện để bắt hành động cuộn của người dùng
        onScrollBeginDrag={() => setIsUserScrolling(true)} // <--- MỚI: Bắt đầu chạm tay kéo -> Bật cờ
        onScrollEndDrag={() => setIsUserScrolling(false)}  // <--- MỚI: Thả tay ra -> Tắt cờ
        onMomentumScrollEnd={() => setIsUserScrolling(false)} // <--- MỚI: Trôi hết đà -> Tắt cờ

        ListHeaderComponent={memoizedHeader}
      />
    </View>
  );
}