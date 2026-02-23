import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, Image, 
  Alert, Modal, TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../../../firebase/firebaseConfig';
import { 
  collection, getDocs, doc, deleteDoc, setDoc 
} from 'firebase/firestore';

import { styles, COLORS } from './style';

const COLLECTION_NAME = 'ingredients';
const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const hasCloudinaryConfig = () => Boolean(CLOUD_NAME && UPLOAD_PRESET);

export default function AdminIngredientsScreen({ navigation }) {
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [nextId, setNextId] = useState(0); // Lưu dạng Number

  // --- 1. TẢI DỮ LIỆU ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      let items = [];
      querySnapshot.forEach((docSnap) => {
        // Lấy dữ liệu từ Firestore
        items.push({ ...docSnap.data() });
      });
      // Sắp xếp theo ingredientId giảm dần (số lớn lên đầu)
      items.sort((a, b) => Number(b.ingredientId) - Number(a.ingredientId));
      setDataList(items);
    } catch (error) {
      Alert.alert("Lỗi tải dữ liệu", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- 2. CHỌN ẢNH ---
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Thông báo', 'Cần quyền truy cập thư viện ảnh');

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, 
      });

      if (!result.canceled && result.assets) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể chọn ảnh");
    }
  };

  // --- 3. UPLOAD CLOUDINARY ---
  const uploadToCloudinary = async (imageFile) => {
    if (!imageFile) return null;
    if (!hasCloudinaryConfig()) return null;

    const data = new FormData();
    const uri = Platform.OS === 'android' ? imageFile.uri : imageFile.uri.replace('file://', '');
    const fileName = imageFile.fileName || uri.split('/').pop() || 'upload.jpg';
    const fileType = imageFile.mimeType || 'image/jpeg';

    data.append('file', { uri, type: fileType, name: fileName });
    data.append('upload_preset', UPLOAD_PRESET);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json', 'Content-Type': 'multipart/form-data' },
      });
      const result = await response.json();
      return response.ok ? result.secure_url : null;
    } catch (error) {
      return null;
    }
  };

  // --- 4. MỞ MODAL & TÍNH TOÁN ID ---
  const openModal = (item = null) => {
    if (item) {
      setIsEditMode(true);
      setFormData({ ...item });
      setNextId(Number(item.ingredientId));
    } else {
      setIsEditMode(false);
      setFormData({ name: '', photo_url: '' });

      // Tính ID tiếp theo: tìm max trong mảng hiện tại
      const maxId = dataList.reduce((max, obj) => {
        const idNum = Number(obj.ingredientId);
        return (!isNaN(idNum) && idNum > max) ? idNum : max;
      }, -1); // Khởi tạo -1 để bản ghi đầu tiên là 0
      
      setNextId(maxId + 1); 
    }
    setSelectedImage(null);
    setModalVisible(true);
  };

  // --- 5. LƯU VÀO FIRESTORE ---
  const handleSave = async () => {
    if (!formData.name) return Alert.alert("Lỗi", "Vui lòng nhập tên");

    setLoading(true);
    try {
      let imageUrl = formData.photo_url || "";

      if (selectedImage) {
        const url = await uploadToCloudinary(selectedImage);
        if (url) imageUrl = url;
      }

      // Cấu trúc dữ liệu theo yêu cầu của bạn
      const finalData = {
        ingredientId: Number(nextId),             // Kiểu Number
        name: String(formData.name),              // Kiểu String
        name_lowercase: String(formData.name).toLowerCase(), // Kiểu String (Dùng để search)
        photo_url: imageUrl                       // Kiểu String
      };

      // Dùng String(nextId) làm tên Document để quản lý đồng nhất
      await setDoc(doc(db, COLLECTION_NAME, String(nextId)), finalData, { merge: true });
      
      setModalVisible(false);
      fetchData();
      Alert.alert("Thành công", isEditMode ? "Đã cập nhật" : "Đã thêm mới");
    } catch (error) {
      Alert.alert("Lỗi Firestore", error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.photo_url || "https://via.placeholder.com/150" }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSub}>ID: {item.ingredientId}</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => openModal(item)} style={[styles.actionBtn, { backgroundColor: COLORS.edit }]}>
          <Text style={styles.btnText}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {
          Alert.alert("Xác nhận", "Xóa nguyên liệu này?", [
            { text: "Hủy" },
            { text: "Xóa", style: 'destructive', onPress: () => deleteDoc(doc(db, COLLECTION_NAME, String(item.ingredientId))).then(fetchData) }
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
          <Text style={{fontSize: 18}}>🔍</Text>
          <TextInput 
            style={styles.searchInput} placeholder="Tìm nguyên liệu..."
            value={searchText} onChangeText={setSearchText}
          />
        </View>
      </View>

      <FlatList
        data={dataList.filter(i => String(i.name).toLowerCase().includes(searchText.toLowerCase()))}
        keyExtractor={(item) => String(item.ingredientId)}
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
                <Text style={styles.modalTitle}>{isEditMode ? 'Cập Nhật' : 'Thêm Mới'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{fontSize: 20, color: '#999'}}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>ID Nguyên liệu (Tự động)</Text>
                    <TextInput style={[styles.input, {backgroundColor: '#eee', color: COLORS.primary, fontWeight: 'bold'}]} value={String(nextId)} editable={false} />
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Tên nguyên liệu</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.name || ''}
                      onChangeText={(text) => setFormData({ ...formData, name: text })}
                      placeholder="VD: Dầu ăn"
                    />
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Ảnh minh họa</Text>
                    <TouchableOpacity style={styles.coverPicker} onPress={pickImage}>
                        {selectedImage ? (
                           <Image source={{ uri: selectedImage.uri }} style={styles.coverImage} />
                        ) : formData.photo_url ? (
                           <Image source={{ uri: formData.photo_url }} style={styles.coverImage} />
                        ) : (
                          <View style={styles.coverPlaceholder}>
                            <Text style={{fontSize: 30, color: COLORS.primary}}>+</Text>
                            <Text style={{fontSize: 12, color: '#666'}}>Chọn ảnh</Text>
                          </View>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
            <TouchableOpacity 
                style={[styles.saveBtn, loading && {backgroundColor: '#ccc'}]} 
                onPress={handleSave} 
                disabled={loading}
            >
                 {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>LƯU DỮ LIỆU</Text>}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}