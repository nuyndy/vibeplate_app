import React, { useLayoutEffect, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { 
  FlatList, Text, View, ActivityIndicator, Modal, TextInput, 
  Alert, TouchableOpacity, StatusBar, Image, Animated, 
  KeyboardAvoidingView, Platform, RefreshControl, LayoutAnimation, UIManager 
} from "react-native";
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import MenuImage from "../../components/MenuImage/MenuImage"; 
import { differenceInDays, format } from 'date-fns';

// --- FIREBASE ---
import { db, auth } from '../../firebase/firebaseConfig'; 
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, query, where, Timestamp, getDocs 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import styles, { ITEM_WIDTH, SPACING, SCREEN_WIDTH } from './styles';

// Kích hoạt LayoutAnimation cho Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_URL = CLOUD_NAME ? `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload` : '';
const hasCloudinaryConfig = () => Boolean(CLOUD_NAME && UPLOAD_PRESET);

export default function PantryScreen(props) {
  const { navigation } = props;
  const [pantryData, setPantryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);

  // FORM STATE
  const [modalVisible, setModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState(""); 
  const [shelfLife, setShelfLife] = useState(""); 
  const [editingItem, setEditingItem] = useState(null);

  // CAMERA & ANIMATION
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Kho thực phẩm",
      headerTransparent: true,
      headerLeft: () => (<MenuImage onPress={() => navigation.openDrawer()} />),
    });
  }, [navigation]);

  // Listener lắng nghe dữ liệu từ Firebase
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
          
          // Sắp xếp theo hạn sử dụng
          items.sort((a, b) => a.expiryDateObj - b.expiryDateObj);
          
          // Hiệu ứng mượt mà khi dữ liệu thay đổi (Xóa/Thêm)
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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

  const getStatusInfo = useCallback((diffDays) => {
    if (diffDays < 0) return { color: '#FF3B30', bg: '#FFEBEE', label: 'HỎNG', glow: '#FF3B30' }; 
    if (diffDays <= 2) return { color: '#FF9500', bg: '#FFF3E0', label: 'GẤP', glow: '#FF9500' }; 
    if (diffDays <= 5) return { color: '#FFCC00', bg: '#FFFDE7', label: 'LƯU Ý', glow: '#FFD600' }; 
    return { color: '#00C851', bg: '#E8F5E9', label: 'TƯƠI', glow: '#00C851' }; 
  }, []);

  const handleDeleteItem = (id) => {
    Alert.alert("Xóa thực phẩm", "Bạn chắc chắn muốn xóa món này?", [
        { text: "Hủy", style: "cancel" },
        { text: "Xóa", style: 'destructive', onPress: async () => {
            // Hiệu ứng trượt khi xóa
            LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
            await deleteDoc(doc(db, "inventory", id)); 
        }}
    ]);
  };

  const handleEditItem = (item) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const exp = item.expiryDateObj || new Date(); exp.setHours(0,0,0,0);
    const diff = differenceInDays(exp, today);
    setNewItemName(item.name); 
    setQuantity(item.quantity?.toString() || "1"); 
    setUnit(item.unit || "hộp");
    setShelfLife(diff.toString()); 
    setEditingItem(item); 
    setCapturedPhoto(item.photo_url); 
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
      if (capturedPhoto && capturedPhoto !== editingItem?.photo_url) {
         if (!hasCloudinaryConfig()) {
           Alert.alert('Thiếu cấu hình', 'Thiếu EXPO_PUBLIC_CLOUD_NAME hoặc EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET trong .env');
           throw new Error('Cloudinary config missing');
         }
         const data = new FormData();
         data.append('file', { uri: capturedPhoto, type: 'image/jpeg', name: 'upload.jpg' });
         data.append('upload_preset', UPLOAD_PRESET);
         const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: data });
         const result = await response.json();
         if (result.secure_url) finalPhotoUrl = result.secure_url;
      }
      
      const expiryDateObj = new Date();
      expiryDateObj.setDate(expiryDateObj.getDate() + parseInt(shelfLife));

      const itemData = {
        email: user?.email,
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
      Alert.alert("Lỗi", "Không thể lưu dữ liệu");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => { 
    setNewItemName(""); setQuantity(""); setShelfLife(""); setUnit("");
    setEditingItem(null); setCapturedPhoto(null); setIsTakingPhoto(false); setModalVisible(false); 
  };

  const renderItem = ({ item, index }) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const expDate = item.expiryDateObj || new Date(); expDate.setHours(0,0,0,0);
    const diffDays = differenceInDays(expDate, today);
    const { color, bg, label, glow } = getStatusInfo(diffDays);
    
    let progress = Math.min(Math.max((diffDays / 15) * 100, 0), 100);

    const inputRange = [ (index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH ];
    
    // Tối ưu outputRange để không bị trắng xóa khi trượt
    const scale = scrollX.interpolate({ inputRange, outputRange: [0.95, 1, 0.95], extrapolate: 'clamp' });
    const opacity = scrollX.interpolate({ inputRange, outputRange: [0.8, 1, 0.8], extrapolate: 'clamp' });

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
                    <Text style={[styles.daysBig, { color: color }]}>{Math.abs(diffDays)}</Text>
                    <Text style={styles.daysLabel}>{diffDays < 0 ? "QUÁ HẠN" : "NGÀY CÒN LẠI"}</Text>
                </View>
            </View>
            <View style={styles.progressContainer}><View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: color }]} /></View>
            <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.btnEdit]} onPress={()=>handleEditItem(item)}>
                    <Ionicons name="create-outline" size={20} color="#007AFF" />
                    <Text style={[styles.actionText, {color: '#007AFF'}]}>Sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.btnDelete]} onPress={()=>handleDeleteItem(item.id)}>
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    <Text style={[styles.actionText, {color: '#FF3B30'}]}>Xóa</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Animated.View>
    );
  };

  if (isTakingPhoto) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>
        <CameraView 
          style={{ width: '100%', aspectRatio: 1 }} 
          facing="back" 
          ref={cameraRef}
        />
        <TouchableOpacity style={{ alignSelf: 'center', marginTop: 30 }} onPress={async () => {
          const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
          setCapturedPhoto(photo.uri);
          setIsTakingPhoto(false);
          setModalVisible(true);
        }}>
          <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', borderWidth: 5, borderColor: '#ccc' }} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {isLoading ? <ActivityIndicator size="large" color="#333" style={{marginTop: 100}} /> : (
        <Animated.FlatList
            data={pantryData} 
            horizontal 
            showsHorizontalScrollIndicator={false}
            // Tối ưu hóa render
            removeClippedSubviews={false}
            windowSize={5}
            initialNumToRender={7}
            maxToRenderPerBatch={5}
            snapToInterval={ITEM_WIDTH} 
            decelerationRate="fast" 
            keyExtractor={item => item.id}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: SPACING, paddingTop: 80, paddingBottom: 50 }}
            ListEmptyComponent={
              <View style={{ width: SCREEN_WIDTH - SPACING*2, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#999' }}>Tủ trống, thêm món mới nhé!</Text>
              </View>
            }
        />
      )}
      
      <TouchableOpacity style={styles.fab} onPress={() => { setModalVisible(true); }} activeOpacity={0.8}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal transparent visible={modalVisible} animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBody}>
            <Text style={styles.modalMainTitle}>{editingItem ? "Sửa thực phẩm" : "Thêm mới"}</Text>
            
            <TouchableOpacity style={styles.photoPlaceholder} onPress={() => { setModalVisible(false); setIsTakingPhoto(true); }}>
               {capturedPhoto ? (
                 <Image source={{ uri: capturedPhoto }} style={{ width: '100%', height: '100%', borderRadius: 15 }} />
               ) : (
                 <Ionicons name="camera-outline" size={32} color="#999" />
               )}
            </TouchableOpacity>

            <TextInput style={styles.modernInput} placeholder="Tên món" value={newItemName} onChangeText={setNewItemName} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput style={[styles.modernInput, { flex: 1 }]} placeholder="SL" keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
                <TextInput style={[styles.modernInput, { flex: 1 }]} placeholder="Đơn vị" value={unit} onChangeText={setUnit} />
            </View>
            <TextInput style={styles.modernInput} placeholder="Số ngày bảo quản" keyboardType="numeric" value={shelfLife} onChangeText={setShelfLife} />

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modernBtnCancel} onPress={resetForm}><Text>Hủy</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modernBtnSave} onPress={handleSaveItem}><Text style={{color: '#fff'}}>Lưu kho</Text></TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}