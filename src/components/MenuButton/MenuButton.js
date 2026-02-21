import { TouchableHighlight, Image, Text, View, StyleSheet } from "react-native";
import PropTypes from "prop-types";
import styles from "./styles";

export default function MenuButton(props) {
  // Thêm 'badgeCount' vào các props nhận được
  const { title, onPress, source, badgeCount } = props;

  return (
    <TouchableHighlight 
      onPress={onPress} 
      style={styles.btnClickContain} 
      underlayColor="rgba(128, 128, 128, 0.1)"
    >
      <View style={styles.btnContainer}>
        <View>
          <Image source={source} style={styles.btnIcon} />
          {/* Nếu có badgeCount lớn hơn 0 thì hiển thị số đè lên icon */}
          {badgeCount > 0 && (
            <View style={localStyles.badge}>
              <Text style={localStyles.badgeText}>
                {badgeCount > 9 ? '9+' : badgeCount}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.btnText}>{title}</Text>
      </View>
    </TouchableHighlight>
  );
}

// Thêm style cục bộ cho Badge
const localStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -5,
    top: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
    zIndex: 10,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '900',
    lineHeight: 10,
  }
});

MenuButton.propTypes = {
  onPress: PropTypes.func,
  source: PropTypes.number,
  title: PropTypes.string,
  badgeCount: PropTypes.number,
};