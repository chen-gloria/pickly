// Decides what the user sees: auth screens when logged out, the main tabs when in.
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import BrowseScreen from "../screens/BrowseScreen";
import ProductDetailScreen from "../screens/ProductDetailScreen";
import WatchlistScreen from "../screens/WatchlistScreen";
import ProfileScreen from "../screens/ProfileScreen";
import LeaderboardScreen from "../screens/LeaderboardScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Without this, React Navigation paints its own default background between
// screens — a white flash on every push in an otherwise dark app.
const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

// Simple emoji icons keep us dependency-free.
function tabIcon(emoji) {
  return ({ focused }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
  );
}

function MainTabs() {
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
        name="Profile"
        component={ProfileScreen}
        options={({ navigation }) => ({
          tabBarIcon: tabIcon("👤"),
          // Tab roots don't get a back button by default (there's nothing
          // "under" them to pop to) — but the bottom bar alone wasn't a
          // clear enough way back for people used to a header control, so
          // this jumps straight to Browse the same way tapping the tab does.
          headerLeft: () => (
            <TouchableOpacity
              hitSlop={8}
              onPress={() => navigation.navigate("Browse")}
              style={{ paddingLeft: 16, paddingRight: 8 }}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        })}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { token, loading } = useAuth();

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
        {token ? (
          <>
            <Stack.Screen
              name="Tabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ProductDetail"
              component={ProductDetailScreen}
              options={{ title: "Price Comparison" }}
            />
            <Stack.Screen
              name="Leaderboard"
              component={LeaderboardScreen}
              options={{ title: "Leaderboard" }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Signup"
              component={SignupScreen}
              options={{ title: "Create account" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
