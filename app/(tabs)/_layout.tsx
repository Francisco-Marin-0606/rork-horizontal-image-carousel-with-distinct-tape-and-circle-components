import { Tabs } from "expo-router";
import { hapticSelection } from "@/utils/haptics";
import { Music, User } from "lucide-react-native";
import React from "react";
import { View, StyleSheet } from "react-native";
import StickyPlayer from "@/components/StickyPlayer";
import GlobalPlayerOverlay from "@/components/GlobalPlayerOverlay";

export default function TabLayout() {
  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#fff",
          tabBarInactiveTintColor: "#666",
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#000",
            borderTopColor: "rgba(255, 255, 255, 0.1)",
            zIndex: 20,
            elevation: 20,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Music",
            tabBarIcon: ({ color }) => <Music color={color} size={24} />,
          }}
          listeners={{
            tabPress: async () => {
              await hapticSelection();
            },
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => <User color={color} size={24} />,
          }}
          listeners={{
            tabPress: async () => {
              await hapticSelection();
            },
          }}
        />
      </Tabs>
      <StickyPlayer />
      <GlobalPlayerOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
});