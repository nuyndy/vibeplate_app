import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Text, SafeAreaView } from 'react-native';

// Import style
import { styles, COLORS } from './style';

// Import các component con
import AdminUsers from '../AdminUsers/AdminUsersScreen';
import AdminCategories from '../AdminCategories/AdminCategoriesScreen';
import AdminIngredients from '../AdminIngredients/AdminIngredientsScreen';
import AdminRecipes from '../AdminRecipes/AdminRecipesScreen';
import AdminSuggestedRecipes from '../AdminSuggestedRecipes/AdminSuggestedRecipesScreen';

// --- TABS GỐC ---
const TABS = {
  USERS: 'users',
  CATEGORIES: 'categories',
  INGREDIENTS: 'ingredients',
  RECIPES: 'recipes',
  SUGGESTED: 'suggested_recipes'
};

// --- LABEL TIẾNG VIỆT ---
const TAB_LABELS = {
  users: "Người dùng",
  categories: "Danh mục",
  ingredients: "Nguyên liệu",
  recipes: "Công thức",
  suggested_recipes: "Đề cử"
};

export default function AdminDataManagement({ navigation, route }) {
  // Mặc định ban đầu là Categories
  const [currentTab, setCurrentTab] = useState(TABS.CATEGORIES);

  // --- XỬ LÝ ĐIỀU HƯỚNG TỪ THÔNG BÁO ---
  useEffect(() => {
    // Nếu có params 'tab' truyền từ navigation.navigate('AdminDataManagement', { tab: '...' })
    if (route.params?.tab) {
      setCurrentTab(route.params.tab);
      
      // Tùy chọn: Xóa params sau khi đã nhận để tránh nhảy tab khi quay lại trang này lần sau
      navigation.setParams({ tab: undefined });
    }
  }, [route.params?.tab]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "QUẢN LÝ " + TAB_LABELS[currentTab].toUpperCase(),
      headerTitleAlign: "center"
    });
  }, [navigation, currentTab]);

  const renderTabContent = () => {
    switch (currentTab) {
      case TABS.USERS:
        return <AdminUsers navigation={navigation} />;
      case TABS.CATEGORIES:
        return <AdminCategories navigation={navigation} />;
      case TABS.INGREDIENTS:
        return <AdminIngredients navigation={navigation} />;
      case TABS.RECIPES:
        return <AdminRecipes navigation={navigation} />;
      case TABS.SUGGESTED:
        return <AdminSuggestedRecipes navigation={navigation} />;
      default:
        return <AdminCategories navigation={navigation} />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={styles.tabContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 10 }}
        >
          {Object.values(TABS).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab, 
                currentTab === tab && styles.activeTab
              ]}
              onPress={() => setCurrentTab(tab)}
            >
              <Text style={[
                styles.tabText, 
                currentTab === tab && styles.activeTabText
              ]}>
                {TAB_LABELS[tab]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Phần nội dung của Tab đã chọn */}
      <View style={{ flex: 1 }}>
        {renderTabContent()}
      </View>
    </SafeAreaView>
  );
}