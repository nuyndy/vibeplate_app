import React, { useLayoutEffect, useState, useEffect } from "react";
import { FlatList, Text, View, Image, TouchableHighlight, ActivityIndicator } from "react-native";
import styles from "./styles";
// Import Service mới
import { getAllIngredients } from "../../data/MockDataAPI";

export default function IngredientsDetailsScreen(props) {
  const { navigation, route } = props;

  // Lấy mảng params từ màn hình trước. Cấu trúc: [[id, quantity], [id, quantity]...]
  const ingredientsParam = route.params?.ingredients;

  // 1. Khai báo State
  const [ingredientsData, setIngredientsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: route.params?.title,
      headerTitleStyle: {
        fontSize: 16,
      },
    });
  }, []);

  // 2. Fetch dữ liệu chi tiết từ Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Hàm này sẽ biến đổi mảng ID [[id, qty]] thành mảng đối tượng [[{FullData}, qty]]
        const data = await getAllIngredients(ingredientsParam);
        setIngredientsData(data);
      } catch (error) {
        console.error("Error fetching ingredients details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (ingredientsParam) {
      fetchData();
    } else {
        setIsLoading(false);
    }
  }, []); // Chỉ chạy 1 lần lúc mount

  const onPressIngredient = (item) => {
    // item bây giờ là object nguyên liệu đầy đủ (item[0] từ renderItem)
    // Không cần gọi getIngredientName nữa vì ta đã có dữ liệu rồi
    navigation.navigate("Ingredient", { 
        ingredient: item.id, 
        name: item.name 
    });
  };

  const renderIngredient = ({ item, index }) => (
    <TouchableHighlight
      underlayColor="rgba(73,182,77,0.9)"
      // item cấu trúc là [ObjectData, QuantityString]
      // item[0] là Object chứa thông tin (id, name, photo_url...)
      onPress={() => onPressIngredient(item[0])}
    >
      <View style={styles.container}>
        <Image style={styles.photo} source={{ uri: item[0].photo_url }} />
        <Text style={styles.title}>{item[0].name}</Text>
        <Text style={{ color: "grey" }}>{item[1]}</Text>
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
        numColumns={3}
        data={ingredientsData} // Dùng dữ liệu từ State
        renderItem={renderIngredient}
        // KeyExtractor: kết hợp ID và index để đảm bảo unique
        keyExtractor={(item, index) => `${item[0].id}_${index}`}
      />
    </View>
  );
}
