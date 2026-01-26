import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, Image, 
  Alert, Modal, TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// ⚠️ Check đường dẫn firebaseConfig
import { db } from '../../../firebase/firebaseConfig';
import { 
  collection, getDocs, doc, deleteDoc, setDoc, 
  query, where, getDocs as getDocsQuery 
} from 'firebase/firestore';

// 👇 Import style từ file style.js cùng thư mục
import { styles, COLORS } from './style';

const COLLECTION_NAME = 'ingredients';

// --- CẤU HÌNH CLOUDINARY ---
const CLOUD_NAME = 'devpumtqu';
const UPLOAD_PRESET = 'VibePlate';

export default function AdminIngredientsScreen({ navigation }) {
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);

  // --- LOAD DỮ LIỆU ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      let items = [];
      querySnapshot.forEach((doc) => {
        // Lưu ý: data().ingredientId có thể trùng hoặc khác doc.id, ta nên ưu tiên doc.id
        items.push({ id: doc.id, ...doc.data() });
      });
      setDataList(items);
    } catch (error) {
      Alert.alert("Lỗi tải dữ liệu", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- CHỌN ẢNH ---
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Cần quyền truy cập thư viện ảnh');

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Nguyên liệu thường hiển thị dạng icon vuông/tròn
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  // --- UPLOAD CLOUDINARY ---
  const uploadToCloudinary = async (imageUri) => {
    if (!imageUri) return null;
    const data = new FormData();
    data.append('file', { uri: imageUri, type: 'image/jpeg', name: 'ing_upload.jpg' });
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

  // --- TÌM KIẾM ---
  const getFilteredData = () => {
    if (!searchText) return dataList;
    const term = searchText.toLowerCase();
    return dataList.filter(item => {
      const id = (item.id || '').toLowerCase();
      const name = (item.name || '').toLowerCase();
      return id.includes(term) || name.includes(term);
    });
  };

  // --- XÓA ---
  const handleDelete = (id) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa nguyên liệu này?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: 'destructive', onPress: async () => {
          try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
            fetchData(); 
          } catch (error) { Alert.alert("Lỗi", error.message); }
        } 
      }
    ]);
  };

  // --- LƯU DỮ LIỆU ---
  const handleSave = async () => {
    // Validate
    if ((!formData.id && !isEditMode) || !formData.name) {
      return Alert.alert("Thiếu thông tin", "Vui lòng nhập ID và Tên nguyên liệu");
    }

    setLoading(true);
    try {
      // Check trùng tên (nếu cần)
      if (!isEditMode) {
        const q = query(collection(db, COLLECTION_NAME), where("name", "==", formData.name));
        const snap = await getDocsQuery(q);
        if (!snap.empty) {
           Alert.alert("Lỗi", "Tên nguyên liệu đã tồn tại.");
           setLoading(false); 
           return;
        }
      }

      let dataToSave = { ...formData };

      // Upload ảnh
      if (selectedImage) {
        const url = await uploadToCloudinary(selectedImage.uri);
        if (url) dataToSave.photo_url = url;
      }

      // Xử lý ID
      const docId = isEditMode ? formData.id : formData.id.trim();
      delete dataToSave.id; // Không lưu field id trùng lặp

      // Lưu vào Firestore
      await setDoc(doc(db, COLLECTION_NAME, docId), dataToSave, { merge: true });
      
      setModalVisible(false);
      setSelectedImage(null);
      fetchData();
      Alert.alert("Thành công", isEditMode ? "Đã cập nhật nguyên liệu" : "Đã thêm nguyên liệu");
    } catch (error) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- MỞ MODAL ---
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

  // --- RENDER FORM ---
  const renderFormFields = () => (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>ID Nguyên liệu (Mã)</Text>
        <TextInput
          style={[styles.input, isEditMode && {backgroundColor: '#eee', color: '#999'}]}
          value={formData.id || ''}
          onChangeText={(text) => setFormData({ ...formData, id: text })}
          placeholder="VD: chicken_breast"
          editable={!isEditMode}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Tên nguyên liệu</Text>
        <TextInput
          style={styles.input}
          value={formData.name || ''}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          placeholder="VD: Ức gà"
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
              <Text style={{color: COLORS.primary, fontWeight: '600'}}>Tải ảnh</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  // --- RENDER ITEM ---
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Text style={{fontSize: 18}}>🥕</Text>
          <TextInput 
            style={styles.searchInput} placeholder="Tìm nguyên liệu..."
            value={searchText} onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
             <TouchableOpacity onPress={() => setSearchText('')}><Text style={{fontSize: 18, color:'#999'}}>✕</Text></TouchableOpacity>
          )}
        </View>
      </View>

      {loading && !modalVisible ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={getFilteredData()}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={
             <Text style={{textAlign:'center', marginTop: 20, color:'#999'}}>
               {searchText ? "Không tìm thấy" : "Chưa có dữ liệu"}
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
                <Text style={styles.modalTitle}>{isEditMode ? 'Cập Nhật' : 'Thêm Mới'} Nguyên liệu</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                   <Text style={{fontSize: 20, color: '#999'}}>✕</Text>
                </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>{renderFormFields()}</ScrollView>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
               <Text style={styles.saveBtnText}>LƯU DỮ LIỆU</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}