import { StyleSheet, TextInput, TouchableOpacity, StatusBar } from 'react-native';
import React from 'react';
import { Text, View } from '@/components/Themed';
import { useState, useEffect } from 'react';
import axios from 'axios';
// MITIGATION: Replace AsyncStorage with secure storage alternatives
// import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import SInfo from 'react-native-sensitive-info';
import { jwtDecode } from 'jwt-decode';
import { default as RNSSLPinning } from 'react-native-ssl-pinning';
import { router } from 'expo-router';
import { MemoryStore } from '@/utils/MemoryStore';

// Type guard for Keychain credentials
function isKeychainCredentials(credentials: any): credentials is { username: string; password: string; service: string } {
  return credentials && typeof credentials === 'object' && 'password' in credentials;
}

// MITIGATION: Configure SSL Pinning (no initialization needed for this library)
const configureSslPinning = () => {
  // This library doesn't need initialization
  console.log('SSL pinning will be used in production mode');
};

// API URL - Use your computer's IP address for the API
// Replace localhost with your computer's IP address
const API_URL = __DEV__ ? 'http://192.168.1.5:3000' : 'https://api.example.com';

interface JwtPayload {
  sub: string;
  name: string;
  iat: number;
  exp?: number; // MITIGATION: Check for token expiration
}

