import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width } = Dimensions.get('window');

export const COLORS = {
  primary: '#1b1d1c',       // Màu đen chủ đạo
  secondary: '#FF9800',     // Màu cam nhấn
  bg: '#F8F9FD',            // Màu nền app
  card: '#FFFFFF',          // Màu nền thẻ
  textMain: '#1A1D26',      // Màu chữ chính
  textSub: '#888888',       // Màu chữ phụ
  danger: '#FF6B6B',        // Màu đỏ
  inputBg: '#F5F6FA',       // Màu nền ô nhập liệu
  border: '#EEEEEE',        // Màu đường viền
};

export const styles = StyleSheet.create({
  // =========================
  // 1. LAYOUT CHUNG
  // =========================
  container: { 
    flex: 1, 
    backgroundColor: COLORS.bg,
  },
  header: { 
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary },
  sectionHeader: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginTop: 25, 
    marginBottom: 10, 
    color: COLORS.primary 
  },
  label: { fontWeight: '600', marginBottom: 6, color: COLORS.textMain, marginTop: 15 },

  // =========================
  // 2. CARD & BOX (DANH SÁCH NGOÀI)
  // =========================
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    marginHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  cardContent: { flex: 1, marginLeft: 15 },
  cardImage: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#eee' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cardAuthor: { fontSize: 13, color: '#666', marginTop: 2 },
  statusText: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  arrowContainer: { marginLeft: 10 },
  arrowIcon: { fontSize: 24, color: '#ccc' },

  // =========================
  // 3. ALBUM ẢNH & DANH MỤC (MỚI BỔ SUNG)
  // =========================
  albumContainer: { 
    flexDirection: 'row', 
    marginVertical: 10 
  },
  albumImageWrapper: { 
    marginRight: 12 
  },
  albumImage: { 
    width: 80, 
    height: 80, 
    borderRadius: 12, 
    backgroundColor: '#eee',
    resizeMode: 'cover'
  },
  metaBadge: { 
    backgroundColor: '#f0f0f0', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 8, 
    fontSize: 14, 
    fontWeight: '600',
    color: '#444',
    marginRight: 10,
    overflow: 'hidden'
  },

  // =========================
  // 4. ADMIN DETAIL (MODAL)
  // =========================
  modalHeader: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 15, 
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    zIndex: 20
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  detailImage: { width: '100%', height: 250, borderRadius: 12, marginTop: 10 },
  detailTitle: { fontSize: 24, fontWeight: '800', marginVertical: 15, color: '#333' },
  
  textBody: { fontSize: 16, lineHeight: 24, color: '#444' },
  ingredientRow: {
    flexDirection:'row', justifyContent:'space-between', 
    paddingVertical:10, borderBottomWidth:1, borderColor:'#f0f0f0'
  },
  stepBox: { 
    marginTop: 5, 
    padding: 15, 
    backgroundColor: '#f9f9f9', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#eee',
  },

  // =========================
  // 5. FEEDBACK SYSTEM
  // =========================
  feedbackBox: {
    marginTop: 20, 
    padding: 15, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#eee',
    backgroundColor: '#FFF'
  },
  inputFeedback: {
    backgroundColor: COLORS.inputBg, 
    borderRadius: 10, 
    padding: 12, 
    height: 100, 
    textAlignVertical: 'top', 
    marginTop: 10,
    fontSize: 15,
    color: COLORS.textMain
  },
  miniBtn: {
    flex: 1, 
    height: 45,
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center'
  },

  // =========================
  // 6. BOTTOM BAR CỐ ĐỊNH
  // =========================
  bottomBar: {
    position: 'absolute', 
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row', 
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 35 : 15, 
    borderTopWidth: 1, 
    borderTopColor: '#eee',
    backgroundColor: '#fff', 
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 15
  },
  bigBtn: {
    flex: 1, 
    height: 52, 
    borderRadius: 12,
    alignItems: 'center', 
    justifyContent: 'center'
  }
});