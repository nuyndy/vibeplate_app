import React, { useLayoutEffect, useRef, useState, useEffect } from "react";
import {
  ScrollView,
  Text,
  View,
  Image,
  Dimensions,
  TouchableHighlight,
} from "react-native";
import styles from "./styles";
import { useSharedValue } from 'react-native-reanimated';
import Carousel, { Pagination } from 'react-native-reanimated-carousel';
// Import Service mới
import { getCategoryById } from "../../data/MockDataAPI";
import BackButton from "../../components/BackButton/BackButton";
import ViewIngredientsButton from "../../components/ViewIngredientsButton/ViewIngredientsButton";

const { width: viewportWidth } = Dimensions.get("window");

export default function RecipeScreen(props) {
  const { navigation, route } = props;
  const item = route.params?.item;

  // 1. Khai báo State để lưu Category
  const [activeCategory, setActiveCategory] = useState(null);
  
  const slider1Ref = useRef(null);
  const progress = useSharedValue(0);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: "true",
      headerLeft: () => (
        <BackButton
          onPress={() => {
            navigation.goBack();
          }}
        />
      ),
      headerRight: () => <View />,
    });
  }, []);

  // 2. Fetch thông tin Category từ Firebase dựa trên item.categoryId
  useEffect(() => {
    const fetchCategory = async () => {
      if (item.categoryId) {
        const catData = await getCategoryById(item.categoryId);
        setActiveCategory(catData);
      }
    };
    fetchCategory();
  }, [item]);

  const renderImage = ({ item }) => (
    <TouchableHighlight>
      <View style={styles.imageContainer}>
        <Image style={styles.image} source={{ uri: item }} />
      </View>
    </TouchableHighlight>
  );

  const onPressPagination = (index) => {
    slider1Ref.current?.scrollTo({
      count: index - progress.value,
      animated: true,
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.carouselContainer}>
        <View style={styles.carousel}>
          <Carousel
            ref={(c) => {
              slider1Ref.current = c;
            }}
            loop={false}
            width={viewportWidth}
            height={250} // Điều chỉnh chiều cao phù hợp (thường là 250 hoặc viewportWidth)
            autoPlay={false}
            data={item.photosArray || [item.photo_url]} // Fallback nếu không có mảng ảnh
            scrollAnimationDuration={1000}
            renderItem={renderImage}
            onProgressChange={progress}
          />
          <Pagination.Basic
            renderItem={(item) => (
              <View
                style={{
                  backgroundColor: "rgba(255,255,255,1)",
                  flex: 1,
                }}
              />
            )}
            progress={progress}
            data={item.photosArray || [item.photo_url]}
            dotStyle={styles.paginationDot}
            containerStyle={styles.paginationContainer}
            onPress={onPressPagination}
          />
        </View>
      </View>
      
      <View style={styles.infoRecipeContainer}>
        <Text style={styles.infoRecipeName}>{item.title}</Text>
        
        <View style={styles.infoContainer}>
          <TouchableHighlight
            onPress={() => {
              // Chỉ navigate khi đã load xong category
              if (activeCategory) {
                navigation.navigate("RecipesList", { 
                    category: activeCategory, 
                    title: activeCategory.name 
                });
              }
            }}
          >
            <Text style={styles.category}>
              {/* Hiển thị tên category từ state, hoặc Loading nếu chưa xong */}
              {activeCategory ? activeCategory.name.toUpperCase() : "LOADING..."}
            </Text>
          </TouchableHighlight>
        </View>

        <View style={styles.infoContainer}>
          <Image
            style={styles.infoPhoto}
            source={require("../../../assets/icons/time.png")}
          />
          <Text style={styles.infoRecipe}>{item.time} minutes </Text>
        </View>

        <View style={styles.infoContainer}>
          <ViewIngredientsButton
            onPress={() => {
              // item.ingredients từ Firebase đã có cấu trúc [[id, qty], ...]
              // truyền thẳng sang IngredientsDetailsScreen là khớp.
              let ingredients = item.ingredients;
              let title = "Ingredients for " + item.title;
              navigation.navigate("IngredientsDetails", { ingredients, title });
            }}
          />
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.infoDescriptionRecipe}>{item.description}</Text>
        </View>
      </View>
    </ScrollView>
  );
}
