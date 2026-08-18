// The main tabs are always what people see first — there's nothing behind
// them that requires an account (search, deals, watchlist all work on local
// device state). Login/Signup are reachable from Profile instead of gating
// the whole app, so a first-time visitor lands straight on something real
// instead of a form.
//
// Leaderboard sits in the tab bar (a real, standalone piece of the product,
// same footing as Browse/Watching) — Profile doesn't, since it's already
// one tap away via the header's person icon on every tab, and doesn't need
// its own permanent slot in the bar.
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import BrowseScreen from "../screens/BrowseScreen";
import WatchlistScreen from "../screens/WatchlistScreen";
import ProfileScreen from "../screens/ProfileScreen";
import LeaderboardScreen from "../screens/LeaderboardScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Simple emoji icons keep us dependency-free.
function tabIcon(emoji) {
  return ({ focused }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
  );
}

function MainTabs({ colors }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      }}
    >
      <Tab.Screen
        name="Browse"
        component={BrowseScreen}
        // One home surface for both the live judged deal feed and the
        // searchable catalog (see BrowseScreen.js for why they're merged).
        // Draws its own editorial header instead of the default bar.
        options={{ tabBarIcon: tabIcon("🔥"), headerShown: false }}
      />
      <Tab.Screen
        name="Favorites"
        component={WatchlistScreen}
        // Route name kept as "Favorites" so existing navigate() calls and
        // deep links don't break; the surface itself is the watchlist.
        options={{ title: "Watching", tabBarIcon: tabIcon("🔖"), headerShown: false }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{ tabBarIcon: tabIcon("🏆"), headerShown: false }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { loading } = useAuth();
  const { colors, scheme } = useTheme();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Without this, React Navigation paints its own default background
  // between screens — a flash of the wrong theme's color on every push.
  const navTheme = {
    ...(scheme === "light" ? DefaultTheme : DarkTheme),
    colors: {
      ...(scheme === "light" ? DefaultTheme.colors : DarkTheme.colors),
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Tabs" options={{ headerShown: false }}>
          {() => <MainTabs colors={colors} />}
        </Stack.Screen>
        {/* Pushed, not a tab — reached via the person icon in each tab's
            header. Gets a native back button for free since it's a normal
            stack push now. */}
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Log in" }} />
        <Stack.Screen
          name="Signup"
          component={SignupScreen}
          options={{ title: "Create account" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
