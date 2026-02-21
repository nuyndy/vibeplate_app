import { LogBox } from 'react-native'; 
import AppContainer from './src/navigations/AppNavigation';

import { BadgeProvider } from './src/contexts/BadgeContext';

// 2. Tắt thông báo vàng
LogBox.ignoreLogs([
  "[Reanimated] Reading from `value`",
  "[react-native-gesture-handler]",
  "Sending `onAnimatedValueUpdate`",
  "Setting a timer",
]);

export default function App() {
  return (
    <BadgeProvider>
      <AppContainer />
    </BadgeProvider>
  );
}
