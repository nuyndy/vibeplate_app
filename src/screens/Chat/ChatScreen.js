import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Image,
  StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView,
  Animated, ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MenuImage from '../../components/MenuImage/MenuImage';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { generatePersonalizedRecipeJSON, getAppRecipes, getUserFridge } from '../Services/AIService';

let sessionChatHistory = [
  { id: '1', type: 'text', text: 'Chào bạn! 👋 Mình sẽ trả 2 tin nhắn: (1) món đã tìm thấy + đồ trong tủ, (2) công thức đầy đủ + hình ảnh. ✨', sender: 'ai' }
];

const normalizeText = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const DetailedRecipeCard = ({ recipeData }) => {
  if (!recipeData) return null;
  const fallbackPhoto = Array.isArray(recipeData.photosArray) && recipeData.photosArray.length > 0
    ? recipeData.photosArray[0]
    : '';
  const cardPhoto = recipeData.photo_url || fallbackPhoto;
  const hasPhoto = cardPhoto && cardPhoto.trim() !== '' && cardPhoto !== 'none';

  return (
    <View style={styles.recipeCard}>
      {hasPhoto && (
        <Image source={{ uri: cardPhoto }} style={styles.cardImage} resizeMode="cover" />
      )}
      <View style={styles.cardContent}>
        <Text style={styles.cardRecipeTitle}>{recipeData.title}</Text>
        <View style={styles.cardMetaInfo}>
          <Text style={styles.cardMetaText}>⏱ {recipeData.time} phút</Text>
          <Text style={styles.cardMetaText}>👤 {recipeData.servings} người</Text>
        </View>
        <Text style={styles.cardSectionTitle}>🛒 Nguyên liệu:</Text>
        {recipeData.ingredients?.map((ing, index) => (
          <Text key={`${recipeData.title}-ing-${index}`} style={styles.cardIngredientText}>• {ing.name} - {ing.amount}</Text>
        ))}
        <Text style={styles.cardSectionTitle}>👨‍🍳 Cách làm:</Text>
        <Text style={styles.cardDescriptionText}>{recipeData.description}</Text>
      </View>
    </View>
  );
};

