import React, { useState, useEffect, useLayoutEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Image, TouchableOpacity,ScrollView } from "react-native";
import { differenceInDays } from 'date-fns';

// Firebase Imports
import { auth, db } from '../../firebase/firebaseConfig';
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import MenuImage from "../../components/MenuImage/MenuImage";
import RecipeNotification from './RecipeNotification';

export default function NotificationScreen(props) {
  const { navigation } = props;
  const [hasExpiredItems, setHasExpiredItems] = useState(false); // Biến kiểm tra có đồ hết hạn không
  const [isLoading, setIsLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Thông báo',
      headerLeft: () => (
        <MenuImage onPress={() => navigation.openDrawer()} />
      ),
      headerRight: () => <View />,
    });
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, "inventory"), where("email", "==", user.email));
        
        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          let foundExpired = false;

          // Duyệt qua tất cả đồ trong tủ
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            const expDate = data.expiryDate ? data.expiryDate.toDate() : new Date();
            expDate.setHours(0, 0, 0, 0);
            
            const diff = differenceInDays(expDate, today);
            
            // LOGIC MỚI THEO YÊU CẦU:
            // diff < 0: Đã quá hạn từ hôm qua trở về trước
            // diff === 0: Hết hạn ngay trong hôm nay
            if (diff <= 0) {
              foundExpired = true;
            }
          });

          setHasExpiredItems(foundExpired);
          setIsLoading(false);
        });

        return () => unsubscribeSnapshot();
      } else {
        setHasExpiredItems(false);
        setIsLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 20}}>
      <RecipeNotification navigation={navigation} />
      {hasExpiredItems ? (

        
        // --- TRƯỜNG HỢP CÓ ĐỒ HẾT HẠN/QUÁ HẠN ---
        <TouchableOpacity 
            style={styles.notificationCard}
            onPress={() => {
                // Chuyển hướng sang màn hình Pantry
                navigation.navigate('Pantry');
            }}
        >
            <Image 
                style={styles.icon}
                // Đảm bảo file hethan.png đã nằm trong assets/icons/
                source={require('../../../assets/icons/hethan.png')} 
            />
            <View style={styles.textContainer}>
                <Text style={styles.warningText}>Tủ lạnh có đồ cần xử lý</Text>
                <Text style={styles.subText}>Có nguyên liệu hết hạn hôm nay hoặc quá hạn. Chạm để kiểm tra.</Text>
            </View>
        </TouchableOpacity>
      ) : (
        // --- TRƯỜNG HỢP AN TOÀN ---
        <View style={styles.emptyContainer}>
            {/* Bạn có thể thay icon check hoặc để trống tùy ý */}
            <Image 
                source={require('../../../assets/icons/emotion.png')} 
                style={{ width: 80, height: 80, marginBottom: 15, resizeMode: 'contain' }}
            />
            <Text style={styles.emptyText}>Mọi nguyên liệu đều tươi ngon </Text>
            <Text style={{color: '#999', marginTop: 5}}>Không có đồ hết hạn hay quá hạn</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff', 
    padding: 20 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE', // Nền đỏ nhạt
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2', // Viền đỏ nhạt
    // Đổ bóng
    shadowColor: "#323030",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  icon: {
    width: 40,  
    height: 40,
    resizeMode: 'contain',
    marginRight: 15
  },
  textContainer: {
    flex: 1,
  },
  warningText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#262323', // Chữ đỏ đậm
    marginBottom: 2
  },
  subText: {
    fontSize: 13,
    color: '#555',
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    opacity: 0.7 
  },
  emptyText: { 
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#54c657' // Màu xanh lá báo an toàn
  }
});