// SignUpScreen.js
import React, { Component } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { signUpSuccess } from '../../store/authActions';

class SignUpScreen extends Component {
  state = {
    email: '',
    password: '',
    confirmPassword: '',
  };

  handleEmailChange = (text) => {
    this.setState({ email: text });
  };

  handlePasswordChange = (text) => {
    this.setState({ password: text });
  };

  handleConfirmPasswordChange = (text) => {
    this.setState({ confirmPassword: text });
  };

  handleSignUp = () => {
    // Add your sign-up logic here
    this.props.signUpSuccess(user);
  };

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Sign Up</Text>
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
        <Button title="Sign Up" onPress={this.handleSignUp} />
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

export default connect(null, { signUpSuccess })(SignUpScreen);
