import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Image, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RecipeCard = ({ item, pantryItems, getIngredientName, onPressRecipe }) => {
  const [analysis, setAnalysis] = useState({ score: 0, missing: [], loading: true });

  useEffect(() => {
    let isMounted = true;
    
    const runAnalysis = async () => {
      // 1. Kiểm tra đầu vào: item.ingredients từ Firestore thường là mảng [ID, Quantity]
      const recipeIngredients = item?.ingredients; 
      if (!recipeIngredients || !Array.isArray(recipeIngredients) || recipeIngredients.length === 0) {
        if (isMounted) setAnalysis({ score: 0, missing: [], loading: false });
        return;
      }

      // 2. Chuẩn hóa Pantry (Tủ lạnh của user)
      const pantryLower = (pantryItems || [])
        .filter(name => name)
        .map(name => String(name).toLowerCase().trim());

      try {
        let matchedCount = 0;
        let missingNames = [];

        // 3. Duyệt mảng ingredients của món ăn
        // Cấu trúc mẫu: [[332, "250g"], [55, "40g"]]
        const analysisResults = await Promise.all(
          recipeIngredients.map(async (ing) => {
            // Lấy ID nguyên liệu (phần tử đầu tiên của mảng con)
            const ingId = Array.isArray(ing) ? ing[0] : (ing.ingredientId || ing.id);
            
            // GỌI HÀM TỪ MockDataAPI.js (Hàm này là async)
            const ingredientName = await getIngredientName(ingId);
            
            if (!ingredientName) {
              return { found: false, name: "Ẩn danh" };
            }

            const nameLower = String(ingredientName).toLowerCase().trim();
            
            // So khớp logic: "Hành lá" vs "Hành"
            const isFound = pantryLower.some(p => 
              nameLower.includes(p) || p.includes(nameLower)
            );

            return { found: isFound, name: ingredientName };
          })
        );

        // 4. Tổng hợp kết quả để tính %
        analysisResults.forEach(res => {
          if (res.found) matchedCount++;
          else missingNames.push(res.name);
        });

        const total = recipeIngredients.length;
        const score = Math.round((matchedCount / total) * 100);

        if (isMounted) {
          setAnalysis({
            score: score > 100 ? 100 : score,
            missing: missingNames,
            loading: false
          });
        }
      } catch (error) {
        console.error("Lỗi phân tích món ăn:", error);
        if (isMounted) setAnalysis({ score: 0, missing: [], loading: false });
      }
    };

    runAnalysis();
    return () => { isMounted = false; };
  }, [item?.id, pantryItems]); // item.id là ID từ Firestore doc

  const { score, missing, loading } = analysis;
  
  if (loading) return (
    <View style={styles.loadingCard}>
      <ActivityIndicator size="small" color="#FF9800" />
      <Text style={styles.loadingText}>Đang tính toán...</Text>
    </View>
  );

  const isHighMatch = score >= 70;

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={() => onPressRecipe(item)}
      style={styles.card}
    >
      <Image source={{ uri: item.photo_url }} style={styles.image} />
      
      <View style={[
        styles.matchBadge, 
        { backgroundColor: score === 0 ? '#666' : (isHighMatch ? '#4CAF50' : '#FF9800') }
      ]}>
        <Text style={styles.matchText}>{score}% Khớp</Text>
      </View>

      <View style={styles.infoContainer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          {score < 100 && (
            <Text style={styles.missingText} numberOfLines={1}>
              ❌ Thiếu: {missing.length > 0 ? missing.join(", ") : "Nguyên liệu lạ"}
            </Text>
          )}
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color="#888" />
            <Text style={styles.metaText}>{item.time}p</Text>
            <Text style={styles.dot}>•</Text>
            <Ionicons name="restaurant-outline" size={14} color="#888" />
            <Text style={styles.metaText}>{item.ingredients?.length} nl</Text>
          </View>
        </View>
        <View style={[styles.goButton, { backgroundColor: isHighMatch ? '#E8F5E9' : '#F5F5F5' }]}>
          <Ionicons name="chevron-forward" size={18} color={isHighMatch ? '#4CAF50' : '#000'} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function SuggestionModal({ visible, onClose, suggestions, onPressRecipe, pantryItems, getIngredientName }) {
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>AI GỢI Ý MÓN ĂN 🍳</Text>
              <Text style={styles.headerSub}>
                {pantryItems?.length > 0 ? `Tủ lạnh có ${pantryItems.length} nguyên liệu` : "Tủ lạnh đang trống"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
              <Ionicons name="close-circle" size={32} color="#DDD" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {suggestions && suggestions.length > 0 ? (
              suggestions.map((item, index) => (
                <RecipeCard 
                  key={item.id ? item.id.toString() : index.toString()}
                  item={item}
                  pantryItems={pantryItems}
                  getIngredientName={getIngredientName}
                  onPressRecipe={onPressRecipe}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={50} color="#EEE" />
                <Text style={styles.emptyText}>Đang lấy danh sách món ăn...</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  container: { height: '85%', backgroundColor: '#FFF', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 20 },
  handle: { width: 40, height: 4, backgroundColor: '#EEE', borderRadius: 2, alignSelf: 'center', marginBottom: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#333' },
  headerSub: { fontSize: 13, color: '#999' },
  card: { marginBottom: 15, backgroundColor: '#FFF', borderRadius: 20, overflow: 'hidden', elevation: 2, borderWidth: 1, borderColor: '#F0F0F0' },
  loadingCard: { marginBottom: 15, height: 100, backgroundColor: '#FAFAFA', borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#DDD' },
  loadingText: { marginTop: 5, fontSize: 10, color: '#999' },
  image: { width: '100%', height: 140 },
  matchBadge: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  matchText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  infoContainer: { padding: 15, flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  missingText: { fontSize: 11, color: '#E53935', marginTop: 3, fontWeight: '500' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  metaText: { fontSize: 12, color: '#999', marginLeft: 4 },
  dot: { color: '#DDD', marginHorizontal: 6 },
  goButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { marginTop: 10, color: '#CCC', fontSize: 15 }
});