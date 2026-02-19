import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, LogBox, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { onAuthStateChanged } from 'firebase/auth';

// --- CONFIG & FIREBASE ---
import { auth } from '../firebase/firebaseConfig';

// --- CONTEXT ---
import { useBadge } from '../contexts/BadgeContext';

// --- SCREENS ---
import LoginScreen from '../screens/Auth/Login/LoginScreen';
import RegisterScreen from '../screens/Auth/Register/RegisterScreen';
import HomeScreen from '../screens/Home/HomeScreen';
import CategoriesScreen from '../screens/Categories/CategoriesScreen';
import RecipesListScreen from '../screens/RecipesList/RecipesListScreen';
import RecipeScreen from '../screens/Recipe/RecipeScreen';
import CookAIScreen from '../screens/Recipe/CookAI';
import IngredientScreen from '../screens/Ingredient/IngredientScreen';
import SearchScreen from '../screens/Search/SearchScreen';
import PantryScreen from '../screens/Pantry/PantryScreen';
import ShoppingListScreen from '../screens/ShoppingList/ShoppingListScreen';
import ChatScreen from '../screens/Chat/ChatScreen';
import NotificationScreen from '../screens/Notification/NotificationScreen';
import DishNominationScreen from '../screens/DishNomination/DishNominationScreen';
import AccountScreen from '../screens/Account/AccountScreen';
import InfoAccountScreen from '../screens/Account/InfoAccountScreen';
import SavedDishesScreen from '../screens/Account/SavedDishesScreen';
import ContributedDishesScreen from '../screens/Account/ContributedDishesScreen';
import Personalization from '../screens/Account/Personalization';
import AdminDataManagement from '../screens/Manage/AdminDataManagement/AdminDataManagementScreen';
import DrawerContainer from '../screens/DrawerContainer/DrawerContainer';

// --- CUSTOM COMPONENTS ---
import MenuImage from '../components/MenuImage/MenuImage'; 

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// Component con để hiển thị nút Menu kèm số Badge
const MenuWithBadge = ({ navigation }) => {
  const count = useBadge(); 
  return (
    <View style={styles.menuWrapper}>
      <MenuImage 
        onPress={() => navigation.openDrawer()} 
        count={count} 
      />
    </View>
  );
};

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
      screenOptions={({ navigation }) => ({
        headerTitleStyle: { fontWeight: 'bold' },
        headerTitleAlign: 'center',
        headerBackTitleVisible: false,
        // Dòng này giúp tất cả các trang đều có nút Menu và Badge
        headerLeft: () => <MenuWithBadge navigation={navigation} />,
      })}
    >
      <Stack.Screen name='Home' component={HomeScreen} />
      <Stack.Screen name='Categories' component={CategoriesScreen} />
      <Stack.Screen name='RecipesList' component={RecipesListScreen} />
      <Stack.Screen name='Recipe' component={RecipeScreen} />
      <Stack.Screen name='CookAI' component={CookAIScreen} />
      <Stack.Screen name='Ingredient' component={IngredientScreen} />
      <Stack.Screen name='Search' component={SearchScreen} />
      <Stack.Screen name='Pantry' component={PantryScreen} />
      <Stack.Screen name='ShoppingList' component={ShoppingListScreen} />
      <Stack.Screen name='Chat' component={ChatScreen} />
      <Stack.Screen name='DishNomination' component={DishNominationScreen} />
      <Stack.Screen name='Notification' component={NotificationScreen} />
      <Stack.Screen name='Account' component={AccountScreen} />
      <Stack.Screen name='InfoAccount' component={InfoAccountScreen} />
      <Stack.Screen name='SavedDishes' component={SavedDishesScreen} />
      <Stack.Screen name='ContributedDishes' component={ContributedDishesScreen} />
      <Stack.Screen name='Personalization' component={Personalization} />
      <Stack.Screen name='AdminDataManagement' component={AdminDataManagement} />
    </Stack.Navigator>
  );
}

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

export default function AppContainer() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    LogBox.ignoreLogs(['Setting a timer', 'AsyncStorage has been extracted']);
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, [initializing]);

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const isAllowedToEnter = user && (user.emailVerified || user.email === 'admin@vibeplate.com');

  return (
    <NavigationContainer>
      {isAllowedToEnter ? <DrawerStack /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  menuWrapper: { marginLeft: 10 }
});