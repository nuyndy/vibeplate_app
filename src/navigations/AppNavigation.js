import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useState, useEffect } from 'react'; // Thêm useState, useEffect
import { View, ActivityIndicator } from 'react-native'; // Thêm ActivityIndicator để hiện loading
import { onAuthStateChanged } from 'firebase/auth'; // Lắng nghe đăng nhập
import { auth } from '../firebase/firebaseConfig'; // Đường dẫn file firebase của bạn

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
import IngredientsDetailsScreen from '../screens/IngredientsDetails/IngredientsDetailsScreen';
import PantryScreen from '../screens/Pantry/PantryScreen';
import ChatScreen from '../screens/Chat/ChatScreen';
import DishNominationScreen from '../screens/DishNomination/DishNominationScreen';

// --- IMPORT MỚI (AUTH & ACCOUNT) ---
import AccountScreen from '../screens/Account/AccountScreen';
import InfoAccountScreen from '../screens/InfoAccount/InfoAccountScreen';
import SavedDishesScreen from '../screens/Account/SavedDishesScreen';
import ContributedDishesScreen from '../screens/Account/ContributedDishesScreen';
import ShoppingListScreen from '../screens/ShoppingList/ShoppingListScreen';

// --- IMPORT MÀN HÌNH GỢI Ý MỚI ---
// Đảm bảo đường dẫn file đúng với nơi bạn vừa tạo file RecipeSuggestionScreen.js
import RecipeSuggestionScreen from '../screens/RecipeSuggestion/RecipeSuggestionScreen'; 

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
      <Stack.Screen name='IngredientsDetails' component={IngredientsDetailsScreen} />
      <Stack.Screen name='Pantry' component={PantryScreen} />
      {/* --- Màn hình Chat AI --- */}
      <Stack.Screen name='Chat' component={ChatScreen} />
      
      {/* Màn hình Account */}
      <Stack.Screen name='Account' component={AccountScreen} />       
      <Stack.Screen name="SavedDishes" component={SavedDishesScreen} />
      <Stack.Screen name="ContributedDishes" component={ContributedDishesScreen} />
      <Stack.Screen name='InfoAccount' component={InfoAccountScreen} />
      <Stack.Screen name='ShoppingList' component={ShoppingListScreen} />
      
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