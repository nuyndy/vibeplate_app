import React, { useLayoutEffect, useEffect, useState } from "react";
import { 
  FlatList, 
  Text, 
  View, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  SafeAreaView 
} from "react-native";
import styles from "./styles";
import { getRecipes } from "../../data/MockDataAPI";

export default function RecipesListScreen(props) {
  const { navigation, route } = props;
  const categoryItem = route?.params?.category;

  const [recipesData, setRecipesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const recipes = await getRecipes(categoryItem.id);
        setRecipesData(recipes);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

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
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.mainContainer}>
      <FlatList 
        numColumns={2} 
        data={recipesData}
        renderItem={renderRecipes} 
        keyExtractor={(item) => `${item.id}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}