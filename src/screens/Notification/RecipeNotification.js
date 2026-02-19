import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { db, auth } from '../../firebase/firebaseConfig';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'; // Thêm orderBy
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function RecipeNotification() {
  const navigation = useNavigation(); 
  const [notifications, setNotifications] = useState([]);

  const getRelativeTime = (time) => {
    if (!time) return "Vừa xong";
    const date = time.toDate ? time.toDate() : new Date(time);
    // Xử lý chuỗi Tiếng Việt mượt mà hơn
    let relative = formatDistanceToNow(date, { addSuffix: true, locale: vi });
    return relative.replace('khoảng ', '').replace('dưới ', '');
  };

  useEffect(() => {
    // Sử dụng onAuthStateChanged để chắc chắn user đã load xong
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setNotifications([]);
        return;
      }

      // Tối ưu: Sắp xếp ngay từ câu truy vấn Firestore
      const q = query(
        collection(db, "notification"), 
        where("email", "==", user.email),
        orderBy("time", "desc") // Phải tạo index trên Firestore nếu dùng cả where và orderBy
      );

      const unsubscribeSnap = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setNotifications(list);
      }, (error) => {
        console.error("Lỗi listener thông báo:", error);
      });

      return () => unsubscribeSnap();
    });

    return () => unsubscribeAuth();
  }, []);

  if (notifications.length === 0) return null;

  const getStatusConfig = (type) => {
    const configs = {
      approved: { label: 'ĐÃ DUYỆT', color: '#4CAF50', icon: 'checkmark-circle' },
      rejected: { label: 'TỪ CHỐI', color: '#F44336', icon: 'close-circle' },
      needs_edit: { label: 'CẦN CHỈNH SỬA', color: '#2196F3', icon: 'pencil-sharp' },
      default: { label: 'THÔNG BÁO', color: '#757575', icon: 'mail' }
    };
    return configs[type] || configs.default;
  };

  return (
    <View style={styles.wrapper}>
      {notifications.map((item) => {
        const config = getStatusConfig(item.type);
        return (
          <TouchableOpacity 
            key={item.id}
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ContributedDishes')}
          >
            <View style={[styles.statusIndicator, { backgroundColor: config.color }]} />
            <View style={styles.cardMain}>
              <View style={styles.row}>
                <View style={[styles.tag, { backgroundColor: config.color + '15' }]}>
                  <Ionicons name={config.icon} size={12} color={config.color} />
                  <Text style={[styles.tagText, { color: config.color }]}>{config.label}</Text>
                </View>
                <Text style={styles.timeText}>{getRelativeTime(item.time)}</Text>
              </View>
              
              <Text style={styles.contentTitle}>{item.content}</Text>
              
              {item.feedback && (
                <View style={styles.feedbackBox}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color="#888" style={{marginBottom: 4}} />
                  <Text style={styles.feedbackText} numberOfLines={3}>
                    "{item.feedback}"
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ... styles giữ nguyên (có thể thêm style cho icon trong feedbackBox nếu muốn)
const styles = StyleSheet.create({
  wrapper: { marginBottom: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
  },
  statusIndicator: { width: 6 },
  cardMain: { flex: 1, padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tag: { 
    flexDirection: 'row', alignItems: 'center', 
    paddingHorizontal: 8, paddingVertical: 4, 
    borderRadius: 8, gap: 4 
  },
  tagText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  timeText: { fontSize: 11, color: '#BBB' },
  contentTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', lineHeight: 20 },
  feedbackBox: { 
    marginTop: 10, padding: 10, 
    backgroundColor: '#F8F9FA', borderRadius: 12,
    borderLeftWidth: 2, borderLeftColor: '#DDD'
  },
  feedbackText: { fontSize: 13, color: '#666', fontStyle: 'italic', lineHeight: 18 }
});