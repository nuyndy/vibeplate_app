import React, { useState, useEffect, useLayoutEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, SafeAreaView } from "react-native";
import { differenceInDays, startOfDay } from 'date-fns';
import { auth, db } from '../../firebase/firebaseConfig';
import { collection, query, where, onSnapshot, getDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import MenuImage from "../../components/MenuImage/MenuImage";
import { Ionicons } from '@expo/vector-icons';
import RecipeNotification from './RecipeNotification';

export default function NotificationScreen(props) {
  const { navigation } = props;
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [expiredCount, setExpiredCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'THÔNG BÁO',
      headerTitleStyle: { fontWeight: '900', letterSpacing: 1, fontSize: 15 },
      headerLeft: () => <MenuImage onPress={() => navigation.openDrawer()} />,
    });
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.email));
        const userRole = userDoc.data()?.role;
        const checkAdmin = userRole === 'admin';
        setIsAdmin(checkAdmin);

        let unsubPending = () => {};
        if (checkAdmin) {
          const qPending = query(collection(db, "suggested_recipes"), where("status", "==", "pending"));
          unsubPending = onSnapshot(qPending, (snap) => setPendingCount(snap.size));
        }

        const qInv = query(collection(db, "inventory"), where("email", "==", user.email));
        const unsubInv = onSnapshot(qInv, (snapshot) => {
          const today = startOfDay(new Date());
          let count = 0;
          snapshot.docs.forEach(d => {
            const data = d.data();
            let expDate = data.expiryDate?.toDate ? startOfDay(data.expiryDate.toDate()) : startOfDay(new Date(data.expiryDate));
            if (differenceInDays(expDate, today) <= 3) count++;
          });
          setExpiredCount(count);
          setIsLoading(false);
        });
        return () => { unsubPending(); unsubInv(); };
      } else { setIsLoading(false); }
    });
    return () => unsubscribeAuth();
  }, []);

  if (isLoading) return <View style={styles.loadingContainer}><ActivityIndicator size="small" color="#000" /></View>;

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#FBFCFE'}}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        
        {/* THÔNG BÁO ADMIN */}
        {isAdmin && pendingCount > 0 && (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('AdminDataManagement', { tab: 'suggested_recipes' })}>
            <View style={[styles.statusIndicator, { backgroundColor: '#096b3a' }]} />
            <View style={styles.cardMain}>
              <View style={styles.row}>
                <View style={[styles.tag, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="shield-checkmark" size={12} color="#096b3a" />
                  <Text style={[styles.tagText, { color: '#096b3a' }]}>QUẢN TRỊ VIÊN</Text>
                </View>
                <Text style={styles.timeText}>Yêu cầu mới</Text>
              </View>
              <Text style={styles.contentTitle}>Có {pendingCount} món ăn đang chờ duyệt</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* THÔNG BÁO TỦ LẠNH */}
        {expiredCount > 0 && (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Pantry')}>
            <View style={[styles.statusIndicator, { backgroundColor: '#ff0015' }]} />
            <View style={styles.cardMain}>
              <View style={styles.row}>
                <View style={[styles.tag, { backgroundColor: '#FFF0F0' }]}>
                  <Ionicons name="alert-circle" size={12} color="#ff0015" />
                  <Text style={[styles.tagText, { color: '#ff0015' }]}>KIỂM TRA TỦ LẠNH</Text>
                </View>
                <Text style={styles.timeText}>Sắp hết hạn</Text>
              </View>
              <Text style={styles.contentTitle}>Có {expiredCount} thực phẩm cần sử dụng ngay</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* THÔNG BÁO NGƯỜI DÙNG */}
        <RecipeNotification navigation={navigation} />

        {!isAdmin && expiredCount === 0 && pendingCount === 0 && (
           <View style={styles.emptyContainer}>
             <Ionicons name="leaf-outline" size={60} color="#E0E0E0" />
             <Text style={styles.emptyText}>Mọi thứ đều ổn</Text>
           </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contentContainer: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 20, marginBottom: 12,
    flexDirection: 'row', overflow: 'hidden',
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
  },
  statusIndicator: { width: 6 },
  cardMain: { flex: 1, padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  tagText: { fontSize: 10, fontWeight: '800' },
  timeText: { fontSize: 11, color: '#BBB' },
  contentTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#CCC', fontWeight: 'bold', marginTop: 10 }
});