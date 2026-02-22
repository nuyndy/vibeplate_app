import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, TouchableOpacity, 
  Image, Alert, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Modal, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { db, auth } from '../../firebase/firebaseConfig'; 
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { styles, COLORS } from './style';

// --- CẤU HÌNH CLOUDINARY ---
const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const hasCloudinaryConfig = () => Boolean(CLOUD_NAME && UPLOAD_PRESET);

export default function DishNominationScreen({ navigation }) {
  
  const [dishName, setDishName] = useState('');
  const [description, setDescription] = useState(''); 
  const [dishImage, setDishImage] = useState(null);
  const [extraPhotos, setExtraPhotos] = useState([]); 

  const [ingredients, setIngredients] = useState([]); 
  const [allIngredients, setAllIngredients] = useState([]); 
  const [filteredIngredients, setFilteredIngredients] = useState([]); 
  const [ingredientSearch, setIngredientSearch] = useState(''); 
  const [selectedIngredient, setSelectedIngredient] = useState(null); 
  const [tempQty, setTempQty] = useState(''); 
  const [showIngredientModal, setShowIngredientModal] = useState(false); 

  const [loading, setLoading] = useState(false);

  const [time, setTime] = useState('');
  const [servings, setServings] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const catSnap = await getDocs(collection(db, 'categories'));
        setCategories(catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const ingSnap = await getDocs(collection(db, 'ingredients'));
        const ingList = ingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllIngredients(ingList);
        setFilteredIngredients(ingList); 
      } catch (e) { console.log("Lỗi load dữ liệu:", e); }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (ingredientSearch.trim() === '') {
      setFilteredIngredients(allIngredients);
    } else {
      const lower = ingredientSearch.toLowerCase();
      const filtered = allIngredients.filter(item => item.name.toLowerCase().includes(lower));
      setFilteredIngredients(filtered);
    }
  }, [ingredientSearch, allIngredients]);

  // --- CẬP NHẬT HEADER LEFT TẠI ĐÂY ---
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Đóng Góp Món Ngon',
      headerTitleAlign: 'center', // Căn giữa tiêu đề cho đẹp
      headerStyle: { backgroundColor: COLORS.card },
      headerTintColor: COLORS.primary,
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={{ marginLeft: 15, padding: 5 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // --- HÀM UPLOAD ẢNH (GIỮ NGUYÊN) ---
  const uploadToCloudinary = async (imageUri) => {
    if (!hasCloudinaryConfig()) return null;

    const data = new FormData();
    const uri = Platform.OS === 'android' ? imageUri : imageUri.replace('file://', '');
    
    data.append('file', { 
      uri, 
      type: 'image/jpeg', 
      name: `recipe_${Date.now()}.jpg` 
    });
    data.append('upload_preset', UPLOAD_PRESET);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { 
        method: 'POST', 
        body: data,
        headers: { 'Accept': 'application/json', 'Content-Type': 'multipart/form-data' }
      });
      const result = await res.json();
      if (result.secure_url) return result.secure_url;
      console.log("Cloudinary Error:", result);
      return null;
    } catch (error) { 
      console.log("Fetch Upload Error:", error);
      return null; 
    }
  };

  // --- HÀM CHỌN ẢNH (GIỮ NGUYÊN) ---
  const pickImage = async (type) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert("Quyền truy cập", "Vui lòng cấp quyền truy cập ảnh trong Cài đặt.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images', 
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        setLoading(true); 
        const url = await uploadToCloudinary(selectedUri);
        setLoading(false);

        if (url) {
          if (type === 'cover') setDishImage(url);
          else setExtraPhotos(prev => [...prev, url]);
        } else {
          Alert.alert("Lỗi", "Không thể upload ảnh. Kiểm tra lại Cloudinary Preset.");
        }
      }
    } catch (err) {
      console.log("Lỗi hệ thống khi chọn ảnh:", err);
      Alert.alert("Lỗi", "Không thể mở thư viện ảnh.");
    }
  };

  const addIngredient = () => {
    if (!selectedIngredient || !tempQty.trim()) return Alert.alert("Lỗi", "Vui lòng chọn tên và nhập định lượng");
    setIngredients([...ingredients, { 
      ingredientId: selectedIngredient.id, 
      name: selectedIngredient.name, 
      quantity: tempQty 
    }]);
    setSelectedIngredient(null);
    setTempQty('');
  };

  const handleSubmit = async () => {
    if (!dishName || !categoryId || !time || !servings || ingredients.length === 0 || !description) {
      return Alert.alert("Thiếu thông tin", "Vui lòng điền đầy đủ các mục.");
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

      const newRecipeData = {
        id: newDocId,
        authorId: user.email,
        authorName: user.displayName || user.email,
        title: dishName,
        categoryId: Number(categoryId),
        time: Number(time),
        servings: Number(servings),
        description: description, 
        ingredients: ingredients, 
        photo_url: dishImage || '', 
        photosArray: dishImage ? [dishImage, ...extraPhotos] : [...extraPhotos], 
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'suggested_recipes', newDocId), newRecipeData);
      Alert.alert("Thành công", "Đã gửi công thức chờ duyệt!", [{ text: "OK", onPress: () => navigation.goBack() }]);
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
          
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Thông tin món ăn</Text>
            <TouchableOpacity style={styles.coverPicker} onPress={() => pickImage('cover')}>
              {dishImage ? (
                <Image source={{ uri: dishImage }} style={styles.coverImage} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Text style={{color: COLORS.primary, fontWeight: '700'}}>+ Tải ảnh bìa</Text>
                </View>
              )}
              {loading && <ActivityIndicator style={{position:'absolute'}} color={COLORS.primary} size="large" />}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tên món</Text>
              <TextInput style={styles.input} placeholderTextColor={COLORS.placeholder} placeholder="Tên món ăn..." value={dishName} onChangeText={setDishName} />
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
                <TextInput style={styles.input} placeholderTextColor={COLORS.placeholder} placeholder="30" keyboardType="numeric" value={time} onChangeText={setTime} />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Khẩu phần</Text>
                <TextInput style={styles.input} placeholderTextColor={COLORS.placeholder} placeholder="2" keyboardType="numeric" value={servings} onChangeText={setServings} />
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionHeader}>🛒 Nguyên liệu</Text>
            <View style={styles.addInputRow}>
              <TouchableOpacity style={[styles.selectBox, {flex:2, marginTop:0}]} onPress={() => setShowIngredientModal(true)}>
                  <Text style={selectedIngredient ? styles.selectText : styles.selectPlaceholder}>
                    {selectedIngredient ? selectedIngredient.name : "Chọn..."}
                  </Text>
              </TouchableOpacity>
              <TextInput style={[styles.input, {flex: 1, height: 50, marginLeft: 10}]} placeholder="Lượng" value={tempQty} onChangeText={setTempQty} />
              <TouchableOpacity style={styles.btnAddSmall} onPress={addIngredient}><Text style={styles.btnAddText}>+</Text></TouchableOpacity>
            </View>
            <View style={styles.chipContainer}>
              {ingredients.map((item, index) => (
                <TouchableOpacity key={index} style={styles.chip} onPress={() => setIngredients(ingredients.filter((_, i) => i !== index))}>
                  <Text style={styles.chipText}>{item.name} ({item.quantity}) ✕</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionHeader}>🍳 Cách làm</Text>
            <TextInput 
                style={[styles.input, {height: 120, textAlignVertical: 'top'}]} 
                placeholderTextColor={COLORS.placeholder}
                placeholder="Mô tả các bước nấu ăn..." 
                multiline 
                value={description} 
                onChangeText={setDescription} 
            />

            <View style={{marginTop: 15}}>
                <Text style={styles.label}>Ảnh minh họa thêm:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 10}}>
                    <TouchableOpacity style={styles.addPhotoDashBox} onPress={() => pickImage('extra')}>
                      <Text style={styles.bigPlus}>+</Text>
                    </TouchableOpacity>

                    {extraPhotos.map((url, idx) => (
                        <View key={idx} style={{marginRight: 10}}>
                            <Image source={{uri: url}} style={{width: 80, height: 80, borderRadius: 8}} />
                        </View>
                    ))}
                </ScrollView>
            </View>
          </View>

          <TouchableOpacity style={[styles.submitButton, loading && { opacity: 0.5 }]} onPress={handleSubmit} disabled={loading}>
             {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>GỬI CÔNG THỨC ✨</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL DANH MỤC */}
      <Modal visible={showCategoryModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowCategoryModal(false)}>
           <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Danh mục</Text>
              <FlatList data={categories} keyExtractor={item => String(item.id)} renderItem={({item}) => (
                  <TouchableOpacity style={styles.categoryItem} onPress={() => { setCategoryId(item.id); setShowCategoryModal(false); }}>
                    <Text style={styles.categoryText}>{item.name}</Text>
                  </TouchableOpacity>
                )} />
           </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL NGUYÊN LIỆU */}
      <Modal visible={showIngredientModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
           <View style={[styles.modalContent, { height: '70%' }]}> 
              <TextInput 
                style={styles.searchBoxModal} 
                placeholder="Tìm nguyên liệu..." 
                value={ingredientSearch} 
                onChangeText={setIngredientSearch} 
              />
              <FlatList 
                data={filteredIngredients} 
                keyExtractor={item => String(item.id)} 
                renderItem={({item}) => (
                  <TouchableOpacity style={styles.categoryItem} onPress={() => { setSelectedIngredient(item); setShowIngredientModal(false); }}>
                    <Text style={styles.categoryText}>{item.name}</Text>
                  </TouchableOpacity>
                )} 
              />
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowIngredientModal(false)}><Text style={styles.closeText}>Đóng</Text></TouchableOpacity>
           </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}