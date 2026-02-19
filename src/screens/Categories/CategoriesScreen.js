import React, { useLayoutEffect, useEffect, useState, useCallback } from "react";
import { 
  FlatList, 
  Text, 
  View, 
  Image, 
  TouchableHighlight, 
  ActivityIndicator,
  RefreshControl 
} from "react-native";
import styles from "./styles";
import { getAllCategories, getNumberOfRecipes } from "../../data/MockDataAPI"; 
import MenuImage from "../../components/MenuImage/MenuImage";

export default function CategoriesScreen(props) {
  const { navigation } = props;
  
  // --- 1. STATES ---
  const [categoriesData, setCategoriesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- 2. NAVIGATION CONFIG ---
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Danh mục',
      headerTitleStyle: {
        fontWeight: "bold",
        textAlign: "center",
        alignSelf: "center",
      },
      headerLeft: () => (
        <MenuImage onPress={() => navigation.openDrawer()} />
      ),
      headerRight: () => <View />, // Cân bằng khoảng trống để tiêu đề căn giữa
    });
  }, [navigation]);

  // --- 3. DATA FETCHING LOGIC ---
  const fetchData = useCallback(async () => {
    try {
      // Lấy danh sách danh mục thô
      const rawCategories = await getAllCategories();
      
      // Chạy song song (Parallel) việc lấy số lượng món ăn để tối ưu tốc độ
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
      setIsRefreshing(false);
    }
  }, []);

  // Gọi dữ liệu khi component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- 4. EVENT HANDLERS ---
  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const onPressCategory = (item) => {
    navigation.navigate("RecipesList", { 
      category: item, 
      title: item.name 
    });
  };

  // --- 5. RENDER COMPONENTS ---
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

  // Màn hình loading trung tâm
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
        keyExtractor={(item) => String(item.id)} // Chuyển sang string cho chuẩn React
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh} 
            tintColor="#000000"
            colors={["#000000"]}
          />
        }
      />
    </View>
  );
}