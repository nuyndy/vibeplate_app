import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HomeBanner from './HomeBanner';

const { width } = Dimensions.get('window');

const moodOptions = [
  { key: "happy", label: "Vui", icon: require("../../../assets/happy.png") },
  { key: "hungry", label: "Đói", icon: require("../../../assets/hungry.png") },
  { key: "neutral", label: "OK", icon: require("../../../assets/normal.png") },
  { key: "tired", label: "Mệt", icon: require("../../../assets/sick.png") },
  { key: "sad", label: "Buồn", icon: require("../../../assets/cry.png") },  
];

export default function HeaderSection({
  bannerData,
  mood,
  setMood,
  weatherData,
  greeting,
  user,
  onPressRecipe,
  onOpenSuggestion,
  isUserScrolling
}) {
  return (
    <View style={styles.headerContainer}>
      <HomeBanner
        bannerData={bannerData}
        onPressRecipe={onPressRecipe}
        isUserScrolling={isUserScrolling}
      />

      <View style={styles.mainWidget}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.greetingText}>
              {greeting}, {user?.displayName ? user.displayName.split(' ').pop() : 'bạn'}!
            </Text>
            <View style={styles.weatherInfo}>
              <Ionicons name="location" size={12} color="#999" />
              <Text style={styles.subText}>{weatherData.city} • </Text>
              <Text style={styles.tempText}>{weatherData.temp}°C</Text>
            </View>
          </View>
          <Ionicons 
            name={weatherData.temp > 25 ? "sunny" : "partly-sunny"} 
            size={32} 
            color="#FFB300" 
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.moodRow}>
          {moodOptions.map((m) => {
            const isSelected = mood === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                onPress={() => setMood(isSelected ? 'neutral' : m.key)}
                activeOpacity={0.6}
                style={[styles.moodItem, isSelected && styles.moodItemActive]}
              >
                {/* SỬA TẠI ĐÂY: source={m.icon} thay vì {uri: m.icon} */}
                <Image source={m.icon} style={styles.moodIcon} />
                <Text style={[styles.moodLabel, isSelected && styles.moodLabelActive]}>
                  {m.label.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity 
          style={styles.suggestionBtn} 
          onPress={onOpenSuggestion}
          activeOpacity={0.7}
        >
          <View style={styles.suggestionLeft}>
            <Ionicons name="restaurant-outline" size={20} color="#FF9800" />
            <Text style={styles.suggestionTitle}>Hôm nay ăn gì?</Text>
          </View>
          <View style={styles.goBadge}>
            <Text style={styles.goText}>AI gợi ý</Text>
            <Ionicons name="chevron-forward" size={12} color="#FF9800" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: { backgroundColor: '#FFF' },
  mainWidget: {
    marginTop: 15,
    marginHorizontal: 15,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greetingText: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  weatherInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  subText: { fontSize: 12, color: '#999', marginLeft: 4 },
  tempText: { fontSize: 12, color: '#555', fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#EEE', marginBottom: 16 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  moodItem: { 
    alignItems: 'center', 
    width: (width - 80) / 5, 
    paddingVertical: 10, 
    borderRadius: 12 
  },
  moodItemActive: { 
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FFE0B2'
  },
  moodIcon: { width: 50, height: 50, marginBottom: 4 },
  moodLabel: { fontSize: 10, color: '#AAA', fontWeight: '500' },
  moodLabelActive: { color: '#FF9800', fontWeight: '700' },
  suggestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  suggestionLeft: { flexDirection: 'row', alignItems: 'center' },
  suggestionTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginLeft: 10 },
  goBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF8E1', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 20 
  },
  goText: { fontSize: 10, color: '#FF9800', fontWeight: 'bold', marginRight: 2 }
});