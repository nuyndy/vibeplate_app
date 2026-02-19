import React, { memo } from 'react'; // Thêm memo
import { View, Text, FlatList, LayoutAnimation, Platform, UIManager } from 'react-native';
import RecipeCard from './RecipeCard';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Bọc component bằng memo để tránh re-render thừa
const CategorySection = memo(({ item, onPressRecipe }) => {
  
  React.useEffect(() => {
    // Chỉ chạy hiệu ứng nếu danh sách recipes có dữ liệu để tránh giật lag lúc mount
    if (item.recipes.length > 0) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [item.recipes]);

  // Sử dụng useCallback cho renderItem nếu CategorySection phức tạp hơn, 
  // nhưng ở mức độ này render trực tiếp vẫn ổn.
  const renderItem = ({ item: recipe }) => (
    <View style={{ position: 'relative' }}>
      <RecipeCard item={recipe} onPress={onPressRecipe} />
    </View>
  );

  return (
    <View style={{ marginBottom: 25 }}>
      {/* Header Section */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginHorizontal: 15,
        marginBottom: 12 
      }}>
        <Text style={{ 
          fontSize: 19, 
          fontWeight: '800', 
          color: '#2D3436',
          letterSpacing: 0.5
        }}>
          {item.name}
        </Text>
        
        <Text style={{ fontSize: 12, color: '#ADADAD', fontWeight: '600' }}>
          {item.recipes.length} món
        </Text>
      </View>

      <FlatList
        horizontal
        data={item.recipes}
        renderItem={renderItem}
        keyExtractor={(recipe) => `cat-${item.id}-rec-${recipe.id}`}
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        // Tối ưu hiệu năng FlatList
        removeClippedSubviews={true} 
        initialNumToRender={5}
        windowSize={5}
        contentContainerStyle={{ 
          paddingLeft: 15, 
          paddingRight: 15,
          paddingBottom: 5 
        }}
      />
      
      {/* Separator */}
      <View style={{ 
        height: 1, 
        backgroundColor: '#F0F0F0', 
        marginHorizontal: 15, 
        marginTop: 15 
      }} />
    </View>
  );
});

export default CategorySection;