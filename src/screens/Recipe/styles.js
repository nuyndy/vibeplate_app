import { StyleSheet, Dimensions } from 'react-native';

const { width: viewportWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flex: 1,
  },
  
  // --- HEADER BUTTONS ---
  backButtonWrapper: {
    marginLeft: 10,
    marginTop: 5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 50,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonWrapper: {
    marginRight: 10,
    marginTop: 5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 50,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  saveIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },

  // --- CAROUSEL ---
  carouselWrapper: {
    position: 'relative',
  },
  imageContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  paginationWrapper: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  },
  paginationDot: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  paginationActiveDot: {
    backgroundColor: '#fff',
    width: 20,
    height: 8,
    borderRadius: 4,
  },

  // --- BODY INFO ---
  infoRecipeContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: -30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 15,
    minHeight: 500,
  },
  indicatorBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    alignSelf: 'center',
    marginBottom: 20,
  },
  recipeTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1D26',
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 32,
  },

  // --- META INFO ---
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  categoryTag: {
    backgroundColor: '#E8F7F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 15,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
    tintColor: '#A0A5B9',
    resizeMode: 'contain'
  },
  metaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#F5F6FA',
    marginVertical: 10,
  },

  // --- INGREDIENTS LIST (Checklist Style) ---
  ingredientsBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 15,
    marginTop: 10,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Tên bên trái, Số lượng bên phải
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  iconWrapper: {
    width: 30,
    height: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0F8ED',
  },
  checkIcon: {
    width: 12,
    height: 12,
    tintColor: '#000000',
  },
  ingredientIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  ingredientName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginRight: 10,
  },
  ingredientQuantity: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
    textAlign: 'right',
  },

  // --- DESCRIPTION ---
  sectionContainer: {
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1D26',
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 16,
    color: '#555',
    lineHeight: 26,
    textAlign: 'justify',
  },

  // --- FOOTER ---
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#F5F6FA',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 20, 
  },
  startCookingBtn: {
    backgroundColor: '#000000',
    borderRadius: 50,
    height: 55,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  startCookingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 10,
  },
  btnIcon: {
    width: 20,
    height: 20,
    tintColor: '#fff',
  }
});

export default styles;