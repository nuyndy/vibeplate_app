import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { db, auth } from '../../firebase/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

// 1. Import Hook điều hướng
import { useNavigation } from '@react-navigation/native';

export default function RecipeNotification() {
  // 2. Khai báo biến navigation
  const navigation = useNavigation(); 
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "notification"), 
      where("email", "==", user.email) 
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => (b.time?.seconds || 0) - (a.time?.seconds || 0));
      setNotifications(list);
    });

    return () => unsubscribe();
  }, []);

  if (notifications.length === 0) return null;

  const getStatusStyle = (type) => {
    switch (type) {
      case 'approved': return { label: 'CHÚC MỪNG MÓN ĂN BẠN ĐÓNG GÓP ĐÃ DUYỆT', textColor: '#2E7D32' };
      case 'rejected': return { label: 'MÓN ĂN BẠN ĐÓNG GÓP BỊ TỪ CHỐI', textColor: '#C62828' };
      case 'needs_edit': return { label: 'MÓN ĂN BẠN ĐÓNG GÓP CẦN CHỈNH SỬA', textColor: '#1565C0' };
      default: return { label: 'THÔNG BÁO', textColor: '#424242' };
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Thông báo của bạn</Text>
      
      {notifications.map((item) => {
        const styleConfig = getStatusStyle(item.type);

        return (
          <TouchableOpacity 
            key={item.id}
            style={[styles.card, { borderLeftColor: styleConfig.textColor }]}
            // 3. Sự kiện bấm: Chuyển trang
            onPress={() => {
                // Lưu ý: Chuỗi bên trong ngoặc '' phải TRÙNG KHỚP với tên 
                // bạn dùng trong App.js (Stack.Screen name="...")
                navigation.navigate('ContributedDishes'); 
            }}
          >
            <View style={styles.headerRow}>
                <Text style={[styles.statusLabel, { color: styleConfig.textColor }]}>
                    {styleConfig.label}
                </Text>
            </View>

            <Text style={styles.content}>{item.content}</Text>

            {item.feedback ? (
                <View style={styles.feedbackContainer}>
                    <Text style={styles.feedbackLabel}>Lý do:</Text>
                    <Text style={styles.feedbackText}>"{item.feedback}"</Text>
                </View>
            ) : null}

          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20, paddingHorizontal: 5 },
  headerTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#1a1a1a', marginLeft: 5 },
  card: {
    backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 10,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
    borderLeftWidth: 4, 
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statusLabel: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  content: { fontSize: 15, color: '#333', lineHeight: 22, fontWeight: '500' },
  feedbackContainer: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  feedbackLabel: { fontSize: 11, color: '#888', marginBottom: 2 },
  feedbackText: { fontSize: 14, color: '#555', fontStyle: 'italic', lineHeight: 20 }
});