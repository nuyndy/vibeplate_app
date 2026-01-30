import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useState, useEffect } from 'react'; 
import { View, ActivityIndicator } from 'react-native'; 
import { onAuthStateChanged } from 'firebase/auth'; 
import { auth } from '../firebase/firebaseConfig'; 
import NotificationScreen from '../screens/Notification/NotificationScreen';

// Import các màn hình 
import LoginScreen from '../screens/Auth/Login/LoginScreen';     
import RegisterScreen from '../screens/Auth/Register/RegisterScreen'; 
import HomeScreen from '../screens/Home/HomeScreen';
import CategoriesScreen from '../screens/Categories/CategoriesScreen';
import RecipeScreen from '../screens/Recipe/RecipeScreen';
import RecipesListScreen from '../screens/RecipesList/RecipesListScreen';
import DrawerContainer from '../screens/DrawerContainer/DrawerContainer';
import IngredientScreen from '../screens/Ingredient/IngredientScreen';
import SearchScreen from '../screens/Search/SearchScreen';
import PantryScreen from '../screens/Pantry/PantryScreen';
import ChatScreen from '../screens/Chat/ChatScreen';
import DishNominationScreen from '../screens/DishNomination/DishNominationScreen';

// --- IMPORT MỚI (AUTH & ACCOUNT) ---
import AccountScreen from '../screens/Account/AccountScreen';
import InfoAccountScreen from '../screens/Account/InfoAccountScreen';
import SavedDishesScreen from '../screens/Account/SavedDishesScreen';
import ContributedDishesScreen from '../screens/Account/ContributedDishesScreen';
import ShoppingListScreen from '../screens/ShoppingList/ShoppingListScreen';
import Personalization from '../screens/Account/Personalization';

//quản lý
import AdminDataManagement from '../screens/Manage/AdminDataManagement/AdminDataManagementScreen';

const Stack = createStackNavigator();

// --- MAIN NAVIGATOR (Bên trong sau khi đăng nhập) ---
function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name='Login' component={LoginScreen} />
      <Stack.Screen name='Register' component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTitleStyle: { fontWeight: 'bold' },
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen name='Home' component={HomeScreen} />
      <Stack.Screen name='Categories' component={CategoriesScreen}/>
      <Stack.Screen name='Recipe' component={RecipeScreen}/>
      <Stack.Screen name='RecipesList' component={RecipesListScreen} />
      <Stack.Screen name='Ingredient' component={IngredientScreen} />
      <Stack.Screen name='Search' component={SearchScreen} />
      <Stack.Screen name='Pantry' component={PantryScreen} />
      
      {/* --- Màn hình Chat AI --- */}
      <Stack.Screen name='Chat' component={ChatScreen} />
      
      {/* Màn hình Account */}
      <Stack.Screen name='Account' component={AccountScreen} />       
      <Stack.Screen name="SavedDishes" component={SavedDishesScreen} />
      <Stack.Screen name="ContributedDishes" component={ContributedDishesScreen} />
      <Stack.Screen name='InfoAccount' component={InfoAccountScreen} />
      <Stack.Screen name='ShoppingList' component={ShoppingListScreen} />
      <Stack.Screen name='Personalization' component={Personalization} />

      {/* 🔥 ĐÃ THÊM: Màn hình Thông Báo 🔥 */}
      <Stack.Screen name='Notification' component={NotificationScreen} />
      
      {/* --- MÀN HÌNH GỢI Ý CÔNG THỨC (MỚI) --- */}
      <Stack.Screen name='DishNomination' component={DishNominationScreen} />

      {/* Quản lý */}
      <Stack.Screen name='AdminDataManagement' component={AdminDataManagement} />
      
    </Stack.Navigator>
  );
}

const Drawer = createDrawerNavigator();

function DrawerStack() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: { width: 250 },
      }}
      drawerContent={({navigation}) => <DrawerContainer navigation={navigation}/>}
    >
      <Drawer.Screen name='Main' component={MainNavigator} />
    </Drawer.Navigator>
  );
}

// --- APP CONTAINER (Luồng đi tổng) ---
export default function AppContainer() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

  if (initializing) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#000000"/>
      </View>
    );
  }
  
  
  const isAllowedToEnter = user && (user.emailVerified || user.email === 'admin@vibeplate.com');
  return (
    <NavigationContainer>
      {/* Chỉ cho vào DrawerStack (Home) nếu đã Verify hoặc là Admin */}
      { isAllowedToEnter ? <DrawerStack/> : <AuthNavigator/> }
    </NavigationContainer>
  );
}

console.disableYellowBox = true;