import { StyleSheet, Dimensions, Platform } from "react-native";

const { width, height } = Dimensions.get('window');

// Kích thước chuẩn
export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;
export const ITEM_WIDTH = width * 0.85; 
export const SPACING = (width - ITEM_WIDTH) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  
  // =================================================
  // 1. STYLE THẺ SẢN PHẨM (CARD)
  // =================================================
  cardWrapper: { 
    width: ITEM_WIDTH, 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: height * 0.75, 
  },
  
  glowBox: { 
    position: 'absolute', width: '90%', height: '90%', 
    borderRadius: 30, opacity: 0.3, top: 25, 
    elevation: 15, shadowOffset: {width:0, height:15}, shadowOpacity:0.4, shadowRadius:20 
  },

  cardInner: {
    width: '95%', 
    height: '92%', 
    backgroundColor: '#fff', 
    borderRadius: 28,
    alignItems: 'center', 
    padding: 20,
    elevation: 8, shadowColor: '#000', shadowOffset: {width:0, height:5}, shadowOpacity:0.1, shadowRadius:10
  },

  cardHeader: { 
    flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', 
    marginBottom: 15, zIndex: 10 
  },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontWeight: 'bold', fontSize: 12 },
  expiryText: { color: '#999', fontSize: 13, fontWeight: '600' },

  imageContainer: { 
    width: '100%', height: 210, borderRadius: 18,   
    backgroundColor: '#fff', marginBottom: 15, overflow: 'hidden', 
  },
  productImage: { width: '100%', height: '100%' },

  productName: { 
    fontSize: 24, fontWeight: '800', color: '#2C3E50', 
    textAlign: 'center', marginBottom: 5, 
    height: 60, textAlignVertical: 'center' 
  },
  
  statsContainer: { marginBottom: 15 },
  daysBlock: { alignItems: 'center' },
  daysBig: { fontSize: 48, fontWeight: '900', lineHeight: 52 },
  daysLabel: { fontSize: 12, fontWeight: 'bold', color: '#aaa', letterSpacing: 1, textTransform: 'uppercase' },

  progressContainer: { width: '100%', height: 8, backgroundColor: '#EFF2F5', borderRadius: 4, marginBottom: 20 },
  progressBar: { height: '100%', borderRadius: 4 },

  actionRow: { 
    flexDirection: 'row', width: '100%', justifyContent: 'space-between', 
    paddingTop: 20, borderTopWidth: 1, borderTopColor: '#f5f5f5', gap: 15, 
  },

  actionBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 16, flex: 1, 
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  btnEdit: { backgroundColor: '#E3F2FD' },
  btnDelete: { backgroundColor: '#FFEBEE' },
  actionText: { fontWeight: '700', fontSize: 14, marginLeft: 8 },

  // =================================================
  // 2. MODERN MODAL (DIALOG) STYLES
  // =================================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end', 
  },
  modalBody: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    width: '100%',
    // Giới hạn chiều cao để không bị tràn khi hiện bàn phím
    maxHeight: height * 0.85, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  modalHeaderLine: {
    width: 40,
    height: 5,
    backgroundColor: '#DDD',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 15,
  },
  modalMainTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 15,
    textAlign: 'center',
  },
  photoPlaceholder: {
    width: '100%',
    height: 120, 
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden'
  },
  modernInput: {
    height: 54, 
    backgroundColor: '#F5F7FA',
    borderRadius: 15,
    paddingHorizontal: 15,
    fontSize: 15,
    color: '#333',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
  },
  modernBtnCancel: {
    flex: 1,
    height: 54,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  modernBtnSave: {
    flex: 2,
    height: 54,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2C3E50',
  },

  // =================================================
  // 3. UI KHÁC
  // =================================================
  fab: { 
    position:'absolute', bottom: 40, alignSelf: 'center',
    width:64, height:64, borderRadius:32, backgroundColor:'#2C3E50', 
    justifyContent:'center', alignItems:'center', 
    elevation:10, shadowColor:'#000', shadowOffset:{width:0, height:4}, shadowOpacity:0.3 
  },
});

export default styles;