import React from 'react';
import { LogBox } from 'react-native'; // <--- 1. Thêm dòng này
import AppContainer from './src/navigations/AppNavigation';

// <--- 2. Thêm đoạn này để tắt thông báo vàng khó chịu
LogBox.ignoreLogs([
  "[Reanimated] Reading from `value`",
  "[react-native-gesture-handler]",
  "Sending `onAnimatedValueUpdate`",
]);
export default function App() {
  return (
     <AppContainer />
  );
}
