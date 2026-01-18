import React, { useLayoutEffect, useState, useEffect, useRef } from "react";
import { 
  FlatList, Text, View, ActivityIndicator, Modal, TextInput, 
  Alert, TouchableOpacity, StatusBar, Image, Animated 
} from "react-native";
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import MenuImage from "../../components/MenuImage/MenuImage"; 
import { differenceInDays, parseISO, format } from 'date-fns';

// Import Style
import styles, { ITEM_WIDTH, SPACING, SCREEN_WIDTH } from './styles';

export default function PantryScreen(props) {
  const { navigation } = props;
  const [pantryData, setPantryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // STATE
  const [modalVisible, setModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [shelfLife, setShelfLife] = useState("");
  const [editingItem, setEditingItem] = useState(null);

  // CAMERA STATE
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
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

  const getStatusInfo = (days) => {
    if (days < 0) return { color: '#FF3B30', bg: '#FFEBEE', label: 'HỎNG', glow: '#FF3B30' }; 
    if (days <= 2) return { color: '#FF9500', bg: '#FFF3E0', label: 'GẤP', glow: '#FF9500' }; 
    if (days <= 5) return { color: '#FFCC00', bg: '#FFFDE7', label: 'LƯU Ý', glow: '#FFD600' }; 
    return { color: '#00C851', bg: '#E8F5E9', label: 'TƯƠI', glow: '#00C851' }; 
  };

  useEffect(() => {
    const today = new Date();
    const addDays = (d) => { const date = new Date(today); date.setDate(today.getDate() + d); return format(date, 'yyyy-MM-dd'); };
    
    // Mock Data
    const mockData = [
      { id: '1', name: 'Sữa Tươi Vinamilk', expiry: addDays(7), maxDays: 14, quantity: 2, image: 'https://cdn.tgdd.vn/Products/Images/2386/79564/bhx/sua-tuoi-tiet-trung-vinamilk-co-duong-bich-220ml-202104161048419619.jpg' },
      { id: '2', name: 'Phô Mai Con Bò Cười', expiry: addDays(2), maxDays: 10, quantity: 1, image: 'https://cdn.tgdd.vn/Products/Images/7209/76662/bhx/pho-mai-con-bo-cuoi-hop-120g-8-mieng-202102190937402804.jpg' },
      { id: '3', name: 'Thịt Bò Mỹ', expiry: addDays(-1), maxDays: 5, quantity: 1, image: 'https://cdn.tgdd.vn/2020/12/CookDish/thit-bo-lam-mon-gi-ngon-tong-hop-25-mon-ngon-tu-thit-bo-thom-1.jpg' },
      { id: '4', name: 'Rau Xà Lách', expiry: addDays(4), maxDays: 7, quantity: 3, image: 'https://cdn.tgdd.vn/Products/Images/8823/217983/bhx/xa-lach-mo-thuy-canh-4kfarm-tui-300g-202302281432168581.jpg' },
      { id: '5', name: 'Tương Ớt Chinsu', expiry: addDays(30), maxDays: 60, quantity: 1, image: 'https://cdn.tgdd.vn/Products/Images/2679/76805/bhx/tuong-ot-chinsu-chai-250g-202306130938493130.jpg' },
    ];
    setTimeout(() => { setPantryData(mockData); setIsLoading(false); }, 1000);
  }, []);

  const handleDeleteItem = (id) => Alert.alert("Xóa", "Bạn muốn xóa món này?", [{text:"Xóa", style:'destructive', onPress:()=>setPantryData(pantryData.filter(i=>i.id!==id))}, {text:"Hủy"}]);
  
  const handleEditItem = (item) => {
    const diff = differenceInDays(parseISO(item.expiry), new Date());
    setNewItemName(item.name); 
    setQuantity(item.quantity?.toString() || "1"); 
    setShelfLife(diff.toString()); 
    setEditingItem(item); 
    setCapturedPhoto(item.image);
    setModalVisible(true);
  };
  
  const handleSaveItem = () => {
    if(!newItemName || !shelfLife || !quantity) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin!");
      return;
    }
    const days = parseInt(shelfLife);
    const qty = parseInt(quantity);
    const expiry = format(new Date(new Date().setDate(new Date().getDate() + days)), 'yyyy-MM-dd');
    
    const newItem = { 
      id: editingItem?.id || Math.random().toString(), 
      name: newItemName, 
      expiry, 
      maxDays: days>0?days+2:7, 
      quantity: qty,
      image: capturedPhoto || editingItem?.image || 'https://cdn-icons-png.flaticon.com/512/3082/3082060.png'
    };
    
    if(editingItem) setPantryData(pantryData.map(i=>i.id===editingItem.id?newItem:i)); 
    else setPantryData([newItem, ...pantryData]);
    resetForm();
  };

  const resetForm = () => { 
    setNewItemName(""); 
    setQuantity(""); 
    setShelfLife(""); 
    setEditingItem(null); 
    setCapturedPhoto(null);
    setIsTakingPhoto(false);
    setModalVisible(false); 
  };
  
  const startCamera = async () => { 
    if(!(await requestPermission()).granted) {
      Alert.alert("Quyền camera", "Vui lòng cấp quyền camera để chụp ảnh sản phẩm");
      return;
    }
    setModalVisible(false);
    setIsTakingPhoto(true);
  };
  
  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: false,
        });
        setCapturedPhoto(photo.uri);
        setIsTakingPhoto(false);
        setModalVisible(true);
      } catch (error) {
        Alert.alert("Lỗi", "Không thể chụp ảnh");
      }
    }
  };

  const renderItem = ({ item, index }) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const expDate = parseISO(item.expiry); expDate.setHours(0,0,0,0);
    const diffDays = differenceInDays(expDate, today);
    const { color, bg, label, glow } = getStatusInfo(diffDays);

    let progress = (diffDays / (item.maxDays || 10)) * 100;
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
              <Image source={{ uri: item.image }} style={styles.productImage} resizeMode="cover" />
              {item.quantity > 1 && (
                <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>x{item.quantity}</Text>
                </View>
              )}
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

  // --- CAMERA VIEW ---
  if (isTakingPhoto) {
    const squareSize = SCREEN_WIDTH * 0.85;
    
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        <View style={{ width: squareSize, height: squareSize, borderRadius: 24, overflow: 'hidden', borderWidth: 3, borderColor: '#fff' }}>
          <CameraView 
            style={{ flex: 1, width: '100%', height: '100%' }} 
            facing="back"
            ref={cameraRef}
          />
        </View>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', width: '100%', paddingHorizontal: 30, marginTop: 50 }}>
          <TouchableOpacity 
            style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => setIsTakingPhoto(false)} 
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)' }}
            onPress={takePicture} 
            activeOpacity={0.8}
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
            data={pantryData} horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: SPACING, paddingTop: 80, paddingBottom: 50 }}
            snapToInterval={ITEM_WIDTH} decelerationRate="fast" bounces={false}
            keyExtractor={item => item.id}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
            renderItem={renderItem}
            ListEmptyComponent={<Text style={{width: SCREEN_WIDTH, textAlign:'center', marginTop:100, color:'#999'}}>Tủ trống!</Text>}
        />
      )}
      
      <TouchableOpacity 
        style={styles.fab} 
        onPress={startCamera} 
        activeOpacity={0.8}
      >
        <Ionicons name="camera" size={28} color="#fff" />
      </TouchableOpacity>
      
      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalBody}>
                <Text style={{fontSize:20, fontWeight:'bold', marginBottom:15}}>
                  {editingItem ? "Chỉnh sửa món" : "Thêm món mới"}
                </Text>
                
                {capturedPhoto && (
                  <View style={{ width: '100%', marginBottom: 15 }}>
                    <Image source={{ uri: capturedPhoto }} style={{ width: '100%', height: 150, borderRadius: 12 }} resizeMode="cover" />
                    <TouchableOpacity 
                      style={{ position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 }}
                      onPress={() => {
                        setCapturedPhoto(null);
                        setModalVisible(false);
                        startCamera();
                      }}
                    >
                      <Ionicons name="camera" size={16} color="#007AFF" />
                      <Text style={{ color: '#007AFF', marginLeft: 5, fontWeight: '600' }}>Chụp lại</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                <TextInput 
                  style={styles.input} 
                  placeholder="Tên sản phẩm..." 
                  value={newItemName} 
                  onChangeText={setNewItemName}
                />
                
                <TextInput 
                  style={styles.input} 
                  placeholder="Số lượng..." 
                  keyboardType="numeric" 
                  value={quantity} 
                  onChangeText={setQuantity}
                />
                
                <TextInput 
                  style={styles.input} 
                  placeholder="Hạn sử dụng (số ngày)..." 
                  keyboardType="numeric" 
                  value={shelfLife} 
                  onChangeText={setShelfLife}
                />
                
                <View style={{flexDirection:'row', gap:10, marginTop:10, width:'100%'}}>
                    <TouchableOpacity style={styles.btnCancel} onPress={resetForm}>
                      <Text>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnSave} onPress={handleSaveItem}>
                      <Text style={{color:'#fff', fontWeight:'bold'}}>Lưu</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>
    </View>
  );
}