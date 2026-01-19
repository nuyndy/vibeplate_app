import React, { useLayoutEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  SafeAreaView, TextInput, FlatList, Alert, Keyboard
} from 'react-native';
import MenuImage from '../../components/MenuImage/MenuImage';

const COLORS = {
  primary: '#111111',
  bg: '#FFFFFF',
  textMain: '#111111',
  textSub: '#6B7280',
  border: '#E5E7EB',
  card: '#FFFFFF',
  check: '#9CA3AF',
};

export default function ShoppingListScreen({ navigation }) {

  const [items, setItems] = useState([
    { id: '1', name: '500g Thịt bò', isBought: false },
    { id: '2', name: 'Hành tây, tỏi', isBought: true },
    { id: '3', name: 'Nước mắm Nam Ngư', isBought: false },
  ]);

  const [newItemName, setNewItemName] = useState('');

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
      headerRight: () => (
        items.length > 0 ? (
          <TouchableOpacity style={{ marginRight: 18 }} onPress={handleClearAll}>
            <Text style={{ color: '#000000', fontWeight: '600' }}>DỌN GIỎ</Text>
          </TouchableOpacity>
        ) : null
      ),
    });
  }, [navigation, items]);

  const handleAddItem = () => {
    if (newItemName.trim().length === 0) return;
    const newItem = {
      id: Date.now().toString(),
      name: newItemName,
      isBought: false,
    };
    setItems([newItem, ...items]);
    setNewItemName('');
    Keyboard.dismiss();
  };

  const toggleItem = (id) => {
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, isBought: !item.isBought } : item
    );
    updatedItems.sort((a, b) => Number(a.isBought) - Number(b.isBought));
    setItems(updatedItems);
  };

  const handleDeleteItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleClearAll = () => {
    Alert.alert("Xác nhận", "Xóa toàn bộ danh sách?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: () => setItems([]) }
    ]);
  };

  const total = items.length;
  const boughtCount = items.filter(i => i.isBought).length;
  const progress = total === 0 ? 0 : (boughtCount / total) * 100;

  const renderItem = ({ item }) => (
    <View style={[styles.itemCard, item.isBought && styles.itemCardBought]}>
      <TouchableOpacity
        style={[styles.checkBox, item.isBought && styles.checkBoxActive]}
        onPress={() => toggleItem(item.id)}
      >
        {item.isBought && (
          <Image
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1828/1828643.png' }}
            style={{ width: 12, height: 12, tintColor: '#fff' }}
          />
        )}
      </TouchableOpacity>

      <TouchableOpacity style={{ flex: 1 }} onPress={() => toggleItem(item.id)}>
        <Text style={[styles.itemText, item.isBought && styles.itemTextBought]}>
          {item.name}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteItem(item.id)}>
        <Image
          source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1828/1828665.png' }}
          style={{ width: 20, height: 20, tintColor: '#9CA3AF' }}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Tiến độ</Text>
          <Text style={styles.progressValue}>{boughtCount}/{total}</Text>
        </View>

        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Thêm món cần mua..."
          placeholderTextColor={COLORS.textSub}
          value={newItemName}
          onChangeText={setNewItemName}
          onSubmitEditing={handleAddItem}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAddItem}>
          <Image
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/748/748113.png' }}
            style={{ width: 18, height: 18, tintColor: '#fff' }}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Image
              source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4076/4076549.png' }}
              style={{ width: 80, height: 80, opacity: 0.6, marginBottom: 12 }}
            />
            <Text style={styles.emptyText}>Danh sách đang trống.</Text>
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

  progressContainer: {
    marginTop: 90,
    marginHorizontal: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  progressValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.textMain,
  },

  inputContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: COLORS.textMain,
  },
  addBtn: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.textMain,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 50,
  },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    padding: 12,
    marginBottom: 10,
  },
  itemCardBought: {
    backgroundColor: '#F3F4F6',
  },
  checkBox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: COLORS.textMain,
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBoxActive: {
    backgroundColor: COLORS.textMain,
    borderColor: COLORS.textMain,
  },
  itemText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textMain,
  },
  itemTextBought: {
    color: COLORS.check,
    textDecorationLine: 'line-through',
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 10,
  },

  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 8,
    color: COLORS.textSub,
  },
});
