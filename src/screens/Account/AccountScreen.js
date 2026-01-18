import React, { useLayoutEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView, SafeAreaView 
} from 'react-native';
import MenuImage from '../../components/MenuImage/MenuImage';

// --- BẢNG MÀU ĐỒNG BỘ ---
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
};

export default function AccountScreen({ navigation }) {

  const interests = ["Healthy", "Món Nhật", "BBQ"];
  const allergies = ["Đậu phộng", "Sữa"];

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

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Hẹn gặp lại bạn nhé?", [
      { text: "Hủy", style: "cancel" },
      { text: "Đăng xuất", onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) }
    ]);
  };

  const StatItem = ({ number, label }) => (
    <View style={{ alignItems: 'center', flex: 1 }}> 
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.textMain }}>{number}</Text>
      <Text style={{ fontSize: 12, color: COLORS.textSub, marginTop: 4 }}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* --- 1. PROFILE CARD & STATS --- */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4333/4333609.png' }} 
              style={styles.avatar} 
            />
            <View style={styles.editBadge}>
              <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/1159/1159633.png'}} style={{width: 12, height: 12, tintColor: '#fff'}} />
            </View>
          </View>
          
          <Text style={styles.name}>VibePlate Chef</Text>
          <Text style={styles.email}>chef@vibeplate.com</Text>

          <View style={styles.statsContainer}>
             <StatItem number="25" label="Món đã lưu" />
             <View style={styles.dividerVertical} />
             <StatItem number="12" label="Đã nấu" />
          </View>
        </View>

        {/* --- 2. BANNER --- */}
        <TouchableOpacity 
          style={styles.bannerBtn} 
          onPress={() => navigation.navigate('DishNomination')}
        >
          <View style={{flex: 1}}>
             <Text style={styles.bannerTitle}>Đóng góp công thức 👨‍🍳</Text>
             <Text style={styles.bannerSub}>Chia sẻ món ngon của bạn tới cộng đồng ngay!</Text>
          </View>
          <View style={styles.bannerIconBox}>
             <Text style={{fontSize: 24}}>📝</Text>
          </View>
        </TouchableOpacity>

        {/* --- 3. SỞ THÍCH --- */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
             <Text style={styles.cardTitle}>Hồ sơ khẩu vị</Text>
             <TouchableOpacity><Text style={styles.linkText}>Sửa</Text></TouchableOpacity>
          </View>

          <View style={{marginBottom: 15}}>
             <Text style={styles.label}>Yêu thích ❤️</Text>
             <View style={styles.tagRow}>
                {interests.map((item, index) => (
                  <View key={index} style={styles.tagGreen}>
                    <Text style={styles.textGreen}>{item}</Text>
                  </View>
                ))}
                <TouchableOpacity style={styles.addTagBtn}>
                   <Text style={{color: COLORS.primary}}>+ Thêm</Text>
                </TouchableOpacity>
             </View>
          </View>

          <View>
             <Text style={styles.label}>Dị ứng / Kiêng kỵ ⚠️</Text>
             <View style={styles.tagRow}>
                {allergies.map((item, index) => (
                  <View key={index} style={styles.tagRed}>
                    <Text style={styles.textRed}>{item}</Text>
                  </View>
                ))}
             </View>
          </View>
        </View>

        {/* --- 4. TÀI KHOẢN & CÀI ĐẶT --- */}
        <View style={styles.card}>
           <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => navigation.navigate('InfoAccount')}
           >
              <View style={[styles.menuIcon, {backgroundColor: COLORS.primaryLight}]}>
                 <Image 
                    source={{uri: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png'}} 
                    style={{width: 20, height: 20, tintColor: COLORS.primary}}
                 />
              </View>
              <Text style={styles.menuText}>Thông tin tài khoản</Text>
              <Text style={styles.arrow}>›</Text>
           </TouchableOpacity>
           <TouchableOpacity 
                style={[styles.menuItem, {borderBottomWidth: 0}]} 
                onPress={handleLogout}
           >
              <View style={[styles.menuIcon, {backgroundColor: COLORS.dangerBg}]}>
                 <Image 
                    source={{uri: 'https://cdn-icons-png.flaticon.com/512/1828/1828479.png'}} 
                    style={{width: 20, height: 20, tintColor: COLORS.danger}}
                 />
              </View>
              <Text style={[styles.menuText, {color: COLORS.danger}]}>Đăng xuất</Text>
           </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>VibePlate v1.0.2</Text>

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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textMain },
  linkText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  label: { fontSize: 13, color: COLORS.textSub, marginBottom: 10, fontWeight: '600' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagGreen: { backgroundColor: COLORS.primaryLight, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  textGreen: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  tagRed: { backgroundColor: COLORS.dangerBg, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  textRed: { color: COLORS.danger, fontWeight: '600', fontSize: 13 },
  addTagBtn: {
    borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed',
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20,
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