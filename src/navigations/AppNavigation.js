import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { onAuthStateChanged } from 'firebase/auth';

// --- CONFIG & FIREBASE ---
import { auth } from '../firebase/firebaseConfig';

// --- SCREENS ---
// Auth Flow
import LoginScreen from '../screens/Auth/Login/LoginScreen';
import RegisterScreen from '../screens/Auth/Register/RegisterScreen';

// Core Features
import HomeScreen from '../screens/Home/HomeScreen';
import CategoriesScreen from '../screens/Categories/CategoriesScreen';
import RecipesListScreen from '../screens/RecipesList/RecipesListScreen';
import RecipeScreen from '../screens/Recipe/RecipeScreen';
import IngredientScreen from '../screens/Ingredient/IngredientScreen';
import SearchScreen from '../screens/Search/SearchScreen';
import PantryScreen from '../screens/Pantry/PantryScreen';
import ShoppingListScreen from '../screens/ShoppingList/ShoppingListScreen';

// AI & Notifications
import ChatScreen from '../screens/Chat/ChatScreen';
import NotificationScreen from '../screens/Notification/NotificationScreen';
import DishNominationScreen from '../screens/DishNomination/DishNominationScreen';

// Account & Personalization
import AccountScreen from '../screens/Account/AccountScreen';
import InfoAccountScreen from '../screens/Account/InfoAccountScreen';
import SavedDishesScreen from '../screens/Account/SavedDishesScreen';
import ContributedDishesScreen from '../screens/Account/ContributedDishesScreen';
import Personalization from '../screens/Account/Personalization';

// Management & Custom UI
import AdminDataManagement from '../screens/Manage/AdminDataManagement/AdminDataManagementScreen';
import DrawerContainer from '../screens/DrawerContainer/DrawerContainer';

// --- NAVIGATORS ---
const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// 1. Luồng dành cho khách (Chưa đăng nhập)
function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name='Login' component={LoginScreen} />
      <Stack.Screen name='Register' component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// 2. Luồng chính sau khi đăng nhập thành công
function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTitleStyle: { fontWeight: 'bold' },
        headerTitleAlign: 'center',
        headerBackTitleVisible: false, // Ẩn chữ 'Back' để giao diện sạch hơn
      }}
    >
      {/* --- Nhóm 1: Khám phá & Tìm kiếm --- */}
      <Stack.Screen name='Home' component={HomeScreen} />
      <Stack.Screen name='Categories' component={CategoriesScreen} />
      <Stack.Screen name='RecipesList' component={RecipesListScreen} />
      <Stack.Screen name='Recipe' component={RecipeScreen} />
      <Stack.Screen name='Ingredient' component={IngredientScreen} />
      <Stack.Screen name='Search' component={SearchScreen} />
      
      {/* --- Nhóm 2: Tiện ích & AI --- */}
      <Stack.Screen name='Pantry' component={PantryScreen} />
      <Stack.Screen name='ShoppingList' component={ShoppingListScreen} />
      <Stack.Screen name='Chat' component={ChatScreen} />
      <Stack.Screen name='DishNomination' component={DishNominationScreen} />
      <Stack.Screen name='Notification' component={NotificationScreen} />

      {/* --- Nhóm 3: Tài khoản & Cá nhân hóa --- */}
      <Stack.Screen name='Account' component={AccountScreen} />
      <Stack.Screen name='InfoAccount' component={InfoAccountScreen} />
      <Stack.Screen name='SavedDishes' component={SavedDishesScreen} />
      <Stack.Screen name='ContributedDishes' component={ContributedDishesScreen} />
      <Stack.Screen name='Personalization' component={Personalization} />

      {/* --- Nhóm 4: Quản trị --- */}
      <Stack.Screen name='AdminDataManagement' component={AdminDataManagement} />
    </Stack.Navigator>
  );
}

// 3. Drawer Navigator (Bao bọc luồng chính)
function DrawerStack() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: { width: 250 },
      }}
      drawerContent={({ navigation }) => <DrawerContainer navigation={navigation} />}
    >
      <Drawer.Screen name='Main' component={MainNavigator} />
    </Drawer.Navigator>
  );
}

// --- APP CONTAINER ---
export default function AppContainer() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Tắt cảnh báo phiền phức
    LogBox.ignoreLogs(['Setting a timer', 'AsyncStorage has been extracted']);
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, [initializing]);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  // Điều kiện vào App: Đã verify email HOẶC là tài khoản Admin đặc biệt
  const isAllowedToEnter = user && (user.emailVerified || user.email === 'admin@vibeplate.com');

  return (
    <NavigationContainer>
      {isAllowedToEnter ? <DrawerStack /> : <AuthNavigator />}
    </NavigationContainer>
  );
}