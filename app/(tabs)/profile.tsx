import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { hapticImpact, hapticSelection, hapticSuccess } from "@/utils/haptics";

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Your music preferences</Text>

        <View style={{ height: 24 }} />

        <TouchableOpacity
          testID="profile-btn-selection"
          accessibilityRole="button"
          style={styles.button}
          onPress={async () => { await hapticSelection(); }}
        >
          <Text style={styles.buttonText}>Test Selection</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="profile-btn-impact"
          accessibilityRole="button"
          style={[styles.button, { backgroundColor: "#334155" }]}
          onPress={async () => { await hapticImpact('medium'); }}
        >
          <Text style={styles.buttonText}>Test Impact</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="profile-btn-success"
          accessibilityRole="button"
          style={[styles.button, { backgroundColor: "#16a34a" }]}
          onPress={async () => { await hapticSuccess(); }}
        >
          <Text style={styles.buttonText}>Test Success</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#888",
  },
  button: {
    marginTop: 12,
    backgroundColor: "#1f2937",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});