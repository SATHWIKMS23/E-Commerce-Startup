import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_SIZE = 80;

export const GridBackground: React.FC = () => {
  const horizontalLines = Math.ceil(SCREEN_HEIGHT / GRID_SIZE) + 2;
  const verticalLines = Math.ceil(SCREEN_WIDTH / GRID_SIZE) + 2;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Horizontal grid lines matching web 80px */}
      {Array.from({ length: horizontalLines }).map((_, i) => (
        <View
          key={`h-${i}`}
          style={[styles.hLine, { top: i * GRID_SIZE }]}
        />
      ))}
      {/* Vertical grid lines matching web 80px */}
      {Array.from({ length: verticalLines }).map((_, i) => (
        <View
          key={`v-${i}`}
          style={[styles.vLine, { left: i * GRID_SIZE }]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  hLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  vLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
});
