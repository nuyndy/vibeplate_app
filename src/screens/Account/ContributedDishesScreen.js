import React, { useEffect, useState, useLayoutEffect, useCallback, memo } from 'react';
import { 
  View, Text, FlatList, Image, ActivityIndicator, StyleSheet, 
  TouchableOpacity, Modal, ScrollView, Alert, TextInput, SafeAreaView, 
  KeyboardAvoidingView, Platform, RefreshControl 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../../firebase/firebaseConfig';
import { collection, getDocs, query, where, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { styles as nominationStyles, COLORS } from '../DishNomination/style'; 

const CLOUD_NAME = 'devpumtqu';
const UPLOAD_PRESET = 'VibePlate';
const TRASH_ICON = require('../../../assets/icons/trashBin.png');
const BACK_ICON = { uri: 'https://cdn-icons-png.flaticon.com/512/271/271220.png' };

// --- SUB-COMPONENTS ---
const StatusTag = memo(({ status }) => {
  const getStatus = (s) => {
    const map = {
      pending: { text: 'Chờ duyệt', color: '#FFA500' },
      approved: { text: 'Đã duyệt', color: '#2ecc71' },
      rejected: { text: 'Từ chối', color: '#e74c3c' },
      needs_edit: { text: 'Cần sửa', color: '#FF9800' }
    };
    return map[s] || { text: 'Ẩn', color: '#999' };
  };
  const config = getStatus(status);
  return (
    <View style={[localStyles.statusTag, { backgroundColor: config.color + '20' }]}>
      <Text style={{ color: config.color, fontSize: 11, fontWeight: '700' }}>{config.text}</Text>
    </View>
  );
});

const AdminFeedback = memo(({ dish }) => {
  if (!dish?.adminFeedback || !['needs_edit', 'rejected'].includes(dish?.status)) return null;
  return (
    <View style={localStyles.feedbackContainer}>
      <Text style={localStyles.feedbackTitle}>Yêu cầu từ Admin:</Text>
      <Text style={localStyles.feedbackContent}>"{dish.adminFeedback}"</Text>
    </View>
  );
});

export default function ContributedDishesScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDish, setSelectedDish] = useState(null); 
  const [submitLoading, setSubmitLoading] = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', photo: null, time: '', servings: '',
    ingredients: [], extraPhotos: []
  });

  const user = auth.currentUser;

  // --- CONFIG HEADER CHÍNH ---
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Món đã đóng góp",
      headerStyle: { backgroundColor: '#fff', elevation: 0 },
      headerTitleStyle: { fontWeight: '800', color: COLORS.textMain, fontSize: 18 },
      headerTitleAlign: 'center',
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={localStyles.headerBtn}>
          <Image source={BACK_ICON} style={localStyles.backIcon} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const fetchData = useCallback(async (isRef = false) => {
    if (!user) return;
    if (!isRef) setLoading(true);
    try {
      const q = query(collection(db, "suggested_recipes"), where("authorId", "==", user.email));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      setData(list);
    } catch (e) { console.error(e); }
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDetail = (item) => {
    setSelectedDish(item);
    setForm({
      title: item.title,
      description: item.description,
      photo: item.photo_url,
      time: String(item.time || ''),
      servings: String(item.servings || ''),
      ingredients: item.ingredients || [{ name: '', quantity: '' }],
      extraPhotos: item.photosArray?.slice(1) || []
    });
  };

  const pickImage = async (type) => {
    if (selectedDish?.status === 'approved') return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images, allowsEditing: true, aspect: [4, 3], quality: 0.6,
    });
    if (!res.canceled) {
      setSubmitLoading(true);
      const url = await uploadToCloudinary(res.assets[0].uri);
      setSubmitLoading(false);
      if (url) {
        if (type === 'cover') setForm(f => ({ ...f, photo: url }));
        else setForm(f => ({ ...f, extraPhotos: [...f.extraPhotos, url] }));
      }
    }
  };

  const uploadToCloudinary = async (uri) => {
    const formData = new FormData();
    formData.append('file', { uri, type: 'image/jpeg', name: 'upload.jpg' });
    formData.append('upload_preset', UPLOAD_PRESET);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const result = await res.json();
      return result.secure_url;
    } catch { return null; }
  };

  const handleUpdate = async () => {
    if (selectedDish?.status === 'approved' || submitLoading) return;
    setSubmitLoading(true);
    try {
      const cleanIngr = form.ingredients.filter(i => i.name.trim());
      await updateDoc(doc(db, "suggested_recipes", selectedDish.id), {
        title: form.title,
        description: form.description,
        ingredients: cleanIngr,
        photo_url: form.photo,
        photosArray: [form.photo, ...form.extraPhotos].filter(Boolean),
        time: Number(form.time),
        servings: Number(form.servings),
        status: 'pending',
        updatedAt: serverTimestamp()
      });
      Alert.alert("Thành công", "Đã gửi lại yêu cầu duyệt.");
      setSelectedDish(null);
      fetchData();
    } catch (e) { Alert.alert("Lỗi", e.message); }
    setSubmitLoading(false);
  };

  const handleDelete = (id) => {
    Alert.alert("Xác nhận", "Xoá vĩnh viễn công thức này?", [
      { text: "Hủy", style: 'cancel' },
      { text: "Xoá", style: 'destructive', onPress: async () => {
          await deleteDoc(doc(db, "suggested_recipes", id));
          setSelectedDish(null); 
          fetchData(); 
      }}
    ]);
  };

  if (loading) return <ActivityIndicator size="large" style={localStyles.loader} color={COLORS.primary} />;

  return (
    <SafeAreaView style={localStyles.safeArea}>
      <FlatList
        data={data}
        contentContainerStyle={{ padding: 16 }}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={localStyles.listCard} onPress={() => openDetail(item)}>
            <Image source={{ uri: item.photo_url }} style={localStyles.listImg} />
            <View style={localStyles.listInfo}>
              <Text style={localStyles.listTitle} numberOfLines={1}>{item.title}</Text>
              <StatusTag status={item.status} />
            </View>
            <Text style={{ color: '#ccc', fontSize: 18 }}>❯</Text>
          </TouchableOpacity>
        )}
      />

      <Modal visible={!!selectedDish} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
          {/* HEADER MODAL VỚI NÚT QUAY LẠI */}
          <View style={localStyles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedDish(null)} style={localStyles.headerBtn}>
              <Image source={BACK_ICON} style={localStyles.backIcon} />
            </TouchableOpacity>
            
            <Text style={localStyles.modalTitle}>Chi tiết công thức</Text>
            
            <View style={{ width: 45, alignItems: 'center' }}>
                {selectedDish?.status !== 'approved' && (
                <TouchableOpacity onPress={() => handleDelete(selectedDish.id)} style={localStyles.headerBtn}>
                    <Image source={TRASH_ICON} style={localStyles.trashIcon}/>
                </TouchableOpacity>
                )}
            </View>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={nominationStyles.container}>
              <AdminFeedback dish={selectedDish} />

              <View style={[nominationStyles.card, selectedDish?.status === 'approved' && { opacity: 0.8 }]}>
                <Text style={nominationStyles.sectionHeader}>Thông tin cơ bản</Text>
                <TouchableOpacity 
                  style={nominationStyles.coverPicker} 
                  onPress={() => pickImage('cover')} 
                  disabled={selectedDish?.status === 'approved'}
                >
                  {form.photo ? (
                    <Image source={{ uri: form.photo }} style={nominationStyles.coverImage} />
                  ) : (
                    <View style={nominationStyles.coverPlaceholder}><Text>+ Thêm ảnh</Text></View>
                  )}
                </TouchableOpacity>

                <TextInput 
                  style={[nominationStyles.input, selectedDish?.status === 'approved' && localStyles.disabledInput]} 
                  value={form.title} 
                  onChangeText={t => setForm({...form, title: t})} 
                  editable={selectedDish?.status !== 'approved'} 
                  placeholder="Tên món"
                />
                
                <View style={nominationStyles.rowInputs}>
                  <TextInput 
                    style={[nominationStyles.input, {flex:1, marginRight:10}, selectedDish?.status === 'approved' && localStyles.disabledInput]} 
                    value={form.time} 
                    onChangeText={t => setForm({...form, time: t})} 
                    keyboardType="numeric" 
                    editable={selectedDish?.status !== 'approved'} 
                    placeholder="Thời gian (phút)" 
                  />
                  <TextInput 
                    style={[nominationStyles.input, {flex:1}, selectedDish?.status === 'approved' && localStyles.disabledInput]} 
                    value={form.servings} 
                    onChangeText={t => setForm({...form, servings: t})} 
                    keyboardType="numeric" 
                    editable={selectedDish?.status !== 'approved'} 
                    placeholder="Khẩu phần" 
                  />
                </View>
              </View>

              <View style={[nominationStyles.card, selectedDish?.status === 'approved' && { opacity: 0.8 }]}>
                <Text style={nominationStyles.sectionHeader}>🛒 Nguyên liệu</Text>
                {form.ingredients.map((item, index) => (
                  <View key={index} style={localStyles.ingredientRow}>
                    <TextInput 
                      style={[nominationStyles.input, { flex: 2, marginRight: 8, marginBottom: 0 }]} 
                      placeholder="Tên" 
                      value={item.name} 
                      onChangeText={(t) => {
                        const n = [...form.ingredients]; n[index].name = t; setForm({...form, ingredients: n});
                      }} 
                      editable={selectedDish?.status !== 'approved'} 
                    />
                    <TextInput 
                      style={[nominationStyles.input, { flex: 1, marginRight: 8, marginBottom: 0 }]} 
                      placeholder="SL" 
                      value={item.quantity} 
                      onChangeText={(t) => {
                        const n = [...form.ingredients]; n[index].quantity = t; setForm({...form, ingredients: n});
                      }} 
                      editable={selectedDish?.status !== 'approved'} 
                    />
                    {selectedDish?.status !== 'approved' && (
                      <TouchableOpacity 
                        style={localStyles.deleteRowBtn} 
                        onPress={() => setForm({...form, ingredients: form.ingredients.filter((_, i) => i !== index)})}
                      >
                        <Text style={{color: '#fff', fontWeight: 'bold'}}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              {selectedDish?.status !== 'approved' ? (
                <TouchableOpacity style={nominationStyles.submitButton} onPress={handleUpdate} disabled={submitLoading}>
                  {submitLoading ? <ActivityIndicator color="#fff" /> : <Text style={nominationStyles.submitText}>CẬP NHẬT & GỬI DUYỆT</Text>}
                </TouchableOpacity>
              ) : (
                <View style={localStyles.lockedBadge}>
                  <Text style={{color: '#2ecc71', fontWeight: 'bold'}}>TRẠNG THÁI: ĐÃ DUYỆT CÔNG KHAI</Text>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  loader: { flex: 1, justifyContent: 'center' },
  listCard: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    marginBottom: 12, 
    borderRadius: 15, 
    padding: 12, 
    alignItems: 'center', 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  listImg: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#eee' },
  listInfo: { flex: 1, marginLeft: 15 },
  listTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statusTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  
  // --- STYLES CHO HEADER ---
  modalHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 10, 
    height: 56, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee',
    backgroundColor: '#fff' 
  },
  headerBtn: { 
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  backIcon: { 
    width: 20, 
    height: 20, 
    tintColor: '#333',
    marginLeft: 10
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#333',
    flex: 1,
    textAlign: 'center'
  },
  trashIcon: { width: 22, height: 22, tintColor: '#e74c3c' },
  
  ingredientRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'center' },
  deleteRowBtn: { backgroundColor: '#e74c3c', width: 32, height: 42, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  disabledInput: { backgroundColor: '#f5f5f5', color: '#888' },
  lockedBadge: { backgroundColor: '#e8f5e9', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#2ecc71' },
  feedbackContainer: { backgroundColor: '#FFF3E0', margin: 15, padding: 15, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#FF9800' },
  feedbackTitle: { color: '#E65100', fontWeight: 'bold', fontSize: 13 },
  feedbackContent: { color: '#333', marginTop: 4, fontStyle: 'italic' },
});