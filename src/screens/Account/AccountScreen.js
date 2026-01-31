import React, { useLayoutEffect, useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView, 
  SafeAreaView, ActivityIndicator, RefreshControl // <--- 1. Thêm RefreshControl
} from 'react-native';
import MenuImage from '../../components/MenuImage/MenuImage';

// --- IMPORT FIREBASE ---
import { auth, db } from '../../firebase/firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, collection, query, where, onSnapshot } from 'firebase/firestore'; 

const COLORS = {
  primary: '#000000',     
  primaryLight: '#d6dbd9', 
  secondary: '#FFC529',   
  bg: '#F8F9FD',          
  card: '#FFFFFF',        
  textMain: '#1A1D26',    
  textSub: '#A0A5B9',     
  danger: '#584343',      
  dangerBg: '#d3cbcb',
  admin: '#4A90E2',      
  adminBg: '#E1F0FF',    
};

export default function AccountScreen({ navigation }) {
  const user = auth.currentUser;
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [contributionCount, setContributionCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false); // <--- 2. State reload
  const [currentAvatar, setCurrentAvatar] = useState(user?.photoURL || 'https://cdn-icons-png.flaticon.com/512/4333/4333609.png');

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '', 
      headerStyle: { backgroundColor: COLORS.bg, shadowColor: 'transparent', elevation: 0 },
      headerLeft: () => (
        <View style={{ marginLeft: 10 }}>
           <MenuImage onPress={() => navigation.openDrawer()} />
        </View>
      )
    });
  }, []);

  // --- 3. HÀM RELOAD ---
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Ép Firebase cập nhật lại thông tin user auth (như emailVerified, photoURL mới nhất)
      if (auth.currentUser) {
        await auth.currentUser.reload();
      }
      // Vì chúng ta dùng onSnapshot, các dữ liệu Firestore sẽ tự động cập nhật ngay sau khi reload
    } catch (error) {
      console.log("Lỗi làm mới tài khoản:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    const userRef = doc(db, "users", user.email.toLowerCase());
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsAdmin(data.role === 'admin');
        if (data.photo_url) setCurrentAvatar(data.photo_url);
        else if (user.photoURL) setCurrentAvatar(user.photoURL);
      }
    });
    return () => unsubscribeUser();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const favQuery = query(collection(db, "favorites"), where("userId", "==", user.uid));
    const unsubscribeFav = onSnapshot(favQuery, (snapshot) => setFavoriteCount(snapshot.size));

    const contribQuery = query(collection(db, "suggested_recipes"), where("authorId", "==", user.email));
    const unsubscribeContrib = onSnapshot(contribQuery, (snapshot) => setContributionCount(snapshot.size));

    return () => {
        unsubscribeFav();
        unsubscribeContrib();
    };
  }, [user]);

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      { text: "Đăng xuất", onPress: async () => {
          try { await signOut(auth); } catch (error) { Alert.alert("Lỗi", error.message); }
      }}
    ]);
  };

  const StatItem = ({ number, label, onPress }) => (
    <TouchableOpacity onPress={onPress} style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.textMain }}>{number}</Text>
      <Text style={{ fontSize: 12, color: COLORS.textSub, marginTop: 4 }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        // --- 4. THÊM REFRESH CONTROL VÀO SCROLLVIEW ---
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh} 
            colors={[COLORS.primary]} // Android
            tintColor={COLORS.primary} // iOS
          />
        }
      >
        
        {/* PROFILE CARD & STATS */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: currentAvatar }} style={styles.avatar} />
            {isAdmin && (
               <View style={[styles.editBadge, {backgroundColor: COLORS.admin}]}>
                 <Text style={{fontSize: 8, color: '#fff', fontWeight: 'bold'}}>ADMIN</Text>
               </View>
            )}
          </View>
          
          <Text style={styles.name}>{user?.displayName || "VibePlate Chef"}</Text>
          <Text style={styles.email}>{user?.email || "No Email"}</Text>

          <View style={styles.statsContainer}>
            <StatItem 
              number={favoriteCount} 
              label="Món yêu thích" 
              onPress={() => navigation.navigate('SavedDishes')} 
            />
            <View style={styles.dividerVertical} />
            <StatItem 
              number={contributionCount} 
              label="Món đã đóng góp" 
              onPress={() => navigation.navigate('ContributedDishes')}
            />
          </View>
        </View>

        {/* BANNER ĐÓNG GÓP */}
        <TouchableOpacity style={styles.bannerBtn} onPress={() => navigation.navigate('DishNomination')}>
          <View style={{flex: 1}}>
             <Text style={styles.bannerTitle}>Đóng góp công thức 👨‍🍳</Text>
             <Text style={styles.bannerSub}>Chia sẻ món ngon của bạn tới cộng đồng ngay!</Text>
          </View>
          <View style={styles.bannerIconBox}>
             <Text style={{fontSize: 24}}>📝</Text>
          </View>
        </TouchableOpacity>

        {/* MENU OPTIONS */}
        <View style={styles.card}>
           {isAdmin && (
             <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AdminDataManagement')}>
                <View style={[styles.menuIcon, {backgroundColor: COLORS.adminBg}]}>
                   <Image 
                     source={{uri: 'https://cdn-icons-png.flaticon.com/512/2345/2345338.png'}} 
                     style={{width: 20, height: 20, tintColor: COLORS.admin}}
                   />
                </View>
                <Text style={styles.menuText}>Quản lý dữ liệu</Text>
                <Text style={styles.arrow}>›</Text>
             </TouchableOpacity>
           )}

           <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('InfoAccount')}>
              <View style={[styles.menuIcon, {backgroundColor: COLORS.primaryLight}]}>
                 <Image 
                   source={{uri: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png'}} 
                   style={{width: 20, height: 20, tintColor: COLORS.primary}}
                 />
              </View>
              <Text style={styles.menuText}>Thông tin tài khoản</Text>
              <Text style={styles.arrow}>›</Text>
           </TouchableOpacity>
           
           <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Personalization')}>
              <View style={[styles.menuIcon, {backgroundColor: '#FFF4E5'}]}> 
                 <Image 
                   source={{uri: 'https://cdn-icons-png.flaticon.com/512/2099/2099122.png'}} 
                   style={{width: 20, height: 20, tintColor: '#FF9F43'}}
                 />
              </View>
              <Text style={styles.menuText}>Cá nhân hóa</Text>
              <Text style={styles.arrow}>›</Text>
           </TouchableOpacity>

           <TouchableOpacity style={[styles.menuItem, {borderBottomWidth: 0}]} onPress={handleLogout}>
              <View style={[styles.menuIcon, {backgroundColor: COLORS.dangerBg}]}>
                 <Image 
                   source={{uri: 'https://cdn-icons-png.flaticon.com/512/1828/1828479.png'}} 
                   style={{width: 20, height: 20, tintColor: COLORS.danger}}
                 />
              </View>
              <Text style={[styles.menuText, {color: COLORS.danger}]}>Đăng xuất</Text>
           </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>VibePlate v1.0.3</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  profileSection: { alignItems: 'center', marginBottom: 25 },
  avatarContainer: {
    position: 'relative', marginBottom: 15,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 5,
  },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: '#fff' },
  editBadge: {
    position: 'absolute', bottom: 0, right: 5, backgroundColor: COLORS.primary,
    padding: 8, borderRadius: 20, borderWidth: 3, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center'
  },
  name: { fontSize: 24, fontWeight: '800', color: COLORS.textMain, marginBottom: 2 },
  email: { fontSize: 14, color: COLORS.textSub, marginBottom: 20 },
  statsContainer: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16,
    paddingVertical: 15, paddingHorizontal: 20, width: '100%',
    justifyContent: 'space-around', alignItems: 'center',
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  dividerVertical: { width: 1, height: 40, backgroundColor: '#F0F0F0' },
  bannerBtn: {
    flexDirection: 'row', backgroundColor: COLORS.textMain, borderRadius: 20,
    padding: 20, alignItems: 'center', marginBottom: 20,
    shadowColor: COLORS.textMain, shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 4,
  },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  bannerSub: { color: '#ccc', fontSize: 12 },
  bannerIconBox: {
    backgroundColor: 'rgba(255,255,255,0.2)', width: 44, height: 44,
    borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 15,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 5, elevation: 2,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 15,
    borderBottomWidth: 1, borderBottomColor: '#F5F6FA',
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15,
  },
  menuText: { flex: 1, fontSize: 15, fontWeight: '500', color: COLORS.textMain },
  arrow: { fontSize: 20, color: '#ccc' },
  versionText: { textAlign: 'center', color: '#ccc', fontSize: 12, marginTop: 10 },
});