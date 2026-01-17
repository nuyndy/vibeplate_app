import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

// 🎨 BẢNG MÀU "BẾP NHÀ HIỆN ĐẠI" (Fresh & Cozy)
const COLORS = {
  // GIỮ NGUYÊN MÀU HOME: Xanh lá tươi (Rau củ/Thảo mộc)
  primary: "#2cd18a",       
  
  // MÀU ẤM (Bổ sung): Vàng Cam (Vỏ bánh nướng/Phô mai) -> Tạo cảm giác thèm ăn
  accent: "#F4A261",        
  
  // MÀU NỀN: Trắng Gạo (Rice White) - Sạch sẽ nhưng không lạnh lẽo như trắng tinh
  background: "#FEFCF8",    
  
  // CARD: Trắng Sứ - Để làm nổi bật đồ ăn
  cardBg: "#FFFFFF",        
  
  // TEXT: Xám Than Chì (Soft Charcoal) - Dịu mắt hơn đen tuyền
  textMain: "#2D3436",      
  textSub: "#95A5A6",       
  
  // INPUT: Xám ấm nhẹ
  inputBg: "#F7F9F9",       
  
  danger: "#E74C3C",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // --- CARD SẢN PHẨM (Tinh tế & Có chiều sâu) ---
  itemContainer: {
    backgroundColor: COLORS.cardBg,
    padding: 20,
    marginHorizontal: 18,
    marginBottom: 16,
    borderRadius: 24,
    
    // ĐỔ BÓNG TỰ NHIÊN (Soft Ambient Shadow)
    shadowColor: "#BCAAA4", 
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,      
    shadowRadius: 12,
    elevation: 4,
    
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.02)",
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textMain,
    flex: 1,
    letterSpacing: 0.2,
  },
  expiryDate: {
    fontSize: 14,
    color: COLORS.textSub,
    marginTop: 4,
    fontStyle: 'italic', 
  },
  
  // Badge trạng thái
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // --- ACTION BUTTONS (Đơn giản, Sạch sẽ) ---
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: "#F0F3F4", 
  },

  // --- FAB BUTTON (+) ---
  fab: {
    position: "absolute",
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    right: 24,
    bottom: 34,
    backgroundColor: COLORS.primary, 
    borderRadius: 32,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: "white",
    marginTop: -2,
  },

  // --- MODAL (Trượt lên từ dưới) ---
  centeredView: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(45, 52, 54, 0.4)", 
  },
  modalView: {
    width: "100%",
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 30,
    paddingBottom: 50,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 20,
  },
  modalTitle: {
    marginBottom: 25,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textMain,
  },
  
  // --- INPUT (Hiện đại & Mềm mại) ---
  input: {
    width: "100%",
    height: 56,
    backgroundColor: COLORS.inputBg,
    borderRadius: 28,          
    paddingHorizontal: 24,
    marginBottom: 16,
    fontSize: 16,
    color: COLORS.textMain,
    fontWeight: "500",
  },
  
  modalButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    paddingVertical: 16,
    elevation: 0,
    marginTop: 15,
    width: "100%",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  textStyle: {
    color: "white",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 17,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 10,
    zIndex: 1,
  },
  closeText: {
    color: COLORS.textSub,
    fontWeight: "600",
    fontSize: 15,
  },

  // --- CAMERA (Viền xanh đồng bộ) ---
  locketContainer: {
    flex: 1,
    backgroundColor: '#000', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  locketFrame: {
   // --- THAY ĐỔI Ở ĐÂY ---
    width: width * 0.8,           // Rộng 80% màn hình
    height: (width * 0.8) * 0.6,  // Cao = 60% của chiều rộng (Hình chữ nhật ngang)
    // -----------------------
    borderRadius: 30,             
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#333',
    position: 'relative',
    backgroundColor: '#222',
  },
  locketCamera: {
    flex: 1,
  },
  locketBackButton: {
    marginTop: 50,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locketBackText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  locketHint: {
    color: '#ECF0F1',
    fontSize: 15,
    marginBottom: 20,
    fontWeight: '500',
    opacity: 0.9,
  },

  // --- ICONS MỚI (Đã được đưa vào trong ngoặc đúng cú pháp) ---
  
  // Style cho icon nhỏ trong nút Sửa/Xóa
  iconSmall: {
    width: 18,
    height: 18,
    marginRight: 8, 
    resizeMode: 'contain',
  },
  // Style cho icon lớn hơn trong menu Modal
  menuIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    resizeMode: 'contain',
  },
  // Style cho container chứa icon và chữ trong nút để căn giữa
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
}); // <--- Đóng ngoặc kết thúc StyleSheet ở đây mới đúng

export default styles;