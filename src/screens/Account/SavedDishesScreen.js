import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, FlatList, Image, ActivityIndicator, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { auth, db } from '../../firebase/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const { width } = Dimensions.get('window');

export default function SavedDishesScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Món đã lưu',
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 20,
        color: 'black', // Tiêu đề đen
      },
      headerTintColor: 'black', // Nút back (nếu có) màu đen
      headerTransparent: true, // Giữ header trong suốt
    });
  }, []);

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    }

    const q = query(
        collection(db, "favorites"), 
        where("email", "==", user.email)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
      }));
      setData(list);
      setLoading(false);
    }, (error) => {
        console.error("Lỗi:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const onPressRecipe = (item) => {
    navigation.navigate("Recipe", { item });
  };

  if (loading) {
      return (
        <View style={styles.loadingContainer}>
            {/* Loading màu Đen */}
            <ActivityIndicator size="large" color="#000000" />
        </View>
      );
  }

  if (data.length === 0) {
      return (
          <View style={styles.emptyContainer}>
              <Image 
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4076/4076432.png' }} 
                style={styles.emptyIcon} 
              />
              <Text style={styles.emptyText}>Chưa có món nào được lưu.</Text>
          </View>
      );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        // 🔥 QUAN TRỌNG: paddingTop: 120 để cách Header ra
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card} 
            onPress={() => onPressRecipe(item)}
            activeOpacity={0.7}
          >
            <Image source={{ uri: item.photo_url }} style={styles.image} />
            <View style={styles.infoContainer}>
              <Text style={styles.name} numberOfLines={1}>{item.title}</Text>
              
              <View style={styles.row}>
                  <Image source={require('../../../assets/icons/time.png')} style={styles.iconTiny} />
                  <Text style={styles.subText}>{item.time} phút</Text>
              </View>

              <View style={styles.row}>
                   {/* Style đen trắng tối giản */}
                   <Text style={styles.categoryText}>
                       {item.servings ? `${item.servings} người` : 'Món ngon'}
                   </Text>
              </View>
            </View>
            
            {/* Trái tim màu Đen */}
            <Image 
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/833/833472.png' }} 
                style={styles.heartIcon} 
            />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
      flex: 1,
      backgroundColor: '#FFFFFF', // Nền trắng tuyệt đối
  },
  loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#FFFFFF'
  },
  listContainer: {
      paddingTop: 80, 
      paddingBottom: 20,
      paddingHorizontal: 15
  },
  emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      marginTop: 50
  },
  emptyIcon: {
      width: 80, 
      height: 80, 
      tintColor: '#000000',
      marginBottom: 20,
      opacity: 0.5
  },
  emptyText: {
      fontSize: 16,
      color: '#000000',
      fontWeight: '500'
  },
  card: { 
      flexDirection: 'row', 
      marginBottom: 15, 
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#E0E0E0', 
  },
  image: { 
      width: 70, 
      height: 70, 
      borderRadius: 8,
      marginRight: 15,
      backgroundColor: '#F0F0F0'
  },
  infoContainer: {
      flex: 1,
      justifyContent: 'center'
  },
  name: { 
      fontSize: 16, 
      fontWeight: 'bold',
      color: '#000000',
      marginBottom: 5
  },
  subText: {
      fontSize: 13,
      color: '#666666',
      marginLeft: 5
  },
  categoryText: {
      fontSize: 13,
      color: '#000000', 
      marginTop: 2,
      fontWeight: '500'
  },
  row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 3
  },
  iconTiny: {
      width: 14,
      height: 14,
      tintColor: '#000000'
  },
  heartIcon: {
      width: 20,
      height: 20,
      tintColor: '#e90000',
      marginRight: 5
  }
});