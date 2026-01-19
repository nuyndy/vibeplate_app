import React, { useLayoutEffect, useState, useEffect, useMemo } from "react";
import { FlatList, Text, View, TouchableHighlight, Image, ActivityIndicator, ScrollView } from "react-native";
import styles from "./styles";
import { getAllRecipes, getAllCategories } from "../../data/MockDataAPI";
import MenuImage from "../../components/MenuImage/MenuImage";
import HomeBanner from './HomeBanner';

export default function HomeScreen(props) {
  const { navigation } = props;

  // recipesData bây giờ sẽ chứa danh sách các Category đã có món ăn bên trong
  const [groupedData, setGroupedData] = useState([]); 
  const [bannerData, setBannerData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Biến state theo dõi hành động cuộn (giữ nguyên logic cũ của bạn)
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Trang chủ',
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

  // --- LẤY VÀ XỬ LÝ DỮ LIỆU ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recipes, categories] = await Promise.all([
          getAllRecipes(),
          getAllCategories()
        ]);

        // 1. Logic tạo Banner (Giữ nguyên: Lấy ngẫu nhiên 5 món)
        const shuffledRecipes = [...recipes].sort(() => 0.5 - Math.random());
        setBannerData(shuffledRecipes.slice(0, 5));

        // 2. LOGIC MỚI: Nhóm món ăn theo thể loại
        const grouped = categories.map(category => {
          // Lọc ra các món ăn thuộc category này
          const recipesInCategory = recipes.filter(recipe => recipe.categoryId === category.id);
          
          return {
            ...category,
            recipes: recipesInCategory
          };
        });

        // Chỉ lấy những thể loại nào có ít nhất 1 món ăn
        const validCategories = grouped.filter(item => item.recipes.length > 0);

        setGroupedData(validCategories);

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

  // --- RENDER MỘT MÓN ĂN (Item con trong list ngang) ---
  // --- RENDER MỘT MÓN ĂN (Chỉ hiện Ảnh + Tên) ---
  const renderRecipeItem = ({ item }) => (
    <TouchableHighlight 
      underlayColor="rgba(73,182,77,0.9)" 
      onPress={() => onPressRecipe(item)}
    >
      <View style={{ 
          marginRight: 15, 
          width: 140, // Độ rộng cố định để các món bằng nhau
      }}>
        
        {/* 1. Hiển thị Ảnh */}
        <Image 
            style={{ 
                width: 140, 
                height: 140,       // Mình để ảnh vuông cho đẹp (hoặc bạn chỉnh thành 110 nếu thích chữ nhật)
                borderRadius: 15   // Bo góc ảnh
            }} 
            source={{ uri: item.photo_url }} 
        />
        
        {/* 2. Hiển thị Tên món */}
        <Text style={{
            marginTop: 8,          // Cách ảnh ra một chút cho thoáng
            fontSize: 14, 
            fontWeight: 'bold', 
            color: '#333',
            textAlign: 'center'    // Căn giữa tên món ăn dưới ảnh
        }} numberOfLines={2}> 
            {item.title} 
        </Text>     
      </View>
    </TouchableHighlight>
  );

  // --- RENDER MỘT THỂ LOẠI (Item cha trong list dọc) ---
  const renderCategoryItem = ({ item }) => (
    <View style={{ marginBottom: 20 }}>
      {/* Tiêu đề thể loại */}
      <Text style={{ 
        fontSize: 20, 
        fontWeight: 'bold', 
        marginLeft: 15, 
        marginBottom: 10,
        color: '#333' 
      }}>
        {item.name}
      </Text>

      {/* List ngang chứa các món ăn của thể loại này */}
      <FlatList
        horizontal
        data={item.recipes}
        renderItem={renderRecipeItem}
        keyExtractor={(recipe) => `${recipe.id}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 15, paddingRight: 15 }}
      />
    </View>
  );

  // Memo header (Giữ nguyên logic của bạn)
  const memoizedHeader = useMemo(() => {
    return (
      <View style={styles.headerContainer}>
         <HomeBanner 
            bannerData={bannerData} 
            onPressRecipe={onPressRecipe} 
            isUserScrolling={isUserScrolling}
         />
      </View>
    );
  }, [bannerData, isUserScrolling]); 

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: 'white'}}>
      {/* FlatList Chính: Cuộn dọc, chứa các danh mục */}
      <FlatList
        vertical
        showsVerticalScrollIndicator={false}
        
        // Dữ liệu bây giờ là danh sách các Category
        data={groupedData}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => `${item.id}`}

        // Quan trọng: Bỏ numColumns={2} vì chúng ta đang render list dọc
        
        // Logic bắt sự kiện cuộn (Giữ nguyên)
        onScrollBeginDrag={() => setIsUserScrolling(true)}
        onScrollEndDrag={() => setIsUserScrolling(false)}
        onMomentumScrollEnd={() => setIsUserScrolling(false)}

        ListHeaderComponent={memoizedHeader}
      />
    </View>
  );
}