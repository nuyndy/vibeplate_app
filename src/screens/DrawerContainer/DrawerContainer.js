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
          // Tạm thời dùng lại icon category
          source={require("../../../assets/icons/pantry.png")} 
          onPress={() => {
            navigation.navigate("Main", { screen: "Pantry" });
            navigation.closeDrawer();
          }}
        />
        <MenuButton
          title="TRỢ LÝ AI"
          // Tạm thời dùng icon search, hoặc bạn có thể tải icon 'chat.png' về assets
          source={require("../../../assets/icons/assistant.png")}
          onPress={() => {
            navigation.navigate("Main", { screen: "Chat" });
            navigation.closeDrawer();
          }}
        />
        
        {/* --- NÚT TÀI KHOẢN MỚI --- */}
        <MenuButton
          title="TÀI KHOẢN"
          // Mình dùng tạm icon home để không bị lỗi, bạn có thể thay bằng icon user.png nếu có
          source={require("../../../assets/icons/user.png")} 
          onPress={() => {
            // Chuyển hướng đến màn hình Account đã khai báo trong MainNavigator
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
    closeDrawer: PropTypes.func.isRequired,
  }),
};
