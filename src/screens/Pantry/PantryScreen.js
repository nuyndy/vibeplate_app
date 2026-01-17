import React, { useLayoutEffect, useState, useEffect } from "react";
import { FlatList, Text, View, TouchableHighlight, ActivityIndicator, Modal, TextInput, Alert, TouchableOpacity, StatusBar, Image } from "react-native";
import { CameraView, useCameraPermissions } from 'expo-camera'; 
import styles from "./styles";
import MenuImage from "../../components/MenuImage/MenuImage";
import { differenceInDays, parseISO } from 'date-fns';

export default function PantryScreen(props) {
  const { navigation } = props;
  const [pantryData, setPantryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- STATE QUẢN LÝ MODAL ---
  const [modalVisible, setModalVisible] = useState(false);
  const [inputMode, setInputMode] = useState(false); 
  
  // STATE DỮ LIỆU NHẬP & SỬA
  const [newItemName, setNewItemName] = useState("");
  const [shelfLife, setShelfLife] = useState(""); 
  const [editingItem, setEditingItem] = useState(null); 

  // --- STATE QUẢN LÝ CAMERA ---
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Tủ Bếp Của Tôi",
      headerLeft: () => (
        <MenuImage onPress={() => navigation.openDrawer()} />
      ),
      headerRight: () => <View />,
    });
  }, []);

  const getExpiryStatus = (expiryDateString) => {
    const today = new Date();
    const expiryDate = parseISO(expiryDateString);
    const diffDays = differenceInDays(expiryDate, today);
    if (diffDays < 0) return { color: "#ff4d4d", status: "Hết hạn", diffDays };
    if (diffDays <= 3) return { color: "#ffcc00", status: "Sắp hết", diffDays };
    return { color: "#2cd18a", status: "An toàn", diffDays };
  };

  useEffect(() => {
    const mockData = [
      { id: '1', name: 'Sữa tươi', expiry: '2026-01-14' },
      { id: '2', name: 'Phô mai', expiry: '2026-01-18' },
    ];
    setTimeout(() => {
      setPantryData(mockData);
      setIsLoading(false);
    }, 1000);
  }, []);

  // --- XỬ LÝ XÓA ---
  const handleDeleteItem = (id, name) => {
    Alert.alert(
      "Xác nhận xóa",
      `Bạn chắc chắn muốn xóa "${name}"?`,
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Xóa luôn", 
          style: "destructive", 
          onPress: () => {
            const newData = pantryData.filter(item => item.id !== id);
            setPantryData(newData);
          }
        }
      ]
    );
  };

  // --- XỬ LÝ SỬA ---
  const handleEditItem = (item) => {
    const today = new Date();
    const expiryDate = parseISO(item.expiry);
    const diffDays = differenceInDays(expiryDate, today);
    
    setNewItemName(item.name);
    setShelfLife(diffDays.toString()); 
    setEditingItem(item); 

    setInputMode(true);
    setModalVisible(true);
  };

  // --- XỬ LÝ LƯU ---
  const handleSaveItem = () => {
    if (newItemName.trim() === "" || shelfLife.trim() === "") {
      Alert.alert("Lỗi", "Vui lòng nhập đủ thông tin!");
      return;
    }

    const daysToAdd = parseInt(shelfLife);
    if (isNaN(daysToAdd)) {
        Alert.alert("Lỗi", "Hạn sử dụng phải là số!");
        return;
    }

    const today = new Date();
    const expiryDate = new Date(today);
    expiryDate.setDate(today.getDate() + daysToAdd); 
    const expiryString = expiryDate.toISOString().split('T')[0];

    if (editingItem) {
      const updatedData = pantryData.map(item => {
        if (item.id === editingItem.id) {
          return { ...item, name: newItemName, expiry: expiryString };
        }
        return item;
      });
      setPantryData(updatedData);
      Alert.alert("Thành công", "Đã cập nhật thông tin!");
    } else {
      const newItem = {
        id: Math.random().toString(),
        name: newItemName,
        expiry: expiryString,
      };
      setPantryData([...pantryData, newItem]);
      Alert.alert("Thành công", `Đã thêm ${newItemName}`);
    }
    
    setNewItemName("");
    setShelfLife(""); 
    setEditingItem(null);
    setInputMode(false);
    setModalVisible(false);
  };

  // --- CAMERA ---
  const startScan = async () => {
    if (!permission) return;
    if (!permission.granted) {
      const { granted } = await requestPermission();
      if (!granted) return;
    }
    setModalVisible(false);
    setIsScanning(true);
    setScanned(false);
  };

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    Alert.alert("Đã quét mã!", `Mã: ${data}`, [
      {
        text: "OK",
        onPress: () => {
          const newItem = {
            id: Math.random().toString(),
            name: `Sản phẩm ${data}`,
            expiry: '2026-12-31', 
          };
          setPantryData([...pantryData, newItem]);
          setIsScanning(false);
        }
      }
    ]);
  };

  // --- GIAO DIỆN QUÉT MÃ ---
  if (isScanning) {
    return (
      <View style={styles.locketContainer}>
        <StatusBar hidden /> 
        <Text style={styles.locketHint}>Di chuyển camera vào mã vạch</Text>

        <View style={styles.locketFrame}>
            <CameraView
              style={styles.locketCamera}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />
        </View>

        <TouchableOpacity style={styles.locketBackButton} onPress={() => setIsScanning(false)}>
          <Text style={styles.locketBackText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2cd18a" />
      </View>
    );
  }

  // --- RENDER MỖI MÓN ĂN ---
  const renderItem = ({ item }) => {
    const { color, status, diffDays } = getExpiryStatus(item.expiry);
    
    let dateText = "";
    if (diffDays < 0) dateText = `Quá hạn ${Math.abs(diffDays)} ngày`;
    else if (diffDays === 0) dateText = "Hết hạn hôm nay";
    else dateText = `Còn ${diffDays} ngày`;

    return (
      <View style={styles.itemContainer}>
        {/* Hàng 1: Thông tin + Badge */}
        <View style={styles.infoRow}>
            <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.name}</Text>
                <Text style={[styles.expiryDate, { 
                    color: diffDays < 0 ? '#ff4d4d' : '#888',
                    fontWeight: diffDays < 0 ? 'bold' : 'normal'
                }]}>
                    {dateText}
                </Text>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: color }]}>
                <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>{status}</Text>
            </View>
        </View>

        {/* Hàng 2: Nút Sửa & Xóa (ĐÃ SỬA TÊN FILE ẢNH Ở ĐÂY) */}
        <View style={styles.actionRow}>
            <TouchableOpacity 
                onPress={() => handleEditItem(item)}
                style={[styles.actionButton, { backgroundColor: '#e6f7ff' }]}
            >
                <View style={styles.buttonContent}>
                  {/* SỬA: Dùng file 'editing.png' thay vì 'edit.png' */}
                  <Image 
                    source={require('../../../assets/icons/editing.png')} 
                    style={{ width: 20, height: 20, tintColor: '#007AFF', marginRight: 5 }} 
                  />
                  <Text style={{ color: '#007AFF', fontWeight: '600' }}>Sửa</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity 
                onPress={() => handleDeleteItem(item.id, item.name)}
                style={[styles.actionButton, { backgroundColor: '#fff1f0' }]}
            >
                <View style={styles.buttonContent}>
                  {/* SỬA: Dùng file 'trash-can.png' thay vì 'delete.png' */}
                  <Image 
                    source={require('../../../assets/icons/trash-can.png')} 
                    style={{ width: 20, height: 20, tintColor: '#ff4d4d', marginRight: 5 }} 
                  />
                  <Text style={{ color: '#ff4d4d', fontWeight: '600' }}>Xóa</Text>
                </View>
            </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={pantryData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100, paddingVertical: 10 }}
      />
      
      <TouchableHighlight 
        style={styles.fab} 
        onPress={() => {
            setEditingItem(null);
            setNewItemName("");
            setShelfLife("");
            setModalVisible(true);
            setInputMode(false); 
        }}
        underlayColor="#20a065"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableHighlight>

      {/* MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            {!inputMode ? (
              // MENU CHỌN
              <>
                <Text style={styles.modalTitle}>Thêm thực phẩm mới</Text>
                
                {/* NÚT NHẬP TAY */}
                <TouchableHighlight style={styles.modalButton} onPress={() => setInputMode(true)}>
                  <View style={styles.buttonContent}>
                    {/* SỬA: Dùng file 'text (1).png' */}
                    <Image 
                      source={require('../../../assets/icons/text (1).png')} 
                      style={{ width: 25, height: 25, tintColor: 'white', marginRight: 10 }} 
                    />
                    <Text style={styles.textStyle}>Nhập tên thủ công</Text>
                  </View>
                </TouchableHighlight>

                {/* NÚT CAMERA */}
                <TouchableHighlight style={styles.modalButton} onPress={startScan}>
                  <View style={styles.buttonContent}>
                    {/* Dùng file 'camera.png' */}
                    <Image 
                      source={require('../../../assets/icons/camera.png')} 
                      style={{ width: 25, height: 25, tintColor: 'white', marginRight: 10 }} 
                    />
                    <Text style={styles.textStyle}>Quét mã vạch</Text>
                  </View>
                </TouchableHighlight>

                <TouchableHighlight style={styles.closeButton} onPress={() => setModalVisible(false)}>
                    <Text style={styles.closeText}>Đóng</Text>
                </TouchableHighlight>
              </>
            ) : (
              // FORM NHẬP LIỆU
              <>
                <Text style={styles.modalTitle}>
                    {editingItem ? "Chỉnh sửa món ăn" : "Nhập món mới"}
                </Text>
                <TextInput 
                    style={styles.input}
                    placeholder="Tên thực phẩm"
                    value={newItemName}
                    onChangeText={setNewItemName}
                />
                <TextInput 
                    style={styles.input}
                    placeholder="Còn hạn bao nhiêu ngày?" 
                    value={shelfLife}
                    onChangeText={setShelfLife}
                    keyboardType="numeric" 
                />
                <TouchableHighlight style={styles.modalButton} onPress={handleSaveItem}>
                  <Text style={styles.textStyle}>
                      {editingItem ? "Cập nhật xong" : "Lưu vào tủ"}
                  </Text>
                </TouchableHighlight>

                <TouchableHighlight 
                    style={styles.closeButton} 
                    onPress={() => {
                        if (editingItem) {
                            setModalVisible(false);
                            setEditingItem(null);
                            setInputMode(false);
                        } else {
                            setInputMode(false);
                        }
                    }}
                >
                  <Text style={{color: '#555'}}>Quay lại</Text>
                </TouchableHighlight>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}