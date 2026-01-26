import { StyleSheet, Dimensions } from 'react-native';

export const COLORS = {
  bg: '#f5f7fa',
  primary: '#1b1d1c',
  white: '#fff',
  
  // --- MÀU MỚI (PASTEL) ---
  edit: '#E3F2FD',   // Xanh nhạt
  danger: '#FFEBEE', // Đỏ nhạt
  // ------------------------

  text: '#333',
  subText: '#999',
  border: '#ddd'
};

export const styles = StyleSheet.create({
  // --- Layout chung ---
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 20, paddingTop: 10, backgroundColor: COLORS.white },
  searchBar: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f2f5', 
    borderRadius: 10, padding: 10 
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: COLORS.text },

  // --- Card Item (Danh mục) ---
  card: {
    flexDirection: 'row', backgroundColor: COLORS.white, marginBottom: 15,
    borderRadius: 12, elevation: 3, padding: 10, alignItems: 'center'
  },
  cardImage: { 
    width: 70, height: 70, borderRadius: 10, marginRight: 15, backgroundColor: '#eee' 
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  cardSub: { fontSize: 13, color: COLORS.subText },
  
  // --- Nút Hành động (Sửa/Xóa) ---
  cardActions: { flexDirection: 'column', justifyContent: 'space-between', height: 70 },
  actionBtn: { 
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, 
    alignItems: 'center', justifyContent: 'center', marginBottom: 5 
  },
  // Đổi màu chữ sang màu tối (COLORS.primary) để nổi trên nền nhạt
  btnText: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold' },

  // --- Floating Action Button (FAB) ---
  fab: { 
    position: 'absolute', bottom: 30, right: 30, 
    width: 60, height: 60, borderRadius: 30, 
    backgroundColor: COLORS.primary, 
    justifyContent: 'center', alignItems: 'center', elevation: 5 
  },
  fabText: { color: COLORS.white, fontSize: 30, marginTop: -4 },

  // --- Modal ---
  modalOverlay: { 
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' 
  },
  modalContent: { 
    width: '90%', backgroundColor: COLORS.white, borderRadius: 15, 
    padding: 20, maxHeight: '80%', elevation: 10 
  },
  modalHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    marginBottom: 20, borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 10 
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },

  // --- Form ---
  inputGroup: { marginBottom: 15 },
  label: { fontWeight: '600', marginBottom: 8, color: COLORS.text },
  input: { 
    borderWidth: 1, borderColor: COLORS.border, padding: 12, 
    borderRadius: 10, backgroundColor: '#fafafa' 
  },

  // --- Ảnh trong Form ---
  coverPicker: {
    width: '100%', height: 150, borderRadius: 12, borderWidth: 1, borderColor: '#ccc',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', 
    backgroundColor: '#f9f9f9', overflow: 'hidden'
  },
  coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center' },

  // --- Nút Lưu ---
  saveBtn: { 
    backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, 
    alignItems: 'center', marginTop: 10 
  },
  saveBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
});