import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width } = Dimensions.get('window');

export const COLORS = {
  primary: '#1b1d1c',       // Màu đen chủ đạo
  secondary: '#FF9800',     // Màu cam nhấn (Button, icon)
  bg: '#F8F9FD',            // Màu nền app (xám rất nhạt)
  card: '#FFFFFF',          // Màu nền thẻ/khung
  textMain: '#1A1D26',      // Màu chữ chính
  textSub: '#888888',       // Màu chữ phụ
  danger: '#FF6B6B',        // Màu đỏ (xóa, từ chối)
  inputBg: '#F5F6FA',       // Màu nền ô nhập liệu
  border: '#EEEEEE',        // Màu đường viền
};

export const styles = StyleSheet.create({
  // =========================
  // 1. LAYOUT CHUNG
  // =========================
  container: { 
    flexGrow: 1, 
    backgroundColor: COLORS.bg,
    paddingBottom: 40
  },
  header: { 
    padding: 20, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary },
  sectionHeader: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginTop: 10, 
    marginBottom: 10, 
    color: COLORS.primary 
  },
  subHint: { fontSize: 13, color: COLORS.textSub, marginBottom: 10 },
  emptyText: { textAlign: 'center', marginTop: 30, color: '#999' },
  label: { fontWeight: '600', marginBottom: 6, color: COLORS.textMain, marginTop: 10 },

  // =========================
  // 2. CARD & BOX (KHUNG)
  // =========================
  card: {
    flexDirection: 'row',       // <--- QUAN TRỌNG: Xếp ngang
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    marginHorizontal: 15, // Cách lề 2 bên nếu dùng ScrollView chung
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  // Style riêng cho item trong danh sách Admin
  cardContent: { flex: 1, marginLeft: 15 },
  cardImage: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#eee' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cardAuthor: { fontSize: 13, color: '#666', marginTop: 2 },

  // =========================
  // 3. INPUT & FORM (ĐÓNG GÓP)
  // =========================
  inputGroup: { marginBottom: 15 },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 15,
    color: COLORS.textMain
  },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  halfInput: { flex: 1 },
  
  // Select Box (Giả lập Dropdown)
  selectBox: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5
  },
  selectText: { color: COLORS.textMain },
  selectPlaceholder: { color: '#999' },

  // Ảnh bìa (Upload)
  coverPicker: {
    height: 180,
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden'
  },
  coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverPlaceholder: { alignItems: 'center' },

  // Ảnh phụ (Thêm vào mảng)
  addPhotoBtn: {
    width: 80, height: 80, 
    borderRadius: 8, 
    borderWidth: 1, borderColor: '#ccc', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10
  },

  // =========================
  // 4. NGUYÊN LIỆU (CHIPS)
  // =========================
  addInputRow: { flexDirection: 'row', gap: 10, marginBottom: 15, alignItems: 'center' },
  btnAddSmall: {
    backgroundColor: COLORS.primary,
    width: 50, height: 50,
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center'
  },
  btnAddText: { color: '#fff', fontSize: 24, marginTop: -2 },
  
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row', alignItems: 'center'
  },
  chipText: { color: '#fff', fontSize: 14, fontWeight: '600', marginRight: 5 },
  chipClose: { 
      backgroundColor: 'rgba(255,255,255,0.3)', 
      width: 18, height: 18, borderRadius: 9, 
      alignItems: 'center', justifyContent: 'center' 
  },

  // =========================
  // 5. CÁCH LÀM (STEPS)
  // =========================
  stepCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.inputBg,
    padding: 10, borderRadius: 8, marginBottom: 10,
    alignItems: 'flex-start'
  },
  stepBadge: {
    backgroundColor: COLORS.primary, width: 24, height: 24,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10
  },
  stepNumber: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  stepText: { fontSize: 15, color: '#333', lineHeight: 22 },
  stepImage: { width: 100, height: 80, borderRadius: 6, marginTop: 5 },

  addStepBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
  stepActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  btnPhoto: { padding: 10 },
  btnAddStep: { backgroundColor: COLORS.secondary, padding: 10, borderRadius: 8 },

  // =========================
  // 6. BUTTONS & MODAL (ADMIN + USER)
  // =========================
  submitButton: {
    backgroundColor: COLORS.primary,
    margin: 20, padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 5, elevation: 5
  },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%', minHeight: '40%'
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  categoryItem: {
    padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0'
  },
  categoryText: { fontSize: 16 },
  closeBtn: {
    marginTop: 15, padding: 15, backgroundColor: '#eee', borderRadius: 10, alignItems: 'center'
  },
  closeText: { fontWeight: 'bold' },
  
  // Search trong Modal
  searchBoxModal: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.inputBg, borderRadius: 10, paddingHorizontal: 10, height: 45, marginBottom: 10
  },

  // =========================
  // 7. ADMIN SPECIFIC (Chi tiết bài duyệt)
  // =========================
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  detailImage: { width: '100%', height: 220, borderRadius: 12, marginTop: 10 },
  detailTitle: { fontSize: 24, fontWeight: '800', marginVertical: 15, color: '#333' },
  
  metaBadge: { 
    backgroundColor: '#eee', 
    paddingHorizontal: 10, paddingVertical: 6, 
    borderRadius: 6, fontSize: 14, fontWeight: '600' 
  },
  
  textBody: { fontSize: 16, lineHeight: 24, color: '#444', marginBottom: 5 },
  ingredientRow: {
    flexDirection:'row', justifyContent:'space-between', 
    paddingVertical:8, borderBottomWidth:1, borderColor:'#eee'
  },
  stepBox: { marginTop: 5, padding: 15, backgroundColor: '#FAFAFA', borderRadius: 8, borderWidth: 1, borderColor: '#eee' },

  // Feedback Box (Admin)
  feedbackBox: {
    marginTop: 20, backgroundColor: '#f0f0f0', padding: 15, 
    borderRadius: 10, borderWidth: 1, borderColor: '#ffffff'
  },
  inputFeedback: {
    backgroundColor: '#fff', borderRadius: 8, padding: 10, height: 80, 
    textAlignVertical: 'top', borderWidth: 1, borderColor: '#eee'
  },
  miniBtn: {
    flex: 1, padding: 10, borderRadius: 6, alignItems: 'center', justifyContent: 'center'
  },

  // Bottom Bar Admin
  bottomBar: {
    flexDirection: 'row', padding: 15, borderTopWidth: 1, borderTopColor: '#eee',
    backgroundColor: '#fff', gap: 10, paddingBottom: 30 
  },
  bigBtn: {
    flex: 1, height: 50, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', elevation: 2
  }
});