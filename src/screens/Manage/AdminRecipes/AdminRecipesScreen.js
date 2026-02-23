import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, Image, 
  Alert, Modal, TextInput, ScrollView, ActivityIndicator, Platform, KeyboardAvoidingView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { db } from '../../../firebase/firebaseConfig'; 
import { 
  collection, getDocs, doc, deleteDoc, setDoc, 
  serverTimestamp 
} from 'firebase/firestore';

import { styles, COLORS } from './style';

// --- CẤU HÌNH CLOUDINARY ---
const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const hasCloudinaryConfig = () => Boolean(CLOUD_NAME && UPLOAD_PRESET);

// --- 1. COMPONENT ITEM (Danh sách món ăn) ---
const RecipeItem = memo(({ item, onEdit, onDelete }) => {
  return (
    <View style={styles.card}>
      <Image 
        source={{uri: item.photo_url || 'https://via.placeholder.com/150'}} 
        style={styles.cardImg}
        resizeMode="cover"
      />
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardSub}>{item.time} phút | {item.servings} người</Text>
        <Text style={{fontSize: 10, color: '#999'}}>ID: {item.recipeId}</Text>
      </View>
      <View style={{ justifyContent: 'center'}}>
        <TouchableOpacity onPress={() => onEdit(item)} style={styles.btnEdit}>
          <Text style={styles.btnText}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(item)} style={styles.btnDel}>
          <Text style={[styles.btnText, {color: '#333'}]}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// --- 2. MÀN HÌNH CHÍNH ---
export default function AdminRecipesScreen({ navigation }) {
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [ingredientsDB, setIngredientsDB] = useState([]);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false); 
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    recipeId: '', categoryId: '', title: '', servings: '', time: '',
    description: '', photo_url: '', photosArray: [], ingredients: []   
  });

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showIngredientPicker, setShowIngredientPicker] = useState(false);
  const [tempIngredient, setTempIngredient] = useState({ id: '', name: '', quantity: '' });
  const [ingSearchText, setIngSearchText] = useState('');

  // --- TẠO KEYWORDS ĐỂ SEARCH ---
  const generateKeywords = (title) => {
    if (!title) return [];
    const nameStr = title.toLowerCase();
    const arrName = nameStr.split(" ");
    const result = [nameStr];
    let curName = "";
    arrName.forEach(str => {
        curName += (curName ? " " : "") + str;
        result.push(curName);
        result.push(str);
    });
    return [...new Set(result)];
  };

  // --- LOAD DỮ LIỆU ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const [recSnap, catSnap, ingSnap] = await Promise.all([
        getDocs(collection(db, 'recipes')),
        getDocs(collection(db, 'categories')),
        getDocs(collection(db, 'ingredients'))
      ]);

      setRecipes(recSnap.docs.map(doc => ({ ...doc.data() })));
      setCategories(catSnap.docs.map(doc => ({ ...doc.data() })));
      setIngredientsDB(ingSnap.docs.map(doc => ({ 
        ...doc.data(), 
        id: doc.data().ingredientId 
      })));
    } catch (error) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- UPLOAD CLOUDINARY ---
  const uploadToCloudinary = async (imageFile) => {
    if (!hasCloudinaryConfig()) return null;
    const data = new FormData();
    const uri = Platform.OS === 'android' ? imageFile.uri : imageFile.uri.replace('file://', '');
    data.append('file', { uri, name: `recipe_${Date.now()}.jpg`, type: 'image/jpeg' });
    data.append('upload_preset', UPLOAD_PRESET);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST', body: data,
      });
      const result = await response.json();
      return result.secure_url;
    } catch (error) { return null; }
  };

  // --- CHỌN ẢNH (ĐÃ FIX WARNING) ---
  const pickImage = async (type) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Lỗi', 'Cần quyền truy cập ảnh');

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', 
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled && result.assets) {
      setUploading(true);
      const url = await uploadToCloudinary(result.assets[0]); 
      setUploading(false);
      if (url) {
        if (type === 'cover') setFormData(p => ({ ...p, photo_url: url }));
        else setFormData(p => ({ ...p, photosArray: [...p.photosArray, url] }));
      }
    }
  };

  // --- LƯU DỮ LIỆU ---
  const handleSave = async () => {
    if (!formData.title || formData.categoryId === '') return Alert.alert("Lỗi", "Vui lòng nhập tên và chọn danh mục.");
    
    setLoading(true);
    try {
      const recipeIdNum = Number(formData.recipeId);
      const dataToSave = {
        recipeId: recipeIdNum,
        categoryId: Number(formData.categoryId),
        categoryIds: [Number(formData.categoryId)], 
        title: formData.title,
        servings: Number(formData.servings) || 1,
        time: String(formData.time),
        description: formData.description,
        photo_url: formData.photo_url,
        photosArray: formData.photosArray || [],
        keywords: generateKeywords(formData.title),
        ingredients: formData.ingredients.map(i => ({ 
            ingredientId: Number(i.ingredientId), 
            quantity: i.quantity 
        })),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'recipes', String(recipeIdNum)), dataToSave, { merge: true });
      setModalVisible(false);
      fetchData();
      Alert.alert("Thành công", "Dữ liệu đã được lưu!");
    } catch (e) { Alert.alert("Lỗi", e.message); } 
    finally { setLoading(false); }
  };

  const openModal = useCallback((item = null) => {
    // --- DỌN DẸP STATE TẠM THỜI TẠI ĐÂY ---
    setTempIngredient({ id: '', name: '', quantity: '' });
    setIngSearchText('');
    // -------------------------------------

    if (item) {
      setIsEditMode(true);
      const mappedIngs = (item.ingredients || []).map(ing => {
        const found = ingredientsDB.find(d => Number(d.id) === Number(ing.ingredientId));
        return { ...ing, name: found ? found.name : 'Nguyên liệu ' + ing.ingredientId };
      });
      setFormData({ 
          ...item, 
          recipeId: String(item.recipeId), 
          ingredients: mappedIngs, 
          categoryId: String(item.categoryId)
      });
    } else {
      setIsEditMode(false);
      const maxId = recipes.reduce((max, r) => Math.max(max, Number(r.recipeId) || 0), -1);
      setFormData({ 
        recipeId: String(maxId + 1), categoryId: '', title: '', servings: '1', time: '10', 
        description: '', photo_url: '', photosArray: [], ingredients: [] 
      });
    }
    setModalVisible(true);
  }, [recipes, ingredientsDB]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
            <Text style={{fontSize: 20}}>🍳</Text>
            <TextInput style={styles.searchInput} placeholder="Tìm món ăn..." value={searchText} onChangeText={setSearchText} />
        </View>
      </View>

      <FlatList 
        data={recipes.filter(i => i.title?.toLowerCase().includes(searchText.toLowerCase()))}
        keyExtractor={item => String(item.recipeId)}
        renderItem={({item}) => <RecipeItem item={item} onEdit={openModal} onDelete={(i) => {
          Alert.alert("Xác nhận", "Xóa công thức này?", [
            {text:"Hủy"}, 
            {text:"Xóa", style:'destructive', onPress: async () => {
              await deleteDoc(doc(db, 'recipes', String(i.recipeId)));
              fetchData();
            }}
          ]);
        }} />}
        contentContainerStyle={{paddingBottom: 100}}
      />

      <TouchableOpacity style={styles.fab} onPress={() => openModal(null)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : null} style={{flex: 1}}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditMode ? 'Sửa Công Thức' : 'Thêm Món Mới'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{fontSize: 24, color:'#999'}}>✕</Text></TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Ảnh đại diện</Text>
              <TouchableOpacity style={styles.coverPicker} onPress={() => pickImage('cover')} disabled={uploading}>
                {uploading ? <ActivityIndicator /> : 
                  formData.photo_url ? <Image source={{ uri: formData.photo_url }} style={styles.coverImage} /> : 
                  <View style={styles.coverPlaceholder}><Text>+ Tải ảnh bìa</Text></View>
                }
              </TouchableOpacity>

              <Text style={styles.label}>Tên món ăn</Text>
              <TextInput style={styles.input} placeholder="Tên món ăn" value={formData.title} onChangeText={t => setFormData({...formData, title: t})} />
              <View style={{flexDirection: 'row', gap: 10}}>
                <Text style={[styles.label, {flex: 1}]}>Thời gian nấu</Text>
                <Text style={[styles.label, {flex: 1}]}>Số người ăn</Text>
              </View>
              <View style={{flexDirection: 'row', gap: 10}}>
                <TextInput style={[styles.input, {flex: 1}]} placeholder="Phút" keyboardType="numeric" value={formData.time} onChangeText={t => setFormData({...formData, time: t})} />
                <TextInput style={[styles.input, {flex: 1}]} placeholder="Người ăn" keyboardType="numeric" value={String(formData.servings)} onChangeText={t => setFormData({...formData, servings: t})} />
              </View>

              <Text style={styles.label}>Danh mục</Text>
              <TouchableOpacity style={styles.selectBox} onPress={() => setShowCategoryPicker(true)}>
                  <Text>{categories.find(c => String(c.id) === String(formData.categoryId))?.name || "Chọn danh mục..."}</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Nguyên liệu</Text>
              <View style={styles.ingredientBox}>
                  <View style={{flexDirection: 'row', marginBottom: 10}}>
                      <TouchableOpacity style={[styles.selectBox, {flex: 2}]} onPress={() => setShowIngredientPicker(true)}>
                          <Text numberOfLines={1}>{tempIngredient.id !== '' ? tempIngredient.name : "Chọn..."}</Text>
                      </TouchableOpacity>
                      <TextInput style={[styles.input, {flex: 1, marginLeft: 5}]} placeholder="kg, g,..." value={tempIngredient.quantity} onChangeText={t => setTempIngredient({...tempIngredient, quantity: t})} />
                      <TouchableOpacity style={styles.btnAddIng} onPress={() => {
                        if (tempIngredient.id === '' || !tempIngredient.quantity) return;
                        setFormData({ ...formData, ingredients: [...formData.ingredients, { ingredientId: tempIngredient.id, name: tempIngredient.name, quantity: tempIngredient.quantity }] });
                        setTempIngredient({ id: '', name: '', quantity: '' });
                      }}><Text style={{color: '#fff', fontSize: 20}}>+</Text></TouchableOpacity>
                  </View>
                  {formData.ingredients.map((item, index) => (
                      <View key={index} style={styles.ingItem}>
                          <Text style={{flex: 1}}>• {item.name}: {item.quantity}</Text>
                          {/* Nút xóa nguyên liệu màu đen */}
                          <TouchableOpacity onPress={() => {
                            let list = [...formData.ingredients]; list.splice(index, 1);
                            setFormData({...formData, ingredients: list});
                          }} style={{padding: 5}}>
                            <Text style={{color: '#1b1d1c', fontWeight: 'bold'}}>✕</Text>
                          </TouchableOpacity>
                      </View>
                  ))}
              </View>

              <Text style={styles.label}>Album ảnh các bước</Text>
              <ScrollView horizontal style={{flexDirection:'row', marginBottom: 15}}>
                  {formData.photosArray.map((img, idx) => (
                    <View key={idx} style={{marginRight: 12, marginTop: 5}}>
                      <Image source={{uri: img}} style={{width: 80, height: 80, borderRadius: 8}} />
                      {/* Nút xóa ảnh album màu đen */}
                      <TouchableOpacity 
                        style={{
                          position:'absolute', top: -5, right: -5, 
                          backgroundColor: '#1b1d1c', borderRadius: 12,
                          width: 22, height: 22, justifyContent: 'center', alignItems: 'center',
                          borderWidth: 1, borderColor: '#fff'
                        }} 
                        onPress={() => {
                          let arr = [...formData.photosArray]; arr.splice(idx, 1);
                          setFormData({...formData, photosArray: arr});
                        }}
                      >
                        <Text style={{color:'#fff', fontSize: 10, fontWeight: 'bold'}}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={[styles.coverPlaceholder, {width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed'}]} onPress={() => pickImage('array')}>
                    <Text style={{color: '#999', fontSize: 24}}>+</Text>
                  </TouchableOpacity>
              </ScrollView>

              <Text style={styles.label}>Cách chế biến</Text>
              <TextInput style={[styles.input, {height: 120, textAlignVertical: 'top'}]} multiline value={formData.description} onChangeText={t => setFormData({...formData, description: t})} />
              <View style={{height: 20}} />
            </ScrollView>

            <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                    {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.saveBtnText}>LƯU CÔNG THỨC</Text>}
                </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODALS CHỌN DANH MỤC & NGUYÊN LIỆU */}
      <Modal visible={showCategoryPicker} transparent>
        <TouchableOpacity style={styles.pickerOverlay} onPress={() => setShowCategoryPicker(false)}>
          <View style={styles.pickerBody}>
            <FlatList data={categories} keyExtractor={i=>String(i.id)} renderItem={({item}) => (
              <TouchableOpacity style={styles.pickerItem} onPress={() => { setFormData({...formData, categoryId: item.id}); setShowCategoryPicker(false); }}>
                <Text>{item.name}</Text>
              </TouchableOpacity>
            )}/>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showIngredientPicker} transparent>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerBody, {height: '70%'}]}>
            <TextInput style={[styles.input, {margin: 10}]} placeholder="Lọc nguyên liệu..." value={ingSearchText} onChangeText={setIngSearchText} />
            <FlatList 
                data={ingredientsDB.filter(i => i.name?.toLowerCase().includes(ingSearchText.toLowerCase()))} 
                keyExtractor={i=>String(i.id)} 
                renderItem={({item}) => (
                    <TouchableOpacity style={styles.pickerItem} onPress={() => { 
                        setTempIngredient({...tempIngredient, id: item.id, name: item.name}); 
                        setShowIngredientPicker(false); 
                    }}>
                        <Text>[{item.id}] {item.name}</Text>
                    </TouchableOpacity>
                )}
            />
            <TouchableOpacity onPress={()=>setShowIngredientPicker(false)} style={{padding: 15, alignItems:'center'}}><Text style={{color: '#1b1d1c', fontWeight: 'bold'}}>Đóng</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}