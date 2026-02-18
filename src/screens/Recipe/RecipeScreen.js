import React, { useLayoutEffect, useRef, useState, useEffect, useCallback, useMemo } from "react";
import { 
  View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator, 
  StyleSheet, StatusBar, Alert, Dimensions, RefreshControl
} from "react-native";
import { 
  collection, query, where, onSnapshot, doc, getDoc, setDoc, 
  deleteDoc, serverTimestamp, writeBatch 
} from "firebase/firestore";
import { useSharedValue } from 'react-native-reanimated';
import Carousel, { Pagination } from 'react-native-reanimated-carousel';
import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';

import { getCategoryById, getAllIngredients } from "../../data/MockDataAPI"; 
import BackButton from "../../components/BackButton/BackButton";
import styles from "./styles"; 
import { auth, db } from '../../firebase/firebaseConfig';
import { useIsFocused, useFocusEffect } from "@react-navigation/native";

const { width: viewportWidth, height: viewportHeight } = Dimensions.get("window");

const OPENROUTER_API_KEY = "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"; 
const globalCaloriesCache = {};

export default function RecipeScreen(props) {
  const { navigation, route } = props;
  
  // 🛠 FIX 1: Tránh lỗi undefined làm crash ngầm app khi mở màn hình
  const item = route.params?.item || {}; 

  // --- STATES ---
  const [currentStep, setCurrentStepState] = useState(1);
  const stepRef = useRef(1); 
  const [recipeSteps, setRecipeStepsState] = useState([]);
  const recipeStepsRef = useRef([]);

  const setCurrentStep = (val) => {
    setCurrentStepState(val);
    stepRef.current = val;
  };

  const setRecipeSteps = (val) => {
    setRecipeStepsState(val);
    recipeStepsRef.current = val;
  };

  useEffect(() => {
    if (item?.description) {
      const steps = item.description.split('\n').filter(s => s.trim() !== '');
      setRecipeSteps(steps);
    }
  }, [item?.description]);

  const [activeCategory, setActiveCategory] = useState(null);
  const [ingredientsData, setIngredientsData] = useState([]); 
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(true);
  const [isSaved, setIsSaved] = useState(false); 
  const [pantryData, setPantryData] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleBuyMissingIngredients = async (missingIngredientsList) => {
    try {
      const batch = writeBatch(db);
      missingIngredientsList.forEach((ingItem) => { 
        const docRef = doc(collection(db, 'shoppingList'));
        batch.set(docRef, {
          email: auth.currentUser?.email || '',
          name: ingItem.name,
          quantity: ingItem.quantity,
          unit: ingItem.unit,
          status: 'pending',
          type: 'missing_from_recipe', 
          sourceRecipe: item?.title || 'Unknown', 
          updatedAt: serverTimestamp()
        });
      });
      
    await batch.commit();
    Alert.alert("Thành công", "Đã thêm các nguyên liệu còn thiếu vào giỏ hàng!", [{ text: "OK" }]); 
  } catch (error) {
    Alert.alert("Lỗi", "Không thể thêm vào giỏ hàng");
  }
};

  // 🔥 CALORIES & VOICE STATES
  const [aiCalories, setAiCalories] = useState(null);
  const [isCalculatingCalories, setIsCalculatingCalories] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAiAnswering, setIsAiAnswering] = useState(false);
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  const progress = useSharedValue(0);
  const chatScrollRef = useRef(null); 
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);
  
  const normalizeName = (name) => name ? name.toLowerCase().trim() : "";

  // 🛠 FIX 2: Bọc mảng data của Carousel vào useMemo. 
  // Nếu không, mỗi lần app render sẽ tạo 1 mảng mới -> Carousel tính toán lại -> Treo JS Thread (Reloading vô tận).
  const carouselData = useMemo(() => {
    if (item?.photosArray && item.photosArray.length > 0) return item.photosArray;
    if (item?.photo_url) return [item.photo_url];
    return [];
  }, [item?.photosArray, item?.photo_url]);

  // --- 1. DATA LOADING ---
  const loadAllData = useCallback(async () => {
    if (!item?.id && !item?.recipeId) return;
    try {
      const [catData, ingredientsDetail] = await Promise.all([
        item.categoryId ? getCategoryById(item.categoryId) : Promise.resolve(null),
        item.ingredients ? getAllIngredients(item.ingredients) : Promise.resolve([])
      ]);

      setActiveCategory(catData);
      setIngredientsData(ingredientsDetail);

      const user = auth.currentUser;
      if (user) {
        const docId = `${user.uid}_${item.recipeId || item.id}`; 
        const docSnap = await getDoc(doc(db, "favorites", docId));
        setIsSaved(docSnap.exists());
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setIsLoadingIngredients(false);
      setIsRefreshing(false);
    }
  }, [item?.id, item?.recipeId, item?.categoryId, item?.ingredients]);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  useEffect(() => {
    const user = auth.currentUser;
    if (user && user.email) {
      const q = query(collection(db, "inventory"), where("email", "==", user.email));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPantryData(items);
      });
      return () => unsubscribe();
    }
  }, []);

  // --- 2. AI CALORIES ---
  const calculateCaloriesWithAI = useCallback(async () => {
    const currentId = item?.recipeId || item?.id;
    if (!currentId) return;

    if (globalCaloriesCache[currentId]) {
      setAiCalories(globalCaloriesCache[currentId]);
      setIsCalculatingCalories(false);
      return;
    }

    if (!ingredientsData || ingredientsData.length === 0) return;
    
    setIsCalculatingCalories(true);
    try {
      const ingredientsListStr = ingredientsData.map(ingArray => {
        const data = ingArray[0];
        const qty = ingArray[1];
        return `${qty} ${data?.name || ''}`;
      }).join(", ");

      const prompt = `Tính tổng lượng Calo (Kcal) xấp xỉ cho danh sách nguyên liệu nấu ăn sau: ${ingredientsListStr}.\nTuyệt đối chỉ trả về 1 con số nguyên duy nhất (là lượng Kcal cho 1 người ăn).\nKhông thêm chữ Kcal, không giải thích, không dấu câu.`;
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:8081",
          "X-Title": "RecipeApp",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          models: ["google/gemma-2-9b-it:free", "mistralai/mistral-7b-instruct:free", "openrouter/free"],
          temperature: 0, 
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content?.trim();
      
      const match = aiResponse?.match(/\d+/);
      if (isMounted.current) {
        if (match) {
          setAiCalories(match[0]);
          globalCaloriesCache[currentId] = match[0]; 
        } else {
          setAiCalories("--");
          globalCaloriesCache[currentId] = "--"; 
        }
      }
    } catch (error) {
      if (isMounted.current) setAiCalories("--");
    } finally {
      if (isMounted.current) setIsCalculatingCalories(false);
    }
    // 🛠 FIX 3: Thêm Optional Chaining (dấu ?) vào dependencies để tránh crash
  }, [ingredientsData, item?.servings, item?.recipeId, item?.id]); 

  useEffect(() => {
    if (ingredientsData.length > 0) {
      calculateCaloriesWithAI();
    }
  }, [ingredientsData, calculateCaloriesWithAI]);

  // --- 3. VOICE ASSISTANT SETUP ---
  useEffect(() => {
    Tts.setDefaultLanguage('vi-VN');
    
    Voice.onSpeechStart = () => setIsListening(true);
    Voice.onSpeechEnd = () => setIsListening(false);
    Voice.onSpeechError = (e) => {
      setIsListening(false);
      console.log("Lỗi mic:", e.error);
    };

    Voice.onSpeechResults = (e) => {
      if (e.value && e.value.length > 0) {
        const spokenText = e.value[0];
        const isCommand = handleVoiceCommand(spokenText);
        if (!isCommand) {
           handleAskAIAssistant(spokenText);
        }
      }
    };

    return () => {
      Voice.destroy().then(() => Voice.removeAllListeners());
      Tts.stop();
    };
  }, []); 

  const startListening = async () => {
    try {
      Tts.stop();
      await Voice.start('vi-VN');
    } catch (e) {
      console.error("Lỗi bật mic:", e);
    }
  };

  const handleAskAIAssistant = async (question) => {
    if (!question || question.trim() === "") return;

    setIsAiAnswering(true);
    try { Tts.stop(); } catch(e){}

    try {
      if (isMounted.current) {
        setChatHistory(prev => [...prev, { role: "user", content: question }]);
      }

      const current = stepRef.current;
      const stepContent = recipeStepsRef.current[current - 1] || "Chưa có nội dung bước này.";
      
      let data = null;
      let isSuccess = false;

      for (let i = 0; i < 3; i++) {
        try {
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${OPENROUTER_API_KEY}`, 
              "HTTP-Referer": "https://vibeplate.app",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              models: ["meta-llama/llama-3-8b-instruct:free", "google/gemma-2-9b-it:free", "openrouter/free"],
              temperature: 0.4, 
              max_tokens: 150,
              messages: [
                {
                  role: "system",
                  content: `Bạn là một đầu bếp ảo đang nấu ăn cùng người dùng.
                  Món ăn: ${item?.title || 'Đang nấu'}.
                  Bước hiện tại (Bước ${current}): ${stepContent}.
                  QUY TẮC:
                  - Chỉ trả lời dựa trên món ăn, bước hiện tại và nội dung bước này.
                  - Thân thiện, tự nhiên như người đứng cạnh trong bếp. Ngắn gọn 1-3 câu.
                  - Thuần tiếng Việt, KHÔNG markdown, KHÔNG ký tự đặc biệt.
                  - Tuyệt đối KHÔNG xuống dòng giữa các câu.
                  - Nếu hỏi ngoài lề nấu ăn, CHỈ đáp: "Tôi đang tập trung hướng dẫn nấu món này, bạn cần giúp gì trong bếp không?"`
                },
                { role: "user", content: question }
              ]
            })
          });

          if (response.ok) {
            const responseData = await response.json();
            if (responseData?.choices?.[0]?.message?.content) {
              data = responseData;
              isSuccess = true;
              break; 
            }
          }
        } catch (err) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (!isSuccess || !data) throw new Error("API lỗi");

      let rawAiResponse = data.choices[0].message.content;
      
      let cleanResponse = rawAiResponse
        .replace(/^(Đầu bếp|Chef|AI|Bot|Trợ lý)(\s*):/gi, '') 
        .replace(/[*#_~`\[\]"']/g, '') 
        .replace(/\n+/g, '. ') 
        .replace(/\.\s*\./g, '.') 
        .trim();

      if (cleanResponse.length < 5 || cleanResponse.toLowerCase() === "đầu bếp") {
          cleanResponse = "Mạng đang hơi chập chờn, bạn hỏi lại giúp mình nhé?";
      }

      if (isMounted.current) {
        setChatHistory(prev => [...prev, { role: "assistant", content: cleanResponse }]);
        Tts.setDefaultRate(0.5);
        Tts.speak(cleanResponse);
      }

    } catch (error) {
      if (isMounted.current) {
        const errStr = "Xin lỗi, mình chưa nghe rõ.";
        setChatHistory(prev => [...prev, { role: "assistant", content: errStr }]);
        Tts.speak(errStr);
      }
    } finally {
      if (isMounted.current) setIsAiAnswering(false);
    }
  };

  const handleSaveRecipe = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để lưu món ăn!");
      return;
    }

    const currentRecipeId = item?.recipeId || item?.id;
    const docId = `${user.uid}_${currentRecipeId}`;
    const docRef = doc(db, "favorites", docId);

    try {
      if (isSaved) {
        await deleteDoc(docRef);
        setIsSaved(false);
      } else {
        await setDoc(docRef, {
          ...item, 
          recipeId: currentRecipeId,
          email: user.email, 
          savedAt: serverTimestamp()
        });
        setIsSaved(true);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể lưu món ăn, vui lòng thử lại!");
    }
  };

  const checkIngredientAvailable = (recipeIngName, pantryList) => {
    const normalizedRecipeName = normalizeName(recipeIngName);
    return pantryList.some(pantryItem => {
        const normalizedPantryName = normalizeName(pantryItem.name);
        return normalizedPantryName.includes(normalizedRecipeName) || normalizedRecipeName.includes(normalizedPantryName);
    });
  };

  const handleStartCooking = () => {
    const missing = ingredientsData.filter(ri => !checkIngredientAvailable(ri[0]?.name, pantryData));
    if (missing.length === 0) {
      setIsCookingMode(true);
      setCurrentStep(1); 
      
      const step1Content = recipeStepsRef.current.length > 0 ? recipeStepsRef.current[0] : "Chưa có dữ liệu bước làm.";
      const msg = `Bây giờ là bước 1. ${step1Content}`;
      
      setChatHistory([{ role: "assistant", content: msg }]);
      Tts.speak(msg);
    }else {
      Alert.alert(
        "Thiếu nguyên liệu", 
        `Bạn đang thiếu: ${missing.map(m => m[0]?.name).join(", ")}.\n\nBạn có muốn thêm các nguyên liệu này vào Giỏ đi chợ không?`,
        [
          { text: "Bỏ qua", style: "cancel" },
          { 
            text: "Thêm vào giỏ", 
            onPress: () => {
              const missingListToBuy = missing.map(m => {
                const data = m[0];
                const quantityStr = m[1] || "";
                
                const numMatch = quantityStr.match(/(\d+)/);
                const amount = numMatch ? parseFloat(numMatch[0]) : 1;
                const unit = quantityStr.replace(/[0-9\s]/g, '') || 'kg';

                return {
                  name: data?.name || "",
                  quantity: amount,
                  unit: unit
                };
              });

              handleBuyMissingIngredients(missingListToBuy);
            } 
          }
        ]
      );
    }
  };

  const renderHorizontalIngredient = (ingredientArr, index) => {
    const data = ingredientArr[0]; 
    const quantity = ingredientArr[1]; 
    if (!data) return null;
    const isAvailable = checkIngredientAvailable(data.name, pantryData);

    return (
        <View key={index} style={customStyles.ingredientItemContainer}>
            <TouchableOpacity onPress={() => navigation.navigate("Ingredient", { ingredient: data })}>
                <View style={[
                    customStyles.ingredientCircle, 
                    isAvailable ? { borderColor: '#32ba7c', borderWidth: 2 } : { borderColor: '#F0F0F0', borderWidth: 1 }
                ]}>
                    <Image source={{ uri: data.photo_url || 'https://cdn-icons-png.flaticon.com/512/706/706164.png' }} style={customStyles.ingredientImage} />
                    {isAvailable && (
                        <View style={customStyles.statusBadge}>
                             <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/190/190411.png'}} style={{width: 10, height: 10, tintColor: 'white'}} />
                        </View>
                    )}
                </View>
            </TouchableOpacity>
            <Text style={[customStyles.ingredientNameText, isAvailable && { fontWeight: '800', color: '#32ba7c' }]} numberOfLines={2}>{data.name}</Text>
            <Text style={customStyles.ingredientQtyText}>{quantity}</Text>
        </View>
    );
  };

  const handleVoiceCommand = (text) => {
    const lowerText = text.toLowerCase().trim();

    if (lowerText.match(/(xong rồi|ok rồi|tiếp theo|bước tiếp|qua bước|rồi đó|tiếp)/)) {
      Tts.stop();
      const current = stepRef.current;
      const steps = recipeStepsRef.current;

      if (current < steps.length) {
        const nextStep = current + 1;
        setCurrentStep(nextStep);
        const msg = `Bây giờ là bước ${nextStep}. ${steps[nextStep - 1]}`;
        setChatHistory(prev => [...prev, { role: "assistant", content: msg }]);
        Tts.speak(msg);
      } else {
        const msg = "Bạn đã hoàn thành tất cả các bước. Chúc ngon miệng nhé!";
        setChatHistory(prev => [...prev, { role: "assistant", content: msg }]);
        Tts.speak(msg);
      }
      return true; 
    }

    if (lowerText.match(/(lùi|quay lại|back|bước trước)/)) {
      Tts.stop();
      const current = stepRef.current;
      const steps = recipeStepsRef.current;

      if (current > 1) {
        const prevStep = current - 1;
        setCurrentStep(prevStep);
        const msg = `Quay lại bước ${prevStep}. ${steps[prevStep - 1]}`;
        setChatHistory(prev => [...prev, { role: "assistant", content: msg }]);
        Tts.speak(msg);
      } else {
        Tts.speak("Đây đã là bước đầu tiên rồi.");
      }
      return true;
    }

    if (lowerText.match(/(dừng|thoát)/)) {
      handleExitCookingMode();
      return true;
    }
    return false; 
  };

  const handleExitCookingMode = () => {
    try {
      Tts.stop();       
      Voice.stop();     
    } catch (e) {}
    
    setIsCookingMode(false); 
    setIsListening(false);
    setChatHistory([]); 
  };

  useFocusEffect(
    useCallback(() => {
      return () => {
        Tts.stop(); 
        Voice.stop();
        setIsListening(false);
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: isCookingMode ? 300 : 100 }} 
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadAllData(); }} tintColor="#000" />}
      >
        <View style={styles.carouselWrapper}>
          <Carousel
            width={viewportWidth} height={viewportHeight * 0.45}
            // 🛠 FIX 4: Truyền carouselData đã memoize vào đây
            data={carouselData}
            // 🛠 FIX 5: Đổi tên biến "item" ở đây thành "imageUrl" để không bị trùng với "item" của món ăn ở trên cùng
            renderItem={({ item: imageUrl }) => (
                <View style={styles.imageContainer}>
                  <Image style={styles.image} source={{ uri: imageUrl }} resizeMode="cover" />
                  <View style={styles.imageOverlay} />
                </View>
            )}
            onProgressChange={(_, absoluteProgress) => {
              progress.value = absoluteProgress;
            }}
          />
          <View style={styles.paginationWrapper}>
            <Pagination.Basic progress={progress} data={carouselData} dotStyle={styles.paginationDot} activeDotStyle={styles.paginationActiveDot} />
          </View>
        </View>

        <View style={styles.infoRecipeContainer}>
          <View style={styles.indicatorBar} />
          <Text style={styles.recipeTitle}>{item?.title || 'Đang tải...'}</Text>
          
          <View style={styles.metaContainer}>
            <TouchableOpacity style={styles.categoryTag}><Text style={styles.categoryText}>{activeCategory?.name.toUpperCase() || "LOADING..."}</Text></TouchableOpacity>
            
            <View style={styles.metaItem}>
              <Text style={styles.metaText}>{item?.time || '0'} phút</Text>
            </View>
            
            <View style={[styles.metaItem, { marginLeft: 15 }]}>
              <Text style={styles.metaText}>{item?.servings || "2"} người</Text>
            </View>

            <View style={[styles.metaItem, { marginLeft: 15 }]}>
              <Text style={{ fontSize: 14, marginRight: 4 }}>🔥</Text>
              {isCalculatingCalories ? (
                <ActivityIndicator size="small" color="#ff9800" />
              ) : (
                <Text style={styles.metaText}>{aiCalories ? `${aiCalories} Kcal` : '-- Kcal'}</Text>
              )}
            </View>
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
            <Text style={styles.sectionTitle}>Cách làm</Text>
            <Text style={styles.descriptionText}>{item?.description || "Chưa có hướng dẫn."}</Text>
          </View>
        </View>
      </ScrollView>

      {!isCookingMode && (
        <View style={styles.stickyFooter}>
            <TouchableOpacity style={styles.startCookingBtn} onPress={handleStartCooking}>
                <Text style={styles.startCookingText}>Bắt đầu nấu ngay</Text>
            </TouchableOpacity>
        </View>
      )}

      {isCookingMode && (
         <View style={customStyles.chatOverlay}>
             <TouchableOpacity 
                style={customStyles.closeButton} 
                onPress={handleExitCookingMode}
             >
                <Text style={{color: '#999', fontWeight: 'bold', fontSize: 16}}>✕</Text>
             </TouchableOpacity>
             <ScrollView 
                ref={chatScrollRef}
                onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 15 }}
             >
                 {chatHistory.map((msg, idx) => (
                     <View key={idx} style={[customStyles.chatBubble, msg.role === 'user' ? customStyles.userBubble : customStyles.aiBubble]}>
                         <Text style={msg.role === 'user' ? customStyles.userText : customStyles.aiText}>
                            {msg.role === 'user' ? '🗣 Bạn: ' : '👩‍🍳 Đầu bếp: '}{msg.content}
                         </Text>
                     </View>
                 ))}
                 {isAiAnswering && (
                     <View style={[customStyles.chatBubble, customStyles.aiBubble, { width: 60, alignItems: 'center' }]}>
                         <ActivityIndicator size="small" color="#32ba7c" />
                     </View>
                 )}
             </ScrollView>
         </View>
      )}

      {isCookingMode && (
         <TouchableOpacity 
             style={[
                 customStyles.floatingVoiceBtn, 
                 isListening && { backgroundColor: '#ff4757' },
                 isAiAnswering && { opacity: 0.6 } 
             ]} 
             onPress={startListening}
             disabled={isAiAnswering} 
         >
             {isListening ? (
                 <Image 
                     source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3177/3177430.png' }} 
                     style={{ width: 24, height: 24, tintColor: '#FFF' }} 
                 />
             ) : (
                 <Image 
                     source={{ uri: 'https://cdn-icons-png.flaticon.com/512/709/709682.png' }} 
                     style={{ width: 24, height: 24, tintColor: '#FFF' }} 
                 />
             )}
         </TouchableOpacity>
      )}
    </View>
  );
}

