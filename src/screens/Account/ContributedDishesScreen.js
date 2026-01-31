import React, { useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { 
  View, Text, FlatList, Image, ActivityIndicator, StyleSheet, 
  TouchableOpacity, Modal, ScrollView, Alert, TextInput, SafeAreaView, 
  KeyboardAvoidingView, Platform, RefreshControl 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../../firebase/firebaseConfig';
import { 
  collection, getDocs, query, where, doc, deleteDoc, updateDoc, serverTimestamp 
} from 'firebase/firestore';

// Import Style từ file Nomination để đồng bộ giao diện
import { styles as nominationStyles, COLORS } from '../DishNomination/style'; 

const CLOUD_NAME = 'devpumtqu';
const UPLOAD_PRESET = 'VibePlate';
const PHOTO_SIZE = 90;
const trashIconImg = require('../../../assets/icons/trashBin.png');

export default function ContributedDishesScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDish, setSelectedDish] = useState(null); 
  const [submitLoading, setSubmitLoading] = useState(false);

  // State Form chỉnh sửa
  const [dishName, setDishName] = useState('');
  const [description, setDescription] = useState('');
  const [dishImage, setDishImage] = useState(null);
  const [time, setTime] = useState('');
  const [servings, setServings] = useState('');
  const [extraPhotos, setExtraPhotos] = useState([]); 
  const [ingredientsList, setIngredientsList] = useState([]);

  const user = auth.currentUser;

  // --- CONFIG HEADER ---
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Món đã đóng góp",
      headerStyle: { backgroundColor: COLORS.card || '#fff' },
      headerTitleStyle: { fontWeight: '800', color: COLORS.textMain || '#333' }
    });
  }, [navigation]);

  // --- FETCH DATA ---
  const fetchData = async (isRefreshingAction = false) => {
    if (!user) return;
    if (!isRefreshingAction) setLoading(true);
    
    try {
      const q = query(collection(db, "suggested_recipes"), where("authorId", "==", user.email));
      const snapshot = await getDocs(q);
      const fetchedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sắp xếp món mới nhất lên đầu
      fetchedData.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      
      setData(fetchedData);
    } catch (e) { 
      console.log("Lỗi fetch:", e); 
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, []);

  // --- XỬ LÝ FORM ---
  const openDetail = (item) => {
    setSelectedDish(item);
    setDishName(item.title);
    setDescription(item.description);
    setDishImage(item.photo_url);
    setTime(String(item.time));
    setServings(String(item.servings));
    
    if (item.ingredients && Array.isArray(item.ingredients)) {
      setIngredientsList(item.ingredients);
    } else {
      setIngredientsList([{ name: '', quantity: '' }]);
    }

    if (item.photosArray && item.photosArray.length > 1) {
      setExtraPhotos(item.photosArray.slice(1));
    } else {
      setExtraPhotos([]);
    }
  };

  const handleIngredientChange = (text, index, field) => {
    const newList = [...ingredientsList];
    newList[index][field] = text;
    setIngredientsList(newList);
  };

  const uploadToCloudinary = async (imageUri) => {
    const formData = new FormData();
    formData.append('file', { uri: imageUri, type: 'image/jpeg', name: 'upload.jpg' });
    formData.append('upload_preset', UPLOAD_PRESET);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const result = await res.json();
      return result.secure_url;
    } catch (error) { return null; }
  };

  const pickImage = async (type) => {
    if (selectedDish?.status === 'approved') return;
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    
    if (!result.canceled) {
      setSubmitLoading(true);
      const url = await uploadToCloudinary(result.assets[0].uri);
      setSubmitLoading(false);
      if (url) {
        if (type === 'cover') setDishImage(url);
        else setExtraPhotos([...extraPhotos, url]);
      }
    }
  };

  const handleUpdate = async () => {
    if (selectedDish?.status === 'approved') return;
    setSubmitLoading(true);
    try {
      let finalPhotos = [dishImage, ...extraPhotos].filter(Boolean);
      const cleanIngredients = ingredientsList.filter(item => item.name.trim() !== '');

      await updateDoc(doc(db, "suggested_recipes", selectedDish.id), {
        title: dishName,
        description: description,
        ingredients: cleanIngredients,
        photo_url: dishImage,
        photosArray: finalPhotos,
        time: Number(time),
        servings: Number(servings),
        status: 'pending', 
        updatedAt: serverTimestamp()
      });
      Alert.alert("Thành công", "Đã gửi lại yêu cầu duyệt.");
      setSelectedDish(null);
      fetchData();
    } catch (e) { Alert.alert("Lỗi", e.message); }
    setSubmitLoading(false);
  };

  const handleDelete = async (id) => {
    Alert.alert("Xác nhận", "Xoá vĩnh viễn công thức này?", [
      { text: "Hủy", style: 'cancel' },
      { text: "Xoá", style: 'destructive', onPress: async () => {
          await deleteDoc(doc(db, "suggested_recipes", id));
          setSelectedDish(null); 
          fetchData(); 
      }}
    ]);
  };

  const getStatus = (status) => {
    const map = {
      pending: { text: 'Đang chờ duyệt', color: '#FFA500' },
      approved: { text: 'Đã duyệt', color: '#2ecc71' },
      rejected: { text: 'Từ chối', color: '#e74c3c' },
      needs_edit: { text: 'Cần chỉnh sửa', color: '#FF9800' }
    };
    return map[status] || { text: 'Ẩn', color: '#999' };
  };

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} color={COLORS.primary} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg || '#F8F9FA' }}>
      <FlatList
        data={data}
        contentContainerStyle={{ padding: 16 }}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={localStyles.listCard} onPress={() => openDetail(item)}>
            <Image source={{ uri: item.photo_url }} style={localStyles.listImg} />
            <View style={localStyles.listInfo}>
              <Text style={localStyles.listTitle} numberOfLines={1}>{item.title}</Text>
              <View style={localStyles.statusRow}>
                <View style={[localStyles.statusTag, { backgroundColor: getStatus(item.status).color + '20' }]}>
                  <Text style={{ color: getStatus(item.status).color, fontSize: 11, fontWeight: '700' }}>
                    {getStatus(item.status).text}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={{ color: '#ccc' }}>❯</Text>
          </TouchableOpacity>
        )}
      />

      <Modal visible={!!selectedDish} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            
            <View style={localStyles.modalHeader}>
               <TouchableOpacity style={localStyles.closeBtnAbs} onPress={() => setSelectedDish(null)}>
                 <Text style={localStyles.closeTxt}>✕</Text>
               </TouchableOpacity>
               <Text style={localStyles.modalTitle}>Chi tiết món ăn</Text>
               {selectedDish?.status !== 'approved' && (
                 <TouchableOpacity style={localStyles.trashBtnAbs} onPress={() => handleDelete(selectedDish.id)}>
                    <Image source={trashIconImg} style={localStyles.customTrashIcon}/>
                 </TouchableOpacity>
               )}
            </View>

            <ScrollView contentContainerStyle={nominationStyles.container}>
              {/* PHẢN HỒI TỪ ADMIN */}
              {selectedDish?.adminFeedback && (selectedDish?.status === 'needs_edit' || selectedDish?.status === 'rejected') && (
                  <View style={localStyles.feedbackContainer}>
                      <Text style={localStyles.feedbackTitle}>Yêu cầu từ Admin:</Text>
                      <Text style={localStyles.feedbackContent}>"{selectedDish.adminFeedback}"</Text>
                  </View>
              )}

              <View style={[nominationStyles.card, selectedDish?.status === 'approved' && { opacity: 0.8 }]}>
                <Text style={nominationStyles.sectionHeader}>Thông tin cơ bản</Text>
                <TouchableOpacity 
                    style={nominationStyles.coverPicker} 
                    onPress={() => pickImage('cover')} 
                    disabled={selectedDish?.status === 'approved'}
                >
                  {dishImage ? <Image source={{ uri: dishImage }} style={nominationStyles.coverImage} /> : <View style={nominationStyles.coverPlaceholder}><Text>+ Thêm ảnh</Text></View>}
                </TouchableOpacity>

                <View style={nominationStyles.inputGroup}>
                  <Text style={nominationStyles.label}>Tên món</Text>
                  <TextInput style={[nominationStyles.input, selectedDish?.status === 'approved' && localStyles.disabledInput]} value={dishName} onChangeText={setDishName} editable={selectedDish?.status !== 'approved'} />
                </View>
                
                <View style={nominationStyles.rowInputs}>
                  <View style={nominationStyles.halfInput}>
                    <Text style={nominationStyles.label}>Thời gian (phút)</Text>
                    <TextInput style={[nominationStyles.input, selectedDish?.status === 'approved' && localStyles.disabledInput]} value={time} onChangeText={setTime} keyboardType="numeric" editable={selectedDish?.status !== 'approved'} />
                  </View>
                  <View style={nominationStyles.halfInput}>
                    <Text style={nominationStyles.label}>Khẩu phần</Text>
                    <TextInput style={[nominationStyles.input, selectedDish?.status === 'approved' && localStyles.disabledInput]} value={servings} onChangeText={setServings} keyboardType="numeric" editable={selectedDish?.status !== 'approved'} />
                  </View>
                </View>
              </View>

              <View style={[nominationStyles.card, selectedDish?.status === 'approved' && { opacity: 0.8 }]}>
                <Text style={nominationStyles.sectionHeader}>🛒 Nguyên liệu</Text>
                {ingredientsList.map((item, index) => (
                  <View key={index} style={localStyles.ingredientRow}>
                    <TextInput style={[nominationStyles.input, { flex: 2, marginRight: 8, marginBottom: 0 }, selectedDish?.status === 'approved' && localStyles.disabledInput]} placeholder="Tên" value={item.name} onChangeText={(t) => handleIngredientChange(t, index, 'name')} editable={selectedDish?.status !== 'approved'} />
                    <TextInput style={[nominationStyles.input, { flex: 1, marginRight: 8, marginBottom: 0 }, selectedDish?.status === 'approved' && localStyles.disabledInput]} placeholder="SL" value={item.quantity} onChangeText={(t) => handleIngredientChange(t, index, 'quantity')} editable={selectedDish?.status !== 'approved'} />
                    {selectedDish?.status !== 'approved' && (
                      <TouchableOpacity style={localStyles.deleteRowBtn} onPress={() => setIngredientsList(ingredientsList.filter((_, i) => i !== index))}>
                        <Text style={{color: '#fff'}}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {selectedDish?.status !== 'approved' && (
                    <TouchableOpacity onPress={() => setIngredientsList([...ingredientsList, {name:'', quantity:''}])} style={localStyles.addIngredientBtn}>
                      <Text style={{color: COLORS.primary, fontWeight: 'bold'}}>+ Thêm nguyên liệu</Text>
                    </TouchableOpacity>
                )}
              </View>

              <View style={[nominationStyles.card, selectedDish?.status === 'approved' && { opacity: 0.8 }]}>
                <Text style={nominationStyles.sectionHeader}>🍳 Cách làm</Text>
                <TextInput style={[nominationStyles.input, { height: 150, textAlignVertical: 'top' }, selectedDish?.status === 'approved' && localStyles.disabledInput]} multiline value={description} onChangeText={setDescription} editable={selectedDish?.status !== 'approved'} />
              </View>

              {selectedDish?.status !== 'approved' ? (
                <TouchableOpacity style={nominationStyles.submitButton} onPress={handleUpdate} disabled={submitLoading}>
                  {submitLoading ? <ActivityIndicator color="#fff" /> : <Text style={nominationStyles.submitText}>CẬP NHẬT & GỬI DUYỆT</Text>}
                </TouchableOpacity>
              ) : (
                <View style={localStyles.lockedBadge}><Text style={{color: '#999', fontWeight: 'bold'}}>TRẠNG THÁI: ĐÃ DUYỆT</Text></View>
              )}
              <View style={{height: 50}} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', height: 60 },
  closeBtnAbs: { position: 'absolute', left: 15 },
  trashBtnAbs: { position: 'absolute', right: 15 },
  closeTxt: { fontSize: 20, fontWeight: 'bold' },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  listCard: { flexDirection: 'row', backgroundColor: '#fff', marginBottom: 12, borderRadius: 15, padding: 12, alignItems: 'center', elevation: 2 },
  listImg: { width: 60, height: 60, borderRadius: 10 },
  listInfo: { flex: 1, marginLeft: 15 },
  listTitle: { fontSize: 16, fontWeight: 'bold' },
  statusRow: { flexDirection: 'row', marginTop: 5 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  ingredientRow: { flexDirection: 'row', marginBottom: 10 },
  deleteRowBtn: { backgroundColor: '#e74c3c', width: 30, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  addIngredientBtn: { alignSelf: 'center', marginTop: 10, padding: 10 },
  disabledInput: { backgroundColor: '#f5f5f5', color: '#999' },
  lockedBadge: { backgroundColor: '#eee', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  feedbackContainer: { backgroundColor: '#FFF3E0', margin: 15, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#FFCC80' },
  feedbackTitle: { color: '#E65100', fontWeight: 'bold', marginBottom: 5 },
  feedbackContent: { fontStyle: 'italic', color: '#333' },
  customTrashIcon: { width: 24, height: 24 }
});