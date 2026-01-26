import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, Image, 
  Alert, Modal, TextInput, ScrollView, ActivityIndicator, 
  KeyboardAvoidingView, Platform 
} from 'react-native';

import { db } from '../../../firebase/firebaseConfig';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';

import { styles, COLORS } from './style';

const COLLECTION_NAME = 'users';

export default function AdminUsersScreen({ navigation }) {
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({});

  // --- 1. LOAD DỮ LIỆU ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      let items = [];
      querySnapshot.forEach((document) => {
        // Lấy ID (chính là email) và data
        items.push({ 
            id: document.id, // ID document là email
            ...document.data() 
        });
      });
      console.log(`Đã tải ${items.length} users`);
      setDataList(items);
    } catch (error) {
      console.error("Lỗi Fetch:", error);
      Alert.alert("Lỗi tải dữ liệu", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- 2. TÌM KIẾM ---
  const getFilteredData = () => {
    if (!searchText) return dataList;
    const term = searchText.toLowerCase();
    
    return dataList.filter(item => {
      // Tìm theo ID hoặc Tên hoặc Email
      const id = (item.id || '').toLowerCase();
      const name = (item.displayName || '').toLowerCase();
      const email = (item.email || '').toLowerCase();
      return id.includes(term) || name.includes(term) || email.includes(term);
    });
  };

  // --- 3. XÓA USER ---
  const handleDelete = (id) => {
    console.log("Đang xóa ID:", id); 

    Alert.alert("Xác nhận xóa", `Bạn muốn xóa user: ${id}?`, [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa ngay", style: 'destructive', onPress: async () => {
          try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
            
            // Xóa thành công thì lọc bỏ khỏi list ngay lập tức
            const newData = dataList.filter(item => item.id !== id);
            setDataList(newData);
            
            Alert.alert("Thành công", "Đã xóa người dùng.");
          } catch (error) { 
            console.error("Lỗi Xóa:", error);
            Alert.alert("Không thể xóa", "Lỗi: " + error.message + "\n\n(Hãy kiểm tra lại Firestore Rules)"); 
          }
        } 
      }
    ]);
  };

  // --- 4. CẬP NHẬT (UPDATE) ---
  const handleUpdate = async () => {
    if (!formData.id) return;

    setLoading(true);
    try {
      const userRef = doc(db, COLLECTION_NAME, formData.id);
      
      // Chỉ update các trường cần thiết
      await updateDoc(userRef, {
        displayName: formData.displayName || '',
        email: formData.email || '',
        role: formData.role || 'user',
      });

      setModalVisible(false);
      fetchData(); 
      Alert.alert("Thành công", "Đã cập nhật thông tin user.");
    } catch (error) {
      console.error("Lỗi Update:", error);
      Alert.alert("Lỗi Cập Nhật", error.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (item) => {
    setFormData({ ...item });
    setModalVisible(true);
  };

  // --- FORM GIAO DIỆN ---
  const renderFormFields = () => (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>ID Document (Không thể sửa)</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={formData.id || ''}
          editable={false} 
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Tên hiển thị</Text>
        <TextInput
          style={styles.input}
          value={formData.displayName || ''}
          onChangeText={(text) => setFormData({ ...formData, displayName: text })}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={formData.email || ''}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Vai trò (role)</Text>
        <TextInput
          style={styles.input}
          value={formData.role || ''}
          onChangeText={(text) => setFormData({ ...formData, role: text })}
          placeholder="user / admin"
        />
      </View>
    </>
  );

// --- RENDER ITEM (Đã sửa đúng link Pravatar) ---
  const renderItem = ({ item }) => {
    // 1. ĐÂY LÀ ẢNH MẶC ĐỊNH BẠN MUỐN
    const DESIRED_DEFAULT = "https://i.pravatar.cc/300";

    // 2. Logic kiểm tra ảnh
    let avatarUri;

    if (item.photo_url && item.photo_url.trim() !== "") {
        // Nếu trong DB có link ảnh riêng -> Dùng link đó
        avatarUri = item.photo_url;
    } else {
        // Nếu trong DB trống hoặc null -> Dùng ảnh Pravatar
        avatarUri = DESIRED_DEFAULT;
    }

    return (
      <View style={styles.card}>
        <Image 
            // Thêm key để React Native biết ảnh đã đổi, cần vẽ lại
            key={avatarUri} 
            source={{ uri: avatarUri }} 
            style={styles.cardImage} 
            // Nếu ảnh tải lỗi -> Quay về ảnh Pravatar
            onError={(e) => {
                e.target.source = { uri: DESIRED_DEFAULT };
            }}
        />
        
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.displayName || "Chưa đặt tên"}</Text>
          <Text style={styles.cardSub}>{item.email}</Text>
          
          <View style={{flexDirection: 'row', marginTop: 5}}>
            <Text style={{fontSize: 11, color: COLORS.primary, fontWeight:'bold', marginRight: 10}}>
              Role: {item.role || 'user'}
            </Text>
            {item.isVerified && (
                <Text style={{fontSize: 11, color: 'green'}}>✓ Đã xác thực</Text>
            )}
          </View>
        </View>
        
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => openEditModal(item)} style={[styles.actionBtn, { backgroundColor: COLORS.edit }]}>
            <Text style={[styles.btnText, { color: COLORS.editText }]}>Sửa</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleDelete(item.id)} style={[styles.actionBtn, { backgroundColor: COLORS.danger }]}>
            <Text style={[styles.btnText, { color: COLORS.dangerText }]}>Xóa</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={{fontSize: 20, fontWeight:'bold', marginBottom: 10, color: COLORS.primary}}>
            Quản Lý User
        </Text>
        <View style={styles.searchBar}>
          <Text style={{fontSize: 18}}>🔍</Text>
          <TextInput 
            style={styles.searchInput}
            placeholder="Tìm tên hoặc email..."
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
                <Text style={{fontSize: 16, color: '#999', paddingHorizontal: 5}}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={getFilteredData()}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <Text style={{textAlign: 'center', marginTop: 40, color: '#999'}}>
              {searchText ? "Không tìm thấy" : "Danh sách trống"}
            </Text>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Cập Nhật User</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Text style={{fontSize: 24, color: '#999'}}>✕</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {renderFormFields()}
            </ScrollView>

            <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate}>
                {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.saveBtnText}>LƯU THAY ĐỔI</Text>}
            </TouchableOpacity>

          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}