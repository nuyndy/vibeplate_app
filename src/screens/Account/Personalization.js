import React, { useLayoutEffect, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, SafeAreaView,
  Alert, ActivityIndicator, TextInput, Keyboard, RefreshControl
} from 'react-native';

// --- FIREBASE ---
import { auth, db } from '../../firebase/firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// --- CONSTANTS ---
const COMMON_DATA = {
  ALLERGIES: ["Hải sản", "Lạc", "Sữa", "Trứng", "Gluten", "Đậu nành", "Vừng"],
  TASTES: ["Chua", "Cay", "Mặn", "Ngọt", "Đắng", "Béo ngậy", "Thanh đạm"],
  INGREDIENTS: ["Hành tây", "Tỏi", "Rau mùi", "Gừng", "Tiêu", "Hành lá", "Mắm tôm"]
};

const COLORS = {
  primary: '#000000',
  bg: '#F8F9FD',
  card: '#FFFFFF',
  textMain: '#1A1D26',
  textSub: '#A0A5B9',
  border: '#E8E8E8',
  inputBg: '#F5F6FA',
  white: '#FFFFFF',
};

// --- SUB-COMPONENT: TAG ITEM (Tách nhỏ để tối ưu re-render) ---
const Tag = React.memo(({ item, onPress, isActive }) => (
  <TouchableOpacity
    style={[styles.tag, isActive ? styles.activeTag : styles.suggestionTag]}
    onPress={() => onPress(item)}
  >
    <Text style={[styles.tagText, isActive ? styles.activeTagText : styles.suggestionText]}>
      {isActive ? item : `+ ${item}`}
    </Text>
    {isActive && (
      <View style={styles.removeIconBg}>
        <Text style={styles.removeIcon}>✕</Text>
      </View>
    )}
  </TouchableOpacity>
));

// --- SUB-COMPONENT: SECTION ---
const Section = React.memo(({ title, icon, suggestions, selectedList, onAdd, onRemove, placeholder }) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = useCallback(() => {
    if (inputValue.trim()) {
      onAdd(inputValue.trim());
      setInputValue('');
      Keyboard.dismiss();
    }
  }, [inputValue, onAdd]);

  // Lọc ra các gợi ý chưa được chọn
  const filteredSuggestions = useMemo(() => 
    suggestions.filter(item => !selectedList.includes(item)), 
    [suggestions, selectedList]
  );

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
            {selectedList.map((item) => (
              <Tag key={item} item={item} isActive onPress={onRemove} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSub}
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={handleAdd}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Text style={styles.addBtnText}>Thêm</Text>
        </TouchableOpacity>
      </View>

      {filteredSuggestions.length > 0 && (
        <>
          <Text style={styles.suggestionLabel}>Gợi ý phổ biến:</Text>
          <View style={styles.tagsWrapper}>
            {filteredSuggestions.map((item) => (
              <Tag key={item} item={item} onPress={onAdd} />
            ))}
          </View>
        </>
      )}
    </View>
  );
});

// --- MAIN COMPONENT ---
export default function Personalization({ navigation }) {
  const user = auth.currentUser;
  const [preferences, setPreferences] = useState({
    allergies: [],
    favoriteTastes: [],
    dislikedIngredients: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Config Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Khẩu vị của bạn",
      headerStyle: styles.headerStyle,
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <Image 
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/271/271220.png' }} 
            style={styles.backIcon} 
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // 2. Fetch Data Logic
  const fetchPreferences = useCallback(async (isSilent = false) => {
    if (!user?.uid) return;
    if (!isSilent) setLoading(true);

    try {
      const docRef = doc(db, "user_preferences", user.uid); // Dùng UID tốt hơn Email
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPreferences({
          allergies: data.allergies || [],
          favoriteTastes: data.favoriteTastes || [],
          dislikedIngredients: data.dislikedIngredients || []
        });
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // 3. Handlers
  const updateList = useCallback((key, value, action) => {
    setPreferences(prev => {
      const currentList = prev[key];
      if (action === 'add') {
        return currentList.includes(value) ? prev : { ...prev, [key]: [...currentList, value] };
      }
      return { ...prev, [key]: currentList.filter(i => i !== value) };
    });
  }, []);

  const handleSave = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const docRef = doc(db, "user_preferences", user.uid);
      await setDoc(docRef, {
        ...preferences,
        email: user.email,
        updatedAt: serverTimestamp(), 
      }, { merge: true });

      Alert.alert("Thành công", "Đã lưu sở thích của bạn!", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPreferences(true); }} />
        }
      >
        <Section 
          title="Dị ứng / Kiêng kỵ" 
          icon="⚠️"
          placeholder="Nhập món bạn bị dị ứng..."
          suggestions={COMMON_DATA.ALLERGIES}
          selectedList={preferences.allergies}
          onAdd={(val) => updateList('allergies', val, 'add')}
          onRemove={(val) => updateList('allergies', val, 'remove')}
        />

        <Section 
          title="Vị yêu thích" 
          icon="😋"
          placeholder="VD: Chua cay, Ngọt..."
          suggestions={COMMON_DATA.TASTES}
          selectedList={preferences.favoriteTastes}
          onAdd={(val) => updateList('favoriteTastes', val, 'add')}
          onRemove={(val) => updateList('favoriteTastes', val, 'remove')}
        />

        <Section 
          title="Không thích ăn (Ghét)" 
          icon="🚫"
          placeholder="VD: Hành, Tỏi, Ớt..."
          suggestions={COMMON_DATA.INGREDIENTS}
          selectedList={preferences.dislikedIngredients}
          onAdd={(val) => updateList('dislikedIngredients', val, 'add')}
          onRemove={(val) => updateList('dislikedIngredients', val, 'remove')}
        />
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.saveBtn, loading && styles.disabledBtn]} 
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveBtnText}>Lưu thay đổi</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },
  headerStyle: { backgroundColor: COLORS.white, elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerBackBtn: { marginLeft: 20, padding: 5 },
  backIcon: { width: 20, height: 20, tintColor: COLORS.textMain },
  
  sectionContainer: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#F0F0F0', elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIcon: { fontSize: 20, marginRight: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textMain },
  
  selectedArea: { minHeight: 40, marginBottom: 15 },
  emptyText: { fontSize: 13, color: COLORS.textSub, fontStyle: 'italic', marginTop: 5 },
  
  tagsWrapper: { flexDirection: 'row', flexWrap: 'wrap' },
  tag: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  activeTag: { backgroundColor: COLORS.primary },
  suggestionTag: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  tagText: { fontWeight: '600', fontSize: 13 },
  activeTagText: { color: COLORS.white, marginRight: 6 },
  suggestionText: { color: '#666' },

  removeIconBg: { backgroundColor: 'rgba(255,255,255,0.2)', width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  removeIcon: { color: COLORS.white, fontSize: 10, fontWeight: 'bold' },

  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  input: { flex: 1, backgroundColor: COLORS.inputBg, height: 44, borderRadius: 12, paddingHorizontal: 15, fontSize: 14, color: COLORS.textMain, marginRight: 10 },
  addBtn: { backgroundColor: '#E0E0E0', height: 44, paddingHorizontal: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: COLORS.textMain, fontWeight: '600', fontSize: 13 },

  suggestionLabel: { fontSize: 12, color: COLORS.textSub, marginBottom: 8, fontWeight: '600', textTransform: 'uppercase' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 14, height: 50, justifyContent: 'center', alignItems: 'center' },
  disabledBtn: { opacity: 0.7 },
  saveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
});