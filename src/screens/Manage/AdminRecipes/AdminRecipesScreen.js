import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, Image, 
  Alert, Modal, TextInput, ScrollView, ActivityIndicator, Keyboard
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
  // --- STATE ---
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [ingredientsDB, setIngredientsDB] = useState([]);

  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentDocId, setCurrentDocId] = useState(null); 

  const [formData, setFormData] = useState({
    recipeId: '', 
    categoryId: '', 
    title: '', servings: '', time: '',
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

      setRecipes(recSnap.docs.map(doc => ({ 
          firestoreDocId: doc.id,
          ...doc.data()
      })));

      setCategories(catSnap.docs.map(doc => ({ 
          firestoreDocId: doc.id,
          ...doc.data() 
      })));
      
      // 🔥 FIX QUAN TRỌNG: Map ingredientId thành id để đồng bộ logic tìm kiếm
      setIngredientsDB(ingSnap.docs.map(doc => {
          const data = doc.data();
          return {
            firestoreDocId: doc.id,
            ...data,
            id: data.ingredientId // Lấy giá trị từ trường ingredientId gán cho id
          };
      }));

    } catch (error) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- UPLOAD ẢNH ---
  const uploadToCloudinary = async (imageUri) => {
    if (!imageUri) return null;
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
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.8,
    });
    if (!result.canceled) {
      Alert.alert("Đang tải ảnh...", "Vui lòng đợi.");
      const url = await uploadToCloudinary(result.assets[0].uri); 
      if (url) {
        if (type === 'cover') setFormData(p => ({ ...p, photo_url: url }));
        else setFormData(p => ({ ...p, photosArray: [...p.photosArray, url] }));
      }
    }
  };

  // --- LOGIC FORM ---
  const addIngredientToForm = () => {
    if (!tempIngredient.id || !tempIngredient.quantity) return Alert.alert("Thiếu thông tin", "Chọn nguyên liệu và nhập số lượng.");
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
    if (!formData.title || !formData.categoryId || !formData.recipeId) return Alert.alert("Thiếu thông tin", "Nhập ID, tên món và danh mục.");
    
    setLoading(true);
    try {
      const inputId = Number(formData.recipeId);

      const existingRecipe = recipes.find(r => r.recipeId === inputId);
      if (existingRecipe && (!isEditMode || existingRecipe.firestoreDocId !== currentDocId)) {
          Alert.alert("Lỗi trùng lặp", `ID số ${inputId} đã tồn tại ở món "${existingRecipe.title}".`);
          setLoading(false);
          return;
      }

      const docRef = isEditMode && currentDocId 
          ? doc(db, 'recipes', currentDocId) 
          : doc(collection(db, 'recipes'));

      const dataToSave = {
        recipeId: inputId, 
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

  const handleDelete = useCallback((item) => {
    if (!item.firestoreDocId) return Alert.alert("Lỗi", "Không tìm thấy ID bài viết");
    Alert.alert("Xác nhận", `Xóa món "${item.title}" (ID: ${item.recipeId})?`, [
      { text: "Hủy" },
      { text: "Xóa", style: 'destructive', onPress: async () => {
          await deleteDoc(doc(db, 'recipes', item.firestoreDocId));
          fetchData();
      }}
    ]);
  }, []);

  const openModal = useCallback((item = null) => {
    if (item) {
      setIsEditMode(true);
      setCurrentDocId(item.firestoreDocId); 
      
      // LOGIC TÌM TÊN NGUYÊN LIỆU (Giờ đã hoạt động vì ingredientsDB đã có trường id)
      const mappedIngs = (item.ingredients || []).map(ing => {
        // So sánh lỏng (==) để khớp số và chuỗi
        const found = ingredientsDB.find(d => d.id == ing.ingredientId);
        return { 
            ...ing, 
            ingredientId: ing.ingredientId,
            name: found ? found.name : 'Unknown' // Sẽ hiện tên đúng
        };
      });

      setFormData({ 
          ...item, 
          recipeId: String(item.recipeId), 
          ingredients: mappedIngs, 
          photosArray: item.photosArray || [],
          categoryId: Number(item.categoryId)
      });
    } else {
      setIsEditMode(false);
      setCurrentDocId(null);
      
      const maxId = recipes.reduce((max, item) => Math.max(max, Number(item.recipeId) || 0), 0);
      const nextId = maxId + 1;

      setFormData({ 
        recipeId: String(nextId), 
        categoryId: '', title: '', servings: '', time: '', 
        description: '', photo_url: '', photosArray: [], ingredients: [] 
      });
    }
    setModalVisible(true);
  }, [recipes, ingredientsDB]);

  // --- FILTER & RENDER ---
  const filteredData = recipes.filter(i => i.title && i.title.toLowerCase().includes(searchText.toLowerCase()));
  
  const filteredIngredients = ingredientsDB.filter(item => {
    const keyword = ingSearchText.toLowerCase().trim();
    const nameMatch = item.name && item.name.toLowerCase().includes(keyword);
    const idMatch = item.id && String(item.id).includes(keyword); // Tìm theo ID (đã map)
    return nameMatch || idMatch;
  });

  const selectedCategoryName = categories.find(c => c.id == formData.categoryId)?.name;
  const renderItem = useCallback(({ item }) => <RecipeItem item={item} onEdit={openModal} onDelete={handleDelete} />, [openModal, handleDelete]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
             <Text style={{fontSize: 20}}>🔍</Text>
             <TextInput 
                style={styles.searchInput} placeholder="Tìm công thức..." 
                value={searchText} onChangeText={setSearchText}
             />
        </View>
      </View>

      <FlatList 
        data={filteredData}
        keyExtractor={item => String(item.recipeId || item.firestoreDocId)}
        renderItem={renderItem}
        initialNumToRender={8} maxToRenderPerBatch={10} windowSize={5} removeClippedSubviews={true}
        contentContainerStyle={{paddingBottom: 100}}
        getItemLayout={(data, index) => ({length: 110, offset: 110 * index, index})}
      />

      <TouchableOpacity style={styles.fab} onPress={() => openModal(null)}><Text style={styles.fabText}>+</Text></TouchableOpacity>

      {/* --- MODAL FORM --- */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{isEditMode ? 'Cập Nhật' : 'Thêm Mới'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{fontSize: 24, color:'#999'}}>✕</Text></TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {/* 1. Ảnh */}
            <Text style={styles.label}>Ảnh đại diện</Text>
            <TouchableOpacity style={styles.coverPicker} onPress={() => pickImage('cover')}>
              {formData.photo_url ? (
                <Image source={{ uri: formData.photo_url }} style={styles.coverImage} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Text style={{color: '#1b1d1c', fontWeight: '600'}}>+ Tải ảnh</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Album ảnh hướng dẫn</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexDirection: 'row', marginTop: 5}}>
                <TouchableOpacity style={styles.addPhotoBox} onPress={() => pickImage('process')}><Text style={{fontSize: 30, color: '#999'}}>+</Text></TouchableOpacity>
                {formData.photosArray.map((url, index) => <Image key={index} source={{uri: url}} style={styles.albumThumb} />)}
            </ScrollView>

            {/* ID Tự Động */}
            <Text style={styles.label}>ID Công thức (Tự động)</Text>
            <TextInput 
                style={[styles.input, {backgroundColor: '#f9f9f9'}]} 
                placeholder="ID (số)" 
                keyboardType="numeric"
                value={formData.recipeId} 
                onChangeText={t => setFormData({...formData, recipeId: t})} 
            />

            {/* 2. Thông tin chung */}
            <Text style={styles.label}>Thông tin chung</Text>
            <TextInput style={styles.input} placeholder="Tên món ăn" value={formData.title} onChangeText={t => setFormData({...formData, title: t})} />
            
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <TextInput style={[styles.input, {width: '48%'}]} placeholder="Số người" keyboardType="numeric" value={String(formData.servings)} onChangeText={t => setFormData({...formData, servings: t})} />
                <TextInput style={[styles.input, {width: '48%'}]} placeholder="Thời gian (phút)" keyboardType="numeric" value={String(formData.time)} onChangeText={t => setFormData({...formData, time: t})} />
            </View>

            {/* 3. Danh mục */}
            <Text style={styles.label}>Danh mục</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setShowCategoryPicker(true)}>
               <Text>{selectedCategoryName || "-- Chọn danh mục --"}</Text><Text>▼</Text>
            </TouchableOpacity>

            {/* 4. Nguyên liệu */}
            <Text style={styles.label}>Nguyên liệu</Text>
            <View style={styles.ingredientBox}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                    <TouchableOpacity style={[styles.selectBox, {flex: 2, marginBottom: 0}]} onPress={() => setShowIngredientPicker(true)}>
                        <Text numberOfLines={1}>
                            {tempIngredient.id ? `[${tempIngredient.id}] ${tempIngredient.name}` : "Chọn nguyên liệu..."}
                        </Text>
                    </TouchableOpacity>
                    <TextInput 
                        style={[styles.input, {flex: 1, marginBottom: 0, marginLeft: 5}]} 
                        placeholder="SL (200g)" value={tempIngredient.quantity} 
                        onChangeText={t => setTempIngredient({...tempIngredient, quantity: t})} 
                    />
                    <TouchableOpacity style={styles.btnAddIng} onPress={addIngredientToForm}><Text style={{color: '#fff', fontSize: 20}}>+</Text></TouchableOpacity>
                </View>
                {/* List Nguyên liệu */}
                {formData.ingredients.map((item, index) => (
                    <View key={index} style={styles.ingItem}>
                        <Text style={{flex: 1}}>• [{item.ingredientId}] {item.name} ({item.quantity})</Text>
                        <TouchableOpacity onPress={() => removeIngredient(index)}><Text style={{color: 'red'}}>✕</Text></TouchableOpacity>
                    </View>
                ))}
            </View>

            {/* 5. Cách làm */}
            <Text style={styles.label}>Cách làm</Text>
            <TextInput style={[styles.input, {height: 100, textAlignVertical: 'top'}]} multiline placeholder="Mô tả..." value={formData.description} onChangeText={t => setFormData({...formData, description: t})} />
            <View style={{height: 50}}/>
          </ScrollView>

          <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.saveBtnText}>LƯU CÔNG THỨC</Text>}
              </TouchableOpacity>
          </View>

          {/* --- PICKER CATEGORY --- */}
          <Modal visible={showCategoryPicker} transparent animationType="fade">
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

           {/* --- PICKER INGREDIENT --- */}
           <Modal visible={showIngredientPicker} transparent animationType="fade" onRequestClose={() => setShowIngredientPicker(false)}>
             <View style={styles.pickerOverlay}>
                <View style={[styles.pickerBody, {height: '70%'}]}>
                   <Text style={{fontWeight:'bold', marginBottom:10, textAlign:'center', fontSize: 16}}>Chọn Nguyên Liệu</Text>
                   
                   <View style={{flexDirection:'row', backgroundColor:'#f0f0f0', borderRadius:8, alignItems:'center', marginBottom:10, paddingHorizontal:10}}>
                       <Text>🔍</Text>
                       <TextInput 
                          style={{flex:1, padding:10, height: 40}} 
                          placeholder="Tìm tên hoặc ID..." 
                          value={ingSearchText} 
                          onChangeText={setIngSearchText}
                          autoFocus={true}
                       />
                       {ingSearchText ? <TouchableOpacity onPress={()=>setIngSearchText('')}><Text style={{color:'#999'}}>✕</Text></TouchableOpacity> : null}
                   </View>

                   <FlatList 
                      data={filteredIngredients} 
                      keyExtractor={i=>String(i.id)} 
                      initialNumToRender={10} removeClippedSubviews={true} 
                      keyboardShouldPersistTaps="handled"
                      ListEmptyComponent={<Text style={{textAlign:'center', color:'#999', marginTop:20}}>Không thấy "{ingSearchText}"</Text>}
                      renderItem={({item}) => (
                        <TouchableOpacity 
                           style={[styles.pickerItem, {borderBottomWidth:1, borderColor:'#f0f0f0'}]} 
                           onPress={() => { 
                               setTempIngredient({...tempIngredient, id: item.id, name: item.name}); 
                               setShowIngredientPicker(false); 
                               setIngSearchText(''); 
                           }}
                        >
                           <Text style={{fontSize:16}}>
                              <Text style={{fontWeight:'bold', color: '#555'}}>[{item.id}]</Text> {item.name}
                           </Text>
                        </TouchableOpacity>
                    )}/>
                   
                   <TouchableOpacity onPress={() => { setShowIngredientPicker(false); setIngSearchText(''); }} style={{padding:15, alignItems:'center', borderTopWidth:1, borderColor:'#eee'}}>
                        <Text style={{color:'red', fontWeight:'bold'}}>Đóng</Text>
                   </TouchableOpacity>
                </View>
             </View>
          </Modal>

        </View>
      </Modal>
    </View>
  );
}