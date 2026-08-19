import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { radius, spacing } from "../theme";

export default function SignupScreen({ navigation }) {
  const { signup } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSignup() {
    if (!name || !email || !password) {
      Alert.alert("Missing details", "Please fill in every field.");
      return;
    }
    if (password.length < 8) {
      // Matches the real minimum the backend enforces (netlify/functions/
      // auth-signup.js) — catching it here saves a round trip, but the
      // server is the actual source of truth for this rule.
      Alert.alert("Weak password", "Use at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await signup(email.trim(), name.trim(), password);
      if (navigation.canGoBack()) navigation.goBack();
    } catch (e) {
      Alert.alert("Sign up failed", e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TextInput
        style={styles.input}
        placeholder="Your name"
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min 6 chars)"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.button} onPress={onSignup} disabled={busy}>
        {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>Create account</Text>}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, justifyContent: "center", padding: spacing.lg },
    input: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      fontSize: 16,
      marginBottom: spacing.md,
      color: colors.text,
    },
    button: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: "center" },
    buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: "700" },
  });
}
