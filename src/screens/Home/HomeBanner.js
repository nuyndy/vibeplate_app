import React, { useState, useEffect, useRef } from "react";
import { ScrollView, View, Text, Image, TouchableHighlight, Dimensions } from "react-native";
import styles from "./styles"; 

const { width: viewportWidth } = Dimensions.get("window");

// 1. Nhận thêm prop `isUserScrolling` từ cha
function HomeBanner({ bannerData, onPressRecipe, isUserScrolling }) {
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerRef = useRef(null);

  useEffect(() => {
    // 2. Kiểm tra an toàn: Nếu không có data HOẶC user đang cuộn -> Dừng ngay
    if (!bannerData || bannerData.length === 0 || isUserScrolling) {
      return; 
    }

    const interval = setInterval(() => {
      setBannerIndex(prevIndex => {
        // Logic tính toán index tiếp theo
        let nextIndex = prevIndex + 1;
        if (nextIndex >= bannerData.length) {
          nextIndex = 0;
        }
        
        // Thực hiện cuộn banner
        if (bannerRef.current) {
           bannerRef.current.scrollTo({
              x: nextIndex * viewportWidth,
              y: 0,
              animated: true,
           });
        }
        return nextIndex;
      });
    }, 3000); 

    // Dọn dẹp interval khi component unmount hoặc khi dependency thay đổi
    return () => clearInterval(interval);

  // 3. Thêm isUserScrolling vào dependency để useEffect chạy lại khi trạng thái này thay đổi
  }, [bannerData, isUserScrolling]);

  // Hàm xử lý khi người dùng lướt banner bằng tay
  const handleScrollEnd = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / viewportWidth);
    setBannerIndex(index);
  };

  return (
    <View style={styles.headerContainer}>
        
        <ScrollView
          ref={bannerRef}
          horizontal={true}
          pagingEnabled={true} 
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
        >
          {bannerData.map((item, index) => (
            <View key={index} style={styles.bannerWrapper}> 
              <TouchableHighlight 
                underlayColor="transparent" 
                onPress={() => onPressRecipe(item)}
              >
                <View style={styles.bannerContainer}>
                  <Image style={styles.bannerPhoto} source={{ uri: item.photo_url }} />
                </View>
              </TouchableHighlight>
            </View>
          ))}
        </ScrollView>
        
        <View style={styles.paginationContainer}>
           {bannerData.map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.paginationDot, 
                  { backgroundColor: i === bannerIndex ? '#000000' : '#ddd' }
                ]} 
              />
           ))}
        </View>
    </View>
  );
}

export default React.memo(HomeBanner);