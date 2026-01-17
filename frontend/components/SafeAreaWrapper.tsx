import React from 'react';
import { View, StyleSheet, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  style?: any;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

/**
 * Cross-platform SafeAreaView that properly handles Android status bar
 */
export default function SafeAreaWrapper({ 
  children, 
  style,
  edges = ['top', 'left', 'right'] 
}: SafeAreaWrapperProps) {
  const insets = useSafeAreaInsets();
  
  // Calculate padding based on edges
  const paddingTop = edges.includes('top') 
    ? Platform.OS === 'android' 
      ? Math.max(insets.top, StatusBar.currentHeight || 24) 
      : insets.top
    : 0;
  
  const paddingBottom = edges.includes('bottom') ? insets.bottom : 0;
  const paddingLeft = edges.includes('left') ? insets.left : 0;
  const paddingRight = edges.includes('right') ? insets.right : 0;

  return (
    <View 
      style={[
        styles.container, 
        { 
          paddingTop,
          paddingBottom,
          paddingLeft,
          paddingRight,
        },
        style
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
