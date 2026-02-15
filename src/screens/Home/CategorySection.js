import React from 'react';
import { View, Text, FlatList, LayoutAnimation, Platform, UIManager } from 'react-native';
import RecipeCard from './RecipeCard';

// Kích hoạt LayoutAnimation cho Android để khi AI lọc, các thẻ bài "bay" mượt hơn
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function CategorySection({ item, onPressRecipe }) {
  
  // Mỗi khi danh sách món thay đổi, thực hiện hiệu ứng chuyển động nhẹ
  // Điều này giúp trải nghiệm lọc theo tâm trạng cảm thấy "xịn" hơn
  React.useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [item.recipes]);

  const renderItem = ({ item: recipe }) => (
    <View style={{ position: 'relative' }}>
      <RecipeCard item={recipe} onPress={onPressRecipe} />
      
      {/* Nếu cần, bạn có thể thêm một chấm nhỏ hoặc Badge ở đây 
          để đánh dấu món này đang cực kỳ "Hot" theo Mood */}
    </View>
  );

  return (
    <View style={{ marginBottom: 25 }}>
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
        contentContainerStyle={{ 
          paddingLeft: 15, 
          paddingRight: 15,
          paddingBottom: 5 // Tạo khoảng trống cho bóng đổ của card
        }}
      />
      
      {/* Đường kẻ mờ phân cách giữa các danh mục cho sạch sẽ */}
      <View style={{ 
        height: 1, 
        backgroundColor: '#F0F0F0', 
        marginHorizontal: 15, 
        marginTop: 15 
      }} />
    </View>
  );
}