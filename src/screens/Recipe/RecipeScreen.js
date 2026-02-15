import React, { useLayoutEffect, useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Alert,
  Dimensions,
  RefreshControl // <--- Thêm RefreshControl
} from "react-native";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { useSharedValue } from 'react-native-reanimated';
import Carousel, { Pagination } from 'react-native-reanimated-carousel';

import { getCategoryById, getAllIngredients } from "../../data/MockDataAPI";
import BackButton from "../../components/BackButton/BackButton";
import styles from "./styles";
import { auth, db } from '../../firebase/firebaseConfig';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';

const { width: viewportWidth, height: viewportHeight } = Dimensions.get("window");

export default function RecipeScreen(props) {
  const { navigation, route } = props;
  const item = route.params?.item;

  // --- STATES ---
  const [activeCategory, setActiveCategory] = useState(null);
  const [ingredientsData, setIngredientsData] = useState([]);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [pantryData, setPantryData] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false); // <--- State cho reload
  //
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  useEffect(() => {
  const subscription = ExpoSpeechRecognitionModule.addListener("result", async (event) => {
  if (event.results?.length > 0) {
    const spokenText = event.results[0]?.transcript || "";
    console.log("🎤 Nhận được:", spokenText);
    setTranscript(spokenText);
  }

  // QUAN TRỌNG: bật lại mic nếu vẫn đang nấu
  if (isListening) {
    await startListening();
  }
});

  return () => {
    subscription.remove();
  };
}, [isListening]);

  //
  const [currentStep, setCurrentStep] = useState(0); // Vị trí bước hiện tại (bắt đầu từ 0)
  const [recipeSteps, setRecipeSteps] = useState([]); // Mảng chứa các câu/bước hướng dẫn

  const slider1Ref = useRef(null);
  const progress = useSharedValue(0);

  const normalizeName = (name) => name ? name.toLowerCase().trim() : "";
  const startListening = async () => {
  try {
    await ExpoSpeechRecognitionModule.start({
      lang: 'vi-VN',
      continuous: true,
      interimResults: true,
    });
  } catch (e) {
    console.error("Lỗi khi bật thu âm:", e);
  }
};


  // --- HÀM TẢI DỮ LIỆU TỔNG HỢP ---
  const loadAllData = useCallback(async () => {
    if (!item) return;
    try {
      // 1. Tải Category & Nguyên liệu song song
      const [catData, ingredientsDetail] = await Promise.all([
        item.categoryId ? getCategoryById(item.categoryId) : Promise.resolve(null),
        item.ingredients ? getAllIngredients(item.ingredients) : Promise.resolve([])
      ]);

      setActiveCategory(catData);
      setIngredientsData(ingredientsDetail);

      // 2. Kiểm tra Favorite
      const user = auth.currentUser;
      if (user) {
        const docId = `${user.uid}_${item.recipeId}`;
        const docSnap = await getDoc(doc(db, "favorites", docId));
        setIsSaved(docSnap.exists());
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setIsLoadingIngredients(false);
      setIsRefreshing(false); // <--- Tắt xoay reload
    }
  }, [item]);

  useEffect(() => {
  loadAllData();
}, []);
useEffect(() => {
  const user = auth.currentUser;
  if (!user) return;

  const q = query(collection(db, "inventory"), where("email", "==", user.email));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const pantryItems = snapshot.docs.map(doc => doc.data());
    setPantryData(pantryItems);
  });

  return () => unsubscribe();
}, []);


  // --- 1. Pull to Refresh ---
  const onRefresh = () => {
    setIsRefreshing(true);
    loadAllData();
  };
  // Trạng thái bật/tắt loa thủ công khi đang nấu
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  // Trạng thái cho nút Nghe tổng quát
  const [isReadingAll, setIsReadingAll] = useState(false);

  // Nút Nghe tổng quát (Đọc tất cả)
  const toggleReadAll = () => {
    if (isReadingAll) {
      Speech.stop();
      setIsReadingAll(false);
    } else {
      setIsReadingAll(true);
      Speech.stop();
      Speech.speak(item.description, {
        language: 'vi-VN',
        onDone: () => setIsReadingAll(false),
        onStopped: () => setIsReadingAll(false),
        onError: () => setIsReadingAll(false),
      });
    }
  };

  // --- HÀM ĐỌC BƯỚC NẤU ĂN (ĐÃ FIX LỖI TỰ ĐỘNG & QUEUE) ---
  const speakCurrentStep = (text) => {
  Speech.stop();

  setTimeout(() => {
    if (text) {
      Speech.speak(text, {
        language: 'vi-VN',
        onDone: () => {
          setCurrentStep(prev => {
            if (prev < recipeSteps.length - 1) {
              return prev + 1;
            } else {
              // đọc xong bước cuối
              setIsAudioMuted(true);   // đổi nút sang ▶
              return prev;
            }
          });
        }
      });
    }
  }, 100);
};


  const handleNextStep = () => {
    if (currentStep < recipeSteps.length - 1) {
      Speech.stop();
      setCurrentStep(prev => prev + 1);
      setIsAudioMuted(false);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      Speech.stop();
      setCurrentStep(prev => prev - 1);
      setIsAudioMuted(false);
    }
  };

  const toggleAudio = () => {

  // Nếu đang mute (hiện ▶)
  if (isAudioMuted) {

    //  Nếu đang ở bước cuối → quay lại từ đầu
    if (currentStep === recipeSteps.length - 1) {
      setCurrentStep(0);
    }

    setIsAudioMuted(false);
  } 
  
  // Nếu đang phát (hiện ⏸)
  else {
    Speech.stop();
    setIsAudioMuted(true);
  }
};




  // --- HÀM DỪNG NẤU ĂN (ĐÃ FIX LỖI MICRO CHẠY NGẦM) ---
  const stopCooking = async () => {
    setIsListening(false);
    Speech.stop();
    setTranscript("");
    setCurrentStep(0); 
    setIsAudioMuted(false);
    // Tắt hẳn thu âm từ native module để tránh lỗi đơ ở lần bật sau
    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch (e) {
      console.log("Lỗi tắt mic:", e);
    }
  };

  // --- QUẢN LÝ LỆNH GIỌNG NÓI ---
  useEffect(() => {
    if (!transcript) return;
    const lowerCommand = transcript.toLowerCase();

    // 1. Chuyển bước
    if (lowerCommand.includes("tiếp")) {
  if (isAudioMuted) {
    setIsAudioMuted(false);
    handleNextStep();
  } else {
    handleNextStep();
  }
}

    // 2. Tạm dừng đọc (Micro vẫn nghe lệnh)
    else if (lowerCommand.includes("ngừng") || lowerCommand.includes("dừng đọc")) {
      console.log("⏸ Tạm dừng âm thanh.");
      setIsAudioMuted(true);
      Speech.stop();
      setTranscript("");
    }
    // LÙI VỀ
    else if (lowerCommand.includes("lùi") || lowerCommand.includes("quay lại")) {
      handlePrevStep();
      setTranscript("");
    }
    // DỪNG ĐỌC nhưng vẫn giữ mic
    else if (lowerCommand.includes("ngừng")) {
      Speech.stop();
      setIsAudioMuted(true);
      setTranscript("");
    }

    // KẾT THÚC HOÀN TOÀN
    else if (lowerCommand.includes("tắt") || lowerCommand.includes("kết thúc")) {
      stopCooking();
    }

  }, [transcript]);

  useEffect(() => {
    if (item?.description) {
      const stepsArray = item.description.split('\n').filter(step => step.trim() !== "");
      setRecipeSteps(stepsArray);
    }
  }, [item]);

  useEffect(() => {
  if (!isListening) return;
  if (isAudioMuted) return;
  if (recipeSteps.length === 0) return;

  speakCurrentStep(recipeSteps[currentStep]);

}, [currentStep, isListening, isAudioMuted]);

  // Lưu ý: Không đưa isAudioMuted vào mảng dependencies để tránh bị đọc đúp khi bấm nút ||
  const handleSaveRecipe = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Yêu cầu đăng nhập", "Bạn cần đăng nhập để lưu món ăn.");
      return;
    }
    const docId = `${user.uid}_${item.recipeId}`;
    const docRef = doc(db, "favorites", docId);
    try {
      if (isSaved) {
        await deleteDoc(docRef);
        setIsSaved(false);
      } else {
        const favoriteData = {
          recipeId: item.recipeId,
          title: item.title,
          photo_url: item.photo_url,
          time: item.time,
          servings: item.servings,
          categoryId: item.categoryId,
          userId: user.uid,
          addedAt: serverTimestamp()
        };
        await setDoc(docRef, favoriteData);
        setIsSaved(true);
        Alert.alert("Đã lưu", "Đã thêm vào danh sách món ăn yêu thích!");
      }
    } catch (error) { console.error(error); }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: true,
      headerTitle: "",
      headerTintColor: "#fff",
      headerLeft: () => <View style={styles.backButtonWrapper}><BackButton onPress={() => navigation.goBack()} /></View>,
      headerRight: () => (
        <TouchableOpacity style={styles.saveButtonWrapper} onPress={handleSaveRecipe}>
          <Image
            source={{ uri: isSaved ? 'https://cdn-icons-png.flaticon.com/512/833/833472.png' : 'https://cdn-icons-png.flaticon.com/512/1077/1077035.png' }}
            style={[styles.saveIcon, isSaved ? { tintColor: '#FF4757' } : { tintColor: '#FFF' }]}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isSaved]);

  const checkIngredientAvailable = (recipeIngName, pantryList) => {
    const normalizedRecipeName = normalizeName(recipeIngName);
    return pantryList.some(pantryItem => {
      const normalizedPantryName = normalizeName(pantryItem.name);
      return normalizedPantryName.includes(normalizedRecipeName) || normalizedRecipeName.includes(normalizedPantryName);
    });
  };

  const parseQuantity = (quantityString) => {
    if (!quantityString) return { qty: 1, unit: 'cái' };
    const regex = /^(\d+(?:[.,]\d+)?)\s*(.*)$/;
    const match = quantityString.toString().trim().match(regex);
    if (match) return { qty: parseFloat(match[1].replace(',', '.')), unit: match[2].trim() || 'cái' };
    return { qty: 1, unit: quantityString };
  };

  const addToShoppingList = async (missingItems) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const batch = writeBatch(db);
      missingItems.forEach((item) => {
        const { qty, unit } = parseQuantity(item[1]);
        const newDocRef = doc(collection(db, "shoppingList"));
        batch.set(newDocRef, {
          email: user.email,
          name: item[0].name,
          quantity: qty,
          unit: unit,
          status: 'pending',
          photo_url: item[0].photo_url || null,
          updatedAt: new Date()
        });
      });
      await batch.commit();
      Alert.alert("Thành công", `Đã thêm ${missingItems.length} món vào giỏ!`);
    } catch (error) { console.error(error); }
  };

  const handleStartCooking = async () => {
    const missing = ingredientsData.filter(ri => !checkIngredientAvailable(ri[0]?.name, pantryData));

    if (missing.length === 0) {
      // Đã đủ nguyên liệu -> Xin quyền thu âm
      try {
        const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();

        if (!granted) {
          Alert.alert("Cần cấp quyền", "Bạn cần cấp quyền Micro để điều khiển bằng giọng nói nhé!");
          return;
        }

        // Bật trạng thái đang nghe
        setCurrentStep(0);
        setIsListening(true);
         await startListening(); // bật mic
        Alert.alert("Sẵn sàng!", "Đang lắng nghe... Hãy ra lệnh ");

      } catch (error) {
        console.error("Lỗi xin quyền:", error);
      }
    } else {
      // Giữ nguyên logic khi thiếu nguyên liệu
      Alert.alert("Thiếu nguyên liệu", `Bạn thiếu: ${missing.map(m => m[0].name).join(", ")}`, [
        { text: "Hủy", style: "cancel" },
        { text: "Tiếp tục nấu", onPress: () => console.log("Cooking") },
        { text: "Thêm vào giỏ", onPress: () => addToShoppingList(missing) }
      ]);
    }
  };

  const renderHorizontalIngredient = (ingredientArr, index) => {
    const data = ingredientArr[0];
    const quantity = ingredientArr[1];
    if (!data) return null;
    const isAvailable = checkIngredientAvailable(data.name, pantryData);

    return (
      <TouchableOpacity key={index} style={customStyles.ingredientItemContainer} onPress={() => navigation.navigate("Ingredient", { ingredient: data })}>
        <View style={[
          customStyles.ingredientCircle,
          // VIỀN XANH LÁ KHI CÓ SẴN
          isAvailable ? { borderColor: '#32ba7c', borderWidth: 2 } : { borderColor: '#F0F0F0', borderWidth: 1 }
        ]}>
          <Image source={{ uri: data.photo_url || 'https://cdn-icons-png.flaticon.com/512/706/706164.png' }} style={customStyles.ingredientImage} />
          {isAvailable && (
            <View style={customStyles.statusBadge}>
              <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/190/190411.png' }} style={{ width: 10, height: 10 }} />
            </View>
          )}
        </View>
        <Text style={[customStyles.ingredientNameText, isAvailable && { fontWeight: '800', color: '#32ba7c' }]} numberOfLines={2}>{data.name}</Text>
        <Text style={customStyles.ingredientQtyText}>{quantity}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#000"
            colors={['#000']}
            progressBackgroundColor="#FFF"
          />
        }
      >
        <View style={styles.carouselWrapper}>
          <Carousel
            width={viewportWidth} height={viewportHeight * 0.45}
            data={(item.photosArray?.length > 0) ? item.photosArray : [item.photo_url]}
            renderItem={({ item }) => (
              <View style={styles.imageContainer}>
                <Image style={styles.image} source={{ uri: item }} resizeMode="cover" />
                <View style={styles.imageOverlay} />
              </View>
            )}
            onProgressChange={progress}
          />
          <View style={styles.paginationWrapper}>
            <Pagination.Basic progress={progress} data={(item.photosArray?.length > 0) ? item.photosArray : [item.photo_url]} dotStyle={styles.paginationDot} activeDotStyle={styles.paginationActiveDot} />
          </View>
        </View>

        <View style={styles.infoRecipeContainer}>
          <View style={styles.indicatorBar} />
          <Text style={styles.recipeTitle}>{item.title}</Text>
          <View style={styles.metaContainer}>
            <TouchableOpacity style={styles.categoryTag}><Text style={styles.categoryText}>{activeCategory?.name.toUpperCase() || "LOADING..."}</Text></TouchableOpacity>
            <View style={styles.metaItem}><Image source={require("../../../assets/icons/time.png")} style={styles.metaIcon} /><Text style={styles.metaText}>{item.time} phút</Text></View>
            <View style={[styles.metaItem, { marginLeft: 15 }]}><Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1250/1250689.png' }} style={styles.metaIcon} /><Text style={styles.metaText}>{item.servings || "2"} người</Text></View>
          </View>
          <View style={styles.divider} />

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Nguyên liệu cần thiết</Text>
            {isLoadingIngredients ? <ActivityIndicator size="small" color="#32ba7c" /> : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10, paddingRight: 20 }}>
                {ingredientsData.map((ing, index) => renderHorizontalIngredient(ing, index))}
              </ScrollView>
            )}
          </View>

          <View style={styles.sectionContainer}>
            {/* TIÊU ĐỀ VÀ NÚT NGHE TỔNG QUÁT */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.sectionTitle}>Cách làm</Text>
              {!isListening && (
                <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#131110', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 }}
                onPress={toggleReadAll}
              >
                {/* Phần Icon */}
                <Ionicons 
                  name={isReadingAll ? "pause" : "play"} 
                  size={14} 
                  color="#fbf7f5" 
                  style={{ marginRight: 5 }}
                />
                
                {/* Phần Chữ (Đã bỏ ký tự đặc biệt) */}
                <Text style={{ color: '#fbf7f5', fontSize: 12, fontWeight: 'bold' }}>
                  {isReadingAll ? 'Dừng nghe' : 'Nghe tổng quát'}
                </Text>
              </TouchableOpacity>
              )}
            </View>

            {/* HIỂN THỊ NỘI DUNG (Highlight khi đang nấu) */}
            {!isListening ? (
              // Trạng thái bình thường
              <Text style={styles.descriptionText}>
                {item.description || "Chưa có hướng dẫn."}
              </Text>
            ) : (
              // Trạng thái đang nấu: Tô đậm bước hiện tại, làm mờ bước khác
              recipeSteps.map((step, index) => (
                <Text 
                  key={index} 
                  style={[
                    styles.descriptionText, 
                    { marginBottom: 10 },
                    index === currentStep 
                      ? { color: '#000', fontWeight: 'bold', fontSize: 16 } // Bước đang đọc
                      : { color: '#B0B0B0', fontSize: 14 } // Bước đã qua hoặc chưa tới
                  ]}
                >
                  {step}
                </Text>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.stickyFooter, isListening && { backgroundColor: 'transparent' }]}>
        {!isListening ? (
          // NÚT BẮT ĐẦU NẤU NGAY (Như cũ)
          <TouchableOpacity style={styles.startCookingBtn} onPress={handleStartCooking}>
            <Text style={styles.startCookingText}>BẮT ĐẦU NẤU NGAY</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ 
            backgroundColor: '#131312', 
            borderRadius: 30, 
            paddingVertical: 15,
            paddingHorizontal: 20,
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            elevation: 5,
            shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 5
          }}>
            {/* Lùi bước */}
            <TouchableOpacity onPress={handlePrevStep} style={{ padding: 10 }}>
              <Text style={{ fontSize: 20, color: 'white' }}>⏮</Text>
            </TouchableOpacity>

            {/* Trạng thái thu âm (Mic) */}
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ color: 'white', fontSize: 10, fontStyle: 'italic' }} numberOfLines={1}>
                {transcript ? transcript : "Đang lắng nghe..."}
              </Text>
            </View>

            {/* Play / Pause âm thanh */}
           <TouchableOpacity onPress={toggleAudio} style={{ padding: 10 }}>
            <Ionicons 
              name={isAudioMuted ? "play" : "pause"} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>

            {/* Tiến bước */}
            <TouchableOpacity onPress={handleNextStep} style={{ padding: 10 }}>
              <Text style={{ fontSize: 20, color: 'white' }}>⏭</Text>
            </TouchableOpacity>

            {/* Dừng hẳn nấu ăn */}
            <TouchableOpacity onPress={stopCooking} style={{ padding: 10, marginLeft: 10, borderLeftWidth: 1, borderColor: '#fff' }}>
              <Text style={{ fontSize: 16, color: 'white', fontWeight: 'bold' }}>X</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const customStyles = StyleSheet.create({
  ingredientItemContainer: { alignItems: 'center', marginRight: 20, width: 75 },
  ingredientCircle: { width: 65, height: 65, borderRadius: 32.5, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', marginBottom: 8, elevation: 3, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 3 },
  ingredientImage: { width: 35, height: 35, resizeMode: 'contain' },
  ingredientNameText: { fontSize: 11, color: '#333', textAlign: 'center', height: 30 },
  ingredientQtyText: { fontSize: 10, color: '#888', marginTop: 2 },
  statusBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#32ba7c', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' }
});