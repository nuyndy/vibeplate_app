import { StyleSheet } from 'react-native';

export const COLORS = {
  primary: '#1b1d1c',     
  secondary: '#a1a1a1',   
  bg: '#F8F9FD',          
  card: '#FFFFFF',        
  textMain: '#1A1D26',    
  textSub: '#A0A5B9',     
  inputBg: '#f1f1f1',     
  danger: '#eeeeee',      
  success: '#4CAF50', 
  placeholder: '#bdbdbd',
};

export const styles = StyleSheet.create({
  // --- LAYOUT CHUNG ---
  container: { padding: 20, paddingBottom: 50 },
  
  // --- THẺ (CARD) ---
  card: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },

  // --- TEXT ---
  sectionHeader: { fontSize: 18, fontWeight: '800', color: COLORS.textMain, marginBottom: 15 },
  subHint: { fontSize: 15, color: COLORS.textSub, marginTop: -10, marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textMain, marginBottom: 8, marginLeft: 4 },

  // --- INPUT ---
  inputGroup: { marginTop: 15 },
  input: { 
    backgroundColor: COLORS.inputBg, 
    borderRadius: 14, 
    paddingHorizontal: 20, 
    paddingVertical: 18, 
    fontSize: 15, 
    color: COLORS.textMain, 
    fontWeight: '500',
  },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between', gap: 15, marginTop: 15 },
  halfInput: { flex: 1 },

  // --- DROPDOWN SELECT ---
  selectBox: { 
    backgroundColor: COLORS.inputBg, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, 
    marginTop: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' 
  },
  selectText: { fontSize: 15, color: COLORS.textMain, fontWeight: '500' },
  selectPlaceholder: { 
    fontSize: 15, 
    color: COLORS.placeholder
  },

  // --- COVER IMAGE ---
  coverPicker: { 
    height: 180, borderRadius: 16, overflow: 'hidden', backgroundColor: '#E8F7F0', 
    borderWidth: 2, borderColor: '#C2EBD9', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 10 
  },
  coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverPlaceholder: { alignItems: 'center' },

  // --- NGUYÊN LIỆU (SELECT + QTY + ADD) ---
  addInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
  btnAddSmall: { 
    backgroundColor: COLORS.primary, width: 50, height: 50, borderRadius: 14, 
    justifyContent: 'center', alignItems: 'center' 
  },
  btnAddText: { color: '#fff', fontWeight: 'bold', fontSize: 24 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { 
    backgroundColor: '#F0F9F4', paddingVertical: 8, paddingHorizontal: 12, paddingRight: 6, borderRadius: 20, 
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1EBE1' 
  },
  chipText: { color: '#2F4F4F', fontWeight: '600', fontSize: 13, marginRight: 6 },
  chipClose: { width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: COLORS.textSub, fontStyle: 'italic', fontSize: 13 },

  // --- STEPS ---
  stepCard: { flexDirection: 'row', marginBottom: 20, gap: 12 },
  stepBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  stepNumber: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  stepText: { fontSize: 15, color: COLORS.textMain, lineHeight: 22, marginTop: 2 },
  stepImage: { width: '100%', height: 120, borderRadius: 12, marginTop: 10 },
  addStepBox: { backgroundColor: COLORS.inputBg, padding: 15, borderRadius: 16, marginTop: 10 },
  stepActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, alignItems: 'center' },
  btnPhoto: { padding: 8 },
  btnAddStep: { backgroundColor: COLORS.textMain, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },

  // --- SUBMIT ---
  submitButton: { 
    backgroundColor: COLORS.primary, borderRadius: 18, paddingVertical: 18, alignItems: 'center', 
    marginTop: 10, marginBottom: 30, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 
  },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },

  // --- MODAL (CATEGORY & INGREDIENT) ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { 
    width: '85%', backgroundColor: '#fff', borderRadius: 20, maxHeight: '60%', padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: COLORS.textMain },
  categoryItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  categoryText: { fontSize: 16, color: COLORS.textMain },
  closeBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
  closeText: { color: COLORS.danger, fontWeight: 'bold', fontSize: 16 },

  // --- MỚI: SEARCH BOX TRONG MODAL ---
  searchBoxModal: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg,
    borderRadius: 12, paddingHorizontal: 12, height: 45, marginBottom: 10
  },
  //Nút thêm ảnh
  // Thêm vào file style.js

  addPhotoDashBox: {
    width: 90,
    height: 90,
    backgroundColor: '#F9F9F9', // Nền xám cực nhạt
    borderWidth: 1.5,
    borderColor: '#D0D0D0',     // Màu viền và chữ (đậm hơn nền một chút)
    borderStyle: 'dashed',      // Viền nét đứt
    borderRadius: 12,
    justifyContent: 'center',   // Căn giữa theo chiều dọc
    alignItems: 'center',       // Căn giữa theo chiều ngang
    marginRight: 12,
  },
  bigPlus: {
    fontSize: 40,               // Dấu cộng to
    color: '#D0D0D0',           // Màu nhạt đồng bộ với viền
    fontWeight: '200',          // Nét mảnh cho tinh tế
    lineHeight: 45,             // Giúp dấu cộng nằm đúng giữa
  },
  subTextPlus: {
    fontSize: 11,
    color: '#D0D0D0',           // Chữ "Thêm ảnh" nhạt
    marginTop: -5,              // Kéo chữ lên gần dấu cộng hơn
  },
  photoContainer: {
    marginRight: 12,
    position: 'relative',
  },
  imageItem: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  deleteBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'rgba(0,0,0,0.4)', // Nút xóa mờ nhạt
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  }

});