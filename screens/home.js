import * as React from 'react';
import { View, Text, Dimensions, Animated } from 'react-native';
import { globalStyles } from '../styles/global';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import data from '../data';

const maxVisibleItems = 8;

const { width } = Dimensions.get('window');
const _size = width * 0.9;

const layout = {
  borderRadius: 16,
  width: _size,
  height: _size * 1.27,
  spacing: 12,
  cardsGap: 22,
};

function Card({ info, index, totalLength, onSwipe }) {
  const translateX = new Animated.Value(0);

  const onGestureEvent = Animated.event(
    [
      {
        nativeEvent: {
          translationX: translateX,
        },
      },
    ],
    { useNativeDriver: false } // Ensure to set useNativeDriver to false for Android compatibility
  );

  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      if (Math.abs(event.nativeEvent.translationX) > width / 2) {
        // Card swiped far enough, dismiss it
        onSwipe();
      } else {
        // Reset the card position
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: false, // Ensure to set useNativeDriver to false for Android compatibility
        }).start();
      }
    }
  };

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <Animated.View
        style={[
          globalStyles.card,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <Text
        style={[
          globalStyles.title,
          {
            position: 'absolute',
            top: -layout.spacing,
            right: layout.spacing,
            fontSize: 102,
            opacity: 0.05,
          },
        ]}
        >
          {index}
        </Text>
        <View style={globalStyles.cardContent}>
          <Text style={globalStyles.title}>{info.type}</Text>
          <View style={globalStyles.row}>
            <Text style={globalStyles.subtitle}>
              {info.from} - {info.to}
            </Text>
          </View>
          <View style={globalStyles.row}>
            <Text style={globalStyles.subtitle}>{info.distance} km</Text>
          </View>
          <View style={globalStyles.row}>
            <Text style={globalStyles.subtitle}>{info.role}</Text>
          </View>
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
}

export default function HomeScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const handleSwipe = () => {
    // Handle card dismissal logic here, e.g., remove the card from the data array
    setCurrentIndex((prevIndex) => prevIndex + 1);
  };

  return (
    <View style={globalStyles.container}>
      {data.slice(currentIndex, currentIndex + 1).map((c, index) => {
        return (
          <Card
            info={c}
            key={c.id}
            index={index}
            totalLength={data.length - 1}
            onSwipe={handleSwipe}
          />
        );
      })}
    </View>
  );
}
