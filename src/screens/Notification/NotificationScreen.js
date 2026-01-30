import React, { useState, useEffect, useLayoutEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Image, TouchableOpacity } from "react-native";
import { differenceInDays, startOfDay } from 'date-fns';
import { auth, db } from '../../firebase/firebaseConfig';
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import MenuImage from "../../components/MenuImage/MenuImage";
import { Ionicons } from '@expo/vector-icons'; // Sử dụng thêm icon vector cho nhẹ app

export default function NotificationScreen(props) {
  const { navigation } = props;
  const [hasExpiredItems, setHasExpiredItems] = useState(false);
  const [expiredCount, setExpiredCount] = useState(0); // Thêm state đếm số lượng để hiển thị cho trực quan
  const [isLoading, setIsLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'THÔNG BÁO',
      headerTitleStyle: { fontWeight: '900', letterSpacing: 1, fontSize: 14 },
      headerLeft: () => <MenuImage onPress={() => navigation.openDrawer()} />,
      headerStyle: { elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }
    });
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, "inventory"), where("email", "==", user.email));
        
        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const today = startOfDay(new Date());
          let count = 0;

          snapshot.docs.forEach(doc => {
            const data = doc.data();
            let expDate;

            // KIỂM TRA KIỂU DỮ LIỆU: Firebase Timestamp hay String?
            if (data.expiryDate && typeof data.expiryDate.toDate === 'function') {
              expDate = startOfDay(data.expiryDate.toDate());
            } else if (typeof data.expiryDate === 'string') {
              expDate = startOfDay(new Date(data.expiryDate));
            } else {
              return; // Bỏ qua nếu không có ngày
            }
            
            const diff = differenceInDays(expDate, today);
            
            // Logic: Thông báo nếu còn <= 3 ngày hoặc đã quá hạn
            if (diff <= 3) {
              count++;
            }
          });

          setExpiredCount(count);
          setHasExpiredItems(count > 0);
          setIsLoading(false);
        });

        return () => unsubscribeSnapshot();
      } else {
        setIsLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {hasExpiredItems ? (
        <TouchableOpacity 
            style={styles.notificationCard}
            onPress={() => navigation.navigate('Pantry')}
        >
            <View style={styles.iconCircle}>
                <Ionicons name="alert-circle" size={28} color="#ff0000" />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.warningText}>Tủ lạnh có {expiredCount} món cần xử lý</Text>
                <Text style={styles.subText}>Có nguyên liệu sắp hết hạn hoặc đã quá hạn. Chạm để kiểm tra ngay.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>
      ) : (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
                <Ionicons name="checkmark-circle-outline" size={80} color="#E0E0E0" />
            </View>
            <Text style={styles.emptyText}>Mọi thứ đều ổn</Text>
            <Text style={styles.emptySubText}>Tất cả nguyên liệu trong kho vẫn còn tươi ngon.</Text>
        </View>
      )}
    </View>
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
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    // Shadow phong cách Clean tối giản
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F9F9F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  textContainer: {
    flex: 1,
  },
  warningText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000',
    marginBottom: 4,
    letterSpacing: -0.3
  },
  subText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  emptyIconWrapper: {
    marginBottom: 20,
    opacity: 0.5
  },
  emptyText: { 
    fontSize: 18, 
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  emptySubText: {
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14
  }
});