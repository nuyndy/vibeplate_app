import { StyleSheet, Dimensions } from "react-native";

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
    height: height * 0.75, // Vùng chứa cao để thẻ thoáng
  },
  
  // Bóng đổ phát sáng sau thẻ
  glowBox: { 
    position: 'absolute', width: '90%', height: '90%', 
    borderRadius: 30, opacity: 0.3, top: 25, 
    elevation: 15, shadowOffset: {width:0, height:15}, shadowOpacity:0.4, shadowRadius:20 
  },

  // Thẻ chính
  cardInner: {
    width: '95%', 
    height: '92%', 
    backgroundColor: '#fff', 
    borderRadius: 28,
    alignItems: 'center', 
    padding: 20,
    elevation: 8, shadowColor: '#000', shadowOffset: {width:0, height:5}, shadowOpacity:0.1, shadowRadius:10
  },

  // Header thẻ (Trạng thái + Hạn SD)
  cardHeader: { 
    flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', 
    marginBottom: 15, zIndex: 10 
  },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontWeight: 'bold', fontSize: 12 },
  expiryText: { color: '#999', fontSize: 13, fontWeight: '600' },

  // Ảnh sản phẩm (Hình chữ nhật ngang)
  imageContainer: { 
    width: '100%', height: 210, borderRadius: 18,   
    backgroundColor: '#fff', marginBottom: 15, overflow: 'hidden', 
  },
  productImage: { width: '100%', height: '100%' },

  // Tên sản phẩm
  productName: { 
    fontSize: 24, fontWeight: '800', color: '#2C3E50', 
    textAlign: 'center', marginBottom: 5, 
    height: 60, textAlignVertical: 'center' 
  },
  
  // Số ngày còn lại
  statsContainer: { marginBottom: 15 },
  daysBlock: { alignItems: 'center' },
  daysBig: { fontSize: 48, fontWeight: '900', lineHeight: 52 },
  daysLabel: { fontSize: 12, fontWeight: 'bold', color: '#aaa', letterSpacing: 1, textTransform: 'uppercase' },

  // Thanh tiến độ
  progressContainer: { width: '100%', height: 8, backgroundColor: '#EFF2F5', borderRadius: 4, marginBottom: 20 },
  progressBar: { height: '100%', borderRadius: 4 },

  // --- NÚT HÀNH ĐỘNG (ĐẸP HƠN) ---
  actionRow: { 
    flexDirection: 'row', 
    width: '100%', 
    justifyContent: 'space-between', 
    paddingTop: 20, 
    borderTopWidth: 1, 
    borderTopColor: '#f5f5f5', 
    gap: 15, 
  },

  actionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12, 
    borderRadius: 16, 
    flex: 1, 
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },

  // Nút Sửa (Xanh)
  btnEdit: { backgroundColor: '#E3F2FD' },
  // Nút Xóa (Đỏ)
  btnDelete: { backgroundColor: '#FFEBEE' },

  actionText: { fontWeight: '700', fontSize: 14, marginLeft: 8 },

  // =================================================
  // 2. STYLE CAMERA (CỬA SỔ NGANG 16:9)
  // =================================================

  scanContainer: { 
    flex: 1, 
    backgroundColor: '#000', 
    alignItems: 'center',
    justifyContent: 'center', 
  },
  
  scanText: {
    color: '#fff', fontSize: 16, fontWeight: '500',
    marginBottom: 30, textAlign: 'center', opacity: 0.9,
    marginTop: -50 
  },

  // Khung Camera cố định chiều cao -> Tạo hình chữ nhật ngang
  scanWindow: {
    width: SCREEN_WIDTH * 0.9, 
    height: 220,               
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#fff',       
    backgroundColor: '#222', 
  },

  scanCamera: { flex: 1, width: '100%', height: '100%' },

  scanCloseBtn: {
    marginTop: 50, width: 60, height: 60, borderRadius: 30, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', alignItems: 'center',
  },
  scanCloseIcon: { color: '#fff', fontSize: 24, marginTop: -2 },

  // =================================================
  // 3. UI KHÁC
  // =================================================
  
  fab: { 
    position:'absolute', bottom: 40, alignSelf: 'center',
    width:60, height:60, borderRadius:30, backgroundColor:'#2C3E50', 
    justifyContent:'center', alignItems:'center', 
    elevation:10, shadowColor:'#000', shadowOffset:{width:0, height:4}, shadowOpacity:0.3 
  },
  fabIcon: { color:'#fff', fontSize:32, marginTop:-3 },

  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center' },
  modalBody: { width:'85%', backgroundColor:'#fff', borderRadius:25, padding:25, alignItems:'center' },
  modalOpt: { width:'100%', padding:15, backgroundColor:'#F0F2F5', borderRadius:12, alignItems:'center' },
  input: { width:'100%', backgroundColor:'#F0F2F5', padding:15, borderRadius:12, marginBottom:10 },
  btnCancel: { flex:1, padding:15, alignItems:'center' },
  btnSave: { flex:1, backgroundColor:'#2C3E50', padding:15, borderRadius:12, alignItems:'center' },
});

export default styles;