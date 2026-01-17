import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';

// --- IMPORT CÁC MÀN HÌNH ---
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

// --- IMPORT MỚI (AUTH & ACCOUNT) ---
import LoginScreen from '../screens/Login/LoginScreen';
import SignupScreen from '../screens/Signup/SignupScreen';
import AccountScreen from '../screens/Account/AccountScreen';

// --- IMPORT MÀN HÌNH GỢI Ý MỚI ---
// Đảm bảo đường dẫn file đúng với nơi bạn vừa tạo file RecipeSuggestionScreen.js
import RecipeSuggestionScreen from '../screens/RecipeSuggestion/RecipeSuggestionScreen'; 

const Stack = createStackNavigator();

// --- MAIN NAVIGATOR (Bên trong sau khi đăng nhập) ---
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
      
      {/* --- MÀN HÌNH GỢI Ý CÔNG THỨC (MỚI) --- */}
      <Stack.Screen 
        name='RecipeSuggestion' 
        component={RecipeSuggestionScreen} 
        options={{ headerShown: false }} // Ẩn header mặc định để dùng ảnh tràn viền đẹp hơn
      />

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
  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ headerShown: false }} 
        initialRouteName="Login"
      >
        {/* Nhóm Authentication (Chưa đăng nhập) */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        
        {/* Nhóm App chính (Đã đăng nhập) */}
        <Stack.Screen name="DrawerStack" component={DrawerStack} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

console.disableYellowBox = true;