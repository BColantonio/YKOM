// App.js
import React from 'react';
import { Provider } from 'react-redux';
import store from './store'; // Import your Redux store here
import AppNavigator from './src/navigation/AppNavigator'; // Your navigation component

const App = () => {
  return (
    <Provider store={store}>
      <AppNavigator />
    </Provider>
  );
};

export default App;
