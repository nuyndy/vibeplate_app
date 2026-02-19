import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  categoriesItemContainer: {
    // Layout
    flex: 1,
    margin: 10,
    height: 215,
    justifyContent: 'center',
    alignItems: 'center',
    
    // Appearance
    backgroundColor: 'white',
    borderWidth: 0.5,
    borderColor: '#cccccc',
    borderRadius: 20,
  },

  categoriesPhoto: {
    // Layout & Dimension
    width: '100%',
    height: 155,
    
    // Border Styling
    borderRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    
    // Shadow & Elevation (Android & iOS)
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowRadius: 5,
    shadowOpacity: 0.2,
    elevation: 3,
  },

  categoriesName: {
    // Layout
    flex: 1,
    marginTop: 8,
    
    // Typography
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333333',
  },

  categoriesInfo: {
    // Layout
    marginTop: 3,
    marginBottom: 5,
    
    // Typography
    fontSize: 14,
    fontWeight: '600',
    color: '#727272',
  },
});

export default styles;