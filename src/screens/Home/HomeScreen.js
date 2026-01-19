import React, { useLayoutEffect, useState, useEffect, useMemo } from "react";
import { FlatList, Text, View, TouchableHighlight, Image, ActivityIndicator, TouchableOpacity } from "react-native";
import styles from "./styles";
import { getAllRecipes, getAllCategories } from "../../data/MockDataAPI";
import MenuImage from "../../components/MenuImage/MenuImage";
import HomeBanner from './HomeBanner';

export default function HomeScreen(props) {
  const { navigation } = props;

  const [groupedData, setGroupedData] = useState([]);
  const [bannerData, setBannerData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isUserScrolling, setIsUserScrolling] = useState(false);

  // Mood + Weather + Random
  const [mood, setMood] = useState(null);
  const [weather, setWeather] = useState({ temp: 27, description: "Nắng nhẹ" });
  const [randomSuggestion, setRandomSuggestion] = useState(null);

  // Mood icon data
  const moodOptions = [
    { key: "happy", label: "Vui vẻ", icon: "https://cdn-icons-png.flaticon.com/512/742/742920.png" },
    { key: "sad", label: "Buồn chán", icon: "https://cdn-icons-png.flaticon.com/512/742/742927.png" },
    { key: "tired", label: "Mệt", icon: "https://cdn-icons-png.flaticon.com/512/742/742760.png" },
    { key: "hungry", label: "Đói meo", icon: "https://cdn-icons-png.flaticon.com/512/1048/1048941.png" },
    { key: "neutral", label: "Bình thường", icon: "https://cdn-icons-png.flaticon.com/512/742/742831.png" },
  ];

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Trang chủ',
      headerLeft: () => (
        <MenuImage onPress={() => navigation.openDrawer()} />
      ),
      headerRight: () => <View />,
    });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recipes, categories] = await Promise.all([
          getAllRecipes(),
          getAllCategories()
        ]);

        const shuffledRecipes = [...recipes].sort(() => 0.5 - Math.random());
        setBannerData(shuffledRecipes.slice(0, 5));

        const grouped = categories.map(category => {
          const recipesInCategory = recipes.filter(recipe => recipe.categoryId === category.id);
          return { ...category, recipes: recipesInCategory };
        });

        const validCategories = grouped.filter(item => item.recipes.length > 0);
        setGroupedData(validCategories);

        if (recipes.length > 0) {
          const r = recipes[Math.floor(Math.random() * recipes.length)];
          setRandomSuggestion(r);
        }

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

  const renderRecipeItem = ({ item }) => (
    <TouchableHighlight underlayColor="rgba(73,182,77,0.9)" onPress={() => onPressRecipe(item)}>
      <View style={{ marginRight: 15, width: 140 }}>
        <Image
          style={{ width: 140, height: 140, borderRadius: 15 }}
          source={{ uri: item.photo_url }}
        />
        <Text style={{
          marginTop: 8,
          fontSize: 14,
          fontWeight: 'bold',
          color: '#333',
          textAlign: 'center'
        }} numberOfLines={2}>
          {item.title}
        </Text>
      </View>
    </TouchableHighlight>
  );

  const renderCategoryItem = ({ item }) => (
    <View style={{ marginBottom: 20 }}>
      <Text style={{
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 15,
        marginBottom: 10,
        color: '#333'
      }}>
        {item.name}
      </Text>

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

  const memoizedHeader = useMemo(() => {
    return (
      <View style={styles.headerContainer}>
        <HomeBanner
          bannerData={bannerData}
          onPressRecipe={onPressRecipe}
          isUserScrolling={isUserScrolling}
        />

        {/* Mood Selector */}
        <View style={{ marginTop: 20, paddingHorizontal: 15 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Hôm nay bạn cảm thấy?</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {moodOptions.map(m => (
              <TouchableOpacity
                key={m.key}
                onPress={() => setMood(m.key)}
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                  padding: 6,
                  borderRadius: 12,
                  backgroundColor: mood === m.key ? "#ffe0b2" : "#fff",
                  borderWidth: 1,
                  borderColor: mood === m.key ? "#ff9800" : "#d0d0d0",
                }}
              >
                <Image
                  source={{ uri: m.icon }}
                  style={{ width: 34, height: 34, marginBottom: 4 }}
                  resizeMode="contain"
                />
                <Text style={{ fontSize: 12, color: "#333" }}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Weather Box */}
        <View style={{
          marginTop: 20,
          marginHorizontal: 15,
          padding: 15,
          borderRadius: 12,
          backgroundColor: '#e3f2fd'
        }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Thời tiết hôm nay</Text>
          <Text style={{ marginTop: 8, fontSize: 15 }}>Nhiệt độ: {weather.temp}°C</Text>
          <Text style={{ fontSize: 15 }}>Trạng thái: {weather.description}</Text>
        </View>

        {/* Random Suggestion */}
        {randomSuggestion && (
          <TouchableOpacity
            style={{
              marginTop: 20,
              marginHorizontal: 15,
              padding: 15,
              borderRadius: 12,
              backgroundColor: '#fff3e0',
              borderWidth: 1,
              borderColor: '#ffb74d'
            }}
            onPress={() => onPressRecipe(randomSuggestion)}
          >
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Gợi ý nấu gì hôm nay?</Text>

            <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center' }}>
              <Image
                source={{ uri: randomSuggestion.photo_url }}
                style={{ width: 60, height: 60, borderRadius: 10, marginRight: 12 }}
              />
              <Text style={{ fontSize: 16, fontWeight: '600', flexShrink: 1 }}>
                {randomSuggestion.title}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [bannerData, mood, weather, randomSuggestion, isUserScrolling]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <FlatList
        vertical
        showsVerticalScrollIndicator={false}
        data={groupedData}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => `${item.id}`}
        onScrollBeginDrag={() => setIsUserScrolling(true)}
        onScrollEndDrag={() => setIsUserScrolling(false)}
        onMomentumScrollEnd={() => setIsUserScrolling(false)}
        ListHeaderComponent={memoizedHeader}
      />
    </View>
  );
}
