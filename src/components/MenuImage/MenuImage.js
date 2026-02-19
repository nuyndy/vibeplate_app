import React from "react";
import { TouchableOpacity, Image, View, Text, StyleSheet } from "react-native";

export default function MenuImage(props) {
  const { count, onPress } = props;

  return (
    <TouchableOpacity style={localStyles.headerButtonContainer} onPress={onPress}>
      <View style={localStyles.iconContainer}>
        <Image 
          style={localStyles.headerButtonImage} 
          source={require("../../../assets/icons/menu.png")} 
        />
        {/* Chỉ hiện số nếu count lớn hơn 0 */}
        {count > 0 && (
          <View style={localStyles.badge}>
            <Text style={localStyles.badgeText}>{count > 9 ? '9+' : count}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const localStyles = StyleSheet.create({
  headerButtonContainer: {
    padding: 15,
  },
  iconContainer: {
    position: 'relative',
  },
  headerButtonImage: {
    width: 25,
    height: 25,
    resizeMode: 'contain',
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
    zIndex: 999,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
  }
});