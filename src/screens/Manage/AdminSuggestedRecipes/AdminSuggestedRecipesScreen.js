import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, Image, 
  Alert, Modal, TextInput, ScrollView, ActivityIndicator, 
  SafeAreaView, KeyboardAvoidingView, Platform
} from 'react-native';

// --- FIREBASE ---
import { db } from '../../../firebase/firebaseConfig'; 
import { collection, getDocs, doc, updateDoc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';

// --- STYLE ---
import { styles, COLORS } from './style'; 
import { Ionicons } from '@expo/vector-icons';

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
  const [feedbackMode, setFeedbackMode] = useState(''); // 'reject' hoặc 'edit'

  // --- 1. LẤY DỮ LIỆU ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, SUGGEST_COLLECTION));
      let items = [];
      querySnapshot.forEach((document) => {
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

  const sendNotificationToUser = async (recipe, type, content) => {
    try {
      // Tạo ID duy nhất bằng cách kết hợp email author và ID món ăn
      // Ví dụ: "user@gmail.com_recipe123"
      const customNotiId = `${recipe.authorId}_${recipe.id}`;
      
      const notiRef = doc(db, "notification", customNotiId);

      await setDoc(notiRef, {
        email: recipe.authorId, 
        type: type,             
        content: content,
        time: serverTimestamp(), // Cập nhật lại thời gian mới nhất
        recipeId: recipe.id,    
        isRead: false, // Reset lại trạng thái chưa đọc khi có cập nhật mới
        title: recipe.title // Nên thêm title vào để hiển thị ở danh sách thông báo dễ hơn
      });
    } catch (error) {
      console.error("Lỗi gửi/cập nhật thông báo:", error);
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

      await sendNotificationToUser(selectedRecipe, 'approved', `Chúc mừng! Món "${selectedRecipe.title}" đã được duyệt.`);
      closeModal("Đã duyệt công thức thành công!");
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
        // Xử lý TỪ CHỐI
        await updateDoc(doc(db, SUGGEST_COLLECTION, selectedRecipe.id), { 
          status: 'rejected',
          adminFeedback: feedbackText 
        });
        await sendNotificationToUser(selectedRecipe, 'rejected', `Món "${selectedRecipe.title}" bị từ chối. Lý do: ${feedbackText}`);
        closeModal("Đã từ chối công thức.");
      } else {
        // Xử lý YÊU CẦU SỬA
        await updateDoc(doc(db, SUGGEST_COLLECTION, selectedRecipe.id), {
          status: 'needs_edit', 
          adminFeedback: feedbackText, 
          updatedAt: serverTimestamp()
        });
        await sendNotificationToUser(selectedRecipe, 'needs_edit', `Yêu cầu sửa món "${selectedRecipe.title}": ${feedbackText}`);
        closeModal("Đã gửi yêu cầu chỉnh sửa.");
      }
    } catch (error) { Alert.alert("Lỗi", error.message); setLoading(false); }
  };

  const closeModal = (message) => {
    if(message) Alert.alert("Thành công", message);
    setModalVisible(false);
    setShowFeedbackInput(false);
    setFeedbackText('');
    setFeedbackMode('');
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
          contentContainerStyle={{ padding: 15 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => onOpenDetail(item)}>
               <Image source={{ uri: item.photo_url || 'https://via.placeholder.com/150' }} style={styles.cardImage} />
               <View style={styles.cardContent}>
                 <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                 <Text style={styles.cardAuthor}>👤 {item.authorName || 'Ẩn danh'}</Text>
                 <Text style={[styles.statusText, { color: item.status === 'updated' ? '#E65100' : '#757575' }]}>
                    {item.status === 'updated' ? '⚠️ Đã sửa lại' : '🕒 Đang chờ duyệt'}
                 </Text>
               </View>
               <View style={styles.arrowContainer}><Text style={styles.arrowIcon}>›</Text></View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 20, color:'#999'}}>Không có bài nào chờ duyệt</Text>}
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
                        <Image source={{ uri: selectedRecipe.photo_url }} style={styles.detailImage} />
                        <Text style={styles.detailTitle}>{selectedRecipe.title}</Text>
                        <View style={{flexDirection: 'row', gap: 15, marginBottom: 20}}>
                             <Text style={styles.metaBadge}>⏱ {selectedRecipe.time} phút</Text>
                             <Text style={styles.metaBadge}>👥 {selectedRecipe.servings} suất</Text>
                        </View>

                        <Text style={styles.sectionHeader}>Nguyên liệu:</Text>
                        {selectedRecipe.ingredients?.map((ing, index) => (
                            <View key={index} style={styles.ingredientRow}>
                                <Text style={styles.textBody}>• {ing.name}</Text>
                                <Text style={{fontWeight:'bold'}}>{ing.quantity}</Text>
                            </View>
                        ))}

                        <Text style={styles.sectionHeader}>Cách làm / Mô tả:</Text>
                        <View style={styles.stepBox}><Text style={styles.textBody}>{selectedRecipe.description}</Text></View>

                        {/* KHUNG NHẬP FEEDBACK (DÙNG CHUNG CHO REJECT & EDIT) */}
                        {showFeedbackInput && (
                            <View style={[styles.feedbackBox, {borderColor: feedbackMode === 'reject' ? '#FFCDD2' : '#FFE0B2'}]}>
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
                                    <TouchableOpacity style={[styles.miniBtn, {backgroundColor:'#ccc'}]} onPress={() => setShowFeedbackInput(false)}>
                                        <Text>Hủy</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.miniBtn, {backgroundColor: feedbackMode === 'reject' ? COLORS.danger : '#000'}]} 
                                        onPress={handleSubmitFeedback}
                                    >
                                        <Text style={{color:'#fff', fontWeight:'bold'}}>Xác nhận & Gửi</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        <View style={{height: 100}} /> 
                    </>
                )}
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
      </Modal>
    </SafeAreaView>
  );
}