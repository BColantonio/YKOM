import React, { useState } from 'react';
import { View, Text, Pressable, Animated, Easing } from 'react-native';

export default function ExpandedCard() {
  const [isExpanded, setIsExpanded] = useState(false);

  const expandCard = () => {
    setIsExpanded(!isExpanded);
  };

  const cardHeight = isExpanded ? 200 : 100; // Adjust the height values as needed
  const animationDuration = 300; // Adjust the animation duration as needed

  const cardHeightAnim = new Animated.Value(cardHeight);

  const toggleCardHeight = () => {
    Animated.timing(cardHeightAnim, {
      toValue: isExpanded ? 100 : 200,
      duration: animationDuration,
      easing: Easing.linear,
      useNativeDriver: false, // Required for height animations
    }).start(expandCard);
  };

  return (
    <View>
      <Pressable onPress={toggleCardHeight}>
        <Animated.View
          style={{
            height: cardHeightAnim,
            backgroundColor: 'lightblue',
            borderRadius: 10,
            padding: 16,
            margin: 10,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text>Click to Expand/Collapse</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}
