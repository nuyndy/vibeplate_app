import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { db, auth } from '../../firebase/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale'; // Import ngôn ngữ Tiếng Việt

export default function RecipeNotification() {
  const navigation = useNavigation(); 
  const [notifications, setNotifications] = useState([]);

  // Hàm xử lý thời gian thân thiện
  const getRelativeTime = (time) => {
    if (!time) return "Vừa xong";
    
    // Chuyển Timestamp Firestore sang Date object
    const date = time.toDate ? time.toDate() : new Date(time);
    
    // Tạo chuỗi "X phút trước", "X giờ trước"...
    let relative = formatDistanceToNow(date, { addSuffix: true, locale: vi });
    
    // Tùy chỉnh một chút để Tiếng Việt tự nhiên hơn
    return relative.replace('khoảng ', '');
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, "notification"), where("email", "==", user.email));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => (b.time?.seconds || 0) - (a.time?.seconds || 0));
      setNotifications(list);
    });
    return () => unsubscribe();
  }, []);

  if (notifications.length === 0) return null;

  const getStatusConfig = (type) => {
    switch (type) {
      case 'approved': return { label: 'CHÚC MỪNG MÓN ĂN BẠN ĐÓNG GÓP ĐÃ DUYỆT', color: '#4CAF50', icon: 'checkmark-circle' };
      case 'rejected': return { label: 'MÓN ĂN BẠN ĐÓNG GÓP BỊ TỪ CHỐI', color: '#F44336', icon: 'close-circle' };
      case 'needs_edit': return { label: 'MÓN ĂN BẠN ĐÓNG GÓP CẦN CHỈNH SỬA', color: '#2196F3', icon: 'pencil-sharp' };
      default: return { label: 'THÔNG BÁO', color: '#757575', icon: 'mail' };
    }
  };

  return (
    <View style={styles.wrapper}>
      {notifications.map((item) => {
        const config = getStatusConfig(item.type);
        return (
          <TouchableOpacity 
            key={item.id}
            style={styles.card}
            onPress={() => navigation.navigate('ContributedDishes')}
          >
            <View style={[styles.statusIndicator, { backgroundColor: config.color }]} />
            <View style={styles.cardMain}>
              <View style={styles.row}>
                <View style={[styles.tag, { backgroundColor: config.color + '15' }]}>
                  <Ionicons name={config.icon} size={12} color={config.color} />
                  <Text style={[styles.tagText, { color: config.color }]}>{config.label}</Text>
                </View>
                {/* HIỂN THỊ THỜI GIAN THÂN THIỆN TẠI ĐÂY */}
                <Text style={styles.timeText}>{getRelativeTime(item.time)}</Text>
              </View>
              <Text style={styles.contentTitle} numberOfLines={2}>{item.content}</Text>
              {item.feedback && (
                <View style={styles.feedbackBox}>
                  <Text style={styles.feedbackText} numberOfLines={3}>
                    <Text style={{fontWeight: 'bold', color: '#555'}}>Ghi chú: </Text>
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