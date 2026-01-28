import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HomeBanner from './HomeBanner';
import styles from './styles';

// 🔥 BỘ ICON 3D CUTE
const moodOptions = [
  { key: "happy", label: "Vui vẻ", icon: "🤩" },
  { key: "sad", label: "Buồn", icon: "😟" },
  { key: "tired", label: "Mệt mỏi", icon: "🥱" },
  { key: "hungry", label: "Đói meo", icon: "🤤" },
  { key: "neutral", label: "Bình thường", icon: "😑" },
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
      {/* 1. Banner (Luôn ở đầu) */}
      <HomeBanner
        bannerData={bannerData}
        onPressRecipe={onPressRecipe}
        isUserScrolling={isUserScrolling}
      />

      {/* 2. 🌤 WEATHER & GREETING (Đã chuyển lên trên) */}
      <View style={{ 
          marginTop: 20, marginHorizontal: 15, padding: 20, borderRadius: 24, 
          backgroundColor: '#E3F2FD', 
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          shadowColor: "#1976D2", shadowOffset: { width: 0, height: 4 }, 
          shadowOpacity: 0.15, shadowRadius: 8, elevation: 5
      }}>
          <View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1565C0' }}>
                  {greeting}{user?.displayName ? `, ${user.displayName.split(' ').pop()}` : '!'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <Ionicons name="location" size={16} color="#42A5F5" />
                  <Text style={{ fontSize: 15, marginLeft: 4, color: '#444', fontWeight: '600' }}>
                    {weatherData.city}
                  </Text>
                  <View style={{ width: 1, height: 12, backgroundColor: '#CCC', marginHorizontal: 10 }} />
                  <Text style={{ fontSize: 18, color: '#1565C0', fontWeight: '800' }}>
                    {weatherData.temp}°
                  </Text>
              </View>
          </View>
          <Ionicons name={weatherData.temp > 25 ? "sunny" : "partly-sunny"} size={52} color="#FFB300" />
      </View>

      {/* 3. 🤔 MOOD SELECTOR (Đã chuyển xuống dưới) */}
      <View style={{ marginTop: 25, paddingHorizontal: 15 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 15, color: '#333' }}>
            Hôm nay bạn thế nào? 
            <Text style={{fontSize: 18}}> 🤔</Text>
        </Text>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {moodOptions.map((m) => {
             const isSelected = mood === m.key;
             return (
                <TouchableOpacity
                  key={m.key}
                  onPress={() => setMood(isSelected ? null : m.key)}
                  activeOpacity={0.8}
                  style={{
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: 60,
                    paddingVertical: 10,
                    borderRadius: 20,
                    backgroundColor: isSelected ? "#FFF3E0" : "#FAFAFA",
                    borderWidth: isSelected ? 2 : 1, 
                    borderColor: isSelected ? "#271f42" : "#F0F0F0",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: isSelected ? 2 : 1 },
                    shadowOpacity: isSelected ? 0.2 : 0.05,
                    shadowRadius: 3,
                    elevation: isSelected ? 4 : 1,
                    transform: [{ scale: isSelected ? 1.1 : 1 }]
                  }}
                >
                  <Image 
                    source={{ uri: m.icon }} 
                    style={{ width: 32, height: 32, marginBottom: 8 }} 
                    resizeMode="contain" 
                  />
                  <Text style={{ 
                      fontSize: 11, 
                      color: isSelected ? "#24324e" : "#888", 
                      fontWeight: isSelected ? 'bold' : '500' 
                  }}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
             );
          })}
        </View>
      </View>

      {/* 4. Suggestion Button (Ở cuối cùng) */}
      <TouchableOpacity
          style={{ 
            marginTop: 25, marginHorizontal: 15, padding: 18, borderRadius: 20, 
            backgroundColor: '#FFF8E1', 
            borderWidth: 1.5, borderColor: '#5f5f5d', borderStyle: 'dashed',
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
          }}
          onPress={onOpenSuggestion}
          activeOpacity={0.7}
        >
          <View>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#000000' }}>Gợi ý hôm nay ăn gì? 🍳</Text>
            <Text style={{ fontSize: 13, color: '#8D6E63', marginTop: 4 }}>Bấm vào đây để App chọn giúp nhé</Text>
          </View>
          <View style={{ 
              backgroundColor: '#FFF', padding: 8, borderRadius: 50,
              shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 2
          }}>
             <Ionicons name="restaurant" size={24} color="#000000" />
          </View>
        </TouchableOpacity>
    </View>
  );
}