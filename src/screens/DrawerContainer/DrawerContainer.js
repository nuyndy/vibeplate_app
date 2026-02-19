import React from "react";
import { View, Text, StyleSheet } from "react-native";
import PropTypes from "prop-types";
import styles from "./styles";
import MenuButton from "../../components/MenuButton/MenuButton";

// --- IMPORT CONTEXT ---
import { useBadge } from "../../contexts/BadgeContext"; 

export default function DrawerContainer(props) {
  const { navigation } = props;
  
  const totalBadge = useBadge();

  return (
    <View style={styles.content}>
      <View style={styles.container}>
        <MenuButton
          title="TRANG CHỦ"
          source={require("../../../assets/icons/home.png")}
          onPress={() => {
            navigation.navigate("Main", { screen: "Home" });
            navigation.closeDrawer();
          }}
        />
        <MenuButton
          title="DANH MỤC"
          source={require("../../../assets/icons/category.png")}
          onPress={() => {
            navigation.navigate("Main", { screen: "Categories" });
            navigation.closeDrawer();
          }}
        />
        <MenuButton
          title="TÌM KIẾM"
          source={require("../../../assets/icons/search.png")}
          onPress={() => {
            navigation.navigate("Main", { screen: "Search" });
          }}
        />
        <MenuButton
          title="TỦ BẾP"
          source={require("../../../assets/icons/pantry.png")} 
          onPress={() => {
            navigation.navigate("Main", { screen: "Pantry" });
          }}
        />
        <MenuButton
          title="ĐI CHỢ"
          source={require("../../../assets/icons/cart.png")} 
          onPress={() => {
            navigation.navigate("Main", { screen: "ShoppingList" });
          }}
        />
        <MenuButton
          title="TRỢ LÝ AI"
          source={require("../../../assets/icons/assistant.png")}
          onPress={() => {
            navigation.navigate("Main", { screen: "Chat" });
          }}
        />
        
        {/* --- NÚT THÔNG BÁO DÙNG CHUNG SỐ VỚI HEADER --- */}
        <View style={localStyles.badgeWrapper}>
          <MenuButton
            title="THÔNG BÁO"
            source={require("../../../assets/icons/notification.png")} 
            onPress={() => {
              navigation.navigate("Main", { screen: "Notification" });
              navigation.closeDrawer();
            }}
          />
          {totalBadge > 0 && (
            <View style={localStyles.badge}>
              <Text style={localStyles.badgeText}>{totalBadge > 9 ? '9+' : totalBadge}</Text>
            </View>
          )}
        </View>

        <MenuButton
          title="TÀI KHOẢN"
          source={require("../../../assets/icons/user.png")} 
          onPress={() => {
            navigation.navigate("Main", { screen: "Account" });
            navigation.closeDrawer();
          }}
        />
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  badgeWrapper: {
    position: 'relative',
    width: '100%',
  },
  badge: {
    position: 'absolute',
    left: 15,              
    top: 9,               
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
    zIndex: 999,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '900',
  }
});

DrawerContainer.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
    closeDrawer: PropTypes.func.isRequired,
  }),
};