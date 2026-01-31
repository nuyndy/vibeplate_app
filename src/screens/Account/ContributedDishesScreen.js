import React, { useEffect, useState, useLayoutEffect } from 'react';
import { 
  View, Text, FlatList, Image, ActivityIndicator, StyleSheet, 
  TouchableOpacity, Modal, ScrollView, Alert, TextInput, SafeAreaView, KeyboardAvoidingView, Platform 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../../firebase/firebaseConfig';
import { 
  collection, getDocs, query, where, doc, deleteDoc, updateDoc, serverTimestamp 
} from 'firebase/firestore';

// Import Style cũ
import { styles as nominationStyles, COLORS } from '../DishNomination/style'; 

const CLOUD_NAME = 'devpumtqu';
const UPLOAD_PRESET = 'VibePlate';
const PHOTO_SIZE = 90;
const trashIconImg = require('../../../assets/icons/trashBin.png');

export default function ContributedDishesScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDish, setSelectedDish] = useState(null); 
  const [submitLoading, setSubmitLoading] = useState(false);

  // State Form
  const [dishName, setDishName] = useState('');
  const [description, setDescription] = useState('');
  const [dishImage, setDishImage] = useState(null);
  const [time, setTime] = useState('');
  const [servings, setServings] = useState('');
  const [extraPhotos, setExtraPhotos] = useState([]); 
  const [ingredientsList, setIngredientsList] = useState([]);

  const user = auth.currentUser;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Món đã đóng góp",
      headerStyle: { backgroundColor: COLORS.card || '#fff' },
      headerTitleStyle: { fontWeight: '800', color: COLORS.textMain || '#333' }
    });
  }, [navigation]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, "suggested_recipes"), where("authorId", "==", user.email));
      const snapshot = await getDocs(q);
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) { console.log("Lỗi fetch:", e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openDetail = (item) => {
    setSelectedDish(item);
    setDishName(item.title);
    setDescription(item.description);
    setDishImage(item.photo_url);
    setTime(String(item.time));
    setServings(String(item.servings));
    
    // --- XỬ LÝ NGUYÊN LIỆU ---
    if (item.ingredients && Array.isArray(item.ingredients) && item.ingredients.length > 0) {
        setIngredientsList(item.ingredients);
    } else if (typeof item.ingredients === 'string') {
        setIngredientsList([{ name: item.ingredients, quantity: '' }]);
    } else {
        setIngredientsList([{ name: '', quantity: '' }]);
    }
    // ------------------------

    if (item.photosArray && item.photosArray.length > 1) {
        setExtraPhotos(item.photosArray.slice(1));
    } else {
        setExtraPhotos([]);
    }
  };

  const addIngredientRow = () => {
    setIngredientsList([...ingredientsList, { name: '', quantity: '' }]);
  };

  const removeIngredientRow = (index) => {
      const newList = ingredientsList.filter((_, i) => i !== index);
      setIngredientsList(newList);
  };

  const handleIngredientChange = (text, index, field) => {
      const newList = [...ingredientsList];
      newList[index][field] = text;
      setIngredientsList(newList);
  };

  const uploadToCloudinary = async (imageUri) => {
    const data = new FormData();
    data.append('file', { uri: imageUri, type: 'image/jpeg', name: 'upload.jpg' });
    data.append('upload_preset', UPLOAD_PRESET);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: data });
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
          if (type === 'cover') {
              setDishImage(url);
          } else {
              setExtraPhotos([...extraPhotos, url]);
          }
      }
    }
  };

  const removeExtraPhoto = (index) => {
      if (selectedDish?.status === 'approved') return;
      const newPhotos = extraPhotos.filter((_, i) => i !== index);
      setExtraPhotos(newPhotos);
  };

  const handleUpdate = async () => {
    if (selectedDish?.status === 'approved') return;
    setSubmitLoading(true);
    try {
      let finalPhotos = [];
      if (dishImage) finalPhotos.push(dishImage);
      finalPhotos = finalPhotos.concat(extraPhotos);

      const cleanIngredients = ingredientsList.filter(item => item.name.trim() !== '');

      await updateDoc(doc(db, "suggested_recipes", selectedDish.id), {
        title: dishName,
        description: description,
        ingredients: cleanIngredients,
        photo_url: dishImage,
        photosArray: finalPhotos,
        time: Number(time),
        servings: Number(servings),
        status: 'pending', // Khi sửa xong, gửi lại trạng thái Pending để Admin duyệt lại
        updatedAt: serverTimestamp()
        // Lưu ý: Không xoá adminFeedback ở đây để Admin biết mình đã sửa cái gì, 
        // hoặc bạn có thể xoá adminFeedback: deleteField() nếu muốn reset.
      });
      Alert.alert("Thành công", "Đã cập nhật công thức và gửi duyệt lại.");
      setSelectedDish(null);
      fetchData();
    } catch (e) { Alert.alert("Lỗi", e.message); }
    setSubmitLoading(false);
  };

  const handleDelete = async (id) => {
    Alert.alert("Cảnh báo", "Bạn có chắc chắn muốn xoá vĩnh viễn công thức này?", [
      { text: "Hủy", style: 'cancel' },
      { text: "Xoá ngay", style: 'destructive', onPress: async () => {
          await deleteDoc(doc(db, "suggested_recipes", id));
          setSelectedDish(null); 
          fetchData(); 
      }}
    ]);
  };

  // --- [UPDATE 1] CẬP NHẬT MAPPING TRẠNG THÁI ---
  const getStatus = (status) => {
    const map = {
      pending: { text: 'Đang chờ duyệt', color: '#FFA500' },
      approved: { text: 'Đã duyệt', color: '#2ecc71' },
      rejected: { text: 'Từ chối', color: '#e74c3c' },
      needs_edit: { text: 'Cần chỉnh sửa', color: '#FF9800' } // Thêm trạng thái này
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
            <Text style={{ color: '#ccc', marginLeft: 5 }}>❯</Text>
          </TouchableOpacity>
        )}
      />

      <Modal visible={!!selectedDish} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg || '#F8F9FA' }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            
            <View style={localStyles.modalHeader}>
               <TouchableOpacity 
                  style={localStyles.closeBtnAbs} 
                  onPress={() => setSelectedDish(null)}
               >
                 <Text style={localStyles.closeTxt}>✕</Text>
               </TouchableOpacity>
               
               <Text style={localStyles.modalTitle}>Chi tiết & Sửa</Text>

               {selectedDish?.status !== 'approved' && (
                 <TouchableOpacity 
                    style={localStyles.trashBtnAbs} 
                    onPress={() => handleDelete(selectedDish.id)}>
                    <Image 
                      source={trashIconImg} 
                      style={localStyles.customTrashIcon}/>
                 </TouchableOpacity>
               )}
            </View>

            <ScrollView contentContainerStyle={nominationStyles.container}>
              
              {/* --- [UPDATE 2] HIỂN THỊ FEEDBACK ADMIN --- */}
              {selectedDish?.adminFeedback && (selectedDish?.status === 'needs_edit' || selectedDish?.status === 'rejected') && (
                  <View style={localStyles.feedbackContainer}>
                      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 5}}>
                        <Text style={localStyles.feedbackTitle}>Yêu cầu từ Admin:</Text>
                      </View>
                      <Text style={localStyles.feedbackContent}>"{selectedDish.adminFeedback}"</Text>
                  </View>
              )}
              {/* ------------------------------------------ */}

              <View style={[nominationStyles.card, selectedDish?.status === 'approved' && { opacity: 0.8 }]}>
                <Text style={nominationStyles.sectionHeader}>Thông tin món ăn</Text>
                
                <TouchableOpacity 
                    style={nominationStyles.coverPicker} 
                    onPress={() => pickImage('cover')} 
                    disabled={selectedDish?.status === 'approved'}
                >
                  {dishImage ? (
                    <Image source={{ uri: dishImage }} style={nominationStyles.coverImage} />
                  ) : (
                    <View style={nominationStyles.coverPlaceholder}><Text>+ Ảnh bìa</Text></View>
                  )}
                </TouchableOpacity>

                <View style={nominationStyles.inputGroup}>
                  <Text style={nominationStyles.label}>Tên món</Text>
                  <TextInput 
                    style={[nominationStyles.input, selectedDish?.status === 'approved' && localStyles.disabledInput]} 
                    value={dishName} 
                    onChangeText={setDishName} 
                    editable={selectedDish?.status !== 'approved'}
                  />
                </View>
                
                <View style={nominationStyles.rowInputs}>
                  <View style={nominationStyles.halfInput}>
                    <Text style={nominationStyles.label}>Thời gian (phút)</Text>
                    <TextInput 
                        style={[nominationStyles.input, selectedDish?.status === 'approved' && localStyles.disabledInput]} 
                        value={time} 
                        onChangeText={setTime} 
                        keyboardType="numeric"
                        editable={selectedDish?.status !== 'approved'}
                    />
                  </View>
                  <View style={nominationStyles.halfInput}>
                    <Text style={nominationStyles.label}>Khẩu phần</Text>
                    <TextInput 
                        style={[nominationStyles.input, selectedDish?.status === 'approved' && localStyles.disabledInput]} 
                        value={servings} 
                        onChangeText={setServings} 
                        keyboardType="numeric"
                        editable={selectedDish?.status !== 'approved'}
                    />
                  </View>
                </View>
              </View>

              {/* PHẦN NGUYÊN LIỆU */}
              <View style={[nominationStyles.card, selectedDish?.status === 'approved' && { opacity: 0.8 }]}>
                <Text style={[nominationStyles.sectionHeader, {marginBottom: 10}]}>🛒 Nguyên liệu</Text>
                
                {ingredientsList.map((item, index) => (
                  <View key={index} style={localStyles.ingredientRow}>
                    <View style={{ flex: 2, marginRight: 8 }}>
                      <TextInput
                        style={[nominationStyles.input, {marginBottom: 0}, selectedDish?.status === 'approved' && localStyles.disabledInput]}
                        placeholder="Tên (VD: Thịt bò)"
                        value={item.name}
                        onChangeText={(text) => handleIngredientChange(text, index, 'name')}
                        editable={selectedDish?.status !== 'approved'}
                      />
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <TextInput
                        style={[nominationStyles.input, {marginBottom: 0}, selectedDish?.status === 'approved' && localStyles.disabledInput]}
                        placeholder="SL"
                        value={item.quantity}
                        onChangeText={(text) => handleIngredientChange(text, index, 'quantity')}
                        editable={selectedDish?.status !== 'approved'}
                      />
                    </View>
                    {selectedDish?.status !== 'approved' && (
                      <TouchableOpacity 
                          style={localStyles.deleteRowBtn} 
                          onPress={() => removeIngredientRow(index)}
                      >
                        <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 14}}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {selectedDish?.status !== 'approved' && (
                    <TouchableOpacity 
                      onPress={addIngredientRow}
                      style={localStyles.addIngredientBtn}
                    >
                        <Text style={{color: COLORS.primary || '#FFA500', fontWeight: 'bold', fontSize: 15}}>
                          + Thêm nguyên liệu
                        </Text>
                    </TouchableOpacity>
                )}
              </View>

              <View style={[nominationStyles.card, selectedDish?.status === 'approved' && { opacity: 0.8 }]}>
                <Text style={nominationStyles.sectionHeader}>🍳 Cách làm (Chi tiết)</Text>
                <TextInput 
                  style={[nominationStyles.input, { height: 180, textAlignVertical: 'top' }, selectedDish?.status === 'approved' && localStyles.disabledInput]} 
                  multiline 
                  value={description} 
                  onChangeText={setDescription}
                  editable={selectedDish?.status !== 'approved'}
                />

                <View style={{ marginTop: 20 }}>
                    <Text style={nominationStyles.label}>Ảnh minh họa thêm:</Text>
                    
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                        {selectedDish?.status !== 'approved' && (
                            <TouchableOpacity style={localStyles.photoBox} onPress={() => pickImage('extra')}>
                                <Text style={{fontSize: 24, color: '#ccc'}}>+</Text>
                                <Text style={{fontSize: 10, color: '#999'}}>Thêm ảnh</Text>
                            </TouchableOpacity>
                        )}

                        {extraPhotos.map((url, idx) => (
                            <View key={idx} style={localStyles.photoItemContainer}>
                                <Image source={{ uri: url }} style={localStyles.photoImg} />
                                {selectedDish?.status !== 'approved' && (
                                    <TouchableOpacity style={localStyles.deletePhotoBtn} onPress={() => removeExtraPhoto(idx)}>
                                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✕</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </ScrollView>
                </View>
              </View>

              {selectedDish?.status !== 'approved' ? (
                <TouchableOpacity 
                    style={[nominationStyles.submitButton, submitLoading && { opacity: 0.7 }]} 
                    onPress={handleUpdate}
                    disabled={submitLoading}
                >
                  {submitLoading ? <ActivityIndicator color="#fff" /> : <Text style={nominationStyles.submitText}>CẬP NHẬT & GỬI LẠI ✨</Text>}
                </TouchableOpacity>
              ) : (
                <View style={localStyles.lockedBadge}>
                    <Text style={{color: '#999', fontWeight: 'bold'}}>ĐÃ DUYỆT - KHÔNG THỂ SỬA</Text>
                </View>
              )}
              <View style={{height: 30}} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  modalHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 16, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee',
    position: 'relative', 
    height: 60
  },
  closeBtnAbs: { position: 'absolute', left: 15, zIndex: 10, padding: 5 },
  trashBtnAbs: { position: 'absolute', right: 15, zIndex: 10, padding: 5 },
  closeTxt: { color: '#000000', fontWeight: 'bold', fontSize: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },

  photoBox: {
    width: PHOTO_SIZE, height: PHOTO_SIZE, borderWidth: 1, borderColor: '#ddd', 
    borderStyle: 'dashed', borderRadius: 8, justifyContent: 'center', alignItems: 'center', 
    marginRight: 10, backgroundColor: '#f9f9f9'
  },
  photoItemContainer: { width: PHOTO_SIZE, height: PHOTO_SIZE, marginRight: 10, position: 'relative' },
  photoImg: { width: '100%', height: '100%', borderRadius: 8 },
  customTrashIcon: { width: 26, height: 26, resizeMode: 'contain' },
  deletePhotoBtn: {
    position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', 
    width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center'
  },
  
  listCard: { flexDirection: 'row', backgroundColor: '#fff', marginBottom: 12, borderRadius: 15, padding: 12, alignItems: 'center', elevation: 3 },
  listImg: { width: 65, height: 65, borderRadius: 10 },
  listInfo: { flex: 1, marginLeft: 15 },
  listTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 10 },
  disabledInput: { backgroundColor: '#f9f9f9', color: '#888' },
  lockedBadge: { backgroundColor: '#f0f0f0', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#ddd' },
  
  ingredientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, justifyContent: 'space-between' },
  deleteRowBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#e74c3c', justifyContent: 'center', alignItems: 'center', marginLeft: 5, elevation: 2 },
  addIngredientBtn: { alignSelf: 'center', marginTop: 15, paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: '#eee', borderRadius: 20, backgroundColor: '#fff' },

  // --- [UPDATE 3] STYLE CHO FEEDBACK BOX ---
  feedbackContainer: {
    backgroundColor: '#FFF3E0', // Cam nhạt
    margin: 15,
    marginBottom: 5,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCC80'
  },
  feedbackTitle: {
    color: '#E65100',
    fontWeight: 'bold',
    fontSize: 16
  },
  feedbackContent: {
    color: '#333',
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic'
  }
});