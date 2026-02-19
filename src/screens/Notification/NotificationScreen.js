import React, { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { 
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, 
  ScrollView, SafeAreaView, RefreshControl, Alert 
} from "react-native";
import { differenceInDays, startOfDay } from 'date-fns';
import { auth, db } from '../../firebase/firebaseConfig';
import { collection, query, where, onSnapshot, getDoc, doc, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import MenuImage from "../../components/MenuImage/MenuImage";
import { Ionicons } from '@expo/vector-icons';
import RecipeNotification from './RecipeNotification';

/**
 * 1. Admin: Kiểm tra role từ Firestore để hiển thị thông báo phê duyệt món ăn.
 * 2. Inventory: Quét tủ lạnh, so sánh ngày hết hạn (cảnh báo nếu <= 3 ngày).
 * 3. Real-time: Kết hợp onSnapshot cho tủ lạnh và getDocs cho Admin để cân bằng hiệu năng.
 */

export default function NotificationScreen(props) {
  const { navigation } = props;
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [expiredCount, setExpiredCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cấu hình Header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'THÔNG BÁO',
      headerTitleAlign: 'center',
      headerTitleStyle: { fontWeight: '900', letterSpacing: 1, fontSize: 15 },
      headerLeft: () => <MenuImage onPress={() => navigation.openDrawer()} />,
    });
  }, [navigation]);

  // --- HÀM TẢI DỮ LIỆU TỔNG HỢP ---
  const fetchData = async (user) => {
    if (!user) return;
    try {
      // Tối ưu hóa: Chạy song song các truy vấn không phụ thuộc nhau
      const [userDoc, snapInv] = await Promise.all([
        getDoc(doc(db, "users", user.email)),
        getDocs(query(collection(db, "inventory"), where("email", "==", user.email)))
      ]);

      const userRole = userDoc.data()?.role;
      const checkAdmin = userRole === 'admin';
      setIsAdmin(checkAdmin);

      // Nếu là admin, fetch thêm số lượng món chờ duyệt
      if (checkAdmin) {
        const qPending = query(collection(db, "suggested_recipes"), where("status", "==", "pending"));
        const snapPending = await getDocs(qPending);
        setPendingCount(snapPending.size);
      }

      // Tính toán nguyên liệu hết hạn từ dữ liệu Inventory
      processInventoryData(snapInv.docs);
      
    } catch (error) {
      console.log("Lỗi tải thông báo:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Logic xử lý ngày hết hạn
  const processInventoryData = (docs) => {
    const today = startOfDay(new Date());
    let count = 0;
    docs.forEach(d => {
      const data = d.data();
      // Xử lý cả định dạng Timestamp của Firestore và chuỗi Date ISO
      let expDate = data.expiryDate?.toDate 
        ? startOfDay(data.expiryDate.toDate()) 
        : startOfDay(new Date(data.expiryDate));
      
      if (differenceInDays(expDate, today) <= 3) count++;
    });
    setExpiredCount(count);
  };

  // --- XỬ LÝ REFRESH (Kéo xuống để cập nhật) ---
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (auth.currentUser) {
      fetchData(auth.currentUser);
    } else {
      setRefreshing(false);
      Alert.alert("Thông báo", "Bạn cần đăng nhập để cập nhật.");
    }
  }, []);

  // --- THEO DÕI TRẠNG THÁI ĐĂNG NHẬP & REALTIME ---
  useEffect(() => {
    let unsubInv = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchData(user);
        
        // Listener Real-time cho tủ lạnh (Để số lượng cập nhật ngay khi sửa ở màn hình khác)
        const qInv = query(collection(db, "inventory"), where("email", "==", user.email));
        unsubInv = onSnapshot(qInv, (snapshot) => {
          processInventoryData(snapshot.docs);
        });
      } else {
        setIsLoading(false);
        setIsAdmin(false);
      }
    });

    // Cleanup: Dọn dẹp tất cả listeners khi thoát màn hình
    return () => {
      unsubscribeAuth();
      if (unsubInv) unsubInv();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FBFCFE' }}>
      <ScrollView 
        contentContainerStyle={styles.contentContainer} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000" colors={["#000"]} />
        }
      >
        
        {/* CARD: THÔNG BÁO QUẢN TRỊ (Chỉ Admin thấy) */}
        {isAdmin && pendingCount > 0 && (
          <TouchableOpacity 
            style={styles.card} 
            onPress={() => navigation.navigate('AdminDataManagement', { tab: 'suggested_recipes' })}
          >
            <View style={[styles.statusIndicator, { backgroundColor: '#096b3a' }]} />
            <View style={styles.cardMain}>
              <View style={styles.row}>
                <View style={[styles.tag, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="shield-checkmark" size={12} color="#096b3a" />
                  <Text style={[styles.tagText, { color: '#096b3a' }]}>QUẢN TRỊ VIÊN</Text>
                </View>
                <Text style={styles.timeText}>Mới</Text>
              </View>
              <Text style={styles.contentTitle}>Bạn có {pendingCount} yêu cầu phê duyệt công thức đang chờ xử lý.</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* CARD: THÔNG BÁO TỦ LẠNH (Cảnh báo hết hạn) */}
        {expiredCount > 0 && (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Pantry')}>
            <View style={[styles.statusIndicator, { backgroundColor: '#ff0015' }]} />
            <View style={styles.cardMain}>
              <View style={styles.row}>
                <View style={[styles.tag, { backgroundColor: '#FFF0F0' }]}>
                  <Ionicons name="alert-circle" size={12} color="#ff0015" />
                  <Text style={[styles.tagText, { color: '#ff0015' }]}>CẢNH BÁO HẾT HẠN</Text>
                </View>
                <Text style={styles.timeText}>Gấp</Text>
              </View>
              <Text style={styles.contentTitle}>Có {expiredCount} nguyên liệu sắp hết hạn. Hãy sử dụng ngay trước khi hỏng!</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* COMPONENT PHỤ: Thông báo công thức cá nhân */}
        <RecipeNotification navigation={navigation} />

        {/* EMPTY STATE: Khi không có thông báo nào */}
        {!isAdmin && expiredCount === 0 && (
           <View style={styles.emptyContainer}>
             <Ionicons name="leaf-outline" size={60} color="#E0E0E0" />
             <Text style={styles.emptyText}>Bạn đã xem hết thông báo</Text>
             <Text style={styles.emptySubText}>Vuốt xuống để làm mới dữ liệu</Text>
           </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contentContainer: { padding: 16, flexGrow: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  contentTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', lineHeight: 22 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { color: '#888', fontWeight: 'bold', marginTop: 10, fontSize: 16 },
  emptySubText: { color: '#CCC', fontSize: 13, marginTop: 5 }
});