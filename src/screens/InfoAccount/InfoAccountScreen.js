import React, { useLayoutEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView, TextInput, ScrollView, Alert 
} from 'react-native';
import BackButton from '../../components/BackButton/BackButton'; // Đảm bảo bạn có component BackButton hoặc dùng icon thay thế

// --- BẢNG MÀU ĐỒNG BỘ ---
const COLORS = {
  primary: '#000000',
  bg: '#F8F9FD',
  card: '#FFFFFF',
  textMain: '#1A1D26',
  textSub: '#A0A5B9',
  border: '#F0F0F0',
};

export default function InfoAccount({ navigation }) {
  // State giả lập dữ liệu người dùng
  const [name, setName] = useState('VibePlate Chef');
  const [email, setEmail] = useState('chef@vibeplate.com');
  const [phone, setPhone] = useState('0987654321');
  const [address, setAddress] = useState('Hà Nội, Việt Nam');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: true,
      headerTitle: "Thông tin cá nhân",
      headerTintColor: COLORS.textMain,
      headerLeft: () => (
         <View style={styles.backButtonWrapper}>
            {/* Nếu bạn chưa có component BackButton, hãy thay bằng TouchableOpacity chứa icon back */}
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Image 
                source={{uri: 'https://cdn-icons-png.flaticon.com/512/271/271220.png'}} 
                style={{width: 20, height: 20, tintColor: COLORS.textMain}} 
              />
            </TouchableOpacity>
         </View>
      ),
    });
  }, [navigation]);

  const handleSave = () => {
    Alert.alert("Thành công", "Thông tin đã được cập nhật!");
    navigation.goBack();
  };

  // Component nhập liệu tái sử dụng
  const InputField = ({ label, value, onChange, icon }) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Image source={{uri: icon}} style={styles.inputIcon} />
        <TextInput 
          style={styles.input} 
          value={value} 
          onChangeText={onChange} 
          placeholderTextColor="#ccc"
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* AVATAR UPLOAD */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
             <Image 
               source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4333/4333609.png' }} 
               style={styles.avatar} 
             />
             <TouchableOpacity style={styles.cameraIcon}>
               <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/685/685655.png'}} style={{width: 16, height: 16, tintColor: '#fff'}} />
             </TouchableOpacity>
          </View>
        </View>

        {/* FORM */}
        <View style={styles.formSection}>
          <InputField 
            label="Họ và tên" 
            value={name} 
            onChange={setName}
            icon="https://cdn-icons-png.flaticon.com/512/1077/1077114.png"
          />
          <InputField 
            label="Email" 
            value={email} 
            onChange={setEmail}
            icon="https://cdn-icons-png.flaticon.com/512/542/542638.png"
          />
          <InputField 
            label="Số điện thoại" 
            value={phone} 
            onChange={setPhone}
            icon="https://cdn-icons-png.flaticon.com/512/455/455705.png"
          />
          <InputField 
            label="Địa chỉ" 
            value={address} 
            onChange={setAddress}
            icon="https://cdn-icons-png.flaticon.com/512/535/535239.png"
          />
        </View>

        {/* BUTTON */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 80, // Để tránh header
  },
  backButtonWrapper: {
    marginLeft: 20,
    marginTop: 10,
  },
  backBtn: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  
  // Avatar
  avatarSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },

  // Form
  formSection: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSub,
    marginBottom: 8,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
  },
  inputIcon: {
    width: 20,
    height: 20,
    tintColor: COLORS.textSub,
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: COLORS.textMain,
    fontWeight: '600',
  },

  // Button
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});