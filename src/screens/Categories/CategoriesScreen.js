import React, { useLayoutEffect, useEffect, useState } from "react";
import { FlatList, Text, View, Image, TouchableHighlight, ActivityIndicator } from "react-native";
import styles from "./styles";
// Bỏ import categories tĩnh từ dataArrays
// import { categories } from "../../data/dataArrays"; 

// Import các hàm async từ Service mới
import { getAllCategories, getNumberOfRecipes } from "../../data/MockDataAPI"; 
import MenuImage from "../../components/MenuImage/MenuImage";

export default function CategoriesScreen(props) {
  const { navigation } = props;
  
  // 1. Khai báo State để lưu dữ liệu và trạng thái loading
  const [categoriesData, setCategoriesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitleStyle: {
        fontWeight: "bold",
        textAlign: "center",
        alignSelf: "center",
        flex: 1,
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

  // 2. Gọi dữ liệu từ Firebase khi màn hình được Mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Lấy danh sách Categories
        const rawCategories = await getAllCategories();
        
        // Với mỗi category, lấy thêm số lượng recipe tương ứng
        // Dùng Promise.all để chạy song song cho nhanh
        const categoriesWithCount = await Promise.all(
          rawCategories.map(async (item) => {
            const count = await getNumberOfRecipes(item.id);
            return {
              ...item,
              recipeCount: count // Lưu số lượng vào object luôn
            };
          })
        );

        setCategoriesData(categoriesWithCount);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      } finally {
        setIsLoading(false); // Tắt loading dù thành công hay thất bại
      }
    };

    fetchData();
  }, []);

  const onPressCategory = (item) => {
    const title = item.name;
    const category = item;
    navigation.navigate("RecipesList", { category, title });
  };

  const renderCategory = ({ item }) => (
    <TouchableHighlight underlayColor="rgba(73,182,77,0.9)" onPress={() => onPressCategory(item)}>
      <View style={styles.categoriesItemContainer}>
        <Image style={styles.categoriesPhoto} source={{ uri: item.photo_url }} />
        <Text style={styles.categoriesName}>{item.name}</Text>
        {/* 3. Hiển thị số lượng đã được lấy sẵn trong state */}
        <Text style={styles.categoriesInfo}>{item.recipeCount} recipes</Text>
      </View>
    </TouchableHighlight>
  );

  // 4. Hiển thị Loading khi đang tải dữ liệu
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
        data={categoriesData} // Dùng state thay vì biến tĩnh
        renderItem={renderCategory} 
        keyExtractor={(item) => `${item.id}`} 
      />
    </View>
  );
}