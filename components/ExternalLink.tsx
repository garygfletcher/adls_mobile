import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Linking, Platform, Pressable, StyleProp, ViewStyle } from 'react-native';

type ExternalLinkProps = {
  href: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ExternalLink({ href, children, style }: ExternalLinkProps) {
  const onPress = async () => {
    if (Platform.OS === 'web') {
      await Linking.openURL(href);
      return;
    }

    await WebBrowser.openBrowserAsync(href);
  };

  return (
    <Pressable onPress={onPress} style={style}>
      {children}
    </Pressable>
  );
}
