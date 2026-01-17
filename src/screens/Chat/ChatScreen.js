import React, { useState, useLayoutEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, 
  StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 
import MenuImage from '../../components/MenuImage/MenuImage';

export default function ChatScreen({ navigation }) {
  // 1. Cấu hình Header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Trợ lý AI',
      headerStyle: {
        backgroundColor: '#fff', // Header trắng
        elevation: 0, // Bỏ bóng đổ Android
        shadowOpacity: 0, // Bỏ bóng đổ iOS
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
      },
      headerTintColor: '#000', // Chữ màu đen
      headerLeft: () => (
        <MenuImage onPress={() => navigation.openDrawer()} />
      ),
      headerRight: () => <View />,
    });
  }, []);

  // 2. Dữ liệu tin nhắn mẫu
  const [messages, setMessages] = useState([
    { id: '1', text: 'Xin chào! Tôi là trợ lý ảo VibePlate. Tôi có thể giúp gì cho bữa ăn của bạn hôm nay?', sender: 'ai' },
  ]);
  const [inputText, setInputText] = useState('');

  // 3. Hàm gửi tin nhắn
  const sendMessage = () => {
    if (inputText.trim().length === 0) return;

    // Thêm tin nhắn của người dùng
    const userMsg = { id: Date.now().toString(), text: inputText, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Giả lập AI trả lời
    setTimeout(() => {
      const aiMsg = { 
        id: (Date.now() + 1).toString(), 
        text: 'Chức năng này đang được phát triển. Sắp tới tôi sẽ có thể gợi ý công thức nấu ăn cho bạn! Bạn có muốn thử tìm kiếm món ăn theo nguyên liệu không?', 
        sender: 'ai' 
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 1000);
  };

  // 4. Render từng tin nhắn
  const renderItem = ({ item }) => {
    const isUser = item.sender === 'user';
    
    return (
      <View style={[
        styles.messageRow, 
        isUser ? styles.rowReverse : styles.rowLeft
      ]}>
        
        {/* Avatar AI (Chỉ hiện nếu là tin nhắn AI) */}
        {!isUser && (
          <View style={styles.avatarContainer}>
            <Ionicons name="sparkles" size={16} color="black" />
          </View>
        )}

        {/* Bong bóng chat */}
        <View style={[
          styles.bubble, 
          isUser ? styles.userBubble : styles.aiBubble
        ]}>
          <Text style={[
            styles.messageText, 
            isUser ? styles.userText : styles.aiText
          ]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Khu vực nhập tin nhắn */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        keyboardVerticalOffset={100}
      >
        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              multiline // Cho phép xuống dòng nếu nhập dài
            />
            <TouchableOpacity 
                onPress={sendMessage} 
                style={[styles.sendButton, { opacity: inputText.trim() ? 1 : 0.5 }]} // Mờ đi nếu chưa nhập gì
                disabled={!inputText.trim()}
            >
              <Ionicons name="arrow-up" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Nền trắng hoàn toàn
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  // Row container để căn chỉnh trái/phải
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end', // Căn đáy để avatar nằm dưới cùng đoạn chat
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  rowLeft: {
    flexDirection: 'row',
  },
  
  // Avatar AI
  avatarContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0', // Xám rất nhạt
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },

  // Bong bóng chat chung
  bubble: {
    maxWidth: '80%', // Giới hạn chiều rộng để không tràn màn hình
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  
  // Style riêng cho User (Đen)
  userBubble: {
    backgroundColor: '#000000',
    borderBottomRightRadius: 4, // Bo góc nhọn để tạo điểm nhấn
  },
  userText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 22,
  },

  // Style riêng cho AI (Xám nhạt)
  aiBubble: {
    backgroundColor: '#F4F4F5', // Màu xám chuẩn hiện đại
    borderBottomLeftRadius: 4,
  },
  aiText: {
    color: '#000000',
    fontSize: 15,
    lineHeight: 22,
  },

  // Khu vực nhập liệu
  inputWrapper: {
    padding: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: '#F4F4F5', // Nền xám nhạt cho ô nhập
    borderRadius: 30,
    paddingHorizontal: 6,
    paddingVertical: 6,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100, // Giới hạn chiều cao khi nhập nhiều dòng
    color: '#000',
  },
  sendButton: {
    backgroundColor: '#000000', // Nút gửi màu đen
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});