import * as React from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function LogInScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Email"
        onChangeText={this.handleEmailChange}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        onChangeText={this.handlePasswordChange}
      />
      <Button title="go" onPress={this.handleLogin} />
      {/* "Sign Up" link */}
      <Text style={styles.subtext}>or</Text>
      <Button title="sign up" onPress={() => navigation.navigate('sign up')} />
    </View>
  );
}

function SignUpScreen() {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Email"
        onChangeText={this.handleEmailChange}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        onChangeText={this.handlePasswordChange}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        secureTextEntry
        onChangeText={this.handleConfirmPasswordChange}
      />
      <Button title="sign up" onPress={this.handleSignUp} />
    </View>
  );
}

const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="log in">
        <Stack.Screen name="log in" component={LogInScreen} />
        <Stack.Screen name="sign up" component={SignUpScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  subtext: {
    fontSize: 12,
    marginBottom: 0,
  },
  input: {
    width: '80%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingLeft: 10,
  },
});

export default App;
