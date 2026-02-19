import React, { useLayoutEffect, useState, useEffect, useCallback, useMemo, memo } from 'react';
import { 
  collection, query, where, onSnapshot, addDoc, doc, 
  getDocs, deleteDoc, updateDoc, writeBatch, serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../../firebase/firebaseConfig'; 
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  SafeAreaView, TextInput, Alert, Keyboard, Modal, 
  ActivityIndicator, RefreshControl, SectionList 
} from 'react-native';
import MenuImage from '../../components/MenuImage/MenuImage';

const COLORS = {
  primary: '#2E7D32',
  bg: '#F5F5F5', 
  textMain: '#111111', 
  textSub: '#6B7280',
  border: '#E5E7EB', 
  card: '#FFFFFF', 
  check: '#9CA3AF',
  modalBg: 'rgba(0,0,0,0.5)', 
  btnBg: '#F3F4F6', 
};

const UNITS = ['kg', 'g', 'mg', 'l', 'ml', 'quả', 'cái', 'hộp', 'gói', 'chai', 'lon', 'bó'];
const DEFAULT_IMAGE = 'https://cdn-icons-png.flaticon.com/512/2927/2927347.png';

// --- TỐI ƯU 1: Tách Item ra component riêng và dùng memo ---
const ShoppingItem = memo(({ item, onToggle, onEdit, onDelete }) => {
  const isCompleted = item.status === 'completed';
  return (
    <View style={[styles.itemCard, isCompleted && styles.itemCardBought]}>
      <TouchableOpacity 
        style={[styles.checkBox, isCompleted && styles.checkBoxActive]} 
        onPress={() => onToggle(item)}
      >
        {isCompleted && <Text style={{color: 'white', fontSize: 10}}>✓</Text>}
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Text style={[styles.itemText, isCompleted && styles.itemTextBought]} numberOfLines={1}>
          {item.name} {item.quantity ? `(${item.quantity} ${item.unit || ''})` : ''}
        </Text>
        <Text style={styles.statusBadge}>
          {isCompleted ? '✓ Đã cất tủ lạnh' : '• Cần mua'}
        </Text>
      </View>

      <View style={styles.actionGroup}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(item)}>
          <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1828/1828911.png' }} style={styles.iconSm} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { marginLeft: 8 }]} onPress={() => onDelete(item.itemId)}>
          <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1828/1828665.png' }} style={[styles.iconSm, {tintColor: '#EF4444'}]} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function ShoppingListScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('kg');
  
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', quantity: '', unit: 'kg' });
  
  const [isUnitModalVisible, setUnitModalVisible] = useState(false);
  const [isSelectingForEdit, setIsSelectingForEdit] = useState(false); 

  // --- TỐI ƯU 2: Dùng onSnapshot một lần duy nhất ---
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, 'shoppingList'), where('email', '==', user.email));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ itemId: doc.id, ...doc.data() }));
      // Sort logic
      list.sort((a, b) => {
        if (a.status === b.status) return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
        return a.status === 'pending' ? -1 : 1;
      });
      setItems(list);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, []);

  // --- TỐI ƯU 3: Dùng useMemo để tránh tính toán lại Sections khi gõ chữ vào ô input ---
  const sections = useMemo(() => {
    const grouped = items.reduce((acc, item) => {
      const key = (item.type === 'missing_from_recipe' && item.sourceRecipe) ? item.sourceRecipe : 'Danh sách đi chợ chung';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    return Object.keys(grouped).map(key => ({
      title: key,
      data: grouped[key],
      isRecipe: key !== 'Danh sách đi chợ chung'
    })).sort((a, b) => (a.isRecipe === b.isRecipe ? 0 : a.isRecipe ? -1 : 1));
  }, [items]);

  const handleToggle = useCallback(async (item) => {
  const newStatus = item.status === 'pending' ? 'completed' : 'pending';
  try {
    const batch = writeBatch(db);
    const itemRef = doc(db, 'shoppingList', item.itemId);
    batch.update(itemRef, { status: newStatus, updatedAt: serverTimestamp() });

    if (newStatus === 'completed') {
      // --- TÍNH TOÁN HẠN SỬ DỤNG (HSD) ---
      const expiryDate = new Date(); 
      expiryDate.setDate(expiryDate.getDate() + 3);

      const invRef = doc(collection(db, 'inventory'));
      batch.set(invRef, {
        email: auth.currentUser.email,
        name: item.name,
        quantity: Number(item.quantity) || 1,
        unit: item.unit || 'kg',
        photo_url: item.photo_url || DEFAULT_IMAGE,
        addedAt: serverTimestamp(),
        // Thêm trường expiryDate để đồng bộ với màn hình Kho (Pantry)
        expiryDate: Timestamp.fromDate(expiryDate) 
      });
    }
    await batch.commit();
  } catch (e) { 
    console.error(e);
    Alert.alert("Lỗi", "Cập nhật thất bại"); 
  }
}, []);

  const handleEdit = useCallback((item) => {
    setEditingItem(item);
    setEditForm({ name: item.name, quantity: String(item.quantity), unit: item.unit || 'kg' });
    setEditModalVisible(true);
  }, []);

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      await updateDoc(doc(db, 'shoppingList', editingItem.itemId), {
        name: editForm.name,
        quantity: Number(editForm.quantity) || 1,
        unit: editForm.unit,
        updatedAt: serverTimestamp()
      });
      setEditModalVisible(false);
    } catch (e) { Alert.alert("Lỗi", "Không thể lưu"); }
  };

  const handleGoToRecipe = async (recipeName) => {
    const q = query(collection(db, "recipes"), where("title", "==", recipeName));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        navigation.navigate("Recipe", { item: { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } });
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Giỏ đi chợ",
      headerLeft: () => <MenuImage onPress={() => navigation.openDrawer()} />,
      headerRight: () => items.length > 0 && (
        <TouchableOpacity style={{ marginRight: 15 }} onPress={() => {
            Alert.alert("Dọn giỏ?", "Xóa toàn bộ món?", [
                {text: "Hủy"},
                {text: "Xóa", onPress: async () => {
                    const batch = writeBatch(db);
                    items.forEach(i => batch.delete(doc(db, 'shoppingList', i.itemId)));
                    await batch.commit();
                }}
            ]);
        }}>
          <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>DỌN GIỎ</Text>
        </TouchableOpacity>
      )
    });
  }, [navigation, items.length]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ height: 100 }} />
      <View style={styles.inputContainer}>
        <TextInput style={[styles.input, { flex: 2 }]} placeholder="Thêm món..." value={newItemName} onChangeText={setNewItemName} />
        <TextInput style={[styles.input, { flex: 0.8, textAlign: 'center' }]} placeholder="SL" keyboardType='numeric' value={newItemQuantity} onChangeText={setNewItemQuantity} />
        <TouchableOpacity style={styles.unitBtn} onPress={() => { setIsSelectingForEdit(false); setUnitModalVisible(true); }}>
            <Text style={styles.unitText}>{selectedUnit} ▼</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={async () => {
             if(!newItemName.trim()) return;
             await addDoc(collection(db, 'shoppingList'), {
                email: auth.currentUser.email, name: newItemName, quantity: Number(newItemQuantity) || 1,
                unit: selectedUnit, photo_url: DEFAULT_IMAGE, status: 'pending', type: 'manual', updatedAt: serverTimestamp()
             });
             setNewItemName(''); setNewItemQuantity(''); Keyboard.dismiss();
        }}><Text style={{color: 'white', fontSize: 20}}>+</Text></TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color={COLORS.primary} /> : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.itemId}
          renderItem={({ item }) => (
            <ShoppingItem 
              item={item} 
              onToggle={handleToggle} 
              onEdit={handleEdit} 
              onDelete={(id) => deleteDoc(doc(db, 'shoppingList', id))}
            />
          )}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, section.isRecipe && section.data.every(i => i.status === 'completed') && { backgroundColor: '#E8F5E9' }]}>
              <Text style={styles.sectionTitle}>{section.isRecipe ? `Món: ${section.title}` : section.title}</Text>
              {section.isRecipe && section.data.every(i => i.status === 'completed') && (
                <TouchableOpacity onPress={() => handleGoToRecipe(section.title)} style={styles.cookNowHeaderBtn}>
                  <Text style={styles.cookNowHeaderText}>NẤU NGAY</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 50 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} />}
        />
      )}

      {/* --- MODAL CHỌN ĐƠN VỊ --- */}
      <Modal visible={isUnitModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setUnitModalVisible(false)}>
          <View style={styles.modernUnitModal}>
            <View style={styles.unitGrid}>
              {UNITS.map(u => (
                <TouchableOpacity key={u} style={[styles.unitChip, (isSelectingForEdit ? editForm.unit : selectedUnit) === u && styles.unitChipSelected]} 
                  onPress={() => {
                    if (isSelectingForEdit) setEditForm({...editForm, unit: u});
                    else setSelectedUnit(u);
                    setUnitModalVisible(false);
                  }}>
                  <Text style={[styles.unitChipText, (isSelectingForEdit ? editForm.unit : selectedUnit) === u && {color: 'white'}]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* --- MODAL SỬA --- */}
      <Modal visible={isEditModalVisible} transparent animationType="slide">
         <View style={styles.modalOverlay}>
            <View style={styles.modernEditModal}>
                <Text style={styles.modalTitle}>Sửa món hàng</Text>
                <TextInput style={styles.modernInput} value={editForm.name} onChangeText={(t) => setEditForm({...editForm, name: t})} />
                <View style={{flexDirection: 'row', gap: 10}}>
                    <TextInput style={[styles.modernInput, {flex: 1}]} value={editForm.quantity} onChangeText={(t) => setEditForm({...editForm, quantity: t})} keyboardType="numeric"/>
                    <TouchableOpacity style={[styles.modernInput, {flex: 1}]} onPress={() => { setIsSelectingForEdit(true); setUnitModalVisible(true); }}>
                        <Text>{editForm.unit} ▼</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.modalActions}>
                    <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.modalBtn}><Text>Hủy</Text></TouchableOpacity>
                    <TouchableOpacity onPress={handleSaveEdit} style={[styles.modalBtn, {backgroundColor: COLORS.primary}]}><Text style={{color: 'white'}}>Lưu</Text></TouchableOpacity>
                </View>
            </View>
         </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inputContainer: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 15, borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, paddingHorizontal: 12, alignItems: 'center', height: 55, backgroundColor: '#FFF' },
  input: { height: '100%', fontSize: 16, color: COLORS.textMain },
  unitBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.btnBg, borderRadius: 8, marginRight: 8 },
  unitText: { fontSize: 13, fontWeight: '700' },
  addBtn: { width: 40, height: 40, backgroundColor: COLORS.primary, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: 12, marginTop: 20, marginBottom: 10, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#D1D5DB' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#374151' },
  itemCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, backgroundColor: COLORS.card, padding: 15, marginBottom: 10 },
  itemCardBought: { opacity: 0.5 },
  checkBox: { width: 22, height: 22, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 7, marginRight: 15, justifyContent: 'center', alignItems: 'center' },
  checkBoxActive: { backgroundColor: COLORS.primary },
  itemText: { fontSize: 16, fontWeight: '700', color: COLORS.textMain },
  itemTextBought: { textDecorationLine: 'line-through' },
  statusBadge: { fontSize: 11, color: COLORS.textSub, marginTop: 4 },
  actionGroup: { flexDirection: 'row' },
  actionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.btnBg, justifyContent: 'center', alignItems: 'center' },
  iconSm: { width: 14, height: 14 },
  modalOverlay: { flex: 1, backgroundColor: COLORS.modalBg, justifyContent: 'center', alignItems: 'center' },
  modernUnitModal: { width: '85%', backgroundColor: 'white', padding: 20, borderRadius: 20 },
  modernEditModal: { width: '90%', backgroundColor: 'white', padding: 25, borderRadius: 25 },
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitChip: { padding: 10, borderRadius: 10, backgroundColor: '#F3F4F6' },
  unitChipSelected: { backgroundColor: COLORS.primary },
  unitChipText: { fontSize: 12 },
  modernInput: { backgroundColor: '#F9FAFB', padding: 12, marginBottom: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center' },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, height: 45, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  cookNowHeaderBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  cookNowHeaderText: { color: 'white', fontSize: 10, fontWeight: 'bold' }
});