export default function ChatScreen({ navigation }) {
  const flatListRef = useRef();
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState(sessionChatHistory);

  useEffect(() => {
    sessionChatHistory = messages;
  }, [messages]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Trợ lý VibePlate',
      headerLeft: () => (<MenuImage onPress={() => navigation.openDrawer()} />),
    });
  }, [navigation]);

  const findExistingRecipe = async (userText) => {
    const allRecipes = await getAppRecipes();
    const normalizedInput = normalizeText(userText);
    if (!normalizedInput) return null;

    return allRecipes.find((recipe) => {
      const title = normalizeText(recipe.title);
      const keywords = (recipe.keywords || []).map(normalizeText);
      return title.includes(normalizedInput)
        || normalizedInput.includes(title)
        || keywords.some((key) => key && (normalizedInput.includes(key) || key.includes(normalizedInput)));
    }) || null;
  };

  const buildRecipeDescription = (recipe) => {
    if (Array.isArray(recipe.steps) && recipe.steps.length) {
      return recipe.steps.map((step, index) => `${index + 1}. ${step}`).join('\n');
    }
    return String(recipe.description || '').trim();
  };

  const buildRecipePayloadText = (recipe, isExistingRecipe) => {
    const ingredientsLines = (recipe.ingredients || []).map((item, index) => {
      if (isExistingRecipe) {
        return `${index}. ingredientId: ${item.ingredientId ?? 'none'}, quantity: "${item.quantity || item.amount || 'vừa đủ'}"`;
      }
      return `- ${item.name}: ${item.amount}`;
    }).join('\n');

    const details = [
      `Tên món: ${recipe.title}`,
      `recipeId: ${recipe.recipeId || 'none'}`,
      `categoryId: ${recipe.categoryId ?? 'none'}`,
      `categoryIds: ${Array.isArray(recipe.categoryIds) && recipe.categoryIds.length ? recipe.categoryIds.join(', ') : 'none'}`,
      `Thời gian nấu: ${recipe.time} phút`,
      `Số lượng ăn: ${recipe.servings} người`,
      'Nguyên liệu:',
      ingredientsLines || '- Đang cập nhật',
      'Description:',
      String(recipe.description || buildRecipeDescription(recipe) || 'Đang cập nhật')
    ];

    if (Array.isArray(recipe.keywords) && recipe.keywords.length) {
      details.push(`keywords: ${recipe.keywords.join(', ')}`);
    }

    if (recipe.photo_url) {
      details.push(`photo_url: ${recipe.photo_url}`);
    }

    if (Array.isArray(recipe.photosArray) && recipe.photosArray.length) {
      details.push(`photosArray: ${recipe.photosArray.join(' | ')}`);
    }

    return details.join('\n');
  };

  const sendMessage = async () => {
    const userText = inputText.trim();
    if (!userText) return;

    const userMsg = { id: Date.now().toString(), type: 'text', text: userText, sender: 'user' };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const savedMood = (await AsyncStorage.getItem('user_current_mood')) || 'neutral';
      const [fridgeItems, existingRecipe] = await Promise.all([
        getUserFridge(),
        findExistingRecipe(userText),
      ]);

      const recipeJson = existingRecipe || await generatePersonalizedRecipeJSON({
        userRequest: userText,
        mood: savedMood,
      });

      if (!recipeJson?.title) throw new Error('no_recipe');

      const fridgeLine = fridgeItems.length
        ? fridgeItems.slice(0, 6).join(', ')
        : 'Hiện chưa có dữ liệu tủ lạnh.';

      const msgFound = {
        id: `${Date.now()}-found`,
        type: 'text',
        text: `${existingRecipe ? 'Mình đã tìm thấy món có sẵn trong recipes 🎯' : 'Mình đã tìm thấy món phù hợp ✅'}\nMón: ${recipeJson.title}\nTrong tủ lạnh hiện có: ${fridgeLine}`,
        sender: 'ai'
      };

      const detailedSteps = buildRecipeDescription(recipeJson);
      const fullRecipeText = buildRecipePayloadText(recipeJson, Boolean(existingRecipe));

      const textMsg = { id: `${Date.now()}-detail`, type: 'text', text: fullRecipeText, sender: 'ai' };
      const cardMsg = {
        id: `${Date.now()}-card`,
        type: 'recipe_card',
        recipeData: {
          ...recipeJson,
          photo_url: recipeJson.photo_url || (Array.isArray(recipeJson.photosArray) ? recipeJson.photosArray[0] : ''),
          description: detailedSteps,
        },
        sender: 'ai'
      };

      setMessages((prev) => [...prev, msgFound, textMsg, cardMsg]);
    } catch (_error) {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        type: 'text',
        text: 'Mình chưa lấy được công thức lúc này, bạn thử lại giúp mình nhé.',
        sender: 'ai'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderItem = ({ item }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.rowReverse : styles.rowLeft]}>
        {!isUser && <View style={styles.avatarContainer}><Ionicons name="sparkles-outline" size={16} color="black" /></View>}
        {item.type === 'text' ? (
          <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
            <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>{item.text}</Text>
          </View>
        ) : (
          <View style={{ width: '85%', marginTop: 4 }}>
            <DetailedRecipeCard recipeData={item.recipeData} />
          </View>
        )}
      </View>
    );
  };

  return (
    <ImageBackground
      source={require('../../../assets/chatBG.png')}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(255, 254, 254, 0.8)' }}>
        <SafeAreaView style={styles.container}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          {isTyping && (<CookingLoader />)}

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
            <View style={styles.inputWrapper}>
              <View style={styles.inputContainer}>
                <TextInput style={styles.input} placeholder="Bạn muốn ăn gì? 🍲" value={inputText} onChangeText={setInputText} multiline />
                <TouchableOpacity onPress={sendMessage} style={[styles.sendButton, { opacity: inputText.trim() ? 1 : 0.5 }]} disabled={!inputText.trim() || isTyping}>
                  <Ionicons name="arrow-up" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

const CookingLoader = () => {
  const dot1 = React.useRef(new Animated.Value(0)).current;
  const dot2 = React.useRef(new Animated.Value(0)).current;
  const dot3 = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const bounceDot = (anim, delay) => {
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: -6, duration: 400, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 400, useNativeDriver: true }),
          ])
        ).start();
      }, delay);
    };

    bounceDot(dot1, 0);
    bounceDot(dot2, 150);
    bounceDot(dot3, 300);
  }, []);

  return (
    <View style={styles.loaderContainer}>
      <Image
        source={require('../../../assets/icons/cooking.png')}
        style={styles.loaderImage}
        resizeMode="contain"
      />
      <View style={styles.dotsWrapper}>
        <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }] }]} />
        <Animated.View style={[styles.dot, { transform: [{ translateY: dot2 }] }]} />
        <Animated.View style={[styles.dot, { transform: [{ translateY: dot3 }] }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  listContent: { paddingHorizontal: 16, paddingVertical: 20 },
  messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' },
  rowReverse: { flexDirection: 'row-reverse' },
  rowLeft: { flexDirection: 'row' },
  avatarContainer: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 8, marginTop: 4 },
  bubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  userBubble: { backgroundColor: '#000000', borderBottomRightRadius: 4 },
  userText: { color: '#ffffff', fontSize: 15 },
  aiBubble: { backgroundColor: '#F4F4F5', borderBottomLeftRadius: 4 },
  aiText: { color: '#000000', fontSize: 15 },
  inputWrapper: { padding: 10, borderTopWidth: 1, borderColor: '#ffffff' },
  inputContainer: { flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 30, paddingHorizontal: 6, paddingVertical: 6, alignItems: 'center', borderColor: '#e9e6e6', borderWidth: 1 },
  input: { flex: 1, paddingHorizontal: 15, fontSize: 16, maxHeight: 100 },
  sendButton: { backgroundColor: '#000000', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  recipeCard: { backgroundColor: '#fff', borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#E4E4E7', marginBottom: 5 },
  cardImage: { width: '100%', height: 180 },
  cardContent: { padding: 16 },
  cardRecipeTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: '#18181B' },
  cardMetaInfo: { flexDirection: 'row', marginBottom: 12 },
  cardMetaText: { fontSize: 14, color: '#71717A', marginRight: 20 },
  cardSectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 12, marginBottom: 8, color: '#27272A' },
  cardIngredientText: { fontSize: 14, color: '#3F3F46', marginBottom: 4, paddingLeft: 4 },
  cardDescriptionText: { fontSize: 14, color: '#3F3F46', lineHeight: 22 },
  loaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginLeft: 15,
    marginTop: 10,
  },
  loaderImage: {
    width: 30,
    height: 30,
    marginRight: 8,
  },
  dotsWrapper: {
    flexDirection: 'row',
    marginLeft: 4,
    height: 10,
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#000000',
    marginHorizontal: 2,
  },
});
