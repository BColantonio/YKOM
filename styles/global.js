import { StyleSheet, Dimensions } from 'react-native';
const { width } = Dimensions.get('window')
const _size = width * 0.9


const layout = {
  borderRadius: 16,
  width: _size,
  height: _size * 1.27,
  spacing: 12,
  cardsGap: 22,
}

const colors = {
  primary: '#2B2D31',
  secondary: '#EFF9F0',
  action: '#EF233C',
  secondary2: '#DDC8C4',
  action2: '#3891A6'
}

const spacing = {
  small: 4,
  max: 100
}

const sizing = {
  button: 40
}

export const globalStyles = StyleSheet.create({
  buttonGroup: {
    height: spacing.max
  },
  buttonLogin: {
    backgroundColor: colors.action,
    height: sizing.button,
    marginBottom: spacing.small
  },
  buttonSignup: {
    backgroundColor: colors.secondary,
    height: sizing.button
  },
  buttonText: {
    textAlign: 'center',
    lineHeight: sizing.button
  },
  buttonTextForgotPassword: {
    textAlign: 'center',
    lineHeight: sizing.button,
    color: colors.secondary
  },
  centeredContent: {
    alignItems: 'center', // Center content horizontally
  },
  container: {
    // alignItems: 'center', // Center horizontally
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    padding: layout.spacing,
  },
  card: {
    borderRadius: layout.borderRadius,
    width: layout.width,
    height: layout.height,
    padding: layout.spacing,
    backgroundColor: colors.secondary,
  },
  title: { fontSize: 32, fontWeight: '600' },
  subtitle: {},
  cardContent: {
    gap: layout.spacing,
    marginBottom: layout.spacing,
  },
  homeScreen: {
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: colors.primary 
  },
  locationImage: {
    flex: 1,
    borderRadius: layout.borderRadius - layout.spacing / 2,
  },
  row: {
    flexDirection: 'row',
    columnGap: layout.spacing / 2,
    alignItems: 'center',
  },
  textOnDark: {
    color: colors.secondary
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16, // Add some spacing between the toggle and content
  },
  icon: {},
    subtext: {
      fontSize: 12,
      marginBottom: 0,
    },
    input: {
      width: '100%',
      height: 40,
      borderColor: 'gray',
      borderWidth: 1,
      marginBottom: 10,
      paddingLeft: 10,
    },
  });
  