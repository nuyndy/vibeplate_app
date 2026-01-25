import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, Image, 
  Alert, Modal, TextInput, ScrollView, ActivityIndicator, 
  SafeAreaView, KeyboardAvoidingView, Platform
} from 'react-native';

// --- ĐƯỜNG DẪN FIREBASE ---
import { db } from '../../../firebase/firebaseConfig'; 
import { collection, getDocs, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// --- IMPORT STYLE ---
import { styles, COLORS } from './style'; 

const SUGGEST_COLLECTION = 'suggested_recipes';
const MAIN_RECIPE_COLLECTION = 'recipes';

export default function AdminSuggestedRecipesScreen({ navigation }) {
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // State Modal & Chức năng
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  // --- 1. LẤY DỮ LIỆU ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, SUGGEST_COLLECTION));
      let items = [];
      querySnapshot.forEach((document) => {
        items.push({ id: document.id, ...document.data() });
      });
      
      // Lọc bài pending (chờ) hoặc updated (đã sửa lại)
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

  // --- 2. XỬ LÝ NÚT BẤM ---
  
  // A. Duyệt
  const confirmApprove = () => {
    Alert.alert("Xác nhận", "Duyệt công thức này lên ứng dụng?", [
      { text: "Hủy", style: "cancel" },
      { text: "Duyệt", onPress: handleApprove }
    ]);
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      // Lưu sang bảng chính thức (recipes)
      // Dữ liệu đã khớp cấu trúc bên Đóng góp (description chứa text, photosArray chứa ảnh)
      await setDoc(doc(db, MAIN_RECIPE_COLLECTION, selectedRecipe.id), {
          ...selectedRecipe,
          status: 'published',
          approvedAt: serverTimestamp()
      });
      // Cập nhật trạng thái trong bảng chờ
      await updateDoc(doc(db, SUGGEST_COLLECTION, selectedRecipe.id), { status: 'approved' });
      
      closeModal("Đã duyệt thành công! ✅");
    } catch (error) { Alert.alert("Lỗi", error.message); setLoading(false); }
  };

  // B. Từ chối
  const confirmReject = () => {
    Alert.alert("Cảnh báo", "Bạn chắc chắn muốn từ chối bài này?", [
      { text: "Hủy", style: "cancel" },
      { text: "Từ chối", style: 'destructive', onPress: handleReject }
    ]);
  };

  const handleReject = async () => {
    setLoading(true);
    try {
       await updateDoc(doc(db, SUGGEST_COLLECTION, selectedRecipe.id), { status: 'rejected' });
       closeModal("Đã từ chối món ăn! ❌");
    } catch (error) { Alert.alert("Lỗi", error.message); setLoading(false); }
  };

  // C. Gửi yêu cầu sửa
  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return Alert.alert("Lỗi", "Vui lòng nhập lý do cần sửa.");
    Alert.alert("Xác nhận", "Gửi yêu cầu sửa cho người dùng?", [
      { text: "Hủy", style: "cancel" },
      { text: "Gửi", onPress: async () => {
          setLoading(true);
          try {
              await updateDoc(doc(db, SUGGEST_COLLECTION, selectedRecipe.id), {
                  status: 'needs_edit', 
                  adminFeedback: feedbackText, 
                  updatedAt: serverTimestamp()
              });
              closeModal("Đã gửi yêu cầu sửa! 📝");
          } catch (error) { Alert.alert("Lỗi", error.message); setLoading(false); }
      }}
    ]);
  };

  const closeModal = (message) => {
    if(message) Alert.alert("Thành công", message);
    setModalVisible(false);
    setShowFeedbackInput(false);
    setFeedbackText('');
    fetchData(); 
  };

  const onOpenDetail = (item) => {
    setSelectedRecipe(item);
    setShowFeedbackInput(false);
    setFeedbackText('');
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Duyệt Công Thức 🍲</Text>
      </View>

      {loading && !modalVisible ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }}/>
      ) : (
        <FlatList
          data={dataList}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => onOpenDetail(item)}>
               {/* Hiển thị ảnh đại diện */}
               <Image source={{ uri: item.photo_url || 'https://via.placeholder.com/150' }} style={styles.cardImage} />
               <View style={styles.cardContent}>
                 <Text style={styles.cardTitle}>{item.title}</Text>
                 <Text style={styles.cardAuthor}>Gửi bởi: {item.authorName || 'Ẩn danh'}</Text>
                 <Text style={{ fontSize: 12, color: item.status === 'updated' ? 'orange' : '#888' }}>
                    {item.status === 'updated' ? '⚠️ Đã chỉnh sửa lại' : '🕒 Đang chờ duyệt'}
                 </Text>
               </View>
               <Text style={{fontSize: 24, color: '#ccc'}}>›</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Hiện không có bài nào chờ duyệt</Text>}
        />
      )}

      {/* --- MODAL CHI TIẾT --- */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
            <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={{padding: 10}}>
                    <Text style={{fontSize: 16, color: '#666'}}>✕ Đóng</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Chi tiết món ăn</Text>
                <View style={{width: 50}} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
            <ScrollView style={{flex: 1, paddingHorizontal: 20}}>
                {selectedRecipe && (
                    <>
                        {/* 1. ẢNH BÌA */}
                        <Image source={{ uri: selectedRecipe.photo_url }} style={styles.detailImage} />
                        
                        {/* 2. TIÊU ĐỀ & THÔNG SỐ */}
                        <Text style={styles.detailTitle}>{selectedRecipe.title}</Text>
                        <View style={{flexDirection: 'row', gap: 15, marginBottom: 20}}>
                             <Text style={styles.metaBadge}>⏱ {selectedRecipe.time} phút</Text>
                             <Text style={styles.metaBadge}>👥 {selectedRecipe.servings} suất</Text>
                        </View>

                        {/* 3. NGUYÊN LIỆU */}
                        <Text style={styles.sectionHeader}>Nguyên liệu:</Text>
                        {selectedRecipe.ingredients?.map((ing, index) => (
                            <View key={index} style={styles.ingredientRow}>
                                <Text style={styles.textBody}>• {ing.name}</Text>
                                <Text style={{fontWeight:'bold'}}>{ing.quantity}</Text>
                            </View>
                        ))}

                        {/* 4. CÁCH LÀM (Hiển thị description thay vì steps) */}
                        <Text style={styles.sectionHeader}>Cách làm / Mô tả:</Text>
                        <View style={styles.stepBox}>
                           <Text style={styles.textBody}>{selectedRecipe.description}</Text>
                        </View>

                        {/* 5. ẢNH PHỤ (Nếu có trong photosArray) */}
                        {selectedRecipe.photosArray && selectedRecipe.photosArray.length > 1 && (
                            <View>
                                <Text style={styles.sectionHeader}>Ảnh minh họa thêm:</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginVertical: 10}}>
                                    {selectedRecipe.photosArray.map((imgUrl, idx) => (
                                        <Image 
                                            key={idx} 
                                            source={{uri: imgUrl}} 
                                            style={{width: 120, height: 120, borderRadius: 8, marginRight: 10, backgroundColor: '#eee'}} 
                                        />
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* KHUNG NHẬP FEEDBACK KHI ADMIN YÊU CẦU SỬA */}
                        {showFeedbackInput && (
                            <View style={styles.feedbackBox}>
                                <Text style={{fontWeight:'bold', color:'#E65100', marginBottom:5}}>Lý do yêu cầu sửa:</Text>
                                <TextInput 
                                    style={styles.inputFeedback}
                                    placeholder="Nhập lý do (ví dụ: Thiếu ảnh, sai chính tả...)"
                                    multiline
                                    value={feedbackText}
                                    onChangeText={setFeedbackText}
                                />
                                <View style={{flexDirection:'row', gap:10, marginTop:10}}>
                                    <TouchableOpacity style={[styles.miniBtn, {backgroundColor:'#ccc'}]} onPress={() => setShowFeedbackInput(false)}>
                                        <Text>Hủy</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.miniBtn, {backgroundColor: COLORS.secondary}]} onPress={handleSendFeedback}>
                                        <Text style={{color:'#fff', fontWeight:'bold'}}>Gửi yêu cầu</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        <View style={{height: 100}} /> 
                    </>
                )}
            </ScrollView>
            </KeyboardAvoidingView>

            {/* THANH TÁC VỤ */}
            {!showFeedbackInput && (
                <View style={styles.bottomBar}>
                    <TouchableOpacity style={[styles.bigBtn, {backgroundColor: '#FFEBEE'}]} onPress={confirmReject}>
                        <Text style={{color: COLORS.danger, fontWeight:'bold'}}>TỪ CHỐI</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.bigBtn, {backgroundColor: '#FFF3E0'}]} onPress={() => setShowFeedbackInput(true)}>
                        <Text style={{color: '#E65100', fontWeight:'bold'}}>YÊU CẦU SỬA</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.bigBtn, {backgroundColor: COLORS.primary}]} onPress={confirmApprove}>
                        <Text style={{color: '#fff', fontWeight:'bold'}}>✓ DUYỆT</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}