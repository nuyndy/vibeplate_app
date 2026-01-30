import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
// Tính toán kích thước ô sản phẩm
const CONTAINER_WIDTH = (width - 40) / 2; 

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 10,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15
  },
  imageContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#eee',
      marginBottom: 10,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f9f9f9'
  },
  photoIngredient: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  ingredientInfo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center'
  },
  // --- STYLE CHO MÓN ĂN (GRID ITEM) ---
  container: {
    width: CONTAINER_WIDTH,
    margin: 5,
    marginBottom: 15,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    borderWidth: 0.5,
    borderColor: '#ddd',
    paddingBottom: 10,
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  photo: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    marginBottom: 5,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#444',
    paddingHorizontal: 5,
    marginTop: 5,
  },
  category: {
    fontSize: 12,
    color: '#888',
    marginTop: 3,
  }
});

export default styles;