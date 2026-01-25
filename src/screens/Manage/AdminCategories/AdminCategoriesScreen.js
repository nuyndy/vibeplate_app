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

// --- CẤU HÌNH CLOUDINARY ---
const CLOUD_NAME = 'devpumtqu';
const UPLOAD_PRESET = 'VibePlate';

export default function AdminCategoriesScreen({ navigation }) {
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);

  // --- 1. LOAD DỮ LIỆU (FIX LỖI ID & SẮP XẾP) ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, TABS.CATEGORIES));
      let items = [];
      querySnapshot.forEach((docItem) => {
        // QUAN TRỌNG: Đặt id: docItem.id ở cuối cùng để đảm bảo lấy ID thật từ Document Key
        items.push({ ...docItem.data(), id: docItem.id });
      });

      // Sắp xếp: Ép kiểu ID về số để so sánh (Mới nhất lên đầu)
      items.sort((a, b) => Number(b.id) - Number(a.id));
      
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
    if (status !== 'granted') return Alert.alert('Cần quyền truy cập thư viện ảnh');

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  // --- 3. UPLOAD LÊN CLOUDINARY ---
  const uploadToCloudinary = async (imageUri) => {
    if (!imageUri) return null;
    const data = new FormData();
    data.append('file', { uri: imageUri, type: 'image/jpeg', name: 'upload.jpg' });
    data.append('upload_preset', UPLOAD_PRESET);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST', body: data,
      });
      const result = await response.json();
      return result.secure_url;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const getFilteredData = () => {
    if (!searchText) return dataList;
    return dataList.filter(item => {
      const term = searchText.toLowerCase();
      // Thêm String() vào item.id đề phòng id là số
      return String(item.id).includes(term) || (item.name || '').toLowerCase().includes(term);
    });
  };

  // --- 4. XÓA ---
  const handleDelete = (id) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa danh mục này?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: 'destructive', onPress: async () => {
          try {
            // Ép kiểu String(id) cho chắc chắn
            await deleteDoc(doc(db, TABS.CATEGORIES, String(id)));
            fetchData(); 
          } catch (error) { Alert.alert("Lỗi", error.message); }
        } 
      }
    ]);
  };

  // --- 5. LƯU DỮ LIỆU (AUTO ID SỐ) ---
  const handleSave = async () => {
    // Chỉ cần kiểm tra Tên, ID sẽ tự sinh
    if (!formData.name) {
      return Alert.alert("Thiếu thông tin", "Vui lòng nhập Tên danh mục");
    }

    setLoading(true);
    try {
      // Check trùng tên
      const q = query(collection(db, TABS.CATEGORIES), where("name", "==", formData.name));
      const snap = await getDocsQuery(q);
      
      if (!snap.empty) {
         const duplicateItem = snap.docs[0];
         // Nếu ID khác nhau thì là trùng tên với mục khác
         if (duplicateItem.id !== String(formData.id)) {
            Alert.alert("Lỗi", "Tên danh mục đã tồn tại!");
            setLoading(false);
            return;
         }
      }

      let dataToSave = { ...formData };

      // Upload ảnh nếu có chọn mới
      if (selectedImage) {
        const url = await uploadToCloudinary(selectedImage.uri);
        if (url) dataToSave.photo_url = url;
      }

      // TẠO ID:
      // - Nếu Edit: Dùng lại ID cũ (ép về chuỗi)
      // - Nếu Mới: Dùng Date.now() làm ID số
      const docId = isEditMode ? String(formData.id) : Date.now().toString();

      // Xóa field id trong data để tránh lưu dư thừa
      delete dataToSave.id; 

      await setDoc(doc(db, TABS.CATEGORIES, docId), dataToSave, { merge: true });
      
      setModalVisible(false);
      fetchData();
      Alert.alert("Thành công", isEditMode ? "Đã cập nhật danh mục" : "Đã thêm danh mục mới");
    } catch (error) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (item = null) => {
    if (item) {
      setIsEditMode(true);
      setFormData({ ...item });
    } else {
      setIsEditMode(false);
      setFormData({});
    }
    setSelectedImage(null);
    setModalVisible(true);
  };

  // --- RENDER ITEMS ---
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
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={[styles.actionBtn, { backgroundColor: COLORS.danger }]}>
          <Text style={styles.btnText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // --- 6. FORM NHẬP LIỆU (FIX HIỂN THỊ ID SỐ) ---
  const renderFormFields = () => (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>ID Danh mục</Text>
        {/* 🔥 FIX QUAN TRỌNG: Thêm String() vào value */}
        <TextInput
          style={[styles.input, {backgroundColor: '#eee', color: '#555'}]}
          value={isEditMode && formData.id ? String(formData.id) : "(Tự động tạo số ID)"}
          editable={false} 
          selectTextOnFocus={false}
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
      
      {/* Chọn ảnh */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Ảnh đại diện</Text>
        <TouchableOpacity style={styles.coverPicker} onPress={pickImage}>
          {selectedImage ? (
             <Image source={{ uri: selectedImage.uri }} style={styles.coverImage} />
          ) : formData.photo_url ? (
             <Image source={{ uri: formData.photo_url }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Image 
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3342/3342137.png' }} 
                style={{ width: 50, height: 50, marginBottom: 10, tintColor: '#1b1d1c' }} 
              />
              <Text style={{color: '#1b1d1c', fontWeight: '600'}}>+ Tải ảnh danh mục</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </>
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
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
               <Text style={{fontSize: 18, color: '#999'}}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && !modalVisible ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={getFilteredData()}
          keyExtractor={(item) => String(item.id)} // Key phải là string
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <Text style={{textAlign: 'center', marginTop: 20, color: '#999'}}>
              {searchText ? "Không tìm thấy kết quả" : "Chưa có dữ liệu"}
            </Text>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => openModal()}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isEditMode ? 'Cập Nhật' : 'Thêm Mới'} Danh mục</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Text style={{fontSize: 20, color: '#999'}}>✕</Text>
                </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>{renderFormFields()}</ScrollView>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                 {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>LƯU DỮ LIỆU</Text>}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}