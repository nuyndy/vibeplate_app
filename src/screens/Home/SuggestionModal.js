import React from 'react';
import { View, Text, TouchableOpacity, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SuggestionModal({ visible, onClose, suggestions, onPressRecipe }) {
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{ height: '75%', backgroundColor: '#F5F7FA', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 }}>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold' }}>Hôm nay ăn gì?</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={30} color="#ccc" />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            {suggestions.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                activeOpacity={0.9} 
                onPress={() => onPressRecipe(item)}
                style={{ 
                  marginBottom: 20, backgroundColor: 'white', borderRadius: 20, 
                  height: 160, elevation: 5, shadowColor: "#000", 
                  shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8
                }}
              >
                <Image 
                  source={{ uri: item.photo_url }} 
                  style={{ width: '100%', height: 100, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} 
                />
                <View style={{ padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }} numberOfLines={1}>{item.title}</Text>
                    <Text style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{item.time || "30"} phút</Text>
                  </View>
                  <Ionicons name="arrow-forward-circle" size={24} color="#ff9800" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}