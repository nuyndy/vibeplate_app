import React, { useLayoutEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView, TextInput, FlatList, Alert, Keyboard 
} from 'react-native';
import MenuImage from '../../components/MenuImage/MenuImage';

// --- BẢNG MÀU ĐỒNG BỘ ---
const COLORS = {
  primary: '#000000',
  primaryLight: '#E0F8ED',
  bg: '#F8F9FD',
  card: '#FFFFFF',
  textMain: '#1A1D26',
  textSub: '#A0A5B9',
  danger: '#686262',
  dangerBg: '#FFF0F0',
  check: '#A0A5B9', // Màu cho item đã mua
};

export default function ShoppingListScreen({ navigation }) {
  
  // Dữ liệu mẫu ban đầu
  const [items, setItems] = useState([
    { id: '1', name: '500g Thịt bò', isBought: false },
    { id: '2', name: 'Hành tây, tỏi', isBought: true },
    { id: '3', name: 'Nước mắm Nam Ngư', isBought: false },
  ]);

  const [newItemName, setNewItemName] = useState('');

  // Cấu hình Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: true,
      headerTitle: "Giỏ đi chợ",
      headerTintColor: COLORS.textMain,
      headerLeft: () => (
              <MenuImage
                onPress={() => {
                  navigation.openDrawer();
                }}
              />
            ),
      // Nút xóa tất cả bên phải
      headerRight: () => (
        <TouchableOpacity style={{ marginRight: 20 }} onPress={handleClearAll}>
           <Text style={{color: COLORS.danger, fontWeight: '600'}}>Xóa hết</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, items]); // Re-render header khi list thay đổi (nếu cần logic disable nút xóa)

  // --- LOGIC ---

  // 1. Thêm món mới
  const handleAddItem = () => {
    if (newItemName.trim().length === 0) return;

    const newItem = {
      id: Date.now().toString(),
      name: newItemName,
      isBought: false,
    };

    setItems([newItem, ...items]); // Thêm lên đầu danh sách
    setNewItemName(''); // Reset ô nhập
    Keyboard.dismiss();
  };

  // 2. Toggle trạng thái mua/chưa mua
  const toggleItem = (id) => {
    const updatedItems = items.map(item => 
      item.id === id ? { ...item, isBought: !item.isBought } : item
    );
    // Sắp xếp: Chưa mua lên đầu, đã mua xuống cuối
    updatedItems.sort((a, b) => Number(a.isBought) - Number(b.isBought));
    setItems(updatedItems);
  };

  // 3. Xóa 1 món
  const handleDeleteItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  // 4. Xóa tất cả
  const handleClearAll = () => {
    if (items.length === 0) return;
    Alert.alert("Xác nhận", "Bạn muốn xóa toàn bộ danh sách?", [
        { text: "Hủy", style: "cancel" },
        { text: "Xóa sạch", onPress: () => setItems([]) }
    ]);
  };

  // Tính toán tiến độ
  const total = items.length;
  const boughtCount = items.filter(i => i.isBought).length;
  const progress = total === 0 ? 0 : (boughtCount / total) * 100;

  // --- RENDER ITEM ---
  const renderItem = ({ item }) => (
    <View style={[styles.itemCard, item.isBought && styles.itemCardBought]}>
      
      {/* Nút Checkbox */}
      <TouchableOpacity 
        style={[styles.checkBox, item.isBought && styles.checkBoxActive]} 
        onPress={() => toggleItem(item.id)}
      >
        {item.isBought && (
            <Image 
                source={{uri: 'https://cdn-icons-png.flaticon.com/512/446/446163.png'}} 
                style={{width: 12, height: 12, tintColor: '#fff'}} 
            />
        )}
      </TouchableOpacity>

      {/* Tên món đồ */}
      <TouchableOpacity style={{flex: 1}} onPress={() => toggleItem(item.id)}>
          <Text style={[styles.itemText, item.isBought && styles.itemTextBought]}>
            {item.name}
          </Text>
      </TouchableOpacity>

      {/* Nút Xóa */}
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteItem(item.id)}>
        <Image 
            source={{uri: 'https://w7.pngwing.com/pngs/124/277/png-transparent-delete-cross-black-crash-cancel-no-remove-prohibited-ban-thumbnail.png'}} 
            style={{width: 20, height: 20}} 
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      
      {/* THANH TIẾN ĐỘ */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTextRow}>
            <Text style={styles.progressLabel}>Tiến độ mua sắm</Text>
            <Text style={styles.progressValue}>{boughtCount}/{total}</Text>
        </View>
        <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* INPUT THÊM MÓN */}
      <View style={styles.inputContainer}>
        <TextInput
            style={styles.input}
            placeholder="Thêm đồ cần mua (vd: Rau cải...)"
            placeholderTextColor="#A0A5B9"
            value={newItemName}
            onChangeText={setNewItemName}
            onSubmitEditing={handleAddItem}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAddItem}>
             <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/992/992651.png'}} style={{width: 20, height: 20, tintColor: '#fff'}} />
        </TouchableOpacity>
      </View>

      {/* DANH SÁCH */}
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
                <Image 
                    source={{uri: 'https://cdn-icons-png.flaticon.com/512/2038/2038854.png'}} 
                    style={{width: 100, height: 100, opacity: 0.5, marginBottom: 10}} 
                />
                <Text style={styles.emptyText}>Tủ lạnh đang đầy ắp! {"\n"}Hoặc bạn chưa thêm gì cả.</Text>
            </View>
        )}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  backButtonWrapper: {
    marginLeft: 20,
    marginTop: 10,
  },
  backBtn: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },

  // --- PROGRESS BAR ---
  progressContainer: {
    marginTop: 80, // Né Header
    marginHorizontal: 20,
    marginBottom: 20,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: COLORS.textSub,
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },

  // --- INPUT SECTION ---
  inputContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  input: {
    flex: 1,
    paddingHorizontal: 15,
    fontSize: 16,
    color: COLORS.textMain,
    height: 50,
  },
  addBtn: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // --- LIST ITEMS ---
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
  },
  itemCardBought: {
    backgroundColor: '#F3F4F6', // Nền xám khi đã mua
    opacity: 0.8,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  checkBoxActive: {
    backgroundColor: COLORS.primary,
  },
  itemText: {
    fontSize: 16,
    color: COLORS.textMain,
    fontWeight: '500',
  },
  itemTextBought: {
    color: COLORS.check,
    textDecorationLine: 'line-through', // Gạch ngang chữ
    fontStyle: 'italic',
  },
  deleteBtn: {
    padding: 8,
  },

  // --- EMPTY STATE ---
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: COLORS.textSub,
    textAlign: 'center',
    lineHeight: 22,
  }
});