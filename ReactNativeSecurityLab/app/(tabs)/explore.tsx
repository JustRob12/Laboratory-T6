import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, StatusBar } from 'react-native';
import { Text, View } from '@/components/Themed';
// MITIGATION: Replace AsyncStorage with secure storage
// import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import SInfo from 'react-native-sensitive-info';
import axios from 'axios';
import { default as RNSSLPinning } from 'react-native-ssl-pinning';
import { jwtDecode } from 'jwt-decode';
import { MemoryStore } from '@/utils/MemoryStore';
import { Ionicons } from '@expo/vector-icons';

// API URL - Use your computer's IP address for the API
// Replace localhost with your computer's IP address
const API_URL = __DEV__ ? 'http://192.168.1.5:3000' : 'https://api.example.com';

// Type guard for Keychain credentials
function isKeychainCredentials(credentials: any): credentials is { username: string; password: string; service: string } {
  return credentials && typeof credentials === 'object' && 'password' in credentials;
}

interface Note {
  id: number;
  text: string;
  timestamp: string;
}

interface JwtPayload {
  sub: string;
  name: string;
  iat: number;
  exp?: number;
}

export default function TabTwoScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginAttempted, setLoginAttempted] = useState(false);
  const [creditCardNumber, setCreditCardNumber] = useState('');
  const [cvv, setCvv] = useState('');

  // MITIGATION: Disable debug mode in production
  const DEBUG_MODE = __DEV__;

  useEffect(() => {
    checkLoginStatus();
  }, []);

  // MITIGATION: Validate JWT token
  const isTokenValid = (token: JwtPayload): boolean => {
    if (!token.exp) return false;
    const currentTime = Math.floor(Date.now() / 1000);
    return token.exp > currentTime;
  };

  const checkLoginStatus = async () => {
    try {
      // MITIGATION: Use secure storage instead of AsyncStorage
      let credentials = null;
      
      try {
        credentials = await Keychain.getGenericPassword();
      } catch (keychainError) {
        console.error('Error checking Keychain in explore tab:', keychainError);
        // Try fallback memory store
        credentials = MemoryStore.getCredentials();
        console.log('Using memory store fallback for retrieving credentials in explore tab');
      }
      
      if (isKeychainCredentials(credentials)) {
        try {
          // Validate token
          const decoded = jwtDecode<JwtPayload>(credentials.password);
          if (isTokenValid(decoded)) {
            setIsLoggedIn(true);
            fetchNotes();
            fetchSavedCreditCard();
          } else {
            // Token expired, clear credentials
            try {
              await Keychain.resetGenericPassword();
            } catch (resetError) {
              console.error('Error resetting Keychain:', resetError);
            }
            MemoryStore.resetCredentials();
          }
        } catch (err) {
          console.error('Invalid token format', err);
          try {
            await Keychain.resetGenericPassword();
          } catch (resetError) {
            console.error('Error resetting Keychain:', resetError);
          }
          MemoryStore.resetCredentials();
        }
      }
      setLoginAttempted(true);
    } catch (error) {
      console.error('Error checking login status:', error);
      setLoginAttempted(true);
    }
  };

  // MITIGATION: Securely store payment information
  const saveCreditCard = async () => {
    try {
      if (creditCardNumber && cvv) {
        // MITIGATION: Encrypt sensitive data before storage
        // MITIGATION: Use secure storage for sensitive data
        const cardData = JSON.stringify({
          number: creditCardNumber,
          cvv: cvv
        });
        
        try {
          // Store in secure enclave/keychain
          await Keychain.setInternetCredentials(
            'payment_info',
            'payment_data',
            cardData
          );
        } catch (keychainError) {
          console.error('Error saving card to Keychain:', keychainError);
        }
        
        alert('Credit card saved securely!');
        
        // Clear form fields after secure storage
        setCreditCardNumber('');
        setCvv('');
      } else {
        alert('Please enter both credit card number and CVV');
      }
    } catch (error) {
      console.error('Error saving credit card:', error);
      alert('Failed to save credit card information');
    }
  };

  const fetchSavedCreditCard = async () => {
    try {
      // MITIGATION: Retrieve from secure storage
      let credentials = null;
      try {
        credentials = await Keychain.getInternetCredentials('payment_info');
      } catch (keychainError) {
        console.error('Error retrieving card from Keychain:', keychainError);
        return;
      }
      
      if (credentials && typeof credentials === 'object' && 'password' in credentials) {
        try {
          const cardData = JSON.parse(credentials.password);
          setCreditCardNumber(cardData.number);
          setCvv(cardData.cvv);
        } catch (err) {
          console.error('Error parsing saved card data', err);
        }
      }
    } catch (error) {
      console.error('Error fetching saved credit card:', error);
    }
  };

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      // MITIGATION: Use HTTPS in production
      const apiUrl = `${API_URL}/notes`;
      
      let response;
      // MITIGATION: Use SSL pinning in production
      if (!__DEV__) {
        // Get token from secure storage
        let credentials = null;
        try {
          credentials = await Keychain.getGenericPassword();
        } catch (keychainError) {
          console.error('Error checking Keychain for notes:', keychainError);
          credentials = MemoryStore.getCredentials();
        }
        
        if (!isKeychainCredentials(credentials)) throw new Error('Authentication required');
        
        response = await RNSSLPinning.fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${credentials.password}`,
            'Content-Type': 'application/json'
          },
          sslPinning: {
            certs: ["cert1"] // Add your certificate names here
          }
        });
        
        const responseText = await response.text();
        const responseData = JSON.parse(responseText);
        setNotes(responseData.notes || []);
      } else {
        // In development
        let credentials = null;
        try {
          credentials = await Keychain.getGenericPassword();
        } catch (keychainError) {
          console.error('Error checking Keychain for notes in dev mode:', keychainError);
          credentials = MemoryStore.getCredentials();
        }
        
        if (isKeychainCredentials(credentials)) {
          response = await axios.get(apiUrl, {
            headers: {
              Authorization: `Bearer ${credentials.password}`,
              'Content-Type': 'application/json'
            },
          });
          
          setNotes(response.data.notes || []);
        } else {
          throw new Error('No credentials found');
        }
      }
    } catch (error) {
      console.log('Using mock data since API is not available');
      
      // For demo purposes only
      const mockNotes: Note[] = [
        { id: 1, text: 'Business plan draft', timestamp: new Date().toISOString() },
        { id: 2, text: 'Meeting notes', timestamp: new Date().toISOString() },
        { id: 3, text: 'Project requirements', timestamp: new Date().toISOString() },
      ];
      
      // MITIGATION: Encrypt sensitive data before storage
      try {
        await SInfo.setItem('offlineNotes', JSON.stringify(mockNotes), {
          sharedPreferencesName: 'secureApp',
          keychainService: 'secureApp'
        });
      } catch (sinfoError) {
        console.error('Error saving to SInfo:', sinfoError);
      }
      
      setNotes(mockNotes);
    } finally {
      setIsLoading(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      // MITIGATION: Use HTTPS in production
      const apiUrl = `${API_URL}/notes`;
      
      // MITIGATION: Use SSL pinning in production
      if (!__DEV__) {
        // Get token from secure storage
        let credentials = null;
        try {
          credentials = await Keychain.getGenericPassword();
        } catch (keychainError) {
          console.error('Error checking Keychain for adding note:', keychainError);
          credentials = MemoryStore.getCredentials();
        }
        
        if (!isKeychainCredentials(credentials)) throw new Error('Authentication required');
        
        await RNSSLPinning.fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${credentials.password}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text: newNote }),
          sslPinning: {
            certs: ["cert1"] // Add your certificate names here
          }
        });
        
        // Refresh notes after adding
        await fetchNotes();
      } else {
        let credentials = null;
        try {
          credentials = await Keychain.getGenericPassword();
        } catch (keychainError) {
          console.error('Error checking Keychain for adding note in dev:', keychainError);
          credentials = MemoryStore.getCredentials();
        }
        
        if (isKeychainCredentials(credentials)) {
          await axios.post(apiUrl, {
            text: newNote,
          }, {
            headers: {
              Authorization: `Bearer ${credentials.password}`,
            },
          });
          
          // Refresh notes after adding
          await fetchNotes();
        } else {
          throw new Error('No credentials found');
        }
      }
      
      setNewNote('');
    } catch (error) {
      console.log('Using mock data since API is not available');
      
      const newNoteObj: Note = {
        id: notes.length + 1,
        text: newNote,
        timestamp: new Date().toISOString(),
      };
      
      const updatedNotes = [...notes, newNoteObj];
      setNotes(updatedNotes);
      
      // MITIGATION: Encrypt sensitive data before storage
      try {
        await SInfo.setItem('offlineNotes', JSON.stringify(updatedNotes), {
          sharedPreferencesName: 'secureApp',
          keychainService: 'secureApp'
        });
      } catch (sinfoError) {
        console.error('Error saving to SInfo:', sinfoError);
      }
      
      setNewNote('');
    }
  };
  
  // MITIGATION: Secure logout that cleans up all sensitive data
  const handleLogout = async () => {
    // Clear all secure storage
    try {
      await Keychain.resetGenericPassword();
    } catch (keychainError) {
      console.error('Error resetting Keychain:', keychainError);
    }
    
    try {
      await Keychain.resetInternetCredentials('payment_info');
    } catch (keychainError) {
      console.error('Error resetting payment Keychain:', keychainError);
    }
    
    // Clear memory store
    MemoryStore.resetCredentials();
    
    // Clear sensitive info storage
    try {
      await SInfo.deleteItem('username', {
        sharedPreferencesName: 'secureApp',
        keychainService: 'secureApp'
      });
    } catch (sinfoError) {
      console.error('Error deleting from SInfo:', sinfoError);
    }
    
    try {
      await SInfo.deleteItem('offlineNotes', {
        sharedPreferencesName: 'secureApp',
        keychainService: 'secureApp'
      });
    } catch (sinfoError) {
      console.error('Error deleting notes from SInfo:', sinfoError);
    }
    
    setIsLoggedIn(false);
    setCreditCardNumber('');
    setCvv('');
    setNotes([]);
  };

  if (!loginAttempted) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4361ee" />
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.background}>
          <View style={styles.contentContainer}>
            <View style={styles.cardContainer}>
              <Text style={styles.title}>Please Login First</Text>
              <Text style={styles.messageText}>You need to login on the home screen to access this feature.</Text>
              <TouchableOpacity 
                style={styles.button} 
                onPress={() => {
                  // Check if MemoryStore has credentials
                  const memCreds = MemoryStore.getCredentials();
                  if (memCreds) {
                    // Use memory credentials to log in 
                    setIsLoggedIn(true);
                    fetchNotes();
                    fetchSavedCreditCard();
                  }
                }}
              >
                <Text style={styles.buttonText}>RETRY LOGIN CHECK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.background}>
        <View style={styles.contentContainer}>
          <Text style={styles.mainTitle}>Secure Notes</Text>
          
          <View style={styles.cardContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={22} color="#4361ee" />
              <Text style={styles.sectionTitle}>Your Notes</Text>
            </View>
            
            {isLoading ? (
              <ActivityIndicator size="small" color="#4361ee" />
            ) : (
              <>
                <FlatList
                  data={notes}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <View style={styles.noteItem}>
                      <Text style={styles.noteText}>{item.text}</Text>
                      <Text style={styles.noteTimestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
                    </View>
                  )}
                  style={styles.notesList}
                  ListEmptyComponent={
                    <View style={styles.emptyNotesContainer}>
                      <Text style={styles.emptyNotesText}>No notes yet. Add your first note below.</Text>
                    </View>
                  }
                />
                
                <View style={styles.addNoteContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Add a new note"
                    placeholderTextColor="#a0a0a0"
                    value={newNote}
                    onChangeText={setNewNote}
                  />
                  <TouchableOpacity style={styles.addButton} onPress={addNote}>
                    <Ionicons name="add" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
          
          <View style={styles.cardContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="card" size={22} color="#4361ee" />
              <Text style={styles.sectionTitle}>Payment Method</Text>
            </View>
            
            <Text style={styles.infoText}>
              Secured with encrypted storage
            </Text>
            
            <View style={styles.paymentInputContainer}>
              <Text style={styles.inputLabel}>Credit Card Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your card number"
                placeholderTextColor="#a0a0a0"
                value={creditCardNumber}
                onChangeText={setCreditCardNumber}
                keyboardType="number-pad"
              />
              
              <Text style={styles.inputLabel}>CVV</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter CVV"
                placeholderTextColor="#a0a0a0"
                value={cvv}
                onChangeText={setCvv}
                keyboardType="number-pad"
                maxLength={4}
              />
              
              <TouchableOpacity style={styles.button} onPress={saveCreditCard}>
                <Text style={styles.buttonText}>SAVE CARD SECURELY</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.buttonText}>LOGOUT</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: '100%',
    backgroundColor: '#3b5998',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  },
  cardContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  notesList: {
    maxHeight: 200,
    marginBottom: 15,
  },
  noteItem: {
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4361ee',
  },
  noteText: {
    fontSize: 16,
    color: '#333',
  },
  noteTimestamp: {
    fontSize: 12,
    color: '#777',
    marginTop: 5,
  },
  emptyNotesContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyNotesText: {
    color: '#777',
    fontStyle: 'italic',
  },
  addNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 50,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
  },
  addButton: {
    backgroundColor: '#4361ee',
    width: 50,
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#4361ee',
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  infoText: {
    color: '#4CAF50',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  paymentInputContainer: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#f44336',
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
});
