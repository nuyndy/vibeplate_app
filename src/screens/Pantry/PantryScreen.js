import React, { useLayoutEffect, useState, useEffect, useRef } from "react";
import { 
  FlatList, Text, View, ActivityIndicator, Modal, TextInput, 
  Alert, TouchableOpacity, StatusBar, Image, Animated, 
  KeyboardAvoidingView, Platform, Button 
} from "react-native";
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import MenuImage from "../../components/MenuImage/MenuImage"; 
import { differenceInDays, parseISO, format } from 'date-fns';

// --- FIREBASE IMPORTS ---
import { db, auth } from '../../firebase/firebaseConfig'; 
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, query, where, Timestamp 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// --- CẤU HÌNH CLOUDINARY ---
const CLOUD_NAME = "devpumtqu";
const UPLOAD_PRESET = "VibePlate";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

import styles, { ITEM_WIDTH, SPACING, SCREEN_WIDTH } from './styles';

export default function PantryScreen(props) {
  const { navigation } = props;
  const [pantryData, setPantryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  // STATE FORM
  const [modalVisible, setModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState(""); 
  const [shelfLife, setShelfLife] = useState(""); 
  const [editingItem, setEditingItem] = useState(null);

  // CAMERA STATE
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  
  // --- QUYỀN CAMERA ---
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  
  const scrollX = useRef(new Animated.Value(0)).current;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Kho thực phẩm",
      headerTransparent: true,
      headerLeft: () => (<View><MenuImage onPress={() => navigation.openDrawer()} /></View>),
    });
  }, []);

  // --- 1. LẤY DỮ LIỆU TỪ FIRESTORE ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const q = query(collection(db, "inventory"), where("email", "==", currentUser.email));
        
        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const items = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              expiryDateObj: data.expiryDate ? data.expiryDate.toDate() : new Date(), 
            };
          });
          items.sort((a, b) => a.expiryDateObj - b.expiryDateObj);
          setPantryData(items);
          setIsLoading(false);
        });
        return () => unsubscribeSnapshot();
      } else {
        setPantryData([]);
        setIsLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // --- 2. CÁC HÀM HỖ TRỢ ---
  const uploadToCloudinary = async (imageUri) => {
    if (!imageUri) return null;
    if (imageUri.startsWith('http') && !imageUri.startsWith('file')) return imageUri;

    try {
      const data = new FormData();
      data.append('file', { uri: imageUri, type: 'image/jpeg', name: 'upload.jpg' });
      data.append('upload_preset', UPLOAD_PRESET);
      data.append('cloud_name', CLOUD_NAME);

      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json', 'Content-Type': 'multipart/form-data' },
      });

      const result = await response.json();
      if (result.secure_url) return result.secure_url;
      else {
        Alert.alert("Lỗi Upload", "Không thể lưu ảnh lên Cloudinary.");
        return null;
      }
    } catch (error) {
      console.error("Upload failed:", error);
      Alert.alert("Lỗi mạng", "Kiểm tra kết nối internet.");
      return null;
    }
  };

  const getStatusInfo = (diffDays) => {
    if (diffDays < 0) return { color: '#FF3B30', bg: '#FFEBEE', label: 'HỎNG', glow: '#FF3B30' }; 
    if (diffDays <= 2) return { color: '#FF9500', bg: '#FFF3E0', label: 'GẤP', glow: '#FF9500' }; 
    if (diffDays <= 5) return { color: '#FFCC00', bg: '#FFFDE7', label: 'LƯU Ý', glow: '#FFD600' }; 
    return { color: '#00C851', bg: '#E8F5E9', label: 'TƯƠI', glow: '#00C851' }; 
  };

  // --- 3. CRUD LOGIC ---
  const handleDeleteItem = (id) => {
    Alert.alert("Xóa thực phẩm", "Bạn chắc chắn muốn xóa món này?", [
        { text: "Hủy", style: "cancel" },
        { text: "Xóa", style: 'destructive', onPress: async () => { await deleteDoc(doc(db, "inventory", id)); }}
    ]);
  };
  
  const handleEditItem = (item) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const exp = item.expiryDateObj || new Date(); exp.setHours(0,0,0,0);
    const diff = differenceInDays(exp, today);
    setNewItemName(item.name); setQuantity(item.quantity?.toString() || "1"); setUnit(item.unit || "hộp");
    setShelfLife(diff.toString()); setEditingItem(item); setCapturedPhoto(item.photo_url); 
    setModalVisible(true);
  };
  
  const handleSaveItem = async () => {
    if(!newItemName || !shelfLife || !quantity) {
      Alert.alert("Thiếu thông tin", "Vui lòng điền đủ thông tin!");
      return;
    }
    setIsLoading(true); 
    try {
      let finalPhotoUrl = editingItem?.photo_url || 'https://via.placeholder.com/150';
      
      // Upload ảnh nếu có ảnh mới
      if (capturedPhoto && capturedPhoto !== editingItem?.photo_url) {
         const uploadedUrl = await uploadToCloudinary(capturedPhoto);
         if (uploadedUrl) finalPhotoUrl = uploadedUrl;
      }

      const days = parseInt(shelfLife);
      const today = new Date();
      const expiryDateObj = new Date(today.setDate(today.getDate() + days));

      const itemData = {
        email: user ? user.email : "unknown",
        name: newItemName,
        quantity: parseInt(quantity),
        unit: unit || "cái",
        expiryDate: Timestamp.fromDate(expiryDateObj), 
        photo_url: finalPhotoUrl
      };

      if (editingItem) {
        await updateDoc(doc(db, "inventory", editingItem.id), itemData);
      } else {
        await addDoc(collection(db, "inventory"), itemData);
      }
      
      resetForm();
    } catch (e) {
      Alert.alert("Lỗi", "Không thể lưu: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => { 
    setNewItemName(""); setQuantity(""); setShelfLife(""); setUnit("");
    setEditingItem(null); setCapturedPhoto(null); setIsTakingPhoto(false); setModalVisible(false); 
  };
  
  // --- 4. CAMERA LOGIC (ĐÃ SỬA LỖI) ---
  const startCamera = async () => { 
    if (!permission) return;
    if (!permission.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert("Cần quyền Camera", "Vui lòng vào Cài đặt > Quyền riêng tư để bật Camera.");
        return;
      }
    }
    setModalVisible(false);
    setIsTakingPhoto(true);
  };
  
  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        // Option an toàn nhất, bỏ skipProcessing
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5, 
          base64: false,
          // skipProcessing: true, // <-- BỎ DÒNG NÀY VÌ GÂY LỖI TRÊN 1 SỐ MÁY
        });
        
        console.log("Ảnh chụp thành công:", photo.uri);
        setCapturedPhoto(photo.uri);
        setIsTakingPhoto(false);
        setModalVisible(true);
      } catch (error) {
        console.error("Camera Error:", error);
        Alert.alert("Lỗi Camera", "Không thể chụp: " + error.message);
      }
    }
  };

  const renderItem = ({ item, index }) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const expDate = item.expiryDateObj || new Date(); expDate.setHours(0,0,0,0);
    const diffDays = differenceInDays(expDate, today);
    const { color, bg, label, glow } = getStatusInfo(diffDays);
    let progress = (diffDays / 15) * 100;
    if(progress < 0) progress = 0; if(progress > 100) progress = 100;

    const inputRange = [ (index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH ];
    const scale = scrollX.interpolate({ inputRange, outputRange: [0.9, 1.05, 0.9], extrapolate: 'clamp' });
    const opacity = scrollX.interpolate({ inputRange, outputRange: [0.6, 1, 0.6], extrapolate: 'clamp' });

    return (
      <Animated.View style={[styles.cardWrapper, { transform: [{ scale }], opacity }]}>
        <View style={[styles.glowBox, { shadowColor: glow, backgroundColor: glow }]} />
        <View style={styles.cardInner}>
            <View style={styles.cardHeader}>
                <View style={[styles.statusPill, { backgroundColor: bg }]}>
                    <Text style={[styles.statusText, { color: color }]}>● {label}</Text>
                </View>
                <Text style={styles.expiryText}>HSD: {format(expDate, 'dd/MM/yyyy')}</Text>
            </View>
            <View style={styles.imageContainer}>
              <Image source={{ uri: item.photo_url }} style={styles.productImage} resizeMode="cover" />
              <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{item.quantity} {item.unit}</Text>
              </View>
            </View>
            <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
            <View style={styles.statsContainer}>
                <View style={styles.daysBlock}>
                    <Text style={[styles.daysBig, { color: color }]}>{diffDays < 0 ? Math.abs(diffDays) : diffDays}</Text>
                    <Text style={styles.daysLabel}>{diffDays < 0 ? "QUÁ HẠN" : "NGÀY CÒN LẠI"}</Text>
                </View>
            </View>
            <View style={styles.progressContainer}><View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: color }]} /></View>
            <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.btnEdit]} onPress={()=>handleEditItem(item)} activeOpacity={0.7}>
                    <Ionicons name="create-outline" size={20} color="#007AFF" />
                    <Text style={[styles.actionText, {color: '#007AFF'}]}>Sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.btnDelete]} onPress={()=>handleDeleteItem(item.id)} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    <Text style={[styles.actionText, {color: '#FF3B30'}]}>Xóa</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Animated.View>
    );
  };

  // --- GIAO DIỆN CAMERA ---
  if (isTakingPhoto) {
    if (!permission) return <View style={{flex:1, backgroundColor:'#000'}} />;
    if (!permission.granted) {
      return (
        <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'white', marginBottom: 20 }}>Cần quyền camera để tiếp tục</Text>
          <Button onPress={requestPermission} title="Cấp quyền" />
          <Button onPress={() => setIsTakingPhoto(false)} title="Hủy" color="red" />
        </View>
      );
    }
    
    const squareSize = SCREEN_WIDTH * 0.85;
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        <View style={{ width: squareSize, height: squareSize, borderRadius: 24, overflow: 'hidden', borderWidth: 3, borderColor: '#fff' }}>
          {/* QUAN TRỌNG: mode="picture" và onCameraReady */}
          <CameraView 
            style={{ flex: 1 }} 
            facing="back" 
            mode="picture"
            ref={cameraRef}
            onCameraReady={() => setIsCameraReady(true)}
          />
        </View>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', width: '100%', paddingHorizontal: 30, marginTop: 50 }}>
          <TouchableOpacity 
            style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => setIsTakingPhoto(false)} activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)' }}
            onPress={takePicture} activeOpacity={0.8}
          >
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' }} />
          </TouchableOpacity>
          <View style={{ width: 50 }} />
        </View>
      </View>
    );
  }

  // --- MAIN UI ---
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {isLoading ? <ActivityIndicator size="large" color="#333" style={{marginTop: 100}} /> : (
        <Animated.FlatList
            data={pantryData} 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ 
                paddingHorizontal: SPACING, 
                paddingTop: 80, 
                paddingBottom: 50,
                flexGrow: 1, 
                justifyContent: pantryData.length === 0 ? 'center' : 'flex-start'
            }}
            snapToInterval={ITEM_WIDTH} 
            decelerationRate="fast" 
            bounces={false}
            keyExtractor={item => item.id}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
            renderItem={renderItem}
            getItemLayout={(data, index) => (
              { length: ITEM_WIDTH, offset: ITEM_WIDTH * index, index }
            )}
            ListEmptyComponent={
              <View style={{ 
                  width: SCREEN_WIDTH, 
                  marginLeft: -SPACING,
                  justifyContent: 'center', 
                  alignItems: 'center',
                  height: '100%' 
              }}>
                <Text style={{ color: '#999', fontSize: 16 }}>Tủ trống, thêm món mới nhé!</Text>
              </View>
            }
        />
      )}
      
      <TouchableOpacity style={styles.fab} onPress={startCamera} activeOpacity={0.8}>
        <Image 
          source={require('../../../assets/icons/camera.png')} 
          style={{ width: 28, height: 28, tintColor: '#fff' }}
          resizeMode="contain"
        />
      </TouchableOpacity>
      
      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBody}>
                <Text style={{fontSize:20, fontWeight:'bold', marginBottom:15}}>
                  {editingItem ? "Chỉnh sửa món" : "Thêm món mới"}
                </Text>
                
                {capturedPhoto && (
                  <View style={{ width: '100%', marginBottom: 15 }}>
                    <Image source={{ uri: capturedPhoto }} style={{ width: '100%', height: 150, borderRadius: 12 }} resizeMode="cover" />
                    <TouchableOpacity 
                      style={{ position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 }}
                      onPress={() => { setCapturedPhoto(null); setModalVisible(false); startCamera(); }}
                    >
                      <Ionicons name="camera" size={16} color="#007AFF" />
                      <Text style={{ color: '#007AFF', marginLeft: 5, fontWeight: '600' }}>Chụp lại</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                <TextInput style={styles.input} placeholder="Tên thực phẩm..." value={newItemName} onChangeText={setNewItemName}/>
                
                <View style={{flexDirection: 'row', gap: 10}}>
                   <TextInput style={[styles.input, {flex: 1}]} placeholder="Số lượng..." keyboardType="numeric" value={quantity} onChangeText={setQuantity}/>
                   <TextInput style={[styles.input, {flex: 1}]} placeholder="Đơn vị (hộp, kg...)" value={unit} onChangeText={setUnit}/>
                </View>
                
                <TextInput style={styles.input} placeholder="Dùng trong bao nhiêu ngày?" keyboardType="numeric" value={shelfLife} onChangeText={setShelfLife}/>
                
                <View style={{flexDirection:'row', gap:10, marginTop:10, width:'100%'}}>
                    <TouchableOpacity style={styles.btnCancel} onPress={resetForm}><Text>Hủy</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.btnSave} onPress={handleSaveItem}>
                        {isLoading ? <ActivityIndicator color="#fff"/> : <Text style={{color:'#fff', fontWeight:'bold'}}>Lưu</Text>}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}