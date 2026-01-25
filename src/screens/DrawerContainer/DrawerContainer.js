// src/screens/DrawerContainer/DrawerContainer.js

import React from "react";
import { View } from "react-native";
import PropTypes from "prop-types";
import styles from "./styles";
import MenuButton from "../../components/MenuButton/MenuButton";

export default function DrawerContainer(props) {
  const { navigation } = props;
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
            navigation.closeDrawer();
          }}
        />
        <MenuButton
          title="TỦ BẾP"
          source={require("../../../assets/icons/pantry.png")} 
          onPress={() => {
            navigation.navigate("Main", { screen: "Pantry" });
            navigation.closeDrawer();
          }}
        />
        <MenuButton
          title="ĐI CHỢ"
          source={require("../../../assets/icons/cart.png")} 
          onPress={() => {
            navigation.navigate("Main", { screen: "ShoppingList" });
            navigation.closeDrawer();
          }}
        />
        <MenuButton
          title="TRỢ LÝ AI"
          source={require("../../../assets/icons/assistant.png")}
          onPress={() => {
            navigation.navigate("Main", { screen: "Chat" });
            navigation.closeDrawer();
          }}
        />
        
        {/* --- NÚT THÔNG BÁO (Thêm vào đây, TRƯỚC trang Tài khoản) --- */}
        <MenuButton
          title="THÔNG BÁO"
          // Lưu ý: Bạn nên tìm icon cái chuông và đổi tên thành notification.png nhé
          // Tạm thời mình dùng icon search để không bị lỗi ảnh
          source={require("../../../assets/icons/notification.png")} 
          onPress={() => {
            // Lệnh này bảo app chuyển sang màn hình tên là "Notification"
            navigation.navigate("Main", { screen: "Notification" });
            navigation.closeDrawer();
          }}
        />

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

DrawerContainer.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
  }),
};