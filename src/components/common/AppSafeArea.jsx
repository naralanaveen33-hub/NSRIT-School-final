import React from 'react';
import {StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme';

/**
 * AppSafeArea — full-screen safe area wrapper for screens that manage
 * their own layout (headerShown:false, modals, full-page forms).
 *
 * edges defaults to ['top','bottom','left','right'].
 * For screens inside a bottom-tab navigator, pass edges={['top']} since
 * the tab bar already handles the bottom inset.
 */
const AppSafeArea = ({
  children,
  edges = ['top', 'bottom', 'left', 'right'],
  style,
  backgroundColor = colors.background,
}) => (
  <SafeAreaView
    edges={edges}
    style={[styles.root, {backgroundColor}, style]}>
    {children}
  </SafeAreaView>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default AppSafeArea;
