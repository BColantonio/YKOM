// LoginScreen.js
import React, { Component } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { loginSuccess } from '../../store/authActions';

class LoginScreen extends Component {
  state = {
    email: '',
    password: '',
  };

  handleEmailChange = (text) => {
    this.setState({ email: text });
  };

  handlePasswordChange = (text) => {
    this.setState({ password: text });
  };

  handleLogin = () => {
    // Add your login logic here
    // Your authentication logic here

    // Dispatch the login success action
    this.props.loginSuccess(user); // Pass the user data to the action
  };

  navigateToSignUp = () => {
    // Use the navigation prop to navigate to the SignUp screen
    this.props.navigation.navigate('SignUp');
  };

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Login</Text>
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
        <Button title="Login" onPress={this.handleLogin} />
        {/* "Sign Up" link */}
        <Button title="Sign Up" onPress={this.navigateToSignUp} />
      </View>
    );
  }
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
  input: {
    width: '80%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingLeft: 10,
  },
});

// Connect the component to the Redux store
export default connect(null, { loginSuccess })(LoginScreen);
