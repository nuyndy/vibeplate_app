import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const ITEM_MARGIN = 20;
const ITEM_WIDTH = (width - ITEM_MARGIN * 3) / 2;

export default StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  listContent: {
    paddingHorizontal: ITEM_MARGIN,
    paddingTop: 20,
  },
  container: {
    width: ITEM_WIDTH,
    marginBottom: 25,
    marginRight: ITEM_MARGIN,
    alignItems: 'center', // Căn giữa nội dung trong Card
  },
  imageWrapper: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH, // Tạo hình vuông hoàn hảo
    backgroundColor: '#F9F9F9',
    borderRadius: 30, // Bo tròn mạnh
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0', // Viền cực nhẹ để tách ảnh trắng với nền trắng
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    marginTop: 12,
    width: '100%',
    paddingHorizontal: 5,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    lineHeight: 20,
  }
});