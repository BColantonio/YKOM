import * as React from 'react';
import { View, Text } from 'react-native';
import { globalStyles } from '../styles/global';

export default function SettingsScreen({ navigation }) {
  return (
    <View style={globalStyles.container}>
        <Text>Settings</Text>
    </View>
  );
}
