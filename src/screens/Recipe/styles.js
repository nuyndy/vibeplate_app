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
  // Sử dụng màu trắng đục nhẹ để nổi bật trên ảnh
  backButtonWrapper: {
    marginLeft: 15,
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 50,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#706d6d',
  },
  saveButtonWrapper: {
    marginRight: 15,
    marginTop: 10,
    backgroundColor: 'rgba(156, 150, 150, 0.9)',
    borderRadius: 50,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    borderWidth: 0.5,
    borderColor: '#666363',
  },
  saveIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },

  // --- CAROUSEL ---
  carouselWrapper: {
    position: 'relative',
  },
  imageContainer: {
    flex: 1,
    backgroundColor: '#f9f9f9',
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
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.05)', // Overlay rất nhạt
  },
  paginationWrapper: {
    position: 'absolute',
    bottom: 45,
    alignSelf: 'center',
  },
  paginationDot: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  paginationActiveDot: {
    backgroundColor: '#fff',
    width: 16,
    height: 6,
    borderRadius: 3,
  },

  // --- BODY INFO ---
  infoRecipeContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: -35,
    borderTopLeftRadius: 40, // Bo tròn mạnh cực hiện đại
    borderTopRightRadius: 40,
    paddingHorizontal: 25,
    paddingTop: 15,
    minHeight: 500,
  },
  indicatorBar: {
    width: 35,
    height: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 25,
  },
  recipeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: 0.5,
  },

  // --- META INFO ---
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  categoryTag: {
    backgroundColor: '#000', // Tag đen chữ trắng
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 15,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    width: 14,
    height: 14,
    marginRight: 6,
    tintColor: '#000',
  },
  metaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  divider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginVertical: 15,
  },

  // --- INGREDIENTS BOX (Nền trắng, vòng tròn trắng) ---
  ingredientsBox: {
    backgroundColor: '#fff', 
    borderRadius: 20,
    marginTop: 5,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9F9F9',
  },
  iconWrapper: {
    width: 45,
    height: 45,
    backgroundColor: '#fff', // HÌNH TRÒN TRẮNG
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    // Hiệu ứng đổ bóng nhẹ để nổi bật trên nền trắng
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  ingredientIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  ingredientName: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    fontWeight: '600',
  },
  ingredientQuantity: {
    fontSize: 14,
    color: '#888',
    fontWeight: '700',
  },

  // --- DESCRIPTION ---
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  descriptionText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 24,
    textAlign: 'left',
  },

  // --- FOOTER ---
  stickyFooter: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 25,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  startCookingBtn: {
    backgroundColor: '#000', // Nút đen hoàn toàn
    borderRadius: 20,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  startCookingText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  }
});

export default styles;