import React, { useLayoutEffect, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  collection, query, where, onSnapshot, addDoc, doc, 
  deleteDoc, updateDoc, writeBatch, serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../../firebase/firebaseConfig'; 
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  SafeAreaView, TextInput, Alert, Keyboard, Modal, 
  ActivityIndicator, RefreshControl, SectionList // 👈 Đổi FlatList thành SectionList
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

export default function ShoppingListScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
    
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('kg');
    
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('kg');
    
  const [isUnitModalVisible, setUnitModalVisible] = useState(false);
  const [isSelectingForEdit, setIsSelectingForEdit] = useState(false); 

  // --- 1. LẤY DỮ LIỆU ---
  const loadData = useCallback(() => {
    const currentUser = auth.currentUser;
    if (!currentUser?.email) return;

    const q = query(
      collection(db, 'shoppingList'), 
      where('email', '==', currentUser.email)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const list = [];
      querySnapshot.forEach((doc) => {
        list.push({ itemId: doc.id, ...doc.data() });
      });
      
      // Sắp xếp: Pending lên trước, sau đó sắp xếp theo thời gian mới nhất
      list.sort((a, b) => {
           if (a.status === 'pending' && b.status === 'completed') return -1;
           if (a.status === 'completed' && b.status === 'pending') return 1;
           return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
      });

      setItems(list);
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = loadData();
    return () => unsubscribe && unsubscribe();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // --- TÁCH DỮ LIỆU THÀNH 2 NHÓM CHO SECTION LIST ---
  // Sử dụng useMemo để tối ưu, chỉ tính toán lại khi items thay đổi
  const missingIngredients = useMemo(() => {
    return items.filter(item => item.type === 'missing_from_recipe');
  }, [items]);

  const normalItems = useMemo(() => {
    return items.filter(item => item.type !== 'missing_from_recipe');
  }, [items]);

  // Cấu trúc data để truyền vào SectionList
  const sections = useMemo(() => {
    const groupedByRecipe = {}; // Object để nhóm: { "Phở bò": [item1, item2], "Bún chả": [item3] }
    const manualItems = [];     // Danh sách đi chợ chung (tự thêm tay)

    items.forEach((item) => {
      // Nếu là nguyên liệu từ công thức VÀ có tên món nguồn
      if (item.type === 'missing_from_recipe' && item.sourceRecipe) {
        if (!groupedByRecipe[item.sourceRecipe]) {
          groupedByRecipe[item.sourceRecipe] = [];
        }
        groupedByRecipe[item.sourceRecipe].push(item);
      } 
      // Các trường hợp còn lại (tự thêm tay hoặc dữ liệu cũ không có sourceRecipe)
      else {
        manualItems.push(item);
      }
    });
    // 1. Chuyển đổi Object nhóm thành mảng Section
    const result = Object.keys(groupedByRecipe).map((recipeName) => ({
      title: `Nguyên liệu cho món: ${recipeName}`, // Tiêu đề section
      data: groupedByRecipe[recipeName]
    }));
    /// 2. Thêm nhóm "Danh sách chung" vào cuối cùng
    // Luôn hiển thị nhóm này để người dùng thêm đồ linh tinh
    result.push({ 
      title: 'Danh sách đi chợ chung', 
      data: manualItems 
    });

    return result;
  }, [items]);

  // --- 2. HEADER ---
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: true, 
      headerTitle: "Giỏ đi chợ", 
      headerTintColor: COLORS.textMain,
      headerLeft: () => (<MenuImage onPress={() => navigation.openDrawer()} />),
      // ĐÃ SỬA LẠI KHÚC NÀY 👇
      headerRight: () => {
        if (items.length > 0) {
          return (
            <TouchableOpacity style={{ marginRight: 18 }} onPress={handleClearAll}>
              <Text style={{ color: '#EF4444', fontWeight: '700' }}>DỌN GIỎ</Text>
            </TouchableOpacity>
          );
        }
        return null; // Trả về null nếu giỏ hàng trống, tránh lỗi render
      },
    });
  }, [navigation, items]);

  // --- 3. LOGIC TICK MƯỢT MÀ ---
  const toggleItemStatus = async (item) => {
    const oldItems = [...items]; 
    const newStatus = item.status === 'pending' ? 'completed' : 'pending';

    setItems(prev => prev.map(i => i.itemId === item.itemId ? { ...i, status: newStatus } : i));

    try {
      const batch = writeBatch(db);
      const itemRef = doc(db, 'shoppingList', item.itemId);

      batch.update(itemRef, {
        status: newStatus,
        updatedAt: new Date()
      });

      if (newStatus === 'completed') {
        const inventoryRef = doc(collection(db, 'inventory')); 
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 3); 

        batch.set(inventoryRef, {
          email: auth.currentUser.email,
          name: item.name,
          quantity: Number(item.quantity) || 1,
          unit: item.unit || 'kg',
          expiryDate: expiry,
          photo_url: item.photo_url || null,
          addedAt: serverTimestamp()
        });
      }

      await batch.commit(); 
    } catch (error) {
      console.log("Lỗi tick:", error);
      setItems(oldItems); 
      Alert.alert("Lỗi", "Không thể cập nhật. Vui lòng kiểm tra kết nối.");
    }
  };

  // --- 4. CRUD BASIC ---
  const handleAddItem = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser?.email || !newItemName.trim()) return;

    try {
      await addDoc(collection(db, 'shoppingList'), {
        email: currentUser.email,
        name: newItemName,
        quantity: Number(newItemQuantity) || 1,
        unit: selectedUnit,
        status: 'pending',
        type: 'manual', // 👈 Đánh dấu đây là món được thêm thủ công
        updatedAt: new Date()
      });
      setNewItemName(''); setNewItemQuantity(''); setSelectedUnit('kg');
      Keyboard.dismiss();
    } catch (error) { Alert.alert("Lỗi", error.message); }
  };

  const handleUpdateItem = async () => {
    if (!editingItemId) return;
    try {
      await updateDoc(doc(db, 'shoppingList', editingItemId), {
        name: editName,
        quantity: Number(editQuantity) || 1,
        unit: editUnit,
        updatedAt: new Date()
      });
      setEditModalVisible(false);
    } catch (error) { Alert.alert("Lỗi", error.message); }
  };

  const handleDeleteItem = async (itemId) => {
    Alert.alert("Xóa?", "Bạn chắc chắn muốn xóa?", [
      { text: "Hủy" },
      { text: "Xóa", style: "destructive", onPress: () => deleteDoc(doc(db, 'shoppingList', itemId)) }
    ]);
  };

  const handleClearAll = () => {
    Alert.alert("Dọn sạch giỏ?", "Xóa toàn bộ danh sách?", [
      { text: "Hủy" },
      { text: "Xóa hết", style: "destructive", onPress: async () => {
          try {
            const batch = writeBatch(db);
            items.forEach(item => batch.delete(doc(db, 'shoppingList', item.itemId)));
            await batch.commit();
          } catch (e) { Alert.alert("Lỗi", "Không thể dọn giỏ"); }
      }}
    ]);
  };

  // --- UI RENDER ---
  const openUnitModal = (forEdit = false) => { setIsSelectingForEdit(forEdit); setUnitModalVisible(true); };
  const handleSelectUnit = (unit) => {
    if (isSelectingForEdit) setEditUnit(unit); else setSelectedUnit(unit);
    setUnitModalVisible(false);
  };

  const renderItem = useCallback(({ item }) => {
    const isCompleted = item.status === 'completed';
    return (
        <View style={[styles.itemCard, isCompleted && styles.itemCardBought]}>
            <TouchableOpacity 
                style={[styles.checkBox, isCompleted && styles.checkBoxActive]} 
                onPress={() => toggleItemStatus(item)}
            >
                {isCompleted && <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1828/1828643.png' }} style={{ width: 12, height: 12, tintColor: '#fff' }} />}
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
                <TouchableOpacity style={styles.actionBtn} onPress={() => {
                    setEditName(item.name); setEditQuantity(String(item.quantity)); setEditUnit(item.unit || 'kg');
                    setEditingItemId(item.itemId); setEditModalVisible(true);
                }}>
                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1828/1828911.png' }} style={styles.iconSm} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { marginLeft: 8 }]} onPress={() => handleDeleteItem(item.itemId)}>
                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1828/1828665.png' }} style={[styles.iconSm, {tintColor: '#EF4444'}]} />
                </TouchableOpacity>
            </View>
        </View>
    );
  }, [items]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressContainer} />
      
      <View style={styles.inputContainer}>
        <TextInput style={[styles.input, { flex: 2 }]} placeholder="Tên món..." value={newItemName} onChangeText={setNewItemName} />
        <View style={styles.divider} />
        <TextInput style={[styles.input, { flex: 0.8, textAlign: 'center' }]} placeholder="SL" keyboardType='numeric' value={newItemQuantity} onChangeText={setNewItemQuantity} />
        <TouchableOpacity style={styles.unitBtn} onPress={() => openUnitModal(false)}><Text style={styles.unitText}>{selectedUnit} ▼</Text></TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={handleAddItem}><Text style={{color: 'white', fontSize: 20}}>+</Text></TouchableOpacity>
      </View>

      {loading && !refreshing ? <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} /> : 
          <SectionList // 👈 Dùng SectionList thay thế
            sections={sections}
            keyExtractor={(item) => item.itemId}
            renderItem={renderItem}
            renderSectionHeader={({ section: { title } }) => (
              <View style={{ 
                  backgroundColor: '#E8F5E9', 
                  paddingVertical: 8, 
                  paddingHorizontal: 16, 
                  borderLeftWidth: 4, 
                  borderLeftColor: COLORS.primary,
                  marginTop: 10
              }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.primary }}>
                  {title}
                </Text>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={() => <View style={styles.emptyContainer}><Text style={styles.emptyText}>Danh sách đang trống</Text></View>} 
          />
      }
        
      {/* Unit Modal */}
      <Modal visible={isUnitModalVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setUnitModalVisible(false)}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Chọn đơn vị</Text>
                <View style={styles.unitGrid}>{UNITS.map(u => (
                    <TouchableOpacity key={u} style={[styles.unitOption, (isSelectingForEdit ? editUnit : selectedUnit) === u && styles.unitOptionSelected]} onPress={() => handleSelectUnit(u)}>
                        <Text style={[(isSelectingForEdit ? editUnit : selectedUnit) === u && styles.unitOptionTextSelected]}>{u}</Text>
                    </TouchableOpacity>))}</View>
            </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={isEditModalVisible} transparent={true} animationType="slide">
         <TouchableOpacity style={styles.modalOverlay} activeOpacity={1}>
            <View style={styles.editModalContent}>
                <Text style={styles.modalTitle}>Sửa món hàng</Text>
                <TextInput style={styles.editInput} value={editName} onChangeText={setEditName} />
                <View style={{flexDirection: 'row', gap: 10}}>
                    <TextInput style={[styles.editInput, {flex: 1}]} value={editQuantity} onChangeText={setEditQuantity} keyboardType="numeric"/>
                    <TouchableOpacity style={styles.editUnitBtn} onPress={() => openUnitModal(true)}><Text>{editUnit} ▼</Text></TouchableOpacity>
                </View>
                <View style={{flexDirection: 'row', gap: 10}}>
                    <TouchableOpacity onPress={() => setEditModalVisible(false)} style={[styles.btnAction, {flex: 1, backgroundColor: '#E5E7EB'}]}><Text>Hủy</Text></TouchableOpacity>
                    <TouchableOpacity onPress={handleUpdateItem} style={[styles.btnAction, {flex: 2, backgroundColor: COLORS.primary}]}><Text style={{color: 'white', fontWeight: 'bold'}}>Lưu</Text></TouchableOpacity>
                </View>
            </View>
         </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  progressContainer: { marginTop: 80 },
  inputContainer: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, paddingHorizontal: 12, alignItems: 'center', height: 55, backgroundColor: '#FFF' },
  divider: { width: 1, height: '50%', backgroundColor: COLORS.border, marginHorizontal: 5 },
  input: { height: '100%', fontSize: 16, color: COLORS.textMain },
  unitBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.btnBg, borderRadius: 8, marginRight: 8 },
  unitText: { fontSize: 13, fontWeight: '700' },
  addBtn: { width: 40, height: 40, backgroundColor: COLORS.primary, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 50 },
  
  // 👈 Thêm style cho Tiêu đề Section
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 12,
    marginTop: 15,
  },

  itemCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, backgroundColor: COLORS.card, padding: 15, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3.84, elevation: 2 },
  itemCardBought: { backgroundColor: '#F9FAFB', opacity: 0.8 },
  checkBox: { width: 24, height: 24, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 8, marginRight: 15, justifyContent: 'center', alignItems: 'center' },
  checkBoxActive: { backgroundColor: COLORS.primary },
  itemText: { fontSize: 16, fontWeight: '700', color: COLORS.textMain },
  itemTextBought: { color: COLORS.check, textDecorationLine: 'line-through' },
  statusBadge: { fontSize: 11, color: COLORS.textSub, marginTop: 4, fontWeight: '500' },
  actionGroup: { flexDirection: 'row', marginLeft: 8 },
  actionBtn: { width: 35, height: 35, borderRadius: 10, backgroundColor: COLORS.btnBg, justifyContent: 'center', alignItems: 'center' },
  iconSm: { width: 16, height: 16 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: COLORS.textSub, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: COLORS.modalBg, justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: 'white', padding: 25, borderRadius: 20 },
  editModalContent: { width: '90%', backgroundColor: 'white', padding: 25, borderRadius: 25 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  unitOption: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  unitOptionSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  unitOptionTextSelected: { color: 'white', fontWeight: 'bold' },
  editInput: { backgroundColor: '#F9FAFB', padding: 12, marginBottom: 15, borderRadius: 12, height: 50, borderWidth: 1, borderColor: COLORS.border },
  editUnitBtn: { backgroundColor: '#F9FAFB', borderRadius: 12, height: 50, flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: COLORS.border },
  btnAction: { padding: 15, alignItems: 'center', borderRadius: 12, marginTop: 5 }
});