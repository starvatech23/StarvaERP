import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation sequence
    Animated.sequence([
      // Logo appears with scale
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Delay
      Animated.delay(300),
      // Text appears
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Tagline appears
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Hold for 1.5 seconds (total ~2.5-3 seconds with animations)
      Animated.delay(1500),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <LinearGradient
      colors={['#F97316', '#EA580C', '#C2410C']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Background Pattern */}
      <View style={styles.patternContainer}>
        <View style={[styles.patternCircle, styles.circle1]} />
        <View style={[styles.patternCircle, styles.circle2]} />
        <View style={[styles.patternCircle, styles.circle3]} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <View style={styles.logoBackground}>
            <Ionicons name="construct" size={60} color="#F97316" />
          </View>
        </Animated.View>

        {/* App Name */}
        <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
          <Text style={styles.starvaText}>Starva's</Text>
          <Text style={styles.appName}>SiteOps</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={[styles.taglineContainer, { opacity: taglineOpacity }]}>
          <View style={styles.divider} />
          <Text style={styles.tagline}>India's Complete Site Management Application</Text>
          <View style={styles.divider} />
        </Animated.View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by Starva Technologies</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patternContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  patternCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  circle1: {
    width: width * 1.5,
    height: width * 1.5,
    top: -width * 0.5,
    right: -width * 0.5,
  },
  circle2: {
    width: width * 1.2,
    height: width * 1.2,
    bottom: -width * 0.3,
    left: -width * 0.4,
  },
  circle3: {
    width: width * 0.8,
    height: width * 0.8,
    bottom: height * 0.2,
    right: -width * 0.2,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 30,
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  starvaText: {
    fontSize: 22,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  appName: {
    fontSize: 52,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 3,
    marginTop: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  taglineContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 1,
    marginVertical: 12,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
  },
});
