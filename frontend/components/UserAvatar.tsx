import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

interface UserAvatarProps {
  profilePhoto?: string | null;
  size?: number;
  iconSize?: number;
  backgroundColor?: string;
  iconColor?: string;
}

export default function UserAvatar({
  profilePhoto,
  size = 40,
  iconSize,
  backgroundColor = '#FEF3C7',
  iconColor = Colors.secondary,
}: UserAvatarProps) {
  const calculatedIconSize = iconSize || size * 0.5;

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  const imageStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (profilePhoto) {
    // Handle both base64 and data URI formats
    const imageUri = profilePhoto.startsWith('data:')
      ? profilePhoto
      : `data:image/jpeg;base64,${profilePhoto}`;

    return (
      <Image
        source={{ uri: imageUri }}
        style={imageStyle}
        defaultSource={require('../assets/images/icon.png')}
      />
    );
  }

  return (
    <View style={containerStyle}>
      <Ionicons name="person" size={calculatedIconSize} color={iconColor} />
    </View>
  );
}
