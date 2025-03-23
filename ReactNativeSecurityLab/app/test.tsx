import React, { useState, useEffect } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Themed';
import axios from 'axios';
import * as Keychain from 'react-native-keychain';

export default function TestPage() {
  const [apiUrl, setApiUrl] = useState('http://192.168.1.5:3000');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [keychainAvailable, setKeychainAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    // Test if Keychain is available
    checkKeychainAvailability();
  }, []);

  const checkKeychainAvailability = async () => {
    try {
      setResult('Testing Keychain availability...\n');
      // Try to set and get a test value
      const testValue = 'test-value-' + Date.now();
      await Keychain.setGenericPassword('test-user', testValue);
      const credentials = await Keychain.getGenericPassword();
      
      if (credentials && credentials.password === testValue) {
        setKeychainAvailable(true);
        setResult(prev => prev + 'Keychain is available and working correctly.\n');
        // Clean up
        await Keychain.resetGenericPassword();
      } else {
        setKeychainAvailable(false);
        setResult(prev => prev + 'Keychain returned unexpected results.\n');
      }
    } catch (error: any) {
      setKeychainAvailable(false);
      setResult(prev => prev + `Keychain is NOT available. Error: ${error.message}\n`);
      console.error('Keychain error:', error);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    setResult('Testing connection to API...\n');
    
    try {
      const response = await fetch(apiUrl, { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      setResult(prev => prev + `Connection successful! Status: ${response.status}\n`);
    } catch (error: any) {
      setResult(prev => prev + `Connection failed: ${error.message}\n`);
    }
    
    setLoading(false);
  };

  const testLogin = async () => {
    setLoading(true);
    setResult('Testing login...\n');
    
    try {
      const loginUrl = `${apiUrl}/login`;
      setResult(prev => prev + `Attempting to login to: ${loginUrl}\n`);
      
      const response = await axios.post(loginUrl, {
        username,
        password
      });
      
      setResult(prev => prev + `Login successful!\nResponse: ${JSON.stringify(response.data, null, 2)}\n`);
      
      if (response.data.token) {
        // Test notes endpoint with token
        setResult(prev => prev + `\nTesting notes endpoint with token...\n`);
        
        const notesResponse = await axios.get(`${apiUrl}/notes`, {
          headers: {
            'Authorization': `Bearer ${response.data.token}`
          }
        });
        
        setResult(prev => prev + `Notes retrieved successfully!\nNotes: ${JSON.stringify(notesResponse.data, null, 2)}\n`);
      }
    } catch (error: any) {
      setResult(prev => prev + `Login failed: ${error.message}\n`);
      
      if (error.response) {
        setResult(prev => prev + `Error response: ${error.response.status}\nData: ${JSON.stringify(error.response.data, null, 2)}\n`);
      } else if (error.request) {
        setResult(prev => prev + `No response received. Request sent but no response.\n`);
      }
    }
    
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>API Connection Test</Text>
      
      <View style={styles.keychainStatus}>
        <Text style={styles.label}>Keychain Status:</Text>
        {keychainAvailable === null ? (
          <Text>Checking...</Text>
        ) : keychainAvailable ? (
          <Text style={styles.available}>Available</Text>
        ) : (
          <Text style={styles.unavailable}>Unavailable - Using memory fallback</Text>
        )}
      </View>
      
      <Text style={styles.label}>API URL:</Text>
      <TextInput
        style={styles.input}
        value={apiUrl}
        onChangeText={setApiUrl}
        placeholder="API URL"
      />
      
      <Text style={styles.label}>Username:</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        placeholder="Username"
      />
      
      <Text style={styles.label}>Password:</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={testConnection}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Connection</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={testLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Login</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: '#FF9800' }]} 
        onPress={checkKeychainAvailability}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Test Keychain</Text>
      </TouchableOpacity>
      
      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      
      <Text style={styles.resultTitle}>Results:</Text>
      <ScrollView style={styles.resultContainer}>
        <Text>{result}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  keychainStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  available: {
    color: 'green',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  unavailable: {
    color: 'red',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
    flex: 0.48,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
  resultContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
}); 