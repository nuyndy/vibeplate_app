import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'; 
import { Ionicons } from '@expo/vector-icons';

export default function RecipeCard({ item, onPress }) {
  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={() => onPress(item)}
      style={styles.cardContainer} 
    >
      <View style={styles.imageWrapper}>
        <Image 
          style={styles.recipeImage} 
          source={{ uri: item.photo_url || 'https://via.placeholder.com/140' }} 
        />
        {item.time && (
          <View style={styles.timeBadge}>
            <Ionicons name="time-outline" size={10} color="#FFF" />
            <Text style={styles.timeText}>{item.time}ph</Text>
          </View>
        )}
      </View>

      <Text 
        style={styles.recipeTitle} 
        numberOfLines={2}
      >
        {item.title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginRight: 15,
    width: 140,
    backgroundColor: '#FFF',
  },
  imageWrapper: {
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, 
  },
  recipeImage: { 
    width: 140, 
    height: 140, 
    borderRadius: 20,
    backgroundColor: '#F0F0F0'
  },
  timeBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  timeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  recipeTitle: { 
    marginTop: 10, 
    fontSize: 14, 
    fontWeight: '700',
    color: '#2D3436', 
    textAlign: 'left',
    lineHeight: 18,
    paddingHorizontal: 2
  }
});