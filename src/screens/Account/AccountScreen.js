import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView } from 'react-native';
// Đảm bảo đường dẫn này đúng với dự án của bạn
import MenuImage from '../../components/MenuImage/MenuImage';

export default function AccountScreen({ navigation }) {

  const interests = ["Eat Clean", "Món Nhật", "Đồ ngọt", "Healthy", "BBQ"];
  
  // Cấu hình Header có nút Menu
  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Hồ sơ của tôi',
      headerLeft: () => (
        <MenuImage onPress={() => navigation.openDrawer()} />
      ),
      headerRight: () => <View />,
    });
  }, []);

  // Xử lý đăng xuất
  const handleLogout = () => {
    Alert.alert(
      "Đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất không?",
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Đồng ý", 
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* --- PHẦN 1: HEADER PROFILE --- */}
      <View style={styles.profileHeader}>
        <Image 
          source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }} 
          style={styles.avatar} 
        />
        <Text style={styles.name}>Admin VibePlate</Text>
        <Text style={styles.email}>admin@vibeplate.com</Text>
      </View>

      {/* --- PHẦN 2: SỞ THÍCH --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sở thích ẩm thực</Text>
        <View style={styles.tagsContainer}>
          {interests.map((item, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{item}</Text>
            </View>
          ))}
          <TouchableOpacity style={[styles.tag, styles.addTag]}>
             <Text style={[styles.tagText, {color: '#2cd18a'}]}>+ Thêm</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- PHẦN 3: NÚT GỢI Ý MÓN ĂN (QUAN TRỌNG) --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gợi ý món ăn</Text>
        <Text style={styles.hintText}>
          Dựa trên nguyên liệu có trong tủ lạnh của bạn
        </Text>
        
        {/* Nút bấm chuyển sang màn hình RecipeSuggestion */}
        <TouchableOpacity 
          style={styles.suggestionBtn} 
          onPress={() => navigation.navigate('RecipeSuggestion')}
        >
          <Image 
            source={{uri: 'https://cdn-icons-png.flaticon.com/512/3565/3565418.png'}} 
            style={styles.btnIcon} 
          />
          <View style={{flex: 1}}>
            <Text style={styles.btnTitle}>Xem thực đơn hôm nay</Text>
            <Text style={styles.btnSubtitle}>Nhấn để xem công thức chi tiết</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* --- PHẦN 4: THÔNG TIN CHUNG --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin chung</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Ngày tham gia:</Text>
          <Text style={styles.value}>15/01/2026</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Cấp bậc:</Text>
          <Text style={styles.value}>Thành viên VIP</Text>
        </View>
      </View>

      {/* --- PHẦN 5: ĐĂNG XUẤT --- */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Đăng xuất ngay</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  contentContainer: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 50,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: '#2cd18a',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    width: '90%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
    color: '#2cd18a',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    color: '#666',
    fontSize: 15,
  },
  value: {
    fontWeight: '600',
    color: '#333',
    fontSize: 15,
  },
  
  // Style cho phần Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#e6f7f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  addTag: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2cd18a',
    borderStyle: 'dashed',
  },
  tagText: {
    color: '#2cd18a',
    fontWeight: 'bold',
    fontSize: 13,
  },

  // Style cho nút Gợi ý (Quan trọng)
  hintText: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  suggestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7f0', 
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c2ebd9',
  },
  btnIcon: {
    width: 40,
    height: 40,
    marginRight: 15,
  },
  btnTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2cd18a',
  },
  btnSubtitle: {
    fontSize: 12,
    color: '#555',
  },
  arrow: {
    fontSize: 28,
    color: '#2cd18a',
    fontWeight: '200',
    paddingBottom: 5,
  },

  // Style nút Logout
  logoutButton: {
    width: '90%',
    backgroundColor: '#ff4d4d',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});