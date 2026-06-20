import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../services/config';
import { submitCrisis, CrisisResponse } from '../services/api';

interface CrisisFormProps {
  visible: boolean;
  onClose: () => void;
  onResult: (result: CrisisResponse) => void;
}

export default function CrisisForm({ visible, onClose, onResult }: CrisisFormProps) {
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [crisis, setCrisis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      // Clean up speech recognition if component unmounts
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Voice Input', 'Voice input is only supported in web browsers.');
      return;
    }

    try {
      // Explicitly request mic permission first
      const nav = (typeof navigator !== 'undefined' ? navigator : null) as any;
      if (nav && nav.mediaDevices && nav.mediaDevices.getUserMedia) {
        await nav.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (permErr) {
      Alert.alert('Microphone Access', 'Please allow microphone access in your browser settings to use voice input.');
      return;
    }

    const globalObj: any = new Function('return this')();
    const SpeechRecognition = globalObj.SpeechRecognition || globalObj.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      Alert.alert('Voice Input', 'Web Speech API is not supported in this browser.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const speechToText = event.results[0][0].transcript;
        setCrisis((prev) => (prev ? prev + ' ' + speechToText : speechToText));
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          Alert.alert('Microphone Blocked', 'Please allow microphone access in your browser settings and try again.');
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error('Speech recognition initialization error:', err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleClose = () => {
    stopListening();
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!crisis.trim()) {
      setError('Please describe your crisis.');
      return;
    }
    stopListening();
    setLoading(true);
    setError('');
    try {
      const result = await submitCrisis(state, country, crisis);
      onResult(result);
      setState('');
      setCountry('');
      setCrisis('');
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to connect. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <Text style={styles.title}>Tell us about your situation</Text>

            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Karnataka"
              placeholderTextColor={COLORS.textMuted}
              value={state}
              onChangeText={setState}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Country</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. India"
              placeholderTextColor={COLORS.textMuted}
              value={country}
              onChangeText={setCountry}
              autoCapitalize="words"
            />

            <View style={styles.inputLabelRow}>
              <Text style={styles.label}>What crisis are you facing?</Text>
              {Platform.OS === 'web' && (
                <TouchableOpacity
                  onPress={toggleListening}
                  style={[
                    styles.micButton,
                    isListening && styles.micButtonActive
                  ]}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isListening ? "mic" : "mic-outline"}
                    size={16}
                    color={isListening ? "#FF5252" : COLORS.primary}
                  />
                  <Text style={[styles.micText, isListening && styles.micTextActive]}>
                    {isListening ? "Listening..." : "Speak"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={isListening ? "Listening... Speak clearly into your mic." : "Describe your situation..."}
              placeholderTextColor={COLORS.textMuted}
              value={crisis}
              onChangeText={setCrisis}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>FIND HELP</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    color: COLORS.text,
    fontSize: FONTS.subtitle,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: FONTS.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 12,
  },
  micButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  micButtonActive: {
    borderColor: '#FF525255',
    backgroundColor: '#FF525215',
  },
  micText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  micTextActive: {
    color: '#FF5252',
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    fontSize: FONTS.body,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 100,
  },
  error: {
    color: COLORS.error,
    fontSize: FONTS.caption,
    marginTop: 12,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: FONTS.button,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  cancelButton: {
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
  },
  cancelText: {
    color: COLORS.textMuted,
    fontSize: FONTS.body,
  },
});
