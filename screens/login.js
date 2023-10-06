import * as React from 'react';
import { Button, Pressable, View, Text, TextInput } from 'react-native';
import { globalStyles } from '../styles/global';

export default function LogInScreen({ navigation }) {
  return (
    <View style={globalStyles.container}>
      <TextInput
        style={globalStyles.input}
        placeholder="Email"
        onChangeText={console.log('textchange')}
      />
      <TextInput
        style={globalStyles.input}
        placeholder="Password"
        secureTextEntry
        onChangeText={console.log('textchange')}
      />
      <Pressable style={globalStyles.buttonLogin} onPress={() => navigation.navigate('Home')}>
        <Text style={globalStyles.buttonText}>log in</Text>
      </Pressable>
      {/* <Text style={globalStyles.subtext}>or</Text> */}
      <Pressable style={globalStyles.buttonSignup} onPress={console.log('handleSignup')}>
        <Text style={globalStyles.buttonText}>sign up</Text>
      </Pressable>
      
    </View>
  );
}
