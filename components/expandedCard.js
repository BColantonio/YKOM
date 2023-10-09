import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { globalStyles } from '../styles/global';

function ExpandedCard({ info, onClose }) {
  return (
    <View style={globalStyles.container}>
      <TouchableOpacity style={globalStyles.card} onPress={onClose}>
        <Text style={globalStyles.title}>{info.type}</Text>
        <View style={globalStyles.cardContent}>
          <Text style={globalStyles.subtitle}>{info.from} - {info.to}</Text>
          <Text style={globalStyles.subtitle}>{info.distance} km</Text>
          <Text style={globalStyles.subtitle}>{info.role}</Text>
          {/* Add more information as needed */}
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default ExpandedCard;
