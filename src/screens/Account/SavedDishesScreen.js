import React, { useEffect, useState, useLayoutEffect, useCallback, useMemo } from 'react';
import { 
  View, Text, FlatList, Image, ActivityIndicator, StyleSheet, 
  TouchableOpacity, Dimensions, RefreshControl, Alert 
} from 'react-native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler'; // Thêm Gesture Handler
import { auth, db } from '../../firebase/firebaseConfig';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- SUB-COMPONENT: NÚT XÓA KHI VUỐT ---
const RightActions = ({ onDelete }) => (
  <TouchableOpacity style={styles.deleteButton} onPress={onDelete} activeOpacity={0.8}>
    <Text style={styles.deleteButtonText}>Xóa</Text>
  </TouchableOpacity>
);

// --- SUB-COMPONENT: RECIPE ITEM ---
const RecipeItem = React.memo(({ item, onPress, onDelete }) => {
  return (
    <Swipeable
      renderRightActions={() => <RightActions onDelete={() => onDelete(item.id)} />}
      friction={2}
      rightThreshold={40}
    >
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => onPress(item)}
        activeOpacity={1} // Swipeable đã xử lý feedback, tránh bị nháy màu
      >
        <Image source={{ uri: item.photo_url }} style={styles.image} />
        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={1}>{item.title}</Text>
          <View style={styles.row}>
            <Image source={require('../../../assets/icons/time.png')} style={styles.iconTiny} />
            <Text style={styles.subText}>{item.time} phút</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.categoryText}>
              {item.servings ? `${item.servings} người` : 'Món ngon'}
            </Text>
          </View>
        </View>
        <Image 
          source={{ uri: 'https://cdn-icons-png.flaticon.com/512/833/833472.png' }} 
          style={styles.heartIcon} 
        />
      </TouchableOpacity>
    </Swipeable>
  );
});

export default function SavedDishesScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const user = auth.currentUser;

  // 1. Config Header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Món đã lưu',
      headerTitleStyle: styles.headerTitle,
      headerTintColor: 'black',
      headerTransparent: true,
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <Image 
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/271/271220.png' }} 
            style={styles.backIcon} 
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // 2. Realtime Listener
  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "favorites"), 
      where("email", "==", user.email.toLowerCase())
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setData(list);
      setLoading(false);
      setIsRefreshing(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 3. Handlers
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  const handleDelete = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, "favorites", id));
      // Không cần setData ở đây vì onSnapshot sẽ tự cập nhật
    } catch (error) {
      Alert.alert("Lỗi", "Không thể xóa món ăn này.");
    }
  }, []);

  const onPressRecipe = useCallback((item) => {
    navigation.navigate("Recipe", { item });
  }, [navigation]);

  // 4. Pure Components
  const renderEmpty = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Image 
        source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4076/4076432.png' }} 
        style={styles.emptyIcon} 
      />
      <Text style={styles.emptyText}>Chưa có món nào được lưu.</Text>
    </View>
  ), []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <FlatList
          data={data}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#000" />
          }
          renderItem={({ item }) => (
            <RecipeItem 
              item={item} 
              onPress={onPressRecipe} 
              onDelete={handleDelete}
            />
          )}
          ListEmptyComponent={renderEmpty}
          removeClippedSubviews={true}
          initialNumToRender={10}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontWeight: "bold", fontSize: 20, color: 'black' },
  headerBackBtn: { marginLeft: 15, padding: 5 },
  backIcon: { width: 20, height: 20, tintColor: 'black' },
  listContainer: {
    paddingTop: 80, 
    paddingBottom: 20,
    paddingHorizontal: 15,
    minHeight: SCREEN_HEIGHT,
  },
  card: { 
    flexDirection: 'row', 
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '83%', 
    borderRadius: 12,
    marginBottom: 12,
    marginLeft: 10,
  },
  deleteButtonText: { color: '#FFF', fontWeight: 'bold' },
  image: { width: 75, height: 75, borderRadius: 10, marginRight: 15, backgroundColor: '#F9F9F9' },
  infoContainer: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },
  subText: { fontSize: 13, color: '#666', marginLeft: 6 },
  categoryText: { fontSize: 13, color: '#444', marginTop: 4, fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  iconTiny: { width: 14, height: 14, tintColor: '#666' },
  heartIcon: { width: 22, height: 22, tintColor: '#FF4B4B', marginRight: 5 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: SCREEN_HEIGHT * 0.15 },
  emptyIcon: { width: 80, height: 80, tintColor: '#000', marginBottom: 20, opacity: 0.2 },
  emptyText: { fontSize: 16, color: '#888', fontWeight: '500' },
});