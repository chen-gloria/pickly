// Full-screen barcode scan overlay. Scans EAN/UPC/Code128 (the formats on
// real retail packaging) and hands the raw code back to the caller —
// BrowseScreen.js does the actual barcode → product lookup (see
// api/barcode.js) and turns it into a normal search.
//
// Confirmed against Expo's SDK 54 docs before building this: expo-camera's
// barcode scanning genuinely works on web (via the browser's camera stream),
// not just native — that's why this doesn't need a native-only fallback.
import React, { useMemo, useRef, useState } from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { spacing, radius, type } from "../theme";
import { useTheme } from "../context/ThemeContext";

const BARCODE_TYPES = ["ean13", "ean8", "upc_a", "upc_e", "code128"];

export default function BarcodeScanner({ onScan, onClose }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  function handleScanned({ data }) {
    // The camera keeps firing while a barcode stays in frame — only act on
    // the first read per scan session, not every frame after it.
    if (scannedRef.current) return;
    scannedRef.current = true;
    onScan(data);
  }

  if (!permission) {
    // Permission status hasn't resolved yet.
    return <View style={styles.overlay} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.overlay}>
        <View style={styles.permissionCard}>
          <Ionicons name="camera-outline" size={32} color={colors.textFaint} />
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionBody}>
            {permission.canAskAgain
              ? "To scan a barcode, Pickly needs permission to use your camera."
              : "Camera access was denied. Enable it in your browser/device settings to scan barcodes."}
          </Text>
          {permission.canAskAgain && (
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>Allow camera</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.overlay}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
        onBarcodeScanned={handleScanned}
      />
      <View style={styles.frame} pointerEvents="none" />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.hintWrap}>
        <Text style={styles.hint}>Line up a barcode inside the frame</Text>
      </View>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#000",
      zIndex: 100,
    },
    frame: {
      position: "absolute",
      top: "35%",
      left: "12%",
      right: "12%",
      height: "20%",
      borderWidth: 2,
      borderColor: "#FFFFFF",
      borderRadius: radius.lg,
    },
    topBar: { position: "absolute", top: spacing.xl, left: spacing.md },
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(0,0,0,0.5)",
      alignItems: "center",
      justifyContent: "center",
    },
    hintWrap: { position: "absolute", bottom: spacing.xl * 1.5, left: 0, right: 0, alignItems: "center" },
    hint: { color: "#FFFFFF", ...type.body, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
    permissionCard: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xl,
      gap: spacing.sm,
    },
    permissionTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700", marginTop: spacing.sm },
    permissionBody: { color: "#C4C9C6", textAlign: "center", lineHeight: 20, marginBottom: spacing.sm },
    permissionBtn: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm + 2,
      marginTop: spacing.sm,
    },
    permissionBtnText: { color: colors.onPrimary, fontWeight: "700" },
    cancelText: { color: "#C4C9C6", marginTop: spacing.lg, fontWeight: "600" },
  });
}
