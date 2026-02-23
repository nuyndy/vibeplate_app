import { StyleSheet, Dimensions } from 'react-native';

// --- ĐỊNH NGHĨA MÀU SẮC (Thêm phần này để hết lỗi) ---
export const COLORS = {
  primary: '#1b1d1c',   // Màu đen chủ đạo của bạn
  edit: '#007bff',      // Màu xanh cho nút sửa
  danger: '#000000',    // Màu đỏ cho nút xóa
  success: '#28a745',   // Màu xanh lá
  white: '#ffffff',
  grey: '#888',
};

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: { padding: 20, paddingTop: 10, backgroundColor: '#fff' }, 
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f2f5', borderRadius: 10, padding: 10 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },

  // --- Card Item ---
  card: { 
    flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 20, marginTop: 15, 
    padding: 10, borderRadius: 12, elevation: 2, height: 95 
  },
  cardImg: { width: 70, height: 75, borderRadius: 10, marginRight: 15, backgroundColor: '#eee' },
  cardInfo: { flex: 1, justifyContent: 'center' },
  cardTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
  cardSub: { color: '#888', fontSize: 13 },
  
  // --- Buttons ---
  btnEdit: { backgroundColor: '#E3F2FD', padding: 5, borderRadius: 5, marginBottom: 5, alignItems:'center', width: 50 },
  btnDel: { backgroundColor: '#FFEBEE', padding: 5, borderRadius: 5, alignItems:'center', width: 50 },
  btnText: { fontSize: 12, fontWeight: '600' },

  // --- FAB ---
  fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { color: '#fff', fontSize: 30, marginTop: -4 },

  // --- Modal ---
  modalContainer: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderBottomWidth: 1, borderColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', flex: 1 },
  modalBody: { padding: 20 },
  modalFooter: { padding: 20, borderTopWidth: 1, borderColor: '#eee' },

  // --- Form Elements ---
  label: { fontWeight: '600', marginTop: 15, marginBottom: 8, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 10, backgroundColor: '#fafafa', marginBottom: 10 },
  selectBox: { flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: '#007bff', padding: 12, borderRadius: 10, backgroundColor: '#F0F8FF', marginBottom: 10 },

  // --- Images ---
  coverPicker: { width: '100%', height: 180, borderRadius: 12, borderWidth: 1, borderColor: '#ccc', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9f9', overflow: 'hidden' },
  coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  addPhotoBox: { width: 80, height: 80, borderRadius: 10, borderWidth: 1, borderColor: '#ccc', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  albumThumb: { width: 80, height: 80, borderRadius: 10, marginRight: 10 },

  // --- Ingredients ---
  ingredientBox: { padding: 15, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  btnAddIng: { backgroundColor: COLORS.primary, width: 45, height: 45, justifyContent: 'center', alignItems: 'center', borderRadius: 10, marginLeft: 10 },
  ingItem: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },

  // --- Action Buttons ---
  saveBtn: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // --- Pickers ---
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 30 },
  pickerBody: { backgroundColor: '#fff', borderRadius: 15, padding: 20, maxHeight: '60%' },
  pickerItem: { paddingVertical: 15, borderBottomWidth: 1, borderColor: '#f0f0f0' },
});