import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  StyleSheet, ActivityIndicator, SafeAreaView, StatusBar, Alert
} from "react-native";
import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import { 
  collection, query, where, getDocs, 
  doc, serverTimestamp, writeBatch 
} from 'firebase/firestore';
import { db, auth } from '../../firebase/firebaseConfig'; 
import { sendMessageToGemini } from '../Services/AIService'; 

export default function CookAI({ route, navigation }) {
  const { steps = [], title = "Món ăn", ingredients = [] } = route.params || {};
  const [currentStep, setCurrentStep] = useState(1);
  const [isListening, setIsListening] = useState(false);
  const [isAiAnswering, setIsAiAnswering] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false); 
  const [chatHistory, setChatHistory] = useState([]);

  const normalizedSteps = useMemo(() => {
    if (!Array.isArray(steps)) return [];

    return steps
      .flatMap(step => String(step ?? '').split(/(\\n|\r?\n)/g))
      .map(step => step.trim())
      .filter(step => step.length > 0);
  }, [steps]);

  const totalSteps = normalizedSteps.length;

  const chatScrollRef = useRef(null);
  const isMountedRef = useRef(true);
  const listenTimeoutRef = useRef(null);
  const isLastStep = totalSteps > 0 && currentStep === totalSteps;

  const safeStopListening = useCallback(async () => {
    try {
      await Voice.stop();
    } catch (error) {
      // ignore when voice not active
    } finally {
      if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
      if (isMountedRef.current) setIsListening(false);
    }
  }, []);

  const startListening = useCallback(async () => {
    if (isListening || isAiAnswering || isFinishing) return;

    try {
      const available = await Voice.isAvailable();
      if (!available) {
        Alert.alert('Thông báo', 'Thiết bị không hỗ trợ Voice Control.');
        return;
      }

      await Tts.stop();
      await Voice.start('vi-VN');

      if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
      listenTimeoutRef.current = setTimeout(() => {
        safeStopListening();
      }, 15000);
    } catch (error) {
      setIsListening(false);
      Alert.alert('Lỗi', 'Không thể bật micro, bạn thử lại nhé.');
    }
  }, [isListening, isAiAnswering, isFinishing, safeStopListening]);

  const handleFinishCooking = async () => {
    await safeStopListening();
    setIsFinishing(true);
    const userEmail = auth.currentUser?.email;

    if (!userEmail) {
      Alert.alert("Lỗi", "Vui lòng đăng nhập.");
      setIsFinishing(false);
      return;
    }

    try {
      console.log("=== BẮT ĐẦU CẬP NHẬT KHO DỮ LIỆU ===");
      const batch = writeBatch(db);

      const invRef = collection(db, 'inventory');
      const shopRef = collection(db, 'shoppingList');
      
      const [invSnapshot, shopSnapshot] = await Promise.all([
        getDocs(query(invRef, where('email', '==', userEmail))),
        getDocs(query(shopRef, where('email', '==', userEmail)))
      ]);

      ingredients.forEach((ingredient) => {
        const nameInRecipe = ingredient.name?.trim().toLowerCase();
        const usedQty = Number(ingredient.quantity || ingredient.amount) || 1; 

        // A. XỬ LÝ TỦ LẠNH
        invSnapshot.docs.forEach((itemDoc) => {
          const data = itemDoc.data();
          const nameInDb = data.name?.trim().toLowerCase();

          if (nameInDb && (nameInDb.includes(nameInRecipe) || nameInRecipe.includes(nameInDb))) {
            const currentQty = Number(data.quantity) || 0;
            const itemRef = doc(db, 'inventory', itemDoc.id);
            const newQty = currentQty - usedQty;

            if (newQty <= 0) {
              // XÓA HẲN nếu hết sạch hoặc âm
              batch.delete(itemRef);
              console.log(`🗑️ ĐÃ XÓA KHỎI TỦ: ${nameInDb} (Số lượng về 0)`);
            } else {
              // CHỈ TRỪ nếu vẫn còn dư
              batch.update(itemRef, {
                quantity: newQty,
                updatedAt: serverTimestamp()
              });
              console.log(`📉 ĐÃ TRỪ KHO: ${nameInDb} (Còn lại: ${newQty})`);
            }
          }
        });

        // B. XỬ LÝ GIỎ ĐI CHỢ
        shopSnapshot.docs.forEach((shopDoc) => {
          const nameInShop = shopDoc.data().name?.trim().toLowerCase();
          if (nameInShop && (nameInShop.includes(nameInRecipe) || nameInRecipe.includes(nameInShop))) {
            batch.delete(doc(db, 'shoppingList', shopDoc.id));
            console.log(`❌ ĐÃ DỌN GIỎ: ${nameInShop}`);
          }
        });
      });

      await batch.commit();
      
      speakAndAddChat(`Xong rồi! Tủ lạnh đã được dọn dẹp và trừ số lượng giúp bạn.`);
      
      Alert.alert(
        "✨ Hoàn tất xuất sắc!",
        "Tủ lạnh và giỏ hàng đã được dọn dẹp.",
        [{ text: "Tuyệt!", onPress: () => navigation.navigate("Home") }]
      );

    } catch (error) {
      console.error("Lỗi Batch commit:", error);
      Alert.alert("Lỗi", "Không thể cập nhật dữ liệu.");
    } finally {
      setIsFinishing(false);
    }
  };

  // --- LOGIC VOICE & VOICE EFFECTS ---
  useEffect(() => {
    navigation.setOptions({ headerShown: true, title: title.toUpperCase() });
    Tts.setDefaultLanguage('vi-VN');

    isMountedRef.current = true;
    Voice.onSpeechStart = () => isMountedRef.current && setIsListening(true);
    Voice.onSpeechEnd = () => isMountedRef.current && setIsListening(false);
    Voice.onSpeechError = () => isMountedRef.current && setIsListening(false);
    Voice.onSpeechResults = (e) => {
      const transcript = e?.value?.[0]?.trim().toLowerCase();
      if (transcript) handleLogic(transcript);
    };

    return () => {
      isMountedRef.current = false;
      if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
      Tts.stop();
      Voice.destroy().catch(() => null).finally(() => {
        Voice.removeAllListeners();
      });
    };
  }, [navigation, title]);
  useEffect(() => {
  if (totalSteps > 0) {
    const firstMessage = `Bắt đầu nấu món ${title}. Bước 1: ${normalizedSteps[0]}`;
    
    setChatHistory(prev => [
      ...prev,
      { role: 'assistant', content: firstMessage }
    ]);

    Tts.stop();
    Tts.speak(firstMessage);
  }
  }, [normalizedSteps, title, totalSteps]);
  const handleLogic = async (text) => {
    const newUserMsg = { role: 'user', content: text };
    const nextHistory = [...chatHistory, newUserMsg];
    setChatHistory(nextHistory);

    if (text.match(/(tiếp theo|xong rồi|ok rồi|qua bước|tiếp)/)) {
  setCurrentStep(prev => {
    const next = prev + 1;

    if (next <= totalSteps) {
      speakAndAddChat(`Bước ${next}: ${normalizedSteps[next - 1]}`);
      return next;
    } else {
      handleFinishCooking();
      return prev;
    }
  });
} else if (text.match(/(quay lại|lùi|bước trước)/)) {
  setCurrentStep(prev => {
    const back = prev - 1;
    if (back >= 1) {
      speakAndAddChat(`Quay lại bước ${back}: ${normalizedSteps[back - 1]}`);
      return back;
    }
    return prev;
  });
} else {
      setIsAiAnswering(true);
      try {
        const aiReply = await sendMessageToGemini(
        text,
        nextHistory.map(m => ({
          sender: m.role === 'user' ? 'user' : 'assistant',
          text: m.content
        })),
        {
          title,
          currentStep,
          stepContent: normalizedSteps[currentStep - 1] || ""
        }
      );
        speakAndAddChat(aiReply);
      } catch (e) { 
        speakAndAddChat("Lag tí, nói lại nhé!"); 
      } finally { 
        setIsAiAnswering(false); 
      }
    }
  };

  const speakAndAddChat = (text) => {
    setChatHistory(prev => [...prev, { role: 'assistant', content: text }]);
    Tts.stop(); Tts.speak(text);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.fixedHeaderArea}>
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${totalSteps ? (currentStep / totalSteps) * 100 : 0}%` }]} />
          </View>
          <View style={styles.progressTextRow}> 
            <Text style={styles.progressText}>TIẾN ĐỘ</Text>
            <Text style={styles.stepCounter}>{currentStep} / {totalSteps}</Text>
          </View>
        </View>
        <View style={styles.stepBox}>
          <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>BƯỚC {currentStep}</Text></View>
          <Text style={styles.stepContent}>{normalizedSteps[currentStep - 1] || "Đang chuẩn bị bước..."}</Text>
        </View>
      </View>

      <ScrollView 
        ref={chatScrollRef} 
        style={styles.scrollArea} 
        contentContainerStyle={styles.chatContainer} 
        onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
      >
        <View style={styles.chatWrapper}>
          {chatHistory.map((item, index) => (
            <View key={index} style={[styles.msg, item.role === 'user' ? styles.msgUser : styles.msgAi]}>
              {item.role === 'assistant' && <Text style={styles.aiName}>Trợ lý VibePlate</Text>}
              <Text style={item.role === 'user' ? styles.txtUser : styles.txtAi}>{item.content}</Text>
            </View>
          ))}
          {isAiAnswering && <ActivityIndicator color="#000" style={{marginTop: 10}} />}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {isLastStep ? (
          <TouchableOpacity style={styles.finishBtnContainer} onPress={handleFinishCooking} disabled={isFinishing}>
            <View style={styles.finishBtn}>
              {isFinishing ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Text style={styles.finishBtnText}>HOÀN TẤT NẤU ĂN</Text>
                  <Text style={styles.finishBtnSubtext}>Dọn tủ lạnh và giỏ hàng</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={() => handleLogic("quay lại")} style={styles.navCircle}><Text>⏮</Text></TouchableOpacity>
            <TouchableOpacity 
              activeOpacity={0.9} 
              style={styles.micMain} 
              disabled={isListening || isAiAnswering || isFinishing}
              onPress={startListening}
            >
              <View style={[styles.micInner, isListening && styles.micActive]}>
                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/709/709682.png' }} style={styles.micImg} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleLogic("tiếp theo")} style={styles.navCircle}><Text>⏭</Text></TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    fixedHeaderArea: { backgroundColor: '#FFF', borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 5, paddingBottom: 20 },
    progressSection: { paddingHorizontal: 25, paddingTop: 15 },
    progressBar: { height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#000' },
    progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    progressText: { fontSize: 10, fontWeight: '700', color: '#BBB' },
    stepCounter: { fontSize: 10, fontWeight: '800', color: '#000' },
    stepBox: { marginHorizontal: 20, marginTop: 15, padding: 20, backgroundColor: '#1A1A1A', borderRadius: 20 },
    stepBadge: { alignSelf: 'flex-start', backgroundColor: '#333', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
    stepBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
    stepContent: { fontSize: 17, fontWeight: '600', color: '#FFF', lineHeight: 24 },
    scrollArea: { flex: 1 },
    chatContainer: { paddingBottom: 30 },
    chatWrapper: { paddingHorizontal: 20, paddingTop: 20 },
    aiName: { fontSize: 10, fontWeight: '800', color: '#999', marginBottom: 4, marginLeft: 5 },
    msg: { marginVertical: 8, padding: 15, borderRadius: 20, maxWidth: '85%' },
    msgUser: { alignSelf: 'flex-end', backgroundColor: '#000', borderBottomRightRadius: 4 },
    msgAi: { alignSelf: 'flex-start', backgroundColor: '#FFF', borderBottomLeftRadius: 4, elevation: 1 },
    txtUser: { color: '#FFF', fontSize: 14 },
    txtAi: { color: '#333', fontSize: 14, fontWeight: '500' },
    footer: { paddingBottom: 40, paddingTop: 20 },
    buttonRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    micMain: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
    micInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    micActive: { backgroundColor: '#FF3B30' },
    micImg: { width: 24, height: 24, tintColor: '#FFF' },
    navCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2 },
    finishBtnContainer: { marginHorizontal: 25 },
    finishBtn: { backgroundColor: '#000', height: 70, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 8 },
    finishBtnText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
    finishBtnSubtext: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4 }
});