export default function TabOneScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // MITIGATION: Removed hardcoded API key, using environment variables or secure storage
  // const API_KEY = "sk_test_51LtEg4W20tVPERFMGkw8lZNJfZkNwcV";
  
  useEffect(() => {
    // MITIGATION: Set up SSL pinning on component mount
    configureSslPinning();
    
    // MITIGATION: Secure token check
    checkLoginStatus();
  }, []);

  // MITIGATION: Validate JWT token
  const isTokenValid = (token: JwtPayload): boolean => {
    // Check if token has expiration
    if (!token.exp) return false;
    
    // Check if token is expired
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
        console.error('Error accessing Keychain:', keychainError);
        // Try fallback memory store
        credentials = MemoryStore.getCredentials();
        console.log('Using memory store fallback for retrieving credentials');
      }
      
      if (isKeychainCredentials(credentials)) {
        try {
          // MITIGATION: Validate token before accepting it
          const decodedToken = jwtDecode<JwtPayload>(credentials.password);
          
          if (isTokenValid(decodedToken)) {
            setUser(decodedToken);
            setIsLoggedIn(true);
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
    } catch (error) {
      console.error('Error checking login status', error);
    }
  };

  const handleLogin = async () => {
    try {
      console.log('Login attempt with:', username, password);
      console.log('API URL:', `${API_URL}/login`);
      
      // MITIGATION: Input validation
      if (!username || !password) {
        setErrorMessage('Username and password are required');
        return;
      }
      
      // MITIGATION: Use HTTPS instead of HTTP in production
      // MITIGATION: Use SSL Pinning for API requests in production
      const apiUrl = `${API_URL}/login`;
      
      let response;
      if (!__DEV__) { // MITIGATION: Use SSL pinning in production
        response = await RNSSLPinning.fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            password,
          }),
          sslPinning: {
            certs: ["cert1"] // Add your certificate names here
          }
        });
        
        // Parse JSON response
        const responseText = await response.text();
        const responseData = JSON.parse(responseText);
        
        if (responseData.token) {
          // MITIGATION: Store token securely, don't store password
          await Keychain.setGenericPassword(username, responseData.token);
          
          // MITIGATION: Store non-sensitive data with encryption
          await SInfo.setItem('username', username, {
            sharedPreferencesName: 'secureApp',
            keychainService: 'secureApp'
          });
          
          const decoded = jwtDecode<JwtPayload>(responseData.token);
          
          // MITIGATION: Validate token
          if (isTokenValid(decoded)) {
            setUser(decoded);
            setIsLoggedIn(true);
            setErrorMessage('');
          } else {
            setErrorMessage('Invalid or expired token received');
          }
        } else {
          setErrorMessage('Invalid credentials');
        }
      } else {
        // In development, use regular axios (or implement dev certificates)
        console.log('Using axios to connect to:', apiUrl);
        try {
          response = await axios.post(apiUrl, {
            username,
            password,
          });
          
          console.log('API response:', response.data);
          
          if (response.data.token) {
            // MITIGATION: Store token securely, don't store password
            let keychainStorageSuccessful = false;
            
            try {
              console.log('Attempting to store credentials in Keychain...');
              await Keychain.setGenericPassword(username, response.data.token);
              console.log('Successfully stored in Keychain');
              keychainStorageSuccessful = true;
            } catch (keychainError) {
              console.error('Failed to store in Keychain:', keychainError);
              // Fall back to memory storage - less secure but prevents app crash
              MemoryStore.setCredentials(username, response.data.token);
              console.log('Using in-memory token storage as fallback');
            }
            
            // MITIGATION: Store non-sensitive data with encryption
            try {
              await SInfo.setItem('username', username, {
                sharedPreferencesName: 'secureApp',
                keychainService: 'secureApp'
              });
            } catch (sinfoError) {
              console.error('Failed to store with SInfo:', sinfoError);
            }
            
            const decoded = jwtDecode<JwtPayload>(response.data.token);
            
            // MITIGATION: Validate token
            if (isTokenValid(decoded)) {
              setUser(decoded);
              setIsLoggedIn(true);
              setErrorMessage('');
            } else {
              setErrorMessage('Invalid or expired token received');
            }
          } else {
            console.log('No token in response:', response.data);
            setErrorMessage('Invalid credentials');
          }
        } catch (error: any) {
          console.error('Axios error:', error);
          if (error.response) {
            console.log('Error response:', error.response.status, error.response.data);
          } else if (error.request) {
            console.log('No response received:', error.request);
          } else {
            console.log('Error message:', error.message);
          }
          throw error; // Re-throw to trigger the fallback
        }
      }
    } catch (error) {
      console.log('Falling back to mock login. Error:', error);
      
      // For demo purposes only
      console.log('Using mock login since API is not available');
      
      // MITIGATION: Remove hardcoded credentials in production
      if (__DEV__ && username === 'admin' && password === 'password123') {
        // Generate token with expiration (for demo only)
        const currentTime = Math.floor(Date.now() / 1000);
        const payload = {
          sub: "1234567890",
          name: "John Doe",
          iat: currentTime,
          exp: currentTime + 3600 // 1 hour expiration
        };
        
        const tokenHeader = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
        const tokenPayload = btoa(JSON.stringify(payload));
        const fakeToken = `${tokenHeader}.${tokenPayload}.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`;
        
        // MITIGATION: Secure storage
        let keychainStorageSuccessful = false;
        
        try {
          await Keychain.setGenericPassword(username, fakeToken);
          keychainStorageSuccessful = true;
        } catch (keychainError) {
          console.error('Failed to store mock credentials in Keychain:', keychainError);
          // Fallback to memory storage
          MemoryStore.setCredentials(username, fakeToken);
        }
        
        try {
          await SInfo.setItem('username', username, {
            sharedPreferencesName: 'secureApp',
            keychainService: 'secureApp'
          });
        } catch (sinfoError) {
          console.error('Failed to store with SInfo:', sinfoError);
        }
        
        setUser(payload);
        setIsLoggedIn(true);
        setErrorMessage('');
      } else {
        setErrorMessage('Invalid credentials');
      }
    }
  };

  const handleLogout = async () => {
    // MITIGATION: Properly clear all secure storage on logout
    try {
      await Keychain.resetGenericPassword();
    } catch (keychainError) {
      console.error('Error resetting Keychain:', keychainError);
    }
    
    // Clear memory store fallback
    MemoryStore.resetCredentials();
    
    try {
      await SInfo.deleteItem('username', {
        sharedPreferencesName: 'secureApp',
        keychainService: 'secureApp'
      });
    } catch (sinfoError) {
      console.error('Error deleting from SInfo:', sinfoError);
    }
    
    setIsLoggedIn(false);
    setUser(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.background}>
        {!isLoggedIn ? (
          <View style={styles.contentContainer}>
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Security Testing Lab</Text>
              <Text style={styles.subtitle}>Secure React Native App</Text>
            </View>
            
            <View style={styles.cardContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your username"
                  placeholderTextColor="#a0a0a0"
                  value={username}
                  onChangeText={setUsername}
                />
                
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#a0a0a0"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                
                {errorMessage ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.error}>{errorMessage}</Text>
                  </View>
                ) : null}
                
                <TouchableOpacity style={styles.button} onPress={handleLogin}>
                  <Text style={styles.buttonText}>LOGIN</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.testButton} 
                  onPress={() => router.push("/test" as any)}
                >
                  <Text style={styles.buttonText}>API CONNECTION TEST</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {__DEV__ && <Text style={styles.hint}>Hint: Try admin/password123</Text>}
          </View>
        ) : (
          <View style={styles.contentContainer}>
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeTitle}>Welcome, {user?.name || username}!</Text>
              <Text style={styles.subtitle}>You're logged in to the secure app</Text>
            </View>
            
            <View style={styles.securityCard}>
              <Text style={styles.securityCardTitle}>Security Measures:</Text>
              <View style={styles.securityFeature}>
                <View style={styles.bulletPoint} />
                <Text style={styles.securityText}>Secure credential storage</Text>
              </View>
              <View style={styles.securityFeature}>
                <View style={styles.bulletPoint} />
                <Text style={styles.securityText}>HTTPS with SSL pinning</Text>
              </View>
              <View style={styles.securityFeature}>
                <View style={styles.bulletPoint} />
                <Text style={styles.securityText}>JWT token validation</Text>
              </View>
              <View style={styles.securityFeature}>
                <View style={styles.bulletPoint} />
                <Text style={styles.securityText}>Environment-aware security controls</Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.buttonText}>LOGOUT</Text>
            </TouchableOpacity>
          </View>
        )}
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#e0e0e0',
    marginTop: 8,
    textAlign: 'center',
  },
  cardContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#4361ee',
    width: '100%',
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  testButton: {
    backgroundColor: '#4CAF50',
    width: '100%',
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  error: {
    color: '#d32f2f',
    textAlign: 'center',
  },
  hint: {
    marginTop: 20,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  securityCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  securityCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  securityFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4361ee',
    marginRight: 10,
  },
  securityText: {
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#f44336',
    width: '80%',
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
