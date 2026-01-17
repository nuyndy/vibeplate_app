import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Đảm bảo bạn đã cài expo icons, nếu chưa thì dùng Text thay thế

const { width } = Dimensions.get('window');

export default function RecipeSuggestionScreen({ navigation }) {
  
  // Dữ liệu giả lập (Sau này có thể lấy từ API hoặc dựa trên Pantry)
  const recipe = {
    title: "Salad Ức Gà Sốt Chanh Leo",
    description: "Món ăn healthy, ít calo, tận dụng ức gà và rau củ đang có trong tủ lạnh của bạn.",
    time: "15 phút",
    calories: "320 kcal",
    difficulty: "Dễ",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    ingredients: [
      "200g Ức gà (đã luộc/áp chảo)",
      "1 quả Cà chua",
      "Xà lách, Dưa chuột",
      "2 quả Chanh leo (làm sốt)",
      "1 thìa mật ong",
      "Gia vị: Muối, Tiêu"
    ],
    steps: [
      "Bước 1: Ức gà rửa sạch, luộc chín hoặc áp chảo vàng 2 mặt, xé nhỏ vừa ăn.",
      "Bước 2: Rau xà lách, cà chua, dưa chuột rửa sạch, cắt miếng vừa ăn.",
      "Bước 3: Pha sốt: Lấy ruột chanh leo + 1 thìa mật ong + xíu muối, khuấy đều.",
      "Bước 4: Trộn tất cả nguyên liệu vào bát lớn, rưới sốt chanh leo lên trên.",
      "Bước 5: Trình bày ra đĩa và thưởng thức ngay!"
    ]
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Ảnh món ăn */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: recipe.image }} style={styles.image} />
          {/* Nút Back nổi trên ảnh */}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonIcon}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          {/* Tiêu đề & Mô tả */}
          <Text style={styles.title}>{recipe.title}</Text>
          <Text style={styles.description}>{recipe.description}</Text>

          {/* Thông tin phụ: Thời gian, Calo */}
          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Thời gian</Text>
              <Text style={styles.metaValue}>{recipe.time}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Calories</Text>
              <Text style={styles.metaValue}>{recipe.calories}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Độ khó</Text>
              <Text style={styles.metaValue}>{recipe.difficulty}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Nguyên liệu */}
          <Text style={styles.sectionHeader}>🛒 Nguyên liệu cần thiết</Text>
          <View style={styles.listContainer}>
            {recipe.ingredients.map((item, index) => (
              <View key={index} style={styles.ingredientItem}>
                <View style={styles.bullet} />
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* Hướng dẫn */}
          <Text style={styles.sectionHeader}>👩‍🍳 Hướng dẫn thực hiện</Text>
          <View style={styles.listContainer}>
            {recipe.steps.map((step, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={styles.stepNumberContainer}>
                   <Text style={styles.stepNumber}>{index + 1}</Text>
                </View>
                <Text style={styles.listText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Nút Nấu Ngay (Floating Button) */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cookButton} onPress={() => alert("Đã thêm vào thực đơn hôm nay!")}>
          <Text style={styles.cookButtonText}>Nấu món này ngay</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  imageContainer: { position: 'relative' },
  image: { width: width, height: 300, resizeMode: 'cover' },
  backButton: {
    position: 'absolute', top: 40, left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20,
    width: 40, height: 40, justifyContent: 'center', alignItems: 'center'
  },
  backButtonIcon: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: -4 },
  
  contentContainer: {
    marginTop: -30, backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  description: { fontSize: 14, color: '#666', marginBottom: 20, lineHeight: 20 },
  
  metaContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, backgroundColor: '#f9fafc', padding: 15, borderRadius: 15 },
  metaItem: { alignItems: 'center' },
  metaLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  metaValue: { fontSize: 15, fontWeight: 'bold', color: '#2cd18a' },
  
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 20 },
  
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  listContainer: { marginBottom: 20 },
  
  ingredientItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  bullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2cd18a', marginRight: 10 },
  
  stepItem: { flexDirection: 'row', marginBottom: 18 },
  stepNumberContainer: { 
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#e6f7f0', 
    justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 
  },
  stepNumber: { color: '#2cd18a', fontWeight: 'bold', fontSize: 12 },
  listText: { fontSize: 15, color: '#444', lineHeight: 22, flex: 1 },

  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  cookButton: { backgroundColor: '#2cd18a', padding: 15, borderRadius: 15, alignItems: 'center', elevation: 3 },
  cookButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});