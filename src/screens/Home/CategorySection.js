import React from 'react';
import { View, Text, FlatList } from 'react-native';
import RecipeCard from './RecipeCard';

export default function CategorySection({ item, onPressRecipe }) {
  const renderItem = ({ item }) => (
    <RecipeCard item={item} onPress={onPressRecipe} />
  );

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginLeft: 15, marginBottom: 10, color: '#333' }}>
        {item.name}
      </Text>
      <FlatList
        horizontal
        data={item.recipes}
        renderItem={renderItem}
        keyExtractor={(recipe) => `${recipe.id}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 15, paddingRight: 15 }}
      />
    </View>
  );
}