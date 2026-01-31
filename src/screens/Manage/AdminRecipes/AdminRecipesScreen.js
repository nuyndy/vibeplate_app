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

import { styles } from './style';

// --- CẤU HÌNH CLOUDINARY ---
const CLOUD_NAME = 'devpumtqu';
const UPLOAD_PRESET = 'VibePlate';

// --- 1. COMPONENT ITEM ---
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
      </View>
      <View style={{ justifyContent: 'center'}}>
        <TouchableOpacity onPress={() => onEdit(item)} style={styles.btnEdit}>
          <Text style={styles.btnText}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(item)} style={styles.btnDel}>
          <Text style={styles.btnText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}, (prev, next) => prev.item.recipeId === next.item.recipeId);

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
  const [currentDocId, setCurrentDocId] = useState(null); 

  const [formData, setFormData] = useState({
    recipeId: '', categoryId: '', title: '', servings: '', time: '',
    description: '', photo_url: '', photosArray: [], ingredients: []   
  });

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showIngredientPicker, setShowIngredientPicker] = useState(false);
  const [tempIngredient, setTempIngredient] = useState({ id: '', name: '', quantity: '' });
  const [ingSearchText, setIngSearchText] = useState('');

  // --- LOAD DỮ LIỆU ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const [recSnap, catSnap, ingSnap] = await Promise.all([
        getDocs(collection(db, 'recipes')),
        getDocs(collection(db, 'categories')),
        getDocs(collection(db, 'ingredients'))
      ]);

      setRecipes(recSnap.docs.map(doc => ({ firestoreDocId: doc.id, ...doc.data() })));
      setCategories(catSnap.docs.map(doc => ({ firestoreDocId: doc.id, ...doc.data() })));
      setIngredientsDB(ingSnap.docs.map(doc => {
          const data = doc.data();
          return { firestoreDocId: doc.id, ...data, id: data.ingredientId };
      }));
    } catch (error) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- HÀM UPLOAD ---
  const uploadToCloudinary = async (imageFile) => {
    if (!imageFile || !imageFile.uri) return null;
    const data = new FormData();
    const uri = Platform.OS === 'android' ? imageFile.uri : imageFile.uri.replace('file://', '');
    const filename = uri.split('/').pop() || 'upload.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    data.append('file', { uri, name: filename, type });
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
      console.error("Fetch Error:", error);
      return null;
    }
  };

  const pickImage = async (type) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Lỗi', 'Cần quyền truy cập ảnh');

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setUploading(true);
      const url = await uploadToCloudinary(result.assets[0]); 
      setUploading(false);
      if (url) {
        if (type === 'cover') setFormData(p => ({ ...p, photo_url: url }));
        else setFormData(p => ({ ...p, photosArray: [...p.photosArray, url] }));
      }
    }
  };

  // --- LOGIC FORM ---
  const addIngredientToForm = () => {
    // Sửa check id !== '' để cho phép chọn ID 0
    if (tempIngredient.id === '' || !tempIngredient.quantity) {
        return Alert.alert("Lỗi", "Vui lòng chọn nguyên liệu và nhập SL.");
    }
    const newIng = { 
        ingredientId: Number(tempIngredient.id), 
        name: tempIngredient.name, 
        quantity: tempIngredient.quantity 
    };
    setFormData({ ...formData, ingredients: [...formData.ingredients, newIng] });
    setTempIngredient({ id: '', name: '', quantity: '' }); 
  };

  const removeIngredient = (index) => {
    const newList = [...formData.ingredients];
    newList.splice(index, 1);
    setFormData({ ...formData, ingredients: newList });
  };

  const handleSave = async () => {
    // Check categoryId !== '' để chấp nhận ID 0
    if (!formData.title || formData.categoryId === '' || !formData.recipeId) {
        return Alert.alert("Thiếu thông tin", "Nhập đầy đủ ID, tên món và danh mục.");
    }
    
    setLoading(true);
    try {
      const docRef = isEditMode && currentDocId ? doc(db, 'recipes', currentDocId) : doc(collection(db, 'recipes'));
      const dataToSave = {
        recipeId: Number(formData.recipeId), 
        categoryId: Number(formData.categoryId), 
        title: formData.title,
        servings: Number(formData.servings) || 1,
        time: Number(formData.time) || 0,
        description: formData.description,
        photo_url: formData.photo_url,
        photosArray: formData.photosArray,
        ingredients: formData.ingredients.map(i => ({ 
            ingredientId: Number(i.ingredientId), 
            quantity: i.quantity 
        })),
        updatedAt: serverTimestamp()
      };
      await setDoc(docRef, dataToSave);
      setModalVisible(false);
      fetchData();
      Alert.alert("Thành công", "Đã lưu công thức.");
    } catch (e) { Alert.alert("Lỗi", e.message); } 
    finally { setLoading(false); }
  };

  const openModal = useCallback((item = null) => {
    if (item) {
      setIsEditMode(true);
      setCurrentDocId(item.firestoreDocId); 
      const mappedIngs = (item.ingredients || []).map(ing => {
        // Dùng String để so sánh ID 0 chính xác
        const found = ingredientsDB.find(d => String(d.id) === String(ing.ingredientId));
        return { ...ing, name: found ? found.name : 'Không xác định' };
      });
      setFormData({ 
          ...item, 
          recipeId: String(item.recipeId), 
          ingredients: mappedIngs, 
          photosArray: item.photosArray || [],
          categoryId: item.categoryId === undefined ? '' : item.categoryId
      });
    } else {
      setIsEditMode(false);
      setCurrentDocId(null);
      const maxId = recipes.reduce((max, r) => Math.max(max, Number(r.recipeId) || 0), 0);
      setFormData({ 
        recipeId: String(maxId + 1), categoryId: '', title: '', servings: '', time: '', 
        description: '', photo_url: '', photosArray: [], ingredients: [] 
      });
    }
    setModalVisible(true);
  }, [recipes, ingredientsDB]);

  const handleDelete = useCallback((item) => {
    Alert.alert("Xác nhận", `Xóa "${item.title}"?`, [
      { text: "Hủy" },
      { text: "Xóa", style: 'destructive', onPress: async () => {
          await deleteDoc(doc(db, 'recipes', item.firestoreDocId));
          fetchData();
      }}
    ]);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
            <Text style={{fontSize: 20}}>🔍</Text>
            <TextInput style={styles.searchInput} placeholder="Tìm món ăn..." value={searchText} onChangeText={setSearchText} />
        </View>
      </View>

      <FlatList 
        data={recipes.filter(i => i.title?.toLowerCase().includes(searchText.toLowerCase()))}
        keyExtractor={item => String(item.recipeId || item.firestoreDocId)}
        renderItem={({item}) => <RecipeItem item={item} onEdit={openModal} onDelete={handleDelete} />}
        contentContainerStyle={{paddingBottom: 100}}
      />

      <TouchableOpacity style={styles.fab} onPress={() => openModal(null)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : null} style={{flex: 1}}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{isEditMode ? 'Sửa món' : 'Thêm mới'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{fontSize: 24, color:'#999'}}>✕</Text></TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <Text style={styles.label}>Ảnh bìa</Text>
            <TouchableOpacity style={styles.coverPicker} onPress={() => pickImage('cover')} disabled={uploading}>
              {uploading ? <ActivityIndicator color="#000" /> : 
                formData.photo_url ? <Image source={{ uri: formData.photo_url }} style={styles.coverImage} /> : 
                <View style={styles.coverPlaceholder}><Text>+ Tải ảnh bìa</Text></View>
              }
            </TouchableOpacity>

            <Text style={styles.label}>Tên món ăn</Text>
            <TextInput style={styles.input} placeholder="..." value={formData.title} onChangeText={t => setFormData({...formData, title: t})} />
            
            <Text style={styles.label}>Danh mục</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setShowCategoryPicker(true)}>
                <Text>{categories.find(c => String(c.id) === String(formData.categoryId))?.name || "Chọn..."}</Text>
                <Text>▼</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Nguyên liệu</Text>
            <View style={styles.ingredientBox}>
                <View style={{flexDirection: 'row', marginBottom: 10}}>
                    <TouchableOpacity style={[styles.selectBox, {flex: 2, marginBottom: 0}]} onPress={() => setShowIngredientPicker(true)}>
                        <Text numberOfLines={1}>{tempIngredient.id !== '' ? `[${tempIngredient.id}] ${tempIngredient.name}` : "Chọn..."}</Text>
                    </TouchableOpacity>
                    <TextInput style={[styles.input, {flex: 1, marginLeft: 5, marginBottom: 0}]} placeholder="SL" value={tempIngredient.quantity} onChangeText={t => setTempIngredient({...tempIngredient, quantity: t})} />
                    <TouchableOpacity style={styles.btnAddIng} onPress={addIngredientToForm}><Text style={{color: '#fff', fontSize: 20}}>+</Text></TouchableOpacity>
                </View>
                {formData.ingredients.map((item, index) => (
                    <View key={index} style={styles.ingItem}>
                        <Text style={{flex: 1}}>• {item.name} ({item.quantity})</Text>
                        <TouchableOpacity onPress={() => removeIngredient(index)}><Text style={{color: 'red'}}>✕</Text></TouchableOpacity>
                    </View>
                ))}
            </View>

            <Text style={styles.label}>Mô tả cách làm</Text>
            <TextInput style={[styles.input, {height: 100, textAlignVertical: 'top'}]} multiline value={formData.description} onChangeText={t => setFormData({...formData, description: t})} />
            <View style={{height: 100}} />
          </ScrollView>

          <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.saveBtnText}>LƯU CÔNG THỨC</Text>}
              </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* PICKER CATEGORY */}
      <Modal visible={showCategoryPicker} transparent animationType="fade">
        <TouchableOpacity style={styles.pickerOverlay} onPress={() => setShowCategoryPicker(false)}>
          <View style={styles.pickerBody}>
            <FlatList data={categories} keyExtractor={i=>String(i.firestoreDocId)} renderItem={({item}) => (
              <TouchableOpacity style={styles.pickerItem} onPress={() => { setFormData({...formData, categoryId: item.id}); setShowCategoryPicker(false); }}>
                <Text>{item.name}</Text>
              </TouchableOpacity>
            )}/>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* PICKER INGREDIENT */}
      <Modal visible={showIngredientPicker} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerBody, {height: '60%'}]}>
            <TextInput style={styles.input} placeholder="Tìm nguyên liệu..." value={ingSearchText} onChangeText={setIngSearchText} />
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
          </View>
        </View>
      </Modal>
    </View>
  );
}