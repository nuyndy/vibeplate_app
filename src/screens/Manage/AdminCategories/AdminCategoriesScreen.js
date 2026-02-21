import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, Image, 
  Alert, Modal, TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../../../firebase/firebaseConfig';
import { 
  collection, getDocs, doc, deleteDoc, setDoc, 
  query, where, getDocs as getDocsQuery 
} from 'firebase/firestore';

import { styles, COLORS } from './style';

const TABS = { CATEGORIES: 'categories' };
const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const hasCloudinaryConfig = () => Boolean(CLOUD_NAME && UPLOAD_PRESET);

export default function AdminCategoriesScreen({ navigation }) {
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [nextId, setNextId] = useState(''); // State lưu ID dự kiến

  // --- 1. LOAD DỮ LIỆU ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, TABS.CATEGORIES));
      let items = [];
      querySnapshot.forEach((docItem) => {
        items.push({ ...docItem.data(), id: docItem.id });
      });
      // Sắp xếp ID số giảm dần (mới nhất lên đầu)
      items.sort((a, b) => Number(b.id) - Number(a.id));
      setDataList(items);
    } catch (error) {
      Alert.alert("Lỗi tải dữ liệu", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- 2. CHỌN ẢNH (FIX LỖI MEDIATYPE & TRUY CẬP) ---
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Thông báo', 'Cần quyền truy cập thư viện ảnh');

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images', // Dùng chuỗi thay vì Enum để tránh lỗi undefined
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể mở thư viện ảnh");
    }
  };

  // --- 3. UPLOAD CLOUDINARY (FIX LỖI ANDROID) ---
  const uploadToCloudinary = async (imageUri) => {
    if (!imageUri) return null;
    if (!hasCloudinaryConfig()) return null;
    const data = new FormData();
    // Fix URI cho Android/iOS
    const cleanUri = Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri;
    
    data.append('file', { 
      uri: cleanUri, 
      type: 'image/jpeg', 
      name: `cat_${Date.now()}.jpg` 
    });
    data.append('upload_preset', UPLOAD_PRESET);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST', 
        body: data,
        headers: { 'Accept': 'application/json', 'Content-Type': 'multipart/form-data' },
      });
      const result = await response.json();
      return result.secure_url || null;
    } catch (error) {
      return null;
    }
  };

  // --- 4. MỞ MODAL & TỰ TÍNH ID (VÍ DỤ 12 -> 13) ---
  const openModal = (item = null) => {
    if (item) {
      setIsEditMode(true);
      setFormData({ ...item });
      setNextId(String(item.id));
    } else {
      setIsEditMode(false);
      setFormData({ name: '', photo_url: '' });

      // Logic tính số tiếp theo: Tìm max hiện tại
      let maxId = 0;
      dataList.forEach(obj => {
        const idNum = parseInt(obj.id);
        if (!isNaN(idNum) && idNum > maxId) maxId = idNum;
      });
      setNextId(String(maxId + 1)); // Nếu lớn nhất là 12, nextId sẽ là 13
    }
    setSelectedImage(null);
    setModalVisible(true);
  };

  // --- 5. LƯU DỮ LIỆU ---
  const handleSave = async () => {
    if (!formData.name) return Alert.alert("Lỗi", "Vui lòng nhập Tên danh mục");

    setLoading(true);
    try {
      let dataToSave = { ...formData };

      if (selectedImage) {
        const url = await uploadToCloudinary(selectedImage.uri);
        if (url) dataToSave.photo_url = url;
      }

      // docId lấy từ nextId đã tính
      const docId = nextId;
      delete dataToSave.id; 

      await setDoc(doc(db, TABS.CATEGORIES, docId), dataToSave, { merge: true });
      
      setModalVisible(false);
      fetchData();
      Alert.alert("Thành công", isEditMode ? "Đã cập nhật! 😋" : `Đã thêm danh mục mới! 😋`);
    } catch (error) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.photo_url || "https://via.placeholder.com/150" }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSub}>ID: {item.id}</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => openModal(item)} style={[styles.actionBtn, { backgroundColor: COLORS.edit }]}>
          <Text style={styles.btnText}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {
          Alert.alert("Xác nhận", "Xóa danh mục này?", [
            { text: "Hủy" },
            { text: "Xóa", style: 'destructive', onPress: () => deleteDoc(doc(db, TABS.CATEGORIES, String(item.id))).then(fetchData) }
          ]);
        }} style={[styles.actionBtn, { backgroundColor: COLORS.danger }]}>
          <Text style={styles.btnText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Text style={{fontSize: 18}}>📂</Text>
          <TextInput 
            style={styles.searchInput} placeholder="Tìm danh mục..."
            value={searchText} onChangeText={setSearchText}
          />
        </View>
      </View>

      <FlatList
        data={dataList.filter(i => String(i.name).toLowerCase().includes(searchText.toLowerCase()))}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => openModal()}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isEditMode ? 'Cập Nhật' : 'Thêm Mới'} Danh mục</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{fontSize: 20, color: '#999'}}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
               <View style={styles.inputGroup}>
                  <Text style={styles.label}>ID Danh mục (Tự động)</Text>
                  <TextInput
                    style={[styles.input, {backgroundColor: '#eee', color: COLORS.primary, fontWeight: 'bold'}]}
                    value={nextId}
                    editable={false} 
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Tên danh mục</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name || ''}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                    placeholder="VD: Hải sản"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Ảnh danh mục</Text>
                  <TouchableOpacity style={styles.coverPicker} onPress={pickImage}>
                    {selectedImage ? (
                       <Image source={{ uri: selectedImage.uri }} style={styles.coverImage} />
                    ) : formData.photo_url ? (
                       <Image source={{ uri: formData.photo_url }} style={styles.coverImage} />
                    ) : (
                      <View style={styles.coverPlaceholder}>
                        <Text style={{color: '#1b1d1c', fontWeight: '600'}}>+ Tải ảnh danh mục</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
            </ScrollView>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                 {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>LƯU DỮ LIỆU</Text>}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}