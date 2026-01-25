import { StyleSheet } from 'react-native';

export const COLORS = {
  bg: '#f5f7fa',
  primary: '#1b1d1c',
  white: '#fff',

  // --- MÀU PASTEL ---
  edit: '#E3F2FD',   // Nền xanh nhạt
  editText: '#1976D2', // Chữ xanh đậm
  
  danger: '#FFEBEE', // Nền đỏ nhạt
  dangerText: '#D32F2F', // Chữ đỏ đậm
  // ------------------------

  text: '#333',
  subText: '#999',
  border: '#ddd',
  inputBg: '#fafafa',
};

export const styles = StyleSheet.create({
  // --- Layout ---
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 20, paddingTop: 10, backgroundColor: COLORS.white },
  
  // --- Search Bar ---
  searchBar: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f2f5', 
    borderRadius: 10, padding: 10 
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: COLORS.text },

  // --- List Item (Card User) ---
  card: {
    flexDirection: 'row', backgroundColor: COLORS.white, marginBottom: 15,
    borderRadius: 12, elevation: 2, padding: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#eee'
  },
  cardImage: { 
    width: 60, height: 60, borderRadius: 30, 
    marginRight: 15, backgroundColor: '#eee', borderWidth: 1, borderColor: '#f0f0f0'
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  cardSub: { fontSize: 12, color: COLORS.subText },
  
  // --- Buttons (Sửa/Xóa) ---
  cardActions: { flexDirection: 'column', justifyContent: 'space-between', gap: 8 },
  actionBtn: { 
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, 
    alignItems: 'center', justifyContent: 'center', minWidth: 60 
  },
  btnText: { fontSize: 12, fontWeight: 'bold' }, 

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

  // --- Inputs ---
  inputGroup: { marginBottom: 15 },
  label: { fontWeight: '600', marginBottom: 8, color: COLORS.text },
  input: { 
    borderWidth: 1, borderColor: COLORS.border, padding: 12, 
    borderRadius: 10, backgroundColor: COLORS.inputBg, fontSize: 16
  },
  inputDisabled: {
    backgroundColor: '#e0e0e0', color: '#777'
  },

  // --- Save Button ---
  saveBtn: { 
    backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, 
    alignItems: 'center', marginTop: 10 
  },
  saveBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
});