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
  const [nextId, setNextId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      let items = [];
      querySnapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      items.sort((a, b) => Number(b.id) - Number(a.id));
      setDataList(items);
    } catch (error) {
      Alert.alert("Lỗi tải dữ liệu", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

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

  // --- HÀM UPLOAD ĐÃ FIX LỖI NETWORK ERROR ---
  const uploadToCloudinary = async (imageFile) => {
    if (!imageFile) return null;
    if (!hasCloudinaryConfig()) return null;

    const data = new FormData();
    
    // Xử lý URI chuẩn cho từng nền tảng
    const uri = Platform.OS === 'android' ? imageFile.uri : imageFile.uri.replace('file://', '');
    
    // Tạo thông tin file chuẩn xác
    const fileName = imageFile.fileName || uri.split('/').pop() || 'upload.jpg';
    const fileType = imageFile.mimeType || 'image/jpeg';

    data.append('file', {
      uri: uri,
      type: fileType,
      name: fileName,
    });
    
    data.append('upload_preset', UPLOAD_PRESET);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: data,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data', // Ép định dạng multipart để fetch hiểu
        },
      });

      const result = await response.json();
      
      if (response.ok && result.secure_url) {
        return result.secure_url;
      } else {
        console.log("Cloudinary Error Detail:", result);
        Alert.alert("Lỗi Cloudinary", result.error?.message || "Không thể upload ảnh");
        return null;
      }
    } catch (error) {
      // Đây là nơi lỗi "Network request failed" thường bị bắt
      console.log("Fetch Error Detail:", error);
      Alert.alert("Lỗi mạng", "Không thể kết nối tới server Cloudinary. Kiểm tra Internet hoặc cấu hình HTTPS.");
      return null;
    }
  };

  const openModal = (item = null) => {
    if (item) {
      setIsEditMode(true);
      setFormData({ ...item });
      setNextId(String(item.id));
    } else {
      setIsEditMode(false);
      setFormData({ name: '' });
      let maxId = 0;
      dataList.forEach(obj => {
        const idNum = parseInt(obj.id);
        if (!isNaN(idNum) && idNum > maxId) maxId = idNum;
      });
      setNextId(String(maxId + 1)); 
    }
    setSelectedImage(null);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name) return Alert.alert("Lỗi", "Vui lòng nhập tên");

    setLoading(true);
    try {
      let dataToSave = { ...formData };

      if (selectedImage) {
        const url = await uploadToCloudinary(selectedImage);
        if (url) {
          dataToSave.photo_url = url;
        } else {
          setLoading(false);
          return; // Dừng lại nếu upload ảnh fail
        }
      }

      const docId = nextId;
      delete dataToSave.id; 

      await setDoc(doc(db, COLLECTION_NAME, docId), dataToSave, { merge: true });
      
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
        <Text style={styles.cardSub}>ID: {item.id}</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => openModal(item)} style={[styles.actionBtn, { backgroundColor: COLORS.edit }]}>
          <Text style={styles.btnText}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {
          Alert.alert("Xác nhận", "Xóa?", [
            { text: "Hủy" },
            { text: "Xóa", style: 'destructive', onPress: () => deleteDoc(doc(db, COLLECTION_NAME, item.id)).then(fetchData) }
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
          <Text style={{fontSize: 18}}>🥕</Text>
          <TextInput 
            style={styles.searchInput} placeholder="Tìm nguyên liệu..."
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
                <Text style={styles.modalTitle}>{isEditMode ? 'Sửa' : 'Thêm'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{fontSize: 20, color: '#999'}}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>ID (Tự động)</Text>
                    <TextInput style={[styles.input, {backgroundColor: '#eee'}]} value={nextId} editable={false} />
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Tên nguyên liệu</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.name || ''}
                      onChangeText={(text) => setFormData({ ...formData, name: text })}
                      placeholder="VD: Cà rốt"
                    />
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Ảnh</Text>
                    <TouchableOpacity style={styles.coverPicker} onPress={pickImage}>
                        {selectedImage ? (
                           <Image source={{ uri: selectedImage.uri }} style={styles.coverImage} />
                        ) : formData.photo_url ? (
                           <Image source={{ uri: formData.photo_url }} style={styles.coverImage} />
                        ) : (
                          <View style={styles.coverPlaceholder}>
                            <Text style={{fontSize: 30, color: COLORS.primary}}>+</Text>
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
                 {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>LƯU</Text>}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}