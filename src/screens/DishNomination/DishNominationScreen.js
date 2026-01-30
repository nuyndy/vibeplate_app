import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, TouchableOpacity, 
  Image, Alert, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Modal, FlatList
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { db, auth } from '../../firebase/firebaseConfig'; 
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { styles, COLORS } from './style';

const CLOUD_NAME = 'devpumtqu';
const UPLOAD_PRESET = 'VibePlate';

export default function DishNominationScreen({ navigation }) {
  
  // --- STATE ---
  const [dishName, setDishName] = useState('');
  
  // THEO YÊU CẦU: Dùng description làm nơi chứa toàn bộ cách làm
  const [description, setDescription] = useState(''); 
  const [dishImage, setDishImage] = useState(null);
  
  // Mảng chứa thêm ảnh các bước (nếu người dùng muốn up thêm ảnh minh họa)
  const [extraPhotos, setExtraPhotos] = useState([]); 

  // --- STATE NGUYÊN LIỆU ---
  const [ingredients, setIngredients] = useState([]); 
  const [allIngredients, setAllIngredients] = useState([]); 
  const [filteredIngredients, setFilteredIngredients] = useState([]); 
  const [ingredientSearch, setIngredientSearch] = useState(''); 
  const [selectedIngredient, setSelectedIngredient] = useState(null); 
  const [tempQty, setTempQty] = useState(''); 
  const [showIngredientModal, setShowIngredientModal] = useState(false); 

  const [loading, setLoading] = useState(false);

  // State các trường Admin
  const [time, setTime] = useState('');
  const [servings, setServings] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // --- LOAD DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const catSnap = await getDocs(collection(db, 'categories'));
        setCategories(catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const ingSnap = await getDocs(collection(db, 'ingredients'));
        const ingList = ingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllIngredients(ingList);
        setFilteredIngredients(ingList); 
      } catch (e) { console.log("Lỗi load data:", e); }
    };
    fetchData();
  }, []);

  // Search nguyên liệu
  useEffect(() => {
    if (ingredientSearch.trim() === '') {
      setFilteredIngredients(allIngredients);
    } else {
      const lower = ingredientSearch.toLowerCase();
      const filtered = allIngredients.filter(item => item.name.toLowerCase().includes(lower));
      setFilteredIngredients(filtered);
    }
  }, [ingredientSearch, allIngredients]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Đóng Góp Món Ngon',
      headerStyle: { backgroundColor: COLORS.card, shadowColor: 'transparent', elevation: 0 },
      headerTitleStyle: { color: COLORS.textMain, fontWeight: '800', fontSize: 18 },
      headerTintColor: COLORS.primary,
    });
  }, [navigation]);

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
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      
      // Upload luôn để lấy URL
      setLoading(true); // Tạm hiện loading nhẹ
      const url = await uploadToCloudinary(uri);
      setLoading(false);

      if (url) {
         if (type === 'cover') {
             setDishImage(url);
         } else {
             // Thêm vào danh sách ảnh phụ
             setExtraPhotos([...extraPhotos, url]);
         }
      } else {
          Alert.alert("Lỗi", "Không upload được ảnh");
      }
    }
  };

  // --- LOGIC NGUYÊN LIỆU ---
  const addIngredient = () => {
    if (!selectedIngredient) return Alert.alert("Chưa chọn", "Vui lòng chọn tên nguyên liệu");
    if (!tempQty.trim()) return Alert.alert("Thiếu số lượng", "Vui lòng nhập định lượng");

    setIngredients([...ingredients, { 
      ingredientId: selectedIngredient.id, 
      name: selectedIngredient.name,      
      quantity: tempQty 
    }]);
    
    setSelectedIngredient(null);
    setTempQty('');
  };

  const removeIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  // --- SUBMIT ---
  const handleSubmit = async () => {
    // Validate cơ bản (Bỏ validate steps vì đã ẩn)
    if (!dishName || !categoryId || !time || !servings || ingredients.length === 0 || !description) {
      Alert.alert("Thiếu thông tin", "Vui lòng điền đầy đủ các mục.");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      const querySnapshot = await getDocs(collection(db, 'suggested_recipes'));
      let maxId = 0;
      querySnapshot.forEach((doc) => {
        const idNum = parseInt(doc.id);
        if (!isNaN(idNum) && idNum > maxId) maxId = idNum;
      });
      const newDocId = String(maxId + 1);

      // TẠO MẢNG ẢNH TỔNG HỢP: [Ảnh bìa, ...Ảnh phụ]
      let finalPhotos = [];
      if (dishImage) finalPhotos.push(dishImage);
      finalPhotos = finalPhotos.concat(extraPhotos);

      const newRecipeData = {
        id: newDocId,
        authorId: user.email,
        authorName: user.displayName || user.email,
        
        recipeId: Number(newDocId),
        title: dishName,
        categoryId: Number(categoryId),
        time: Number(time),
        servings: Number(servings),
        
        description: description, // Toàn bộ nội dung cách làm nằm ở đây
        steps: [],                // Mảng steps để rỗng
        
        ingredients: ingredients, 
        
        photo_url: dishImage || '',     // Ảnh đại diện
        photosArray: finalPhotos,       // Mảng chứa tất cả ảnh
        
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'suggested_recipes', newDocId), newRecipeData);

      Alert.alert("Thành công!", "Đã gửi công thức chờ duyệt.", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          
          {/* 1. THÔNG TIN CƠ BẢN */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Thông tin món ăn</Text>
            
            <TouchableOpacity style={styles.coverPicker} onPress={() => pickImage('cover')}>
              {dishImage ? (
                <Image source={{ uri: dishImage }} style={styles.coverImage} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Text style={{color: COLORS.primary, fontWeight: '600'}}>+ Tải ảnh bìa món ăn</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tên món</Text>
              <TextInput style={styles.input} placeholder="Ví dụ: Phở bò..." value={dishName} onChangeText={setDishName} />
            </View>

            <View style={styles.inputGroup}>
               <Text style={styles.label}>Danh mục</Text>
               <TouchableOpacity style={styles.selectBox} onPress={() => setShowCategoryModal(true)}>
                  <Text style={categoryId ? styles.selectText : styles.selectPlaceholder}>
                    {categories.find(c => c.id == categoryId)?.name || "-- Chọn danh mục --"}
                  </Text>
                  <Text>▼</Text>
               </TouchableOpacity>
            </View>

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Thời gian (phút)</Text>
                <TextInput style={styles.input} placeholder="30" placeholderTextColor={COLORS.placeholder} keyboardType="numeric" value={time} onChangeText={setTime} />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Khẩu phần (người)</Text>
                <TextInput style={styles.input} placeholder="2" placeholderTextColor={COLORS.placeholder} keyboardType="numeric" value={servings} onChangeText={setServings} />
              </View>
            </View>
          </View>

          {/* 2. NGUYÊN LIỆU (Giữ nguyên logic) */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>🛒 Nguyên liệu</Text>
            
            <View style={styles.addInputRow}>
              <TouchableOpacity 
                style={[styles.selectBox, { flex: 2, marginTop: 0, height: 50, paddingVertical: 0 }]} 
                onPress={() => { setIngredientSearch(''); setShowIngredientModal(true); }}
              >
                  <Text style={selectedIngredient ? styles.selectText : styles.selectPlaceholder}>
                    {selectedIngredient ? selectedIngredient.name : "Chọn tên..."}
                  </Text>
              </TouchableOpacity>

              <TextInput 
                style={[styles.input, {flex: 1, height: 50}]} 
                placeholder="Lượng" 
                placeholderTextColor={COLORS.placeholder}
                value={tempQty} 
                onChangeText={setTempQty} 
              />
              <TouchableOpacity style={styles.btnAddSmall} onPress={addIngredient}>
                <Text style={styles.btnAddText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.chipContainer}>
              {ingredients.map((item, index) => (
                <TouchableOpacity key={index} style={styles.chip} onPress={() => removeIngredient(index)}>
                  <Text style={styles.chipText}>{item.name} ({item.quantity})</Text>
                  <Text style={{color: 'white', marginLeft: 5}}>✕</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 3. CÁCH LÀM (SỬA LẠI: 1 Ô LỚN) */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>🍳 Cách làm (Chi tiết)</Text>
            
            <TextInput 
               style={[styles.input, {height: 150, padding: 10, textAlignVertical: 'top'}]} 
               placeholder="Bước 1: Sơ chế...&#10;Bước 2: Nấu...&#10;Bước 3: Hoàn thiện..." 
               placeholderTextColor={COLORS.placeholder}
               multiline 
               value={description} 
               onChangeText={setDescription} 
            />

            {/* Khu vực thêm ảnh phụ (Nằm trong mảng ảnh) */}
            <View style={{marginTop: 15}}>
                <Text style={styles.label}>Ảnh minh họa thêm (Tùy chọn):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexDirection: 'row', marginTop: 10}}>
                    {/* Nút thêm ảnh */}
                    <TouchableOpacity 
                      style={styles.addPhotoDashBox} 
                      onPress={() => pickImage('extra')}>
                      <Text style={styles.bigPlus}>+</Text>
                      <Text style={styles.subTextPlus}>Thêm ảnh</Text>
                    </TouchableOpacity>

                    {/* List ảnh đã chọn */}
                    {extraPhotos.map((url, idx) => (
                        <View key={idx} style={{marginRight: 10, position: 'relative'}}>
                            <Image source={{uri: url}} style={{width: 80, height: 80, borderRadius: 8}} />
                            <TouchableOpacity 
                                style={{position:'absolute', top:0, right:0, backgroundColor:'rgba(0,0,0,0.5)', padding:2, borderRadius:4}}
                                onPress={() => setExtraPhotos(extraPhotos.filter((_, i) => i !== idx))}
                            >
                                <Text style={{color: '#fff', fontSize: 10}}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>
            </View>

          </View>

          <TouchableOpacity style={[styles.submitButton, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
             {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>GỬI CÔNG THỨC ✨</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- MODAL DANH MỤC & NGUYÊN LIỆU (Giữ nguyên) --- */}
      <Modal visible={showCategoryModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowCategoryModal(false)}>
           <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Chọn Danh Mục</Text>
              <FlatList data={categories} keyExtractor={item => String(item.id)} renderItem={({item}) => (
                  <TouchableOpacity style={styles.categoryItem} onPress={() => { setCategoryId(item.id); setShowCategoryModal(false); }}>
                    <Text style={styles.categoryText}>{item.name}</Text>
                  </TouchableOpacity>
                )} />
           </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showIngredientModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
           <View style={[styles.modalContent, { height: '70%' }]}> 
              <Text style={styles.modalTitle}>Chọn Nguyên Liệu</Text>
              <View style={styles.searchBoxModal}>
                 <Text style={{marginRight: 10}}>🔍</Text>
                 <TextInput style={{flex: 1}} placeholder="Tìm kiếm..." value={ingredientSearch} onChangeText={setIngredientSearch} autoFocus/>
              </View>
              <FlatList data={filteredIngredients} keyExtractor={item => String(item.id)} renderItem={({item}) => (
                  <TouchableOpacity style={styles.categoryItem} onPress={() => { setSelectedIngredient(item); setShowIngredientModal(false); }}>
                    <Text style={styles.categoryText}>{item.name}</Text>
                  </TouchableOpacity>
                )} 
                ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20}}>Không tìm thấy</Text>}
              />
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowIngredientModal(false)}><Text style={styles.closeText}>Đóng</Text></TouchableOpacity>
           </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}