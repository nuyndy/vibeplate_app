import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, Image, 
  Alert, Modal, TextInput, ScrollView, ActivityIndicator, 
  SafeAreaView, KeyboardAvoidingView, Platform
} from 'react-native';

// --- ĐƯỜNG DẪN FIREBASE ---
import { db } from '../../../firebase/firebaseConfig'; 
import { collection, getDocs, doc, updateDoc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';

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
  const sendNotificationToUser = async (recipe, type, content) => {
    try {
      await addDoc(collection(db, "notification"), {
        email: recipe.authorId, // Hoặc recipe.authorName nếu bạn lưu ID vào đó. Quan trọng là trùng với ID user đang đăng nhập.
        type: type,             // approved / rejected / needs_edit
        content: content,
        time: serverTimestamp(),
        recipeId: recipe.id,    // Lưu thêm ID món để sau này user bấm vào thì mở món đó ra (tuỳ chọn)
        isRead: false           // Thêm cái này để sau làm tính năng chưa đọc/đã đọc (tuỳ chọn)
      });
      console.log("Đã gửi thông báo cho user:", recipe.authorId);
    } catch (error) {
      console.error("Lỗi gửi thông báo:", error);
    }
  };

  // --- 2. XỬ LÝ NÚT BẤM ---
  
  // A. Duyệt
  const handleApprove = async () => {
    setLoading(true);
    try {
      // ... (Logic lưu sang bảng recipes giữ nguyên) ...
      await setDoc(doc(db, MAIN_RECIPE_COLLECTION, selectedRecipe.id), {
          ...selectedRecipe,
          status: 'published',
          approvedAt: serverTimestamp()
      });
      // ... (Logic update bảng suggest giữ nguyên) ...
      await updateDoc(doc(db, SUGGEST_COLLECTION, selectedRecipe.id), { status: 'approved' });

      // ===> THÊM DÒNG NÀY: Gửi thông báo
      await sendNotificationToUser(selectedRecipe, 'approved', `Chúc mừng! Món "${selectedRecipe.title}" của bạn đã được duyệt và đăng công khai.`);
      
      closeModal("Đã duyệt và gửi thông báo! ");
    } catch (error) { Alert.alert("Lỗi", error.message); setLoading(false); }
  };
  const confirmApprove = () => {
      Alert.alert(
          "Duyệt món ăn",
          "Bạn có chắc chắn muốn duyệt món này và đăng công khai không?",
          [
              { text: "Hủy", style: "cancel" },
              { 
                  text: "Duyệt ngay", 
                  onPress: handleApprove // <--- Gọi hàm xử lý khi bấm OK
              } 
          ]
      );
  };

  // B. Từ chối
  const handleReject = async () => {
    setLoading(true);
    try {
       await updateDoc(doc(db, SUGGEST_COLLECTION, selectedRecipe.id), { status: 'rejected' });
       
       // ===> THÊM DÒNG NÀY: Gửi thông báo
       await sendNotificationToUser(selectedRecipe, 'rejected', `Rất tiếc, món "${selectedRecipe.title}" đã bị từ chối.`);

       closeModal("Đã từ chối và gửi thông báo!");
    } catch (error) { Alert.alert("Lỗi", error.message); setLoading(false); }
  };
  // 2. Hàm xác nhận (Gắn hàm này vào nút bấm trong giao diện)
  const confirmReject = () => {
      Alert.alert(
          "Xác nhận từ chối",
          "Bạn có chắc chắn muốn từ chối món ăn này không? Hành động này không thể hoàn tác.",
          [
              { text: "Hủy", style: "cancel" },
              { 
                  text: "Từ chối", 
                  style: 'destructive', 
                  onPress: handleReject // <-- Bấm OK thì mới gọi hàm xử lý ở trên
              } 
          ]
      );
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

              // ===> THÊM DÒNG NÀY: Gửi thông báo
              await sendNotificationToUser(
                  selectedRecipe, 
                  'needs_edit', 
                  `Yêu cầu sửa món "${selectedRecipe.title}"`, 
                  feedbackText 
              );

              closeModal("Đã gửi yêu cầu sửa!");
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
          contentContainerStyle={{ padding: 15 }} // Cách lề ngoài cùng một chút
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => onOpenDetail(item)}>
               
               {/* 1. BÊN TRÁI: ẢNH (Kích thước cố định) */}
               <Image 
                 source={{ uri: item.photo_url || 'https://via.placeholder.com/150' }} 
                 style={styles.cardImage} 
               />
               
               {/* 2. Ở GIỮA: THÔNG TIN (Dùng flex: 1 để giãn hết khoảng trống còn lại) */}
               <View style={styles.cardContent}>
                 <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                 </Text>
                 <Text style={styles.cardAuthor}>
                    👤 {item.authorName || 'Ẩn danh'}
                 </Text>
                 <Text style={[
                    styles.statusText, 
                    { color: item.status === 'updated' ? '#E65100' : '#757575' }
                 ]}>
                    {item.status === 'updated' ? '⚠️ Đã sửa lại' : '🕒 Đang chờ duyệt'}
                 </Text>
               </View>

               {/* 3. BÊN PHẢI: MŨI TÊN */}
               <View style={styles.arrowContainer}>
                  <Text style={styles.arrowIcon}>›</Text>
               </View>

            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={{textAlign:'center', marginTop: 20, color:'#999'}}>
                Hiện không có bài nào chờ duyệt
            </Text>
          }
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
                                    <TouchableOpacity 
                                        style={[styles.miniBtn, {
                                            backgroundColor: '#000', 
                                            paddingVertical: 8, 
                                            paddingHorizontal: 15, 
                                            borderRadius: 4
                                        }]} 
                                        onPress={handleSendFeedback}
                                    >
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