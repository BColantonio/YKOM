import * as React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { globalStyles } from '../styles/global';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import data from '../data';


const maxVisibleItems = 8;

const { width } = Dimensions.get('window')
const _size = width * 0.9


const layout = {
  borderRadius: 16,
  width: _size,
  height: _size * 1.27,
  spacing: 12,
  cardsGap: 22,
}

function Card ({
  info,
  index,
  totalLength
}) {
  return (
    <View style={globalStyles.card}>
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
    </View>
  )
}

export default function HomeScreen({ navigation }) {
  return (
    <GestureHandlerRootView style={globalStyles.container}>
      <View
        style={{
          alignItems: 'center',
          flex: 1,
          justifyContent: 'flex-end',
          marginBottom: layout.cardsGap * 2,
        }}
        pointerEvents="box-none"
      >
        {data.slice(0, 1).map((c, index) => {
          return (
            <Card
              info={c}
              key={c.id}
              index={index}
              totalLength={data.length - 1}
            />
          )
        })}
      </View>
    </GestureHandlerRootView>
  )
}
