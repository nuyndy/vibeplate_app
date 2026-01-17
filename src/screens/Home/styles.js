import { StyleSheet, Dimensions } from 'react-native';
import { RecipeCard } from '../../AppStyles';

const { width: viewportWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: RecipeCard.container,
  photo: RecipeCard.photo,
  title: RecipeCard.title,
  category: RecipeCard.category,

  headerContainer: {
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 20,
    marginBottom: 10,
  },
  
  // --- BANNER STYLES ---
  bannerWrapper: {
    width: viewportWidth, // Bắt buộc bằng chiều rộng màn hình
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerContainer: {
    width: viewportWidth - 40, 
    height: 200,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    elevation: 5, 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  bannerPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', 
    padding: 15,
  },
  bannerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  }
});

export default styles;