import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, Image, 
  Alert, Modal, TextInput, ScrollView, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform 
} from 'react-native';
import { db } from '../../firebase/firebaseConfig';
import { collection, getDocs, doc, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';

// Import style
import { styles, COLORS } from './style';

// --- TABS GỐC ---
const TABS = {
  USERS: 'users',
  CATEGORIES: 'categories',
  INGREDIENTS: 'ingredients',
  RECIPES: 'recipes',
  SUGGESTED: 'suggested_recipes'
};

// --- LABEL TIẾNG VIỆT ---
const TAB_LABELS = {
  users: "Người dùng",
  categories: "Danh mục",
  ingredients: "Nguyên liệu",
  recipes: "Công thức",
  suggested_recipes: "Đề cử"
};

export default function AdminDataManagement({ navigation }) {
  const [currentTab, setCurrentTab] = useState(TABS.CATEGORIES);
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "QUẢN LÝ " + TAB_LABELS[currentTab].toUpperCase(),
      headerTitleAlign: "center"
    });
  }, [navigation, currentTab]);

  // --- 1. LOAD DỮ LIỆU ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, currentTab));
      let items = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });

      if (currentTab === TABS.USERS) {
        items = items.filter(u => u.role !== "admin");
      }

      setDataList(items);
      setSearchText('');
    } catch (error) {
      Alert.alert("Lỗi tải dữ liệu", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentTab]);

  const getFilteredData = () => {
    if (!searchText) return dataList;

    return dataList.filter(item => {
      const searchContent = searchText.toLowerCase();
      const id = (item.id || '').toLowerCase();
      let name = '';
      
      if (currentTab === TABS.USERS) name = (item.displayName || item.email || '').toLowerCase();
      else if (currentTab === TABS.RECIPES) name = (item.title || '').toLowerCase();
      else if (currentTab === TABS.SUGGESTED) name = (item.title || '').toLowerCase();
      else name = (item.name || '').toLowerCase();

      return id.includes(searchContent) || name.includes(searchContent);
    });
  };

  // --- 2. XÓA ---
  const handleDelete = (id) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa mục này?", [
      { text: "Hủy", style: "cancel" },
      { 
        text: "Xóa", 
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, currentTab, id));
            fetchData(); 
          } catch (error) {
            Alert.alert("Lỗi", error.message);
          }
        } 
      }
    ]);
  };

  // --- DUYỆT ĐỀ CỬ ---
  const handleApprove = async (item) => {
    try {
      await updateDoc(doc(db, TABS.SUGGESTED, item.id), { status: "approved" });
      Alert.alert("Thành công", "Món đã được duyệt");
      fetchData();
    } catch (err) {
      Alert.alert("Lỗi", err.message);
    }
  };

  // --- 3. LƯU DỮ LIỆU CHUNG ---
  const handleSave = async () => {
    if (!formData.id && !isEditMode) {
      Alert.alert("Thiếu ID", "Vui lòng nhập ID định danh");
      return;
    }
    setLoading(true);
    try {
      let dataToSave = { ...formData };
      const docId = dataToSave.id;
      delete dataToSave.id; 

      if (currentTab === TABS.RECIPES || currentTab === TABS.SUGGESTED) {
        if (typeof dataToSave.ingredients === 'string') {
          try { dataToSave.ingredients = JSON.parse(dataToSave.ingredients); } catch (e) {}
        }
        if (typeof dataToSave.steps === 'string') {
          try { dataToSave.steps = JSON.parse(dataToSave.steps); } catch (e) {}
        }
        if (typeof dataToSave.photosArray === 'string') {
          dataToSave.photosArray = dataToSave.photosArray.includes('[') 
            ? JSON.parse(dataToSave.photosArray) 
            : dataToSave.photosArray.split(',').map(url => url.trim());
        }
      }

      await setDoc(doc(db, currentTab, docId), dataToSave, { merge: true });
      setModalVisible(false);
      fetchData();
    } catch (error) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (item = null) => {
    if (currentTab === TABS.SUGGESTED) return;

    if (item) {
      setIsEditMode(true);
      let editData = { ...item };
      setFormData(editData);
    } else {
      setIsEditMode(false);
      setFormData({});
    }
    setModalVisible(true);
  };

  const renderItem = ({ item }) => {
    let title = item.id;
    let subtitle = "";
    let image = item.photo_url || item.photosArray?.[0] || "https://via.placeholder.com/150";

    if (currentTab === TABS.USERS) {
      title = item.displayName || item.email;
      subtitle = item.email;
    } else if (currentTab === TABS.CATEGORIES) {
      title = item.name;
      subtitle = "ID: " + item.id;
    } else if (currentTab === TABS.INGREDIENTS) {
      title = item.name;
      subtitle = "IngID: " + (item.ingredientId || item.id);
    } else if (currentTab === TABS.RECIPES) {
      title = item.title;
      subtitle = `${item.time} phút | ${item.servings} người`;
    } else if (currentTab === TABS.SUGGESTED) {
      title = item.title;
      subtitle = `${item.authorName} | ${item.status}`;
    }

    return (
      <View style={styles.card}>
        <Image source={{ uri: image }} style={styles.cardImage} />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSub}>{subtitle}</Text>
        </View>

        {currentTab === TABS.SUGGESTED ? (
          <View style={styles.cardActions}>
            {item.status !== "approved" && (
              <TouchableOpacity onPress={() => handleApprove(item)} style={[styles.actionBtn, { backgroundColor: COLORS.approve }]}>
                <Text style={styles.btnText}>Duyệt</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={[styles.actionBtn, { backgroundColor: COLORS.danger }]}>
              <Text style={styles.btnText}>Từ chối</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={() => openModal(item)} style={[styles.actionBtn, { backgroundColor: COLORS.edit }]}>
              <Text style={styles.btnText}>Sửa</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={[styles.actionBtn, { backgroundColor: COLORS.danger }]}>
              <Text style={styles.btnText}>Xóa</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderFormFields = () => {
    const input = (field, label, multiline = false) => (
      <View style={styles.inputGroup} key={field}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={[styles.input, multiline && { height: 80 }]}
          value={formData[field] || ''}
          onChangeText={(text) => setFormData({ ...formData, [field]: text })}
          placeholder={`Nhập ${label}`}
          editable={field === 'id' ? !isEditMode : true}
          multiline={multiline}
        />
      </View>
    );

    const idField = input('id', 'ID Định danh (Ví dụ: sug_abc123)');

    switch (currentTab) {
      case TABS.SUGGESTED:
        return <>
          {idField}
          {input('authorId', 'ID Người gửi')}
          {input('authorName', 'Tên Người gửi')}
          {input('title', 'Tên món')}
          {input('status', 'Trạng thái (pending/approved)')}
          {input('ingredients', 'Nguyên liệu (JSON)', true)}
          {input('steps', 'Các bước (JSON)', true)}
          {input('photosArray', 'Ảnh (JSON)', true)}
          {input('createdAt', 'Thời gian gửi')}
        </>;
      default:
        return <Text>Chưa hỗ trợ thêm sửa trong tab này</Text>;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Text style={{fontSize: 18}}>🍳</Text>
          <TextInput 
            style={styles.searchInput}
            placeholder={`Tìm trong ${TAB_LABELS[currentTab]}...`}
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#999"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
               <Text style={{fontSize: 18, color: '#999'}}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {Object.values(TABS).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, currentTab === tab && styles.activeTab]}
              onPress={() => setCurrentTab(tab)}
            >
              <Text style={[styles.tabText, currentTab === tab && styles.activeTabText]}>
                {TAB_LABELS[tab]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
            <Text style={{textAlign: 'center', marginTop: 20, color: '#999'}}>
              {searchText ? "Không tìm thấy kết quả" : "Chưa có dữ liệu"}
            </Text>
          }
        />
      )}

      {currentTab !== TABS.SUGGESTED && (
        <TouchableOpacity style={styles.fab} onPress={() => openModal()}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isEditMode ? 'Cập Nhật' : 'Thêm Mới'} {TAB_LABELS[currentTab]}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Text style={{fontSize: 20, color: '#999'}}>✕</Text>
                </TouchableOpacity>
            </View>
            <ScrollView style={{maxHeight: '80%'}}>{renderFormFields()}</ScrollView>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>LƯU DỮ LIỆU</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

