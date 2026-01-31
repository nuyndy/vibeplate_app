import React, { useLayoutEffect, useEffect, useState } from "react";
import { 
  FlatList, 
  Text, 
  View, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  StyleSheet
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import styles from "./styles";
import { getRecipes } from "../../data/MockDataAPI";

export default function RecipesListScreen(props) {
  const { navigation, route } = props;
  const categoryItem = route?.params?.category;

  const [recipesData, setRecipesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: route.params?.title || "Recipes",
      headerTitleStyle: { 
        fontWeight: '800', 
        fontSize: 16,
        color: '#000',
        textTransform: 'uppercase', 
      },
      headerStyle: { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0 },
      headerTintColor: '#000',
      headerTitleAlign: 'center',
    });
  }, [navigation, route.params?.title]);

  // Hàm tải dữ liệu
  const fetchData = async () => {
    try {
      const recipes = await getRecipes(categoryItem.id);
      setRecipesData(recipes);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Xử lý kéo để làm mới
  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  // Component hiển thị khi không có món nào (Căn giữa)
  const renderEmptyContainer = () => (
    <View style={customStyles.emptyContainer}>
      <Ionicons name="fast-food-outline" size={80} color="#E0E0E0" />
      <Text style={customStyles.emptyText}>Chưa có món ăn nào 😪</Text>
    </View>
  );

  const renderRecipes = ({ item }) => (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => navigation.navigate("Recipe", { item })}
      style={styles.container}
    >
      <View style={styles.imageWrapper}>
        <Image style={styles.photo} source={{ uri: item.photo_url }} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={customStyles.center}>
        <ActivityIndicator size="small" color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={customStyles.mainContainer}>
      <FlatList 
        numColumns={2} 
        data={recipesData}
        renderItem={renderRecipes} 
        keyExtractor={(item) => `${item.id}`}
        // Quan trọng: Quyết định việc căn giữa nội dung trống
        contentContainerStyle={[
          styles.listContent, 
          recipesData.length === 0 && { flex: 1, justifyContent: 'center' }
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyContainer}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh}
            colors={['#000']} 
            tintColor={'#000'} 
          />
        }
      />
    </SafeAreaView>
  );
}

// Style bổ sung để căn chỉnh
const customStyles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 50,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 15,
    color: '#999',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  backButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 25,
    backgroundColor: '#000',
    borderRadius: 20,
  }
});