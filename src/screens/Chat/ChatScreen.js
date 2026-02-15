import React, { useState, useLayoutEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, Image,
  StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 
import MenuImage from '../../components/MenuImage/MenuImage';

// --- IMPORT 2 HÀM SERVICE AI ---
import { sendMessageToGemini, generateRecipeJSON } from '../Services/AIService'; 

// 1. COMPONENT CARD CÔNG THỨC CHI TIẾT (KHÔNG BỊ BỌC TRONG BUBBLE TEXT)
// ====================================================================
const DetailedRecipeCard = ({ recipeData }) => {
  if (!recipeData) return null;

  const isAiMade = recipeData.recipeId === 'none' || recipeData.recipeId === 'null';

  const handleSaveRecipe = () => {
    Alert.alert("Thành công", `Đã lưu món "${recipeData.title}" vào danh sách yêu thích!`);
  };

  return (
    <View style={styles.recipeCard}>
      {/* Ảnh món ăn */}
      <Image 
        source={{ uri: recipeData.photo_url || 'https://via.placeholder.com/300' }} 
        style={styles.cardImage} 
      />
      
      <View style={styles.cardContent}>
        <Text style={styles.cardRecipeTitle}>{recipeData.title}</Text>
        
        <View style={styles.cardMetaInfo}>
          <Text style={styles.cardMetaText}>⏱ {recipeData.time} phút</Text>
          <Text style={styles.cardMetaText}>👥 {recipeData.servings} người</Text>
        </View>

        {/* Cảnh báo nếu là món AI tự chế */}
        {isAiMade && (
          <Text style={styles.cardAiWarningText}>
            ✨ Món ăn này được AI sáng tạo riêng cho bạn, không có sẵn trong hệ thống!
          </Text>
        )}

        <Text style={styles.cardSectionTitle}>Nguyên liệu:</Text>
        {recipeData.ingredients?.map((ing, index) => (
          <Text key={index} style={styles.cardIngredientText}>
            • {ing.name} - {ing.amount}
          </Text>
        ))}

        <Text style={styles.cardSectionTitle}>Cách làm:</Text>
        <Text style={styles.cardDescriptionText}>{recipeData.description}</Text>

        
      </View>
    </View>
  );
};


// ====================================================================
// 2. MÀN HÌNH CHAT CHÍNH
// ====================================================================
export default function ChatScreen({ navigation }) {
  const flatListRef = useRef();
  const [isTyping, setIsTyping] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Trợ lý AI',
      headerStyle: { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
      headerTintColor: '#000',
      headerLeft: () => (<MenuImage onPress={() => navigation.openDrawer()} />),
      headerRight: () => <View />,
    });
  }, []);

  // State tin nhắn có chứa "type" để phân biệt Text và Card
  const [messages, setMessages] = useState([
    { id: '1', type: 'text', text: 'Chào bạn! Bạn muốn nấu món gì, hay cần tôi gợi ý công thức chi tiết?', sender: 'ai' },
  ]);
  const [inputText, setInputText] = useState('');

  // --- HÀM GỬI TIN NHẮN  ---
  const sendMessage = async () => {
    const userText = inputText.trim();
    if (userText.length === 0) return;

    // 1. Hiện câu hỏi của User lên màn hình
    const userMsg = { id: Date.now().toString(), type: 'text', text: userText, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const lowerText = userText.toLowerCase();

      // 2. LOGIC THÔNG MINH ĐỂ GỌI CARD:
      // - Có chứa các từ khóa xin công thức
      // - HOẶC câu nhập vào rất ngắn (dưới 15 ký tự), thường là người dùng chỉ gõ tên nguyên liệu (VD: "Tôm", "Thịt bò", "Trứng")
      const isAskingForRecipe = 
        lowerText.includes('công thức') || 
        lowerText.includes('cách làm') || 
        lowerText.includes('hướng dẫn') ||
        lowerText.includes('nấu') ||
        lowerText.length <= 15; // Bắt các từ khóa ngắn

      if (isAskingForRecipe) {
         console.log("Đang tạo card công thức cho:", userText);
         
         // Gọi API lấy JSON
         const recipeJson = await generateRecipeJSON(userText);
         
         // In ra Terminal để kiểm tra dữ liệu
         console.log("=== DỮ LIỆU JSON TỪ AI ===");
         console.log(JSON.stringify(recipeJson, null, 2)); 
         console.log("==========================");

         // Tin nhắn 1: Text mồi cực kỳ tự nhiên
         const textIntroMsg = {
            id: Date.now().toString(),
            type: 'text',
            text: `Với nguyên liệu này, mình gợi ý bạn làm món **${recipeJson.title}** nhé! Gửi bạn công thức chi tiết: 🍳`,
            sender: 'ai'
         };

         // Tin nhắn 2: Card chi tiết (giao diện đen trắng)
         const cardMsg = { 
            id: (Date.now() + 1).toString(), 
            type: 'recipe_card', 
            recipeData: recipeJson, 
            sender: 'ai' 
         };

         // Cập nhật cả 2 tin nhắn cùng lúc
         setMessages(prev => [...prev, textIntroMsg, cardMsg]);

      } else {
         // 3. Nếu User chat câu dài bình thường (hỏi han, trò chuyện) -> Trả về Text thường
         console.log("Đang chat text bình thường...");
         const textReply = await sendMessageToGemini(userText, messages); 
         const textMsg = { 
            id: Date.now().toString(), 
            type: 'text', 
            text: textReply,
            sender: 'ai' 
         };
         setMessages(prev => [...prev, textMsg]);
      }

    } catch (error) {
        console.error("Lỗi gọi AI: ", error);
        const errorMsg = { id: Date.now().toString(), type: 'text', text: 'Xin lỗi, tôi đang gặp lỗi kết nối mạng. Bạn thử lại nhé!', sender: 'ai' };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsTyping(false);
    }
  };

  // --- HÀM RENDER ITEM LUỒNG CHAT ---
  const renderItem = ({ item }) => {
    const isUser = item.sender === 'user';
    
    return (
      <View style={[styles.messageRow, isUser ? styles.rowReverse : styles.rowLeft]}>
        
        {/* Avatar AI (Chỉ hiện cho tin nhắn AI dạng text) */}
        {!isUser && item.type === 'text' && (
          <View style={styles.avatarContainer}>
            <Ionicons name="sparkles-outline" size={16} color="black" />
          </View>
        )}

        {/* KIỂM TRA LOẠI TIN NHẮN */}
        {item.type === 'text' ? (
          // NẾU LÀ TEXT: Render bong bóng chat (Bubble)
          <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
            <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>{item.text}</Text>
          </View>
        ) : item.type === 'recipe_card' ? (
          // NẾU LÀ CARD: Render thẳng Component Card, KHÔNG DÙNG BUBBLE
          // Lùi vào một chút (marginLeft: 38) để căn lề cho đẹp với Avatar AI phía trên
          <View style={{ marginLeft: 38, width: '85%', marginTop: 4 }}> 
            <DetailedRecipeCard recipeData={item.recipeData} />
          </View>
        ) : null}

      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      
      {/* Hiệu ứng AI đang suy nghĩ */}
      {isTyping && (
        <View style={{marginLeft: 54, marginBottom: 12, flexDirection:'row', alignItems:'center'}}>
            <ActivityIndicator size="small" color="#666" />
            <Text style={{color:'#666', fontSize: 12, marginLeft: 8}}>AI đang soạn công thức...</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={90}>
        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input} placeholder="Hỏi công thức, ví dụ: Cách làm gà rán..." placeholderTextColor="#999"
              value={inputText} onChangeText={setInputText} multiline
            />
            <TouchableOpacity onPress={sendMessage} style={[styles.sendButton, { opacity: inputText.trim() ? 1 : 0.5 }]} disabled={!inputText.trim() || isTyping}>
              <Ionicons name="arrow-up" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// 3. STYLES
const styles = StyleSheet.create({
  // --- STYLE KHUNG CHAT ---
  container: { flex: 1, backgroundColor: '#ffffff' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingVertical: 20 },
  messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' },
  rowReverse: { flexDirection: 'row-reverse' },
  rowLeft: { flexDirection: 'row' },
  avatarContainer: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: '#eee', marginTop: 4 },
  bubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  userBubble: { backgroundColor: '#000000', borderBottomRightRadius: 4 },
  userText: { color: '#ffffff', fontSize: 15, lineHeight: 22 },
  aiBubble: { backgroundColor: '#F4F4F5', borderBottomLeftRadius: 4 },
  aiText: { color: '#000000', fontSize: 15, lineHeight: 22 },
  inputWrapper: { padding: 10, backgroundColor: '#ffffff', borderTopWidth: 1, borderColor: '#f0f0f0' },
  inputContainer: { flexDirection: 'row', backgroundColor: '#F4F4F5', borderRadius: 30, paddingHorizontal: 6, paddingVertical: 6, alignItems: 'center' },
  input: { flex: 1, paddingHorizontal: 15, paddingVertical: 8, fontSize: 16, maxHeight: 100, color: '#000' },
  sendButton: { backgroundColor: '#000000', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  // --- STYLE CARD CHI TIẾT (MỚI - THEO TÔNG ĐEN TRẮNG) ---
  recipeCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: '#000', 
    marginBottom: 5 
  },
  cardImage: { 
    width: '100%', 
    height: 160, 
    backgroundColor: '#eee',
    borderBottomWidth: 1,
    borderBottomColor: '#000'
  },
  cardContent: { padding: 12 },
  cardRecipeTitle: { fontSize: 18, fontWeight: 'bold', color: '#000', marginBottom: 8 },
  cardMetaInfo: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 10 },
  cardMetaText: { fontSize: 13, color: '#000', fontWeight: '500', marginRight: 15 },
  cardAiWarningText: { 
    color: '#333', 
    fontStyle: 'italic', 
    marginBottom: 10, 
    fontSize: 12, 
    borderLeftWidth: 2, 
    borderColor: '#000', 
    paddingLeft: 8,
    backgroundColor: '#f9f9f9',
    paddingVertical: 4
  },
  cardSectionTitle: { fontSize: 15, fontWeight: 'bold', marginTop: 10, marginBottom: 5, color: '#000' },
  cardIngredientText: { fontSize: 14, color: '#333', marginLeft: 5, marginBottom: 2 },
  cardDescriptionText: { fontSize: 14, color: '#333', lineHeight: 22, marginTop: 5 },
  
  cardSaveButton: { 
    flexDirection: 'row', 
    backgroundColor: '#000', 
    padding: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 20 
  },
  cardSaveButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  cardDisabledButton: { 
    flexDirection: 'row', 
    backgroundColor: '#f5f5f5', 
    padding: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 20, 
    borderWidth: 1, 
    borderColor: '#ddd' 
  },
  cardDisabledButtonText: { color: '#666', fontSize: 14, fontWeight: 'bold' },
});