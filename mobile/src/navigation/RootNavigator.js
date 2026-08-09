// Decides what the user sees: auth screens when logged out, the main tabs when in.
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import SearchScreen from "../screens/SearchScreen";
import ProductDetailScreen from "../screens/ProductDetailScreen";
import ListScreen from "../screens/ListScreen";
import FavoritesScreen from "../screens/FavoritesScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: "#fff",
        tabBarActiveTintColor: colors.primaryDark,
      }}
    >
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        // This screen draws its own header (logo + profile/filter/favorite
        // icons) to match the Figma design instead of the default bar.
        options={{ title: "Compare", tabBarIcon: tabIcon("🔍"), headerShown: false }}
      />
      <Tab.Screen
        name="List"
        component={ListScreen}
        options={{ title: "My List", tabBarIcon: tabIcon("🛒") }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ title: "Saved", tabBarIcon: tabIcon("⭐") }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: tabIcon("👤") }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: "#fff",
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
