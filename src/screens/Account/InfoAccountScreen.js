import React, { useLayoutEffect, useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView, 
  TextInput, ScrollView, Alert, ActivityIndicator, RefreshControl 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// --- IMPORT FIREBASE ---
import { auth, db } from '../../firebase/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

const CLOUD_NAME = "devpumtqu";
const UPLOAD_PRESET = "VibePlate";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

const COLORS = {
  primary: '#000000',
  bg: '#F8F9FD',
  card: '#FFFFFF',
  textMain: '#1A1D26',
  textSub: '#A0A5B9',
  border: '#F0F0F0',
};

export default function InfoAccount({ navigation }) {
  const user = auth.currentUser;

  // --- STATES ---
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [avatar, setAvatar] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // State cho reload

  // --- HÀM LẤY DỮ LIỆU (Tách riêng để dùng chung cho useEffect và onRefresh) ---
  const fetchUserData = async () => {
    if (!user) return;
    try {
      // 1. Set dữ liệu từ Auth trước
      setName(user.displayName || '');
      setEmail(user.email || '');
      let currentAvatar = user.photoURL || 'https://cdn-icons-png.flaticon.com/512/4333/4333609.png';
      setAvatar(currentAvatar);

      // 2. Lấy dữ liệu chi tiết từ Firestore
      const docRef = doc(db, "users", user.email.toLowerCase());
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.location) setLocation(data.location);
        if (data.photo_url) setAvatar(data.photo_url);
        if (data.displayName) setName(data.displayName);
      }
    } catch (error) {
      console.log("Lỗi tải dữ liệu user:", error);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user]);

  // --- XỬ LÝ RELOAD ---
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Reload lại Firebase Auth Profile để đảm bảo dữ liệu mới nhất
    await user.reload(); 
    await fetchUserData();
    setRefreshing(false);
  }, []);

  // --- CONFIG HEADER ---
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: true,
      headerTitle: "Thông tin cá nhân",
      headerTintColor: COLORS.textMain,
      headerLeft: () => (
         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
           <Image 
             source={{uri: 'https://cdn-icons-png.flaticon.com/512/271/271220.png'}} 
             style={{width: 20, height: 20, tintColor: COLORS.textMain}} 
           />
         </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Cần quyền", "Cần cấp quyền truy cập thư viện ảnh.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  const uploadToCloudinary = async (imageUri) => {
    const data = new FormData();
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image`;

    data.append('file', { uri: imageUri, name: filename, type });
    data.append('upload_preset', UPLOAD_PRESET);
    data.append('cloud_name', CLOUD_NAME);

    try {
      const res = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: data,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const result = await res.json();
      return result.secure_url;
    } catch (error) {
      console.log("Upload Error:", error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    try {
      let finalPhotoUrl = avatar; 

      if (avatar && avatar.startsWith('file://')) {
          finalPhotoUrl = await uploadToCloudinary(avatar);
      }

      await updateProfile(user, {
        displayName: name,
        photoURL: finalPhotoUrl 
      });

      const userRef = doc(db, "users", user.email.toLowerCase());
      await updateDoc(userRef, {
        displayName: name,
        photo_url: finalPhotoUrl,
        location: location
      });

      setAvatar(finalPhotoUrl);
      Alert.alert("Thành công", "Thông tin đã được cập nhật!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể cập nhật: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ label, value, onChange, icon, editable = true }) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, !editable && {backgroundColor: '#EFEFEF'}]}>
        <Image source={{uri: icon}} style={[styles.inputIcon, !editable && {opacity: 0.5}]} />
        <TextInput 
          style={[styles.input, !editable && {color: '#888'}]} 
          value={value} 
          onChangeText={onChange} 
          placeholderTextColor="#ccc"
          editable={editable}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        
        {/* AVATAR */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
             <Image source={{ uri: avatar }} style={styles.avatar} />
             <TouchableOpacity style={styles.cameraIcon} onPress={pickImage}>
               <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/685/685655.png'}} style={{width: 16, height: 16, tintColor: '#fff'}} />
             </TouchableOpacity>
          </View>
        </View>

        {/* FORM */}
        <View style={styles.formSection}>
          <InputField 
            label="Họ và tên" 
            value={name} onChange={setName}
            icon="https://cdn-icons-png.flaticon.com/512/1077/1077114.png"
          />
          <InputField 
            label="Email" 
            value={email} onChange={setEmail}
            icon="https://cdn-icons-png.flaticon.com/512/542/542638.png"
            editable={false} 
          />
          <InputField 
            label="Địa chỉ" 
            value={location} onChange={setLocation}
            icon="https://cdn-icons-png.flaticon.com/512/535/535239.png"
          />
        </View>

        {/* BUTTON */}
        <TouchableOpacity 
            style={[styles.saveBtn, loading && {opacity: 0.7}]} 
            onPress={handleSave}
            disabled={loading}
        >
          {loading ? (
             <ActivityIndicator size="small" color="#fff" />
          ) : (
             <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { padding: 20, paddingTop: 100 },
  backBtn: { padding: 8, backgroundColor: '#fff', borderRadius: 12, marginLeft: 20, marginTop: 10, elevation: 2 },
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: '#fff' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.primary, padding: 10, borderRadius: 20, borderWidth: 3, borderColor: '#fff' },
  formSection: { backgroundColor: COLORS.card, borderRadius: 20, padding: 20, marginBottom: 30, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, color: COLORS.textSub, marginBottom: 8, fontWeight: '600' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F6FA', borderRadius: 12, paddingHorizontal: 15, height: 52 },
  inputIcon: { width: 20, height: 20, tintColor: COLORS.textSub, marginRight: 12 },
  input: { flex: 1, color: COLORS.textMain, fontWeight: '600', fontSize: 15 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 16, height: 56, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});