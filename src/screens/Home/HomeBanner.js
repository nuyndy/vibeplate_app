import React, { useState, useEffect, useRef, useCallback } from "react";
import { ScrollView, View, Image, TouchableHighlight, Dimensions, Text, StyleSheet } from "react-native";

const { width: viewportWidth } = Dimensions.get("window");
const CARD_WIDTH = viewportWidth - 30; 
const CARD_MARGIN = 15;

function HomeBanner({ bannerData, onPressRecipe, isUserScrolling, mood }) {
  const bannerRef = useRef(null);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    if (bannerRef.current) {
      bannerRef.current.scrollTo({ x: 0, y: 0, animated: true });
    }
    currentIndexRef.current = 0;
  }, [bannerData]);

  useEffect(() => {
    if (!bannerData || bannerData.length <= 1 || isUserScrolling) return;

    const interval = setInterval(() => {
      let nextIndex = currentIndexRef.current + 1;
      if (nextIndex >= bannerData.length) nextIndex = 0;
      
      if (bannerRef.current) {
        bannerRef.current.scrollTo({
          x: nextIndex * viewportWidth,
          y: 0,
          animated: true,
        });
        currentIndexRef.current = nextIndex;
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [bannerData, isUserScrolling]);

  const handleScrollEnd = useCallback((event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / viewportWidth);
    currentIndexRef.current = index;
  }, []);

  if (!bannerData || bannerData.length === 0) return null;

  return (
    <View style={styles.headerContainer}>
        <ScrollView
          ref={bannerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
          decelerationRate="fast"
        >
          {bannerData.map((item, index) => (
            <View key={item.id || `banner-${index}`} style={styles.bannerWrapper}> 
              <TouchableHighlight 
                underlayColor="transparent" 
                onPress={() => onPressRecipe(item)}
              >
                <View style={styles.floatingCard}>
                  <Image 
                    style={styles.bannerPhoto} 
                    source={{ uri: item.photo_url }} 
                    resizeMode="cover"
                  />
                  <View style={styles.textOverlay}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {mood && mood !== 'neutral' && (
                      <View style={styles.moodBadge}>
                        <Text style={styles.moodText}>✨ Phù hợp với bạn</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableHighlight>
            </View>
          ))}
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: { marginTop: 10 },
  bannerWrapper: { width: viewportWidth, paddingHorizontal: CARD_MARGIN, paddingVertical: 10 },
  floatingCard: {
    width: CARD_WIDTH,
    height: 210,
    borderRadius: 30,
    backgroundColor: '#FFF',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  bannerPhoto: { width: '100%', height: '100%' },
  textOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', 
    justifyContent: 'center',
  },
  itemTitle: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 18,
    textAlign: 'center' 
  },
  moodBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  moodText: { color: '#FFD700', fontSize: 11, fontWeight: '700' }
});

export default React.memo(HomeBanner);