const customStyles = StyleSheet.create({
    ingredientItemContainer: { alignItems: 'center', marginRight: 20, width: 75 },
    ingredientCircle: { width: 65, height: 65, borderRadius: 32.5, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', marginBottom: 8, elevation: 3, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 3 },
    ingredientImage: { width: 35, height: 35, resizeMode: 'contain' },
    ingredientNameText: { fontSize: 11, color: '#333', textAlign: 'center', height: 30 },
    ingredientQtyText: { fontSize: 10, color: '#888', marginTop: 2 },
    statusBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#32ba7c', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
    
    chatOverlay: {
        position: 'absolute',
        bottom: 105, 
        left: 20,
        right: 20,
        height: 220, 
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        zIndex: 998,
        borderWidth: 1,
        borderColor: '#EFEFEF'
    },
    chatBubble: {
        maxWidth: '85%',
        padding: 12,
        borderRadius: 15,
        marginBottom: 10,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#32ba7c',
        borderBottomRightRadius: 2,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#f1f2f6',
        borderBottomLeftRadius: 2,
    },
    userText: { color: '#fff', fontSize: 14, fontWeight: '500', lineHeight: 20 },
    aiText: { color: '#2f3542', fontSize: 14, fontWeight: '400', lineHeight: 20 },
    closeButton: {
        position: 'absolute',
        top: 8,
        right: 10,
        zIndex: 1000,
        backgroundColor: '#f1f2f6',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2
    },
    floatingVoiceBtn: {
        position: 'absolute',
        bottom: 30, 
        alignSelf: 'center', 
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#32ba7c',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        zIndex: 999,
    }
});
