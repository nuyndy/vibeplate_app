import React, { useState, useLayoutEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, 
  Image, Alert, KeyboardAvoidingView, Platform, SafeAreaView 
} from 'react-native';

// --- BẢNG MÀU HIỆN ĐẠI ---
const COLORS = {
  primary: '#1b1d1c',     // Xanh chủ đạo
  secondary: '#928f87',   // Vàng điểm nhấn
  bg: '#F8F9FD',          // Nền tổng thể (Xám xanh rất nhạt)
  card: '#FFFFFF',        // Nền thẻ trắng
  textMain: '#1A1D26',    // Đen than (dễ đọc hơn đen tuyền)
  textSub: '#A0A5B9',     // Xám nhạt
  inputBg: '#F5F6FA',     // Nền ô nhập liệu
  danger: '#FF6B6B',      // Màu đỏ báo lỗi/xóa
};

export default function DishNominationScreen({ navigation }) {
  
  // --- STATE ---
  const [dishName, setDishName] = useState('');
  const [description, setDescription] = useState('');
  const [dishImage, setDishImage] = useState(null);

  const [tempIngredient, setTempIngredient] = useState('');
  const [ingredients, setIngredients] = useState([]);

  const [tempStep, setTempStep] = useState('');
  const [tempStepImage, setTempStepImage] = useState(null);
  const [steps, setSteps] = useState([]);

  // --- HEADER CONFIG ---
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Đóng Góp Món Ngon',
      headerStyle: { backgroundColor: COLORS.card, shadowColor: 'transparent', elevation: 0 },
      headerTitleStyle: { color: COLORS.textMain, fontWeight: '800', fontSize: 18 },
      headerTintColor: COLORS.primary,
    });
  }, [navigation]);

  // --- LOGIC ---
  const pickImage = (setFunc) => {
    // Giả lập chọn ảnh
    setFunc('https://images.unsplash.com/photo-1546069901-ba9599a7e63c'); 
  };

  const addIngredient = () => {
    if (tempIngredient.trim()) {
      setIngredients([...ingredients, tempIngredient]);
      setTempIngredient('');
    }
  };

  const addStep = () => {
    if (tempStep.trim()) {
      setSteps([...steps, { text: tempStep, image: tempStepImage }]);
      setTempStep('');
      setTempStepImage(null);
    }
  };

  const handleSubmit = () => {
    if (!dishName || ingredients.length === 0 || steps.length === 0) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên, nguyên liệu và các bước.");
      return;
    }
    Alert.alert("Tuyệt vời! 👨‍🍳", "Món ăn của bạn đã được gửi đi phê duyệt.", [
      { text: "Về trang chủ", onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          
          {/* 1. HEADER ẢNH & TÊN MÓN */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Thông tin cơ bản</Text>
            
            {/* Vùng chọn ảnh Cover */}
            <TouchableOpacity style={styles.coverPicker} onPress={() => pickImage(setDishImage)}>
              {dishImage ? (
                <Image source={{ uri: dishImage }} style={styles.coverImage} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Image 
                    source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3342/3342137.png' }} 
                    style={{ width: 50, height: 50, marginBottom: 10, tintColor: COLORS.primary }} 
                  />
                  <Text style={{color: COLORS.primary, fontWeight: '600'}}>+ Tải ảnh món ăn</Text>
                  <Text style={{color: COLORS.textSub, fontSize: 12}}>Ảnh đẹp giúp món ăn hấp dẫn hơn</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tên món ăn</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Ví dụ: Cơm tấm sườn bì..."
                placeholderTextColor={COLORS.textSub}
                value={dishName}
                onChangeText={setDishName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mô tả ngắn</Text>
              <TextInput 
                style={[styles.input, {height: 80, paddingTop: 15}]} 
                placeholder="Giới thiệu sơ qua về hương vị..."
                placeholderTextColor={COLORS.textSub}
                multiline
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          {/* 2. NGUYÊN LIỆU (Style dạng Tags/Chips) */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>🛒 Nguyên liệu</Text>
            <Text style={styles.subHint}>Liệt kê các thành phần cần thiết</Text>

            {/* Input thêm nguyên liệu */}
            <View style={styles.addInputRow}>
              <TextInput 
                style={[styles.input, {flex: 1}]} 
                placeholder="Nhập tên & định lượng..."
                placeholderTextColor={COLORS.textSub}
                value={tempIngredient}
                onChangeText={setTempIngredient}
              />
              <TouchableOpacity style={styles.btnAddSmall} onPress={addIngredient}>
                <Text style={styles.btnAddText}>Thêm</Text>
              </TouchableOpacity>
            </View>

            {/* Danh sách Chips */}
            <View style={styles.chipContainer}>
              {ingredients.map((item, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.chip}
                  onPress={() => {
                    const newIds = ingredients.filter((_, i) => i !== index);
                    setIngredients(newIds);
                  }}
                >
                  <Text style={styles.chipText}>{item}</Text>
                  <View style={styles.chipClose}>
                    <Text style={{color: 'white', fontSize: 10, fontWeight:'bold'}}>✕</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {ingredients.length === 0 && <Text style={styles.emptyText}>Chưa có nguyên liệu nào</Text>}
            </View>
          </View>

          {/* 3. CÁC BƯỚC (Style Timeline) */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>🍳 Các bước thực hiện</Text>
            
            {steps.map((step, index) => (
              <View key={index} style={styles.stepCard}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.stepText}>{step.text}</Text>
                  {step.image && (
                    <Image source={{ uri: step.image }} style={styles.stepImage} />
                  )}
                </View>
                <TouchableOpacity onPress={() => {
                   const newSteps = steps.filter((_, i) => i !== index);
                   setSteps(newSteps);
                }}>
                  <Image 
                    source={{uri: 'https://cdn-icons-png.flaticon.com/512/1214/1214428.png'}} 
                    style={{width: 20, height: 20, tintColor: COLORS.danger, opacity: 0.5}} 
                  />
                </TouchableOpacity>
              </View>
            ))}

            {/* Form thêm bước */}
            <View style={styles.addStepBox}>
              <TextInput 
                style={[styles.input, {height: 80, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee'}]} 
                placeholder="Hướng dẫn chi tiết bước này..."
                placeholderTextColor={COLORS.textSub}
                multiline
                value={tempStep}
                onChangeText={setTempStep}
              />
              <View style={styles.stepActions}>
                <TouchableOpacity style={styles.btnPhoto} onPress={() => pickImage(setTempStepImage)}>
                   <Text style={{fontSize: 13, color: tempStepImage ? COLORS.primary : COLORS.textSub, fontWeight: '600'}}>
                     {tempStepImage ? "📸 Đã có ảnh" : "📷 Thêm ảnh bước"}
                   </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnAddStep} onPress={addStep}>
                  <Text style={{color: '#fff', fontWeight: 'bold'}}>+ Lưu bước {steps.length + 1}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* NÚT SUBMIT LỚN */}
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
             <Text style={styles.submitText}>GỬI CÔNG THỨC ✨</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 50,
  },
  
  // --- CARD CHUNG ---
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    // Bóng đổ mềm
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 15,
  },
  subHint: {
    fontSize: 13,
    color: COLORS.textSub,
    marginTop: -10,
    marginBottom: 15,
  },

  // --- INPUT STYLES ---
  inputGroup: {
    marginTop: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.textMain,
    fontWeight: '500',
  },

  // --- IMAGE PICKER ---
  coverPicker: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E8F7F0', // Xanh rất nhạt
    borderWidth: 2,
    borderColor: '#C2EBD9',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    alignItems: 'center',
  },

  // --- INGREDIENT CHIPS ---
  addInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  btnAddSmall: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  btnAddText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#F0F9F4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    paddingRight: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1EBE1',
  },
  chipText: {
    color: '#2F4F4F',
    fontWeight: '600',
    fontSize: 13,
    marginRight: 6,
  },
  chipClose: {
    backgroundColor: '#BCCGC6', 
    width: 18, 
    height: 18, 
    borderRadius: 9, 
    backgroundColor: COLORS.primary,
    justifyContent: 'center', 
    alignItems: 'center'
  },
  emptyText: {
    color: COLORS.textSub,
    fontStyle: 'italic',
    fontSize: 13,
  },

  // --- STEPS TIMELINE ---
  stepCard: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumber: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepText: {
    fontSize: 15,
    color: COLORS.textMain,
    lineHeight: 22,
    marginTop: 2,
  },
  stepImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginTop: 10,
  },
  
  // Add Step Form
  addStepBox: {
    backgroundColor: COLORS.inputBg,
    padding: 15,
    borderRadius: 16,
    marginTop: 10,
  },
  stepActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    alignItems: 'center',
  },
  btnPhoto: {
    padding: 8,
  },
  btnAddStep: {
    backgroundColor: COLORS.textMain, // Nút đen cho nổi
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },

  // --- SUBMIT BUTTON ---
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});