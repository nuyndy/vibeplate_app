import React, { useLayoutEffect, useState, useEffect, useCallback } from 'react'; // Thêm useCallback
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, SafeAreaView, 
  Alert, ActivityIndicator, TextInput, Keyboard, RefreshControl // Thêm RefreshControl
} from 'react-native';

// --- FIREBASE ---
import { auth, db } from '../../firebase/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// --- DATA MẪU ---
const COMMON_ALLERGIES = ["Hải sản", "Lạc", "Sữa", "Trứng", "Gluten", "Đậu nành", "Vừng"];
const COMMON_TASTES = ["Chua", "Cay", "Mặn", "Ngọt", "Đắng", "Béo ngậy", "Thanh đạm"];
const COMMON_INGREDIENTS = ["Hành tây", "Tỏi", "Rau mùi", "Gừng", "Tiêu", "Hành lá", "Mắm tôm"];

const COLORS = {
  primary: '#000000',
  bg: '#F8F9FD',
  card: '#FFFFFF',
  textMain: '#1A1D26',
  textSub: '#A0A5B9',
  border: '#E8E8E8',
  inputBg: '#F5F6FA',
};

export default function Personalization({ navigation }) {
  const user = auth.currentUser;

  // --- STATES ---
  const [allergies, setAllergies] = useState([]);
  const [favoriteTastes, setFavoriteTastes] = useState([]);
  const [dislikedIngredients, setDislikedIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // State quản lý reload

  // --- 1. CONFIG HEADER ---
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Khẩu vị của bạn",
      headerStyle: { 
        backgroundColor: '#FFFFFF', 
        elevation: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0' 
      },
      headerTintColor: COLORS.textMain,
      headerLeft: () => (
         <TouchableOpacity onPress={() => navigation.goBack()} style={{marginLeft: 20, padding: 5}}>
           <Image 
             source={{uri: 'https://cdn-icons-png.flaticon.com/512/271/271220.png'}} 
             style={{width: 20, height: 20, tintColor: COLORS.textMain}} 
           />
         </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // --- 2. HÀM FETCH DATA (Tách riêng để dùng chung) ---
  const fetchPreferences = async (isRefreshingAction = false) => {
    if (!user || !user.email) return;
    
    // Nếu không phải là hành động vuốt để reload thì mới hiện loading chính
    if (!isRefreshingAction) setLoading(true);

    try {
      const docId = user.email.toLowerCase(); 
      const docRef = doc(db, "user_preferences", docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAllergies(data.allergies || []);
        setFavoriteTastes(data.favoriteTastes || []);
        setDislikedIngredients(data.dislikedIngredients || []);
      }
    } catch (error) {
      console.log("Lỗi tải data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, [user]);

  // --- 3. XỬ LÝ REFRESH (VUỐT XUỐNG) ---
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPreferences(true);
  }, []);

  // --- LOGIC THÊM / XOÁ ---
  const addItem = (list, setList, item) => {
    const cleanItem = item.trim();
    if (cleanItem && !list.includes(cleanItem)) {
      setList([...list, cleanItem]);
    }
  };

  const removeItem = (list, setList, item) => {
    setList(list.filter(i => i !== item));
  };

  // --- 4. LƯU DỮ LIỆU ---
  const handleSave = async () => {
    if (!user || !user.email) return;
    setLoading(true);
    try {
      const docId = user.email.toLowerCase();
      const docRef = doc(db, "user_preferences", docId);

      await setDoc(docRef, {
        email: user.email,
        allergies,
        favoriteTastes,
        dislikedIngredients,
        updatedAt: new Date(),
      }, { merge: true });

      Alert.alert("Thành công", "Đã lưu sở thích ăn uống của bạn!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- COMPONENT CON: SECTION ---
  const Section = ({ title, icon, suggestions, selectedList, setList, placeholder }) => {
    const [inputValue, setInputValue] = useState('');

    const handleAddInput = () => {
        addItem(selectedList, setList, inputValue);
        setInputValue(''); 
        Keyboard.dismiss();
    };

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
           <Text style={styles.sectionIcon}>{icon}</Text>
           <Text style={styles.sectionTitle}>{title}</Text>
        </View>

        <View style={styles.selectedArea}>
            {selectedList.length === 0 ? (
                <Text style={styles.emptyText}>Chưa chọn mục nào</Text>
            ) : (
                <View style={styles.tagsWrapper}>
                    {selectedList.map((item, index) => (
                        <TouchableOpacity 
                            key={index} 
                            style={styles.activeTag} 
                            onPress={() => removeItem(selectedList, setList, item)}
                        >
                            <Text style={styles.activeTagText}>{item}</Text>
                            <View style={styles.removeIconBg}>
                                <Text style={styles.removeIcon}>✕</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>

        <View style={styles.inputRow}>
            <TextInput 
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor="#A0A5B9"
                value={inputValue}
                onChangeText={setInputValue}
                onSubmitEditing={handleAddInput}
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleAddInput}>
                <Text style={styles.addBtnText}>Thêm</Text>
            </TouchableOpacity>
        </View>

        <Text style={styles.suggestionLabel}>Gợi ý phổ biến:</Text>
        <View style={styles.tagsWrapper}>
            {suggestions
                .filter(item => !selectedList.includes(item))
                .map((item, index) => (
                <TouchableOpacity 
                    key={index}
                    style={styles.suggestionTag}
                    onPress={() => addItem(selectedList, setList, item)}
                >
                    <Text style={styles.suggestionText}>+ {item}</Text>
                </TouchableOpacity>
            ))}
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg}}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        // --- TÍCH HỢP PULL TO REFRESH ---
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]} // Android
            tintColor={COLORS.primary} // iOS
          />
        }
      >
        <Section 
          title="Dị ứng / Kiêng kỵ" 
          icon="⚠️"
          placeholder="Nhập món bạn bị dị ứng..."
          suggestions={COMMON_ALLERGIES}
          selectedList={allergies}
          setList={setAllergies}
        />

        <Section 
          title="Vị yêu thích" 
          icon="😋"
          placeholder="VD: Chua cay, Ngọt..."
          suggestions={COMMON_TASTES}
          selectedList={favoriteTastes}
          setList={setFavoriteTastes}
        />

        <Section 
          title="Không thích ăn (Ghét)" 
          icon="🚫"
          placeholder="VD: Hành, Tỏi, Ớt..."
          suggestions={COMMON_INGREDIENTS}
          selectedList={dislikedIngredients}
          setList={setDislikedIngredients}
        />

        <View style={{height: 100}} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
            style={[styles.saveBtn, loading && {opacity: 0.7}]} 
            onPress={handleSave}
            disabled={loading}
        >
          {loading ? (
             <ActivityIndicator size="small" color="#fff" />
          ) : (
             <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 100 },
  
  sectionContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIcon: { fontSize: 20, marginRight: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textMain },
  
  selectedArea: { minHeight: 40, marginBottom: 15 },
  emptyText: { fontSize: 13, color: '#ccc', fontStyle: 'italic', marginTop: 5 },
  activeTag: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 20, marginRight: 8, marginBottom: 8
  },
  activeTagText: { color: '#fff', fontWeight: '600', fontSize: 13, marginRight: 6 },
  removeIconBg: {
    backgroundColor: 'rgba(255,255,255,0.2)', width: 16, height: 16, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center'
  },
  removeIcon: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  input: {
    flex: 1, backgroundColor: COLORS.inputBg,
    height: 44, borderRadius: 12,
    paddingHorizontal: 15, fontSize: 14,
    color: COLORS.textMain, marginRight: 10,
  },
  addBtn: {
    backgroundColor: '#E0E0E0', height: 44, paddingHorizontal: 15,
    borderRadius: 12, justifyContent: 'center', alignItems: 'center'
  },
  addBtnText: { color: COLORS.textMain, fontWeight: '600', fontSize: 13 },

  suggestionLabel: { fontSize: 12, color: COLORS.textSub, marginBottom: 8, fontWeight: '600', textTransform: 'uppercase' },
  tagsWrapper: { flexDirection: 'row', flexWrap: 'wrap' },
  suggestionTag: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8E8E8',
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 20, marginRight: 8, marginBottom: 8
  },
  suggestionText: { color: '#666', fontSize: 13 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F0F0F0'
  },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, height: 50,
    justifyContent: 'center', alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});