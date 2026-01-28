import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native'; // 1. Đổi import

export default function RecipeCard({ item, onPress }) {
  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => onPress(item)}
      style={{ marginRight: 15, width: 140 }} 
    >
      <View>
        <Image 
          style={{ width: 140, height: 140, borderRadius: 15 }} 
          source={{ uri: item.photo_url }} 
        />
        <Text 
          style={{ 
            marginTop: 8, 
            fontSize: 14, 
            fontWeight: 'bold', 
            color: '#333', 
            textAlign: 'center' 
          }} 
          numberOfLines={2}
        >
          {item.title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}