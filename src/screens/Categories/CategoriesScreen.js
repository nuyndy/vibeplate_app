import React, { useLayoutEffect, useEffect, useState, useCallback } from "react";
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
import { getAllCategories, getNumberOfRecipes } from "../../data/MockDataAPI"; 
import MenuImage from "../../components/MenuImage/MenuImage";

export default function CategoriesScreen(props) {
  const { navigation } = props;
  
  const [categoriesData, setCategoriesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); // <--- 2. State cho trạng thái reload

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Danh mục',
      headerTitleStyle: {
        fontWeight: "bold",
        textAlign: "center",
        alignSelf: "center",
      },
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

  // 3. Hàm fetch dữ liệu dùng chung
  const fetchData = useCallback(async () => {
    try {
      const rawCategories = await getAllCategories();
      
      const categoriesWithCount = await Promise.all(
        rawCategories.map(async (item) => {
          const count = await getNumberOfRecipes(item.id);
          return {
            ...item,
            recipeCount: count 
          };
        })
      );

      setCategoriesData(categoriesWithCount);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false); // Tắt vòng xoay reload
    }
  }, []);

  // 4. Xử lý khi người dùng kéo xuống
  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onPressCategory = (item) => {
    const title = item.name;
    const category = item;
    navigation.navigate("RecipesList", { category, title });
  };

  const renderCategory = ({ item }) => (
    <TouchableHighlight 
      underlayColor="#eeecec" 
      onPress={() => onPressCategory(item)}
    >
      <View style={styles.categoriesItemContainer}>
        <Image style={styles.categoriesPhoto} source={{ uri: item.photo_url }} />
        <Text style={styles.categoriesName}>{item.name}</Text>
        <Text style={styles.categoriesInfo}>{item.recipeCount} món</Text>
      </View>
    </TouchableHighlight>
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList 
        data={categoriesData}
        renderItem={renderCategory} 
        keyExtractor={(item) => `${item.id}`} 
        // 5. Thêm RefreshControl vào FlatList
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh} 
            tintColor="#000000" // Màu cho iOS
            colors={["#000000"]} // Màu cho Android
          />
        }
      />
    </View>
  );
}