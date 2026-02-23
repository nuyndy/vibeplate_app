import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, Image, 
  Alert, TextInput, ScrollView, ActivityIndicator, 
  SafeAreaView, KeyboardAvoidingView, Platform, BackHandler
} from 'react-native';

// --- FIREBASE ---
import { db } from '../../../firebase/firebaseConfig'; 
import { collection, getDocs, doc, updateDoc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';

// --- STYLE ---
import { styles, COLORS } from './style'; 
import { Ionicons } from '@expo/vector-icons';

const SUGGEST_COLLECTION = 'suggested_recipes';
const MAIN_RECIPE_COLLECTION = 'recipes';
const CATEGORY_COLLECTION = 'categories';
const NOTI_COLLECTION = 'notification';

export default function AdminSuggestedRecipesScreen({ navigation }) {
  const [dataList, setDataList] = useState([]);
  const [categoriesMap, setCategoriesMap] = useState({});
  const [loading, setLoading] = useState(false);
  
  // State Chức năng (Thay thế Modal)
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackMode, setFeedbackMode] = useState(''); // 'reject' hoặc 'edit'

  // --- 1. LẤY DỮ LIỆU ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // Tải danh mục và món ăn cùng lúc để tối ưu tốc độ
      const [catSnap, recipeSnap] = await Promise.all([
        getDocs(collection(db, CATEGORY_COLLECTION)),
        getDocs(collection(db, SUGGEST_COLLECTION))
      ]);

      // Map danh mục: Khóa (Key) sẽ luôn được ép về chuỗi (String) để dễ so sánh
      let tempCatMap = {};
      catSnap.forEach(doc => {
        const data = doc.data();
        // Lấy trường data.id (nếu là số 11 thì ép thành chuỗi "11")
        const catId = data.id !== undefined ? String(data.id) : doc.id; 
        tempCatMap[catId] = data.name;
      });
      setCategoriesMap(tempCatMap);

      let items = [];
      recipeSnap.forEach((document) => {
        items.push({ id: document.id, ...document.data() });
      });
      
      const pendingItems = items.filter(item => 
        item.status === 'pending' || item.status === 'updated'
      );
      setDataList(pendingItems);
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", "Không tải được danh sách.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Xử lý nút Back trên Android để không bị văng app
  useEffect(() => {
    const backAction = () => {
      if (selectedRecipe) {
        closeDetail();
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [selectedRecipe]);

  // --- THÔNG BÁO (DÙNG addDoc ĐỂ AN TOÀN) ---
  const sendNotification = async (email, recipe, type, content) => {
    try {
      await addDoc(collection(db, NOTI_COLLECTION), {
        email: email, 
        type: type,            
        content: content,
        time: serverTimestamp(), 
        recipeId: String(recipe.id),    
        isRead: false, 
        title: recipe.title || "Công thức" 
      });
    } catch (error) {
      console.error("Lỗi gửi thông báo:", error);
    }
  };

  // --- 2. XỬ LÝ DUYỆT (APPROVE) ---
  const handleApprove = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, MAIN_RECIPE_COLLECTION, selectedRecipe.id), {
          ...selectedRecipe,
          status: 'published',
          approvedAt: serverTimestamp()
      });
      await updateDoc(doc(db, SUGGEST_COLLECTION, selectedRecipe.id), { status: 'approved' });

      const msg = `Chúc mừng! Món "${selectedRecipe.title}" đã được duyệt.`;
      await sendNotification(selectedRecipe.authorId, selectedRecipe, 'approved', msg);

      
      closeDetail("Đã duyệt công thức thành công!");
    } catch (error) { Alert.alert("Lỗi", error.message); setLoading(false); }
  };

  const confirmApprove = () => {
    Alert.alert("Duyệt món ăn", "Đăng công khai món này?", [
      { text: "Hủy", style: "cancel" },
      { text: "Duyệt ngay", onPress: handleApprove } 
    ]);
  };

  // --- 3. XỬ LÝ GỬI PHẢN HỒI (REJECT & EDIT) ---
  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) return Alert.alert("Lỗi", "Vui lòng nhập lý do.");

    setLoading(true);
    try {
      if (feedbackMode === 'reject') {
        await updateDoc(doc(db, SUGGEST_COLLECTION, selectedRecipe.id), { 
          status: 'rejected',
          adminFeedback: feedbackText 
        });
        const msg = `Món "${selectedRecipe.title}" bị từ chối. Lý do: ${feedbackText}`;
        await sendNotification(selectedRecipe.authorId, selectedRecipe, 'rejected', msg);
        
        closeDetail("Đã từ chối công thức.");
      } else {
        await updateDoc(doc(db, SUGGEST_COLLECTION, selectedRecipe.id), {
          status: 'needs_edit', 
          adminFeedback: feedbackText, 
          updatedAt: serverTimestamp()
        });
        const msg = `Yêu cầu sửa món "${selectedRecipe.title}": ${feedbackText}`;
        await sendNotification(selectedRecipe.authorId, selectedRecipe, 'needs_edit', msg);
        
        closeDetail("Đã gửi yêu cầu chỉnh sửa.");
      }
    } catch (error) { Alert.alert("Lỗi", error.message); setLoading(false); }
  };

  const closeDetail = (message) => {
    if(message && typeof message === 'string') Alert.alert("Thành công", message);
    setSelectedRecipe(null);
    setShowFeedbackInput(false);
    setFeedbackText('');
    setFeedbackMode('');
    fetchData(); 
  };

  const onOpenDetail = (item) => {
    setSelectedRecipe(item);
    setShowFeedbackInput(false);
    setFeedbackText('');
  };

  // ==========================================
  // RENDER 1: MÀN HÌNH DANH SÁCH
  // ==========================================
  if (!selectedRecipe) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Duyệt Công Thức 🍲</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }}/>
        ) : (
          <FlatList
            data={dataList}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 15 }}
            renderItem={({ item }) => {
              // Xử lý lấy tên danh mục ở ngoài danh sách (nếu cần)
              const catId = item.categoryId || item.category_id;
              const catName = categoriesMap[String(catId)] || 'Chưa phân loại';

              return (
                <TouchableOpacity style={styles.card} onPress={() => onOpenDetail(item)}>
                  <Image source={{ uri: item.photo_url || 'https://via.placeholder.com/150' }} style={styles.cardImage} />
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.cardAuthor}>👤 {item.authorName || 'Ẩn danh'} • 🏷 {catName}</Text>
                    <Text style={[styles.statusText, { color: item.status === 'updated' ? '#E65100' : '#757575' }]}>
                        {item.status === 'updated' ? '⚠️ Đã sửa lại' : '🕒 Đang chờ duyệt'}
                    </Text>
                  </View>
                  <View style={styles.arrowContainer}><Text style={styles.arrowIcon}>›</Text></View>
                </TouchableOpacity>
              )
            }}
            ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 20, color:'#999'}}>Không có bài nào chờ duyệt</Text>}
          />
        )}
      </SafeAreaView>
    );
  }

  // ==========================================
  // RENDER 2: MÀN HÌNH CHI TIẾT
  // ==========================================
  
  // Xử lý ép kiểu ID (đề phòng trường hợp CSDL lưu là categoryId hoặc category_id)
  const currentCatId = selectedRecipe.categoryId || selectedRecipe.category_id;
  const currentCategoryName = currentCatId ? (categoriesMap[String(currentCatId)] || 'Không xác định') : 'Chưa phân loại';

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
        <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => closeDetail()} style={{padding: 10}}>
                <Text style={{fontSize: 16, color: '#666'}}>‹ Quay lại</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Chi tiết món ăn</Text>
            <View style={{width: 60}} />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
        <ScrollView style={{flex: 1, paddingHorizontal: 20}} keyboardShouldPersistTaps="handled">
            
            {/* Lịch sử Admin Feedback */}
            {selectedRecipe.adminFeedback && (
              <View style={{ backgroundColor: '#fff3cd', padding: 12, borderRadius: 8, marginBottom: 15, marginTop: 10 }}>
                <Text style={{ color: '#856404', fontWeight: 'bold' }}>⚠️ Lịch sử nhắc nhở trước đó:</Text>
                <Text style={{ color: '#856404', marginTop: 4 }}>{selectedRecipe.adminFeedback}</Text>
              </View>
            )}

            {/* Ảnh & Tên & Danh Mục */}
            <Image source={{ uri: selectedRecipe.photo_url || 'https://via.placeholder.com/400' }} style={[styles.detailImage, {marginTop: 10}]} />
            <Text style={styles.detailTitle}>{selectedRecipe.title}</Text>
            
            {/* Thông số */}
            <View style={{flexDirection: 'row', gap: 15, marginBottom: 20}}>
              <Text style={styles.metaBadge}>🏷 {currentCategoryName}</Text>
              <Text style={styles.metaBadge}>⏱ {selectedRecipe.time || 0} phút</Text>
              <Text style={styles.metaBadge}>👥 {selectedRecipe.servings || 1} suất</Text>
            </View>

            {/* Nguyên Liệu */}
            <Text style={styles.sectionHeader}>Nguyên liệu:</Text>
            {Array.isArray(selectedRecipe.ingredients) && selectedRecipe.ingredients.length > 0 ? (
              selectedRecipe.ingredients.map((ing, index) => (
                  <View key={index} style={styles.ingredientRow}>
                      <Text style={styles.textBody}>• {ing?.name || 'Nguyên liệu'}</Text>
                      <Text style={{fontWeight:'bold'}}>{ing?.quantity}</Text>
                  </View>
              ))
            ) : (
              <Text style={{fontStyle: 'italic', color: '#888', marginBottom: 15}}>Không có danh sách nguyên liệu.</Text>
            )}

            {/* Album Ảnh */}
            {Array.isArray(selectedRecipe.photosArray) && selectedRecipe.photosArray.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={styles.sectionHeader}>Album ảnh thực tế:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectedRecipe.photosArray.map((imgUri, idx) => (
                    <Image key={String(idx)} source={{ uri: imgUri }} style={{ width: 120, height: 120, borderRadius: 8, marginRight: 10 }} resizeMode="cover" />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Cách Làm / Bước */}
            <Text style={styles.sectionHeader}>Cách làm / Mô tả:</Text>
            <View style={styles.stepBox}>
              {Array.isArray(selectedRecipe.steps) && selectedRecipe.steps.length > 0 ? (
                selectedRecipe.steps.map((step, idx) => {
                  const stepContent = typeof step === 'string' ? step : (step?.description || step?.content || JSON.stringify(step));
                  return (
                    <View key={String(idx)} style={{ marginBottom: 12 }}>
                      <Text style={{ fontWeight: 'bold', color: COLORS.primary, fontSize: 15 }}>Bước {idx + 1}:</Text>
                      <Text style={[styles.textBody, { marginTop: 4 }]}>{stepContent}</Text>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.textBody}>{selectedRecipe.description || "Tác giả không cập nhật nội dung các bước làm."}</Text>
              )}
            </View>

            {/* KHUNG NHẬP FEEDBACK */}
            {showFeedbackInput && (
                <View style={[styles.feedbackBox, {borderColor: feedbackMode === 'reject' ? '#FFCDD2' : '#FFE0B2', marginTop: 15}]}>
                    <Text style={{fontWeight:'bold', color: feedbackMode === 'reject' ? COLORS.danger : '#E65100', marginBottom:5}}>
                        {feedbackMode === 'reject' ? 'Lý do từ chối:' : 'Lý do yêu cầu sửa:'}
                    </Text>
                    <TextInput 
                        style={styles.inputFeedback}
                        placeholder="Nhập nội dung phản hồi cho người dùng..."
                        multiline
                        value={feedbackText}
                        onChangeText={setFeedbackText}
                        autoFocus
                    />
                    <View style={{flexDirection:'row', gap:10, marginTop:10}}>
                        <TouchableOpacity style={[styles.miniBtn, {backgroundColor:'#ccc', flex: 1, alignItems: 'center'}]} onPress={() => setShowFeedbackInput(false)}>
                            <Text>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.miniBtn, {backgroundColor: feedbackMode === 'reject' ? COLORS.danger : '#000', flex: 2, alignItems: 'center'}]} 
                            onPress={handleSubmitFeedback}
                        >
                            <Text style={{color:'#fff', fontWeight:'bold'}}>Xác nhận & Gửi</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
            <View style={{height: 100}} /> 
        </ScrollView>
        </KeyboardAvoidingView>

        {/* THANH TÁC VỤ DƯỚI CÙNG */}
        {!showFeedbackInput && (
            <View style={styles.bottomBar}>
                <TouchableOpacity 
                    style={[styles.bigBtn, {backgroundColor: '#FFEBEE'}]} 
                    onPress={() => { setFeedbackMode('reject'); setShowFeedbackInput(true); }}
                >
                    <Text style={{color: COLORS.danger, fontWeight:'bold'}}>TỪ CHỐI</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.bigBtn, {backgroundColor: '#FFF3E0'}]} 
                    onPress={() => { setFeedbackMode('edit'); setShowFeedbackInput(true); }}
                >
                    <Text style={{color: '#E65100', fontWeight:'bold'}}>YÊU CẦU SỬA</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.bigBtn, {backgroundColor: COLORS.primary}]} onPress={confirmApprove}>
                    <Text style={{color: '#fff', fontWeight:'bold'}}>✓ DUYỆT</Text>
                </TouchableOpacity>
            </View>
        )}
    </SafeAreaView>
  );
}