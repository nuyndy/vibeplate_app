import React, { useLayoutEffect, useState, useEffect, useCallback, memo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView, 
  TextInput, ScrollView, Alert, ActivityIndicator, RefreshControl 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// --- IMPORT FIREBASE ---
import { auth, db } from '../../firebase/firebaseConfig';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

const COLORS = {
  primary: '#000000',
  bg: '#F8F9FD',
  card: '#FFFFFF',
  textMain: '#1A1D26',
  textSub: '#A0A5B9',
  border: '#F0F0F0',
};

// Component Input tách rời để tối ưu render
const InputField = memo(({ label, value, onChange, icon, editable = true }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputWrapper, !editable && styles.disabledInput]}>
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
));

export default function InfoAccount({ navigation }) {
  const user = auth.currentUser;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    location: '',
    avatar: 'https://cdn-icons-png.flaticon.com/512/4333/4333609.png'
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserData = useCallback(async () => {
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.email.toLowerCase());
      const docSnap = await getDoc(docRef);
      
      const firestoreData = docSnap.exists() ? docSnap.data() : {};
      
      setFormData({
        name: firestoreData.displayName || user.displayName || '',
        email: user.email || '',
        location: firestoreData.location || '',
        avatar: firestoreData.photo_url || user.photoURL || 'https://cdn-icons-png.flaticon.com/512/4333/4333609.png'
      });
    } catch (error) {
      console.error("Lỗi tải dữ liệu user:", error);
    }
  }, [user]);

  useEffect(() => { fetchUserData(); }, [fetchUserData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await user?.reload();
    await fetchUserData();
    setRefreshing(false);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: true,
      headerTitle: "Thông tin cá nhân",
      headerTitleStyle: { fontWeight: 'bold' },
      headerLeft: () => (
         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Image 
              source={{uri: 'https://cdn-icons-png.flaticon.com/512/271/271220.png'}} 
              style={{width: 18, height: 18, tintColor: COLORS.textMain}} 
            />
         </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Cần quyền", "Ứng dụng cần truy cập ảnh để đổi avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setFormData(prev => ({ ...prev, avatar: result.assets[0].uri }));
    }
  };

  // --- HÀM UPLOAD FIX LỖI ---
  const uploadToCloudinary = async (imageUri) => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      console.error("Lỗi: Thiếu cấu hình Cloudinary trong .env");
      return null;
    }

    const data = new FormData();
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image`;

    data.append('file', {
      uri: imageUri,
      name: filename,
      type: type,
    });
    data.append('upload_preset', UPLOAD_PRESET);

    try {
      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: data,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });
      const result = await response.json();
      return result.secure_url || null;
    } catch (error) {
      console.error("Cloudinary Upload Error:", error);
      return null;
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập họ và tên.");
      return;
    }

    setLoading(true);
    try {
      let finalPhotoUrl = formData.avatar;

      // Nếu avatar là file local (vừa chọn xong) thì mới upload
      if (formData.avatar.startsWith('file://') || formData.avatar.startsWith('content://')) {
        const uploadedUrl = await uploadToCloudinary(formData.avatar);
        if (uploadedUrl) {
          finalPhotoUrl = uploadedUrl;
        } else {
          throw new Error("Không thể tải ảnh lên máy chủ.");
        }
      }

      const userEmail = user.email.toLowerCase();
      const userDocRef = doc(db, "users", userEmail);

      // Cập nhật song song
      await Promise.all([
        updateProfile(user, { 
          displayName: formData.name, 
          photoURL: finalPhotoUrl 
        }),
        updateDoc(userDocRef, {
          displayName: formData.name,
          photo_url: finalPhotoUrl,
          location: formData.location
        }).catch(async (err) => {
            // Nếu document chưa tồn tại thì dùng setDoc
            if (err.code === 'not-found') {
                await setDoc(userDocRef, {
                    displayName: formData.name,
                    photo_url: finalPhotoUrl,
                    location: formData.location,
                    email: userEmail
                });
            } else throw err;
        })
      ]);

      Alert.alert("Thành công", "Thông tin đã được cập nhật!");
      navigation.goBack();
    } catch (error) {
      console.error("Save Error:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi lưu thông tin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
             <Image source={{ uri: formData.avatar }} style={styles.avatar} />
             <TouchableOpacity style={styles.cameraIcon} onPress={pickImage} activeOpacity={0.8}>
               <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/685/685655.png'}} style={styles.camImg} />
             </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formSection}>
          <InputField 
            label="Họ và tên" 
            value={formData.name} 
            onChange={t => setFormData({...formData, name: t})}
            icon="https://cdn-icons-png.flaticon.com/512/1077/1077114.png"
          />
          <InputField 
            label="Email" 
            value={formData.email} 
            icon="https://cdn-icons-png.flaticon.com/512/542/542638.png"
            editable={false} 
          />
          <InputField 
            label="Địa chỉ" 
            value={formData.location} 
            onChange={t => setFormData({...formData, location: t})}
            icon="https://cdn-icons-png.flaticon.com/512/535/535239.png"
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, loading && styles.disabledBtn]} 
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Lưu thay đổi</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { padding: 24, paddingTop: 110 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: {width:0, height:2} },
  avatarSection: { alignItems: 'center', marginBottom: 35 },
  avatarContainer: { position: 'relative', elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#fff' },
  cameraIcon: { position: 'absolute', bottom: 5, right: 5, backgroundColor: COLORS.primary, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  camImg: { width: 14, height: 14, tintColor: '#fff' },
  formSection: { backgroundColor: COLORS.card, borderRadius: 24, padding: 20, marginBottom: 30, elevation: 2 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 13, color: COLORS.textSub, marginBottom: 8, fontWeight: '700', textTransform: 'uppercase', marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FB', borderRadius: 16, paddingHorizontal: 16, height: 56 },
  disabledInput: { backgroundColor: '#F0F0F0', opacity: 0.7 },
  inputIcon: { width: 18, height: 18, tintColor: COLORS.textSub, marginRight: 12 },
  input: { flex: 1, color: COLORS.textMain, fontWeight: '600', fontSize: 15 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 18, height: 58, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  disabledBtn: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});