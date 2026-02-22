import React, { useLayoutEffect, useState, useEffect, useCallback, memo, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView, 
  SafeAreaView, ActivityIndicator, RefreshControl 
} from 'react-native';
import MenuImage from '../../components/MenuImage/MenuImage';
import { auth, db } from '../../firebase/firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, collection, query, where, onSnapshot } from 'firebase/firestore';

const COLORS = {
  primary: '#000', primaryLight: '#d6dbd9', secondary: '#FFC529', bg: '#F8F9FD',
  card: '#FFF', textMain: '#1A1D26', textSub: '#A0A5B9', danger: '#584343',
  dangerBg: '#d3cbcb', admin: '#4A90E2', adminBg: '#E1F0FF',
};

// Memoize StatItem để tránh re-render khi các phần khác của màn hình thay đổi
const StatItem = memo(({ number, label, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.statItem}>
    <Text style={styles.statNumber}>{number}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </TouchableOpacity>
));

export default function AccountScreen({ navigation }) {
  const user = auth.currentUser;
  const [userData, setUserData] = useState({
    isAdmin: false,
    favoriteCount: 0,
    contributionCount: 0,
    avatar: user?.photoURL || 'https://cdn-icons-png.flaticon.com/512/4333/4333609.png'
  });
  const [refreshing, setRefreshing] = useState(false);

  // 1. Cấu hình Header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerStyle: { backgroundColor: COLORS.bg, elevation: 0, shadowOpacity: 0 },
      headerLeft: () => (
        <View style={{ marginLeft: 15 }}>
          <MenuImage onPress={() => navigation.openDrawer()} />
        </View>
      ),
    });
  }, [navigation]);

  // 2. Logic làm mới (Refresh)
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (auth.currentUser) await auth.currentUser.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // 3. Hợp nhất các Firebase Listeners (Tăng tốc độ tải dữ liệu)
  useEffect(() => {
    if (!user?.email) return;

    const email = user.email.toLowerCase();
    
    // Listeners cho Profile, Favorites và Contributions
    const unsubUser = onSnapshot(doc(db, "users", email), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserData(prev => ({ 
          ...prev, 
          isAdmin: data.role === 'admin',
          avatar: data.photo_url || user.photoURL || prev.avatar
        }));
      }
    });

    const unsubFav = onSnapshot(query(collection(db, "favorites"), where("email", "==", email)), 
      (snap) => setUserData(prev => ({ ...prev, favoriteCount: snap.size }))
    );

    const unsubContrib = onSnapshot(query(collection(db, "suggested_recipes"), where("authorId", "==", email)), 
      (snap) => setUserData(prev => ({ ...prev, contributionCount: snap.size }))
    );

    return () => { unsubUser(); unsubFav(); unsubContrib(); };
  }, [user]);

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn muốn thoát tài khoản?", [
      { text: "Hủy", style: "cancel" },
      { text: "Đăng xuất", onPress: () => signOut(auth).catch(e => Alert.alert("Lỗi", e.message)) }
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: userData.avatar }} style={styles.avatar} />
            {userData.isAdmin && <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>ADMIN</Text></View>}
          </View>
          <Text style={styles.userName}>{user?.displayName || "VibePlate Chef"}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          <View style={styles.statsCard}>
            <StatItem number={userData.favoriteCount} label="Yêu thích" onPress={() => navigation.navigate('SavedDishes')} />
            <View style={styles.vDivider} />
            <StatItem number={userData.contributionCount} label="Đóng góp" onPress={() => navigation.navigate('ContributedDishes')} />
          </View>
        </View>

        <TouchableOpacity style={styles.banner} onPress={() => navigation.navigate('DishNomination')}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Đóng góp công thức 👨‍🍳</Text>
            <Text style={styles.bannerSub}>Chia sẻ món ngon tới cộng đồng!</Text>
          </View>
          <Text style={styles.bannerEmoji}>📝</Text>
        </TouchableOpacity>

        <View style={styles.menuCard}>
          {userData.isAdmin && (
            <MenuItem icon="https://cdn-icons-png.flaticon.com/512/2345/2345338.png" title="Quản lý dữ liệu" 
              color={COLORS.admin} bg={COLORS.adminBg} onPress={() => navigation.navigate('AdminDataManagement')} />
          )}
          <MenuItem icon="https://cdn-icons-png.flaticon.com/512/1077/1077114.png" title="Thông tin tài khoản" 
            color={COLORS.primary} bg={COLORS.primaryLight} onPress={() => navigation.navigate('InfoAccount')} />
          <MenuItem icon="https://cdn-icons-png.flaticon.com/512/2099/2099122.png" title="Cá nhân hóa" 
            color="#FF9F43" bg="#FFF4E5" onPress={() => navigation.navigate('Personalization')} />
          <MenuItem icon="https://cdn-icons-png.flaticon.com/512/1828/1828479.png" title="Đăng xuất" 
            color={COLORS.danger} bg={COLORS.dangerBg} onPress={handleLogout} isLast />
        </View>
        <Text style={styles.version}>VibePlate v1.0.3</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const MenuItem = ({ icon, title, color, bg, onPress, isLast }) => (
  <TouchableOpacity style={[styles.menuItem, isLast && { borderBottomWidth: 0 }]} onPress={onPress}>
    <View style={[styles.menuIconBox, { backgroundColor: bg }]}>
      <Image source={{ uri: icon }} style={[styles.menuIconImage, { tintColor: color }]} />
    </View>
    <Text style={[styles.menuText, { color: color === COLORS.danger ? color : COLORS.textMain }]}>{title}</Text>
    <Text style={styles.arrow}>›</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { padding: 20, paddingBottom: 40 },
  profileSection: { alignItems: 'center', marginBottom: 25 },
  avatarWrapper: {
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
  },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#FFF' },
  adminBadge: { 
    position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.admin, 
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 2, borderColor: '#FFF' 
  },
  adminBadgeText: { fontSize: 8, color: '#FFF', fontWeight: 'bold' },
  userName: { fontSize: 22, fontWeight: '800', color: COLORS.textMain, marginTop: 15 },
  userEmail: { fontSize: 13, color: COLORS.textSub, marginBottom: 20 },
  statsCard: { 
    flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, padding: 15, width: '100%',
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: COLORS.textMain },
  statLabel: { fontSize: 11, color: COLORS.textSub, marginTop: 2 },
  vDivider: { width: 1, height: '100%', backgroundColor: '#F0F0F0' },
  banner: { 
    flexDirection: 'row', backgroundColor: COLORS.textMain, borderRadius: 18, padding: 18, alignItems: 'center', marginBottom: 20 
  },
  bannerTitle: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  bannerSub: { color: '#AAA', fontSize: 11, marginTop: 2 },
  bannerEmoji: { fontSize: 22, marginLeft: 10 },
  menuCard: { backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 15, elevation: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F8F9FD' },
  menuIconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuIconImage: { width: 18, height: 18 },
  menuText: { flex: 1, fontSize: 14, fontWeight: '500' },
  arrow: { fontSize: 18, color: '#CCC' },
  version: { textAlign: 'center', color: '#DDD', fontSize: 11, marginTop: 15 }
});