import * as React from 'react';
import { View, Text, Dimensions, Animated, Switch, ScrollView, FlatList, TouchableOpacity, Pressable } from 'react-native';
import { globalStyles } from '../styles/global';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import data from '../data';
import ExpandedCard from '../components/expandedCard';

const maxVisibleItems = 8;

const { width, height } = Dimensions.get('window');
const _size = width * 0.9;

const layout = {
  borderRadius: 16,
  width: _size,
  height: _size * 1.27,
  spacing: 12,
  cardsGap: 22,
};

// Define action constants
const SWIPE_ACTIONS = {
  LEFT: 'NO',
  RIGHT: 'YES',
  UP: 'GET ME IN THE MOOD FIRST',
  DOWN: 'MAYBE',
};

function Card({ info, index, totalLength, onSwipe, isExpanded, onCardClick }) {
  const translateX = new Animated.Value(0);
  const translateY = new Animated.Value(0);

  const onGestureEvent = Animated.event(
    [
      {
        nativeEvent: {
          translationX: translateX,
          translationY: translateY,
        },
      },
    ],
    { useNativeDriver: false } // Ensure to set useNativeDriver to false for Android compatibility
  );

  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX, translationY } = event.nativeEvent;

      if (Math.abs(translationX) > width / 2 || Math.abs(translationY) > height / 2) {
        // Card swiped far enough in any direction, dismiss it
        onSwipe();
      } else {
        // Reset the card position
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      }
    }
  };

  return (
    <TouchableOpacity onPress={() => (isExpanded ? onCardClick() : null)}>
      <View>
        {isExpanded ? (
          <ExpandedCard info={info} onClose={onCardClick} />
        ) : (
          <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
          >
            <Animated.View
              style={[
                globalStyles.card,
                {
                  transform: [{ translateX }, { translateY }],
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
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isListView, setIsListView] = React.useState(true); // State for toggle
  const [toggleValue, setToggleValue] = React.useState(true); // State for the Switch
  const [expandedCard, setExpandedCard] = React.useState(null);

  const handleSwipe = () => {
    // Handle card dismissal logic here, e.g., remove the card from the data array
    setCurrentIndex((prevIndex) => prevIndex + 1);
  };

  const handleCardClick = (item) => {
    // Set the clicked card as expanded
    setExpandedCard(item);
  };
  
  const handleCloseExpandedCard = () => {
    // Close the expanded card view
    setExpandedCard(null);
  };

  const renderItem = ({ item }) => {
    if (isListView) {
      // Render card view
      return (
        <TouchableOpacity onPress={() => handleCardClick(item)}>
          <Card
            info={item}
            index={currentIndex}
            totalLength={data.length - 1}
            onSwipe={handleSwipe}
          />
        </TouchableOpacity>
      );
    } else {
      // Render list view
      return (
        <View style={globalStyles.listViewItem}>
          <Text style={globalStyles.textOnDark}>{item.type}</Text>
          <Text style={globalStyles.textOnDark}>{item.from} - {item.to}</Text>
          <Text style={globalStyles.textOnDark}>{item.distance} km</Text>
          <Text style={globalStyles.textOnDark}>{item.role}</Text>
        </View>
      );
    }
  };

  return (
    <View style={globalStyles.homeScreen}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={globalStyles.textOnDark}>List</Text>
        <Switch
          value={toggleValue}
          onValueChange={(value) => {
            setToggleValue(value);
            setIsListView(value);
          }}
        />
        <Text style={globalStyles.textOnDark}>Card</Text>
      </View>
      {!isListView ? (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
        />
      ) : (
        <ScrollView>
          <FlatList
            data={data.slice(currentIndex, currentIndex + 1)}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
          />
          <Pressable onPress={console.log('skip this card')}>
            <Text style={globalStyles.textOnDark}>Skip</Text>
          </Pressable>
        </ScrollView>
      )}
      {expandedCard && (
        <ExpandedCard info={expandedCard} onClose={handleCloseExpandedCard} />
      )}
    </View>
  );
}
