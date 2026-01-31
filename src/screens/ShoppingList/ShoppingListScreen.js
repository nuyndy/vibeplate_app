import React, { useLayoutEffect, useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  doc, 
  deleteDoc, 
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../../firebase/firebaseConfig'; 
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  SafeAreaView, TextInput, FlatList, Alert, Keyboard, Modal, ActivityIndicator
} from 'react-native';
import MenuImage from '../../components/MenuImage/MenuImage';

const COLORS = {
  primary: '#111111', bg: '#FFFFFF', textMain: '#111111', textSub: '#6B7280',
  border: '#E5E7EB', card: '#FFFFFF', check: '#9CA3AF', modalBg: 'rgba(0,0,0,0.5)', btnBg: '#F3F4F6', 
};
const UNITS = ['kg', 'g', 'mg', 'l', 'ml', 'quả', 'cái', 'hộp', 'gói', 'chai', 'lon', 'bó'];

export default function ShoppingListScreen({ navigation }) {

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
    
  // State nhập liệu
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('kg');
    
  // State Modal Sửa
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
    
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('kg');
    
  const [isUnitModalVisible, setUnitModalVisible] = useState(false);
  const [isSelectingForEdit, setIsSelectingForEdit] = useState(false); 

  // --- 1. LẤY DỮ LIỆU (Query Collection theo userId là email) ---
  useEffect(() => {
    const currentUser = auth.currentUser;
    // Kiểm tra user có tồn tại và có email không
    if (!currentUser || !currentUser.email) {
        setItems([]); 
        setLoading(false);
        return;
    }

    // 🔥 SỬA: Query vào collection 'shoppingList' lọc theo trường userId (là email)
    const q = query(
      collection(db, 'shoppingList'), 
      where('userId', '==', currentUser.email)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const list = [];
      querySnapshot.forEach((doc) => {
        // 🔥 Map dữ liệu từ document, lấy doc.id làm itemId
        list.push({
          itemId: doc.id, 
          ...doc.data()
        });
      });
      
      // Sắp xếp client-side (pending lên đầu)
      list.sort((a, b) => {
           if (a.status === 'pending' && b.status === 'completed') return -1;
           if (a.status === 'completed' && b.status === 'pending') return 1;
           // Nếu cùng trạng thái, sắp xếp theo thời gian mới nhất (tùy chọn)
           return b.updatedAt?.seconds - a.updatedAt?.seconds;
      });

      setItems(list);
      setLoading(false);
    }, (error) => {
      console.log("Lỗi tải data:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []); 
    
  // Setup Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: true, headerTitle: "Giỏ đi chợ", headerTintColor: COLORS.textMain,
      headerLeft: () => (<MenuImage onPress={() => navigation.openDrawer()} />),
      headerRight: () => (
        items.length > 0 ? (
          <TouchableOpacity style={{ marginRight: 18 }} onPress={handleClearAll}>
            <Text style={{ color: '#000000', fontWeight: '600' }}>DỌN GIỎ</Text>
          </TouchableOpacity>
        ) : null
      ),
    });
  }, [navigation, items]);

  // --- 2. THÊM MỚI (Add Document với Auto ID) ---
  const handleAddItem = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) return;
    if (newItemName.trim() === '') { Alert.alert("Lỗi", "Chưa nhập tên món!"); return; }

    try {
      // 🔥 SỬA: Tạo object theo đúng định dạng yêu cầu
      const newItemData = {
        email: currentUser.email,   // string - tên gmail người dùng
        name: newItemName,           // string - đồ cần mua
        quantity: Number(newItemQuantity) || 1, // number - số lượng
        unit: selectedUnit,          // string - đơn vị tính
        status: 'pending',           // string - trạng thái
        updatedAt: new Date()        // timestamp - thời gian cập nhật
      };

      // 🔥 Thêm document mới vào collection (ID tự sinh)
      await addDoc(collection(db, 'shoppingList'), newItemData);

      setNewItemName(''); setNewItemQuantity(''); setSelectedUnit('kg');
      Keyboard.dismiss();
    } catch (error) {
      Alert.alert("Lỗi thêm món", error.message);
    }
  };

  // --- 3. CẬP NHẬT (Update Document theo ID) ---
  const handleUpdateItem = async () => {
    if (!editingItemId) return;

    try {
      // 🔥 SỬA: Update trực tiếp vào document ID
      const itemRef = doc(db, 'shoppingList', editingItemId);
      
      await updateDoc(itemRef, {
        name: editName,
        quantity: Number(editQuantity) || 1,
        unit: editUnit,
        updatedAt: new Date()
      });
        
      setEditModalVisible(false); setEditingItemId(null);
    } catch (error) { Alert.alert("Lỗi update", error.message); }
  };

  // Toggle trạng thái
  const toggleItemStatus = async (itemId, currentStatus) => {
    try {
        // 🔥 SỬA: Update trạng thái document
        const itemRef = doc(db, 'shoppingList', itemId);
        const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';

        await updateDoc(itemRef, {
            status: newStatus,
            updatedAt: new Date()
        });

    } catch (error) { console.log(error); }
  };

  // Xóa món (Xóa Document)
  const handleDeleteItem = async (itemId) => {
    Alert.alert("Xóa?", "Bạn chắc chắn xóa?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: async () => {
          try {
            // 🔥 SỬA: Xóa document dựa trên ID
            await deleteDoc(doc(db, 'shoppingList', itemId));
          } catch (error) { Alert.alert("Lỗi", "Không xóa được"); }
      }}
    ]);
  };

  // Xóa hết (Dọn giỏ - Xóa Batch)
  const handleClearAll = () => {
    Alert.alert("Dọn sạch giỏ?", "Thao tác này sẽ xóa hết món ăn.", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa hết", style: "destructive", onPress: async () => {
          try {
            // 🔥 SỬA: Dùng Batch để xóa nhiều document cùng lúc
            const batch = writeBatch(db);
            items.forEach(item => {
                const itemRef = doc(db, 'shoppingList', item.itemId);
                batch.delete(itemRef);
            });
            await batch.commit();
          } catch (error) {
            Alert.alert("Lỗi", "Không thể dọn giỏ");
          }
      }}
    ]);
  };

  // --- UI COMPONENTS ---
  const openUnitModal = (forEdit = false) => { setIsSelectingForEdit(forEdit); setUnitModalVisible(true); };
  const handleSelectUnit = (unit) => {
    if (isSelectingForEdit) setEditUnit(unit); else setSelectedUnit(unit);
    setUnitModalVisible(false);
  };

  const renderItem = ({ item }) => {
    const isCompleted = item.status === 'completed';
    return (
        <View style={[styles.itemCard, isCompleted && styles.itemCardBought]}>
        
        <TouchableOpacity 
            style={[styles.checkBox, isCompleted && styles.checkBoxActive]} 
            onPress={() => toggleItemStatus(item.itemId, item.status)}
        >
            {isCompleted && <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1828/1828643.png' }} style={{ width: 12, height: 12, tintColor: '#fff' }} />}
        </TouchableOpacity>

        <TouchableOpacity style={{ flex: 1 }} onPress={() => toggleItemStatus(item.itemId, item.status)}>
            <View>
                <Text style={[styles.itemText, isCompleted && styles.itemTextBought]} numberOfLines={1}>
                    {item.name} {item.quantity ? `(${item.quantity} ${item.unit || ''})` : ''}
                </Text>
                <Text style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                    {isCompleted ? 'Đã mua' : 'Chưa mua'}
                </Text>
            </View>
        </TouchableOpacity>

        <View style={styles.actionGroup}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => {
                setEditName(item.name); 
                setEditQuantity(String(item.quantity)); 
                setEditUnit(item.unit || 'kg');
                setEditingItemId(item.itemId); 
                setEditModalVisible(true);
            }}>
            <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1828/1828911.png' }} style={{ width: 16, height: 16, tintColor: COLORS.textMain }} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, { marginLeft: 8 }]} onPress={() => handleDeleteItem(item.itemId)}>
            <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1828/1828665.png' }} style={{ width: 16, height: 16, tintColor: '#EF4444' }} />
            </TouchableOpacity>
        </View>
        </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressContainer}><Text style={styles.progressTitle}>Danh sách mua sắm</Text></View>
      <View style={styles.inputContainer}>
        <TextInput style={[styles.input, { flex: 2 }]} placeholder="Tên món..." value={newItemName} onChangeText={setNewItemName} />
        <View style={styles.divider} />
        <TextInput style={[styles.input, { flex: 0.8, textAlign: 'center' }]} placeholder="SL" keyboardType='numeric' value={newItemQuantity} onChangeText={setNewItemQuantity} />
        <TouchableOpacity style={styles.unitBtn} onPress={() => openUnitModal(false)}><Text style={styles.unitText}>{selectedUnit} ▼</Text></TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={handleAddItem}><Text style={{color: 'white', fontSize: 20}}>+</Text></TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator size="large" color={COLORS.textMain} style={{marginTop: 50}} /> : 
          <FlatList data={items} keyExtractor={item => item.itemId} renderItem={renderItem} contentContainerStyle={styles.listContent} 
          ListEmptyComponent={() => <View style={styles.emptyContainer}><Text style={styles.emptyText}>Danh sách trống</Text></View>} />
      }
       
      {/* Unit Modal */}
      <Modal visible={isUnitModalVisible} transparent={true} onRequestClose={() => setUnitModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setUnitModalVisible(false)}>
             <View style={styles.modalContent}><View style={styles.unitGrid}>{UNITS.map(u => (
                    <TouchableOpacity key={u} style={[styles.unitOption, (isSelectingForEdit ? editUnit : selectedUnit) === u && styles.unitOptionSelected]} onPress={() => handleSelectUnit(u)}>
                        <Text style={[(isSelectingForEdit ? editUnit : selectedUnit) === u && styles.unitOptionTextSelected]}>{u}</Text>
                    </TouchableOpacity>))}</View></View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={isEditModalVisible} transparent={true} onRequestClose={() => setEditModalVisible(false)}>
         <TouchableOpacity style={styles.modalOverlay} onPress={() => setEditModalVisible(false)}>
            <View style={styles.editModalContent}><Text style={styles.modalTitle}>Sửa món hàng</Text>
                <TextInput style={styles.editInput} value={editName} onChangeText={setEditName} />
                <View style={{flexDirection: 'row', gap: 10}}>
                    <TextInput style={[styles.editInput, {flex: 1}]} value={editQuantity} onChangeText={setEditQuantity} keyboardType="numeric"/>
                    <TouchableOpacity style={[styles.editUnitBtn, {flex: 1}]} onPress={() => openUnitModal(true)}><Text>{editUnit} ▼</Text></TouchableOpacity>
                </View>
                <TouchableOpacity onPress={handleUpdateItem} style={[styles.btnAction, {backgroundColor: COLORS.textMain}]}><Text style={{color: 'white'}}>Lưu</Text></TouchableOpacity>
            </View>
         </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  progressContainer: { marginTop: 60, marginHorizontal: 20 },
  progressTitle: { fontSize: 20, fontWeight: 'bold' },
  inputContainer: { flexDirection: 'row', marginHorizontal: 20, marginTop: 16, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, alignItems: 'center', height: 50 },
  divider: { width: 1, height: '60%', backgroundColor: COLORS.border, marginHorizontal: 5 },
  input: { height: '100%', fontSize: 16, color: COLORS.textMain },
  unitBtn: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: COLORS.btnBg, borderRadius: 6, marginRight: 8 },
  unitText: { fontSize: 14, fontWeight: '600' },
  addBtn: { width: 36, height: 36, backgroundColor: COLORS.textMain, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 50 },
  itemCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, padding: 12, marginBottom: 10 },
  itemCardBought: { backgroundColor: '#F3F4F6' },
  checkBox: { width: 22, height: 22, borderWidth: 2, borderColor: COLORS.textMain, borderRadius: 6, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkBoxActive: { backgroundColor: COLORS.textMain },
  itemText: { fontSize: 16, fontWeight: '500' },
  itemTextBought: { color: COLORS.check, textDecorationLine: 'line-through' },
  actionGroup: { flexDirection: 'row', marginLeft: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.btnBg, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: COLORS.textSub },
  modalOverlay: { flex: 1, backgroundColor: COLORS.modalBg, justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: 'white', padding: 20, borderRadius: 16 },
  editModalContent: { width: '85%', backgroundColor: 'white', padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  unitOption: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  unitOptionSelected: { backgroundColor: COLORS.textMain, borderColor: COLORS.textMain },
  unitOptionTextSelected: { color: 'white' },
  editInput: { borderWidth: 1, borderColor: '#ddd', padding: 10, marginBottom: 15, borderRadius: 8, height: 45 },
  editUnitBtn: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, height: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 15, backgroundColor: '#F9FAFB' },
  btnAction: { padding: 12, alignItems: 'center', borderRadius: 8, marginTop: 10 }
});