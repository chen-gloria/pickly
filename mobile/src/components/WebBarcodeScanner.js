// Web's real barcode reader.
//
// expo-camera's web implementation only decodes QR codes (it pipes frames
// through jsQR — see node_modules/expo-camera/build/web/useWebQRScanner.js —
// and its own barcodeTypes check is hardcoded to
// `barcodeScannerSettings?.barcodeTypes?.includes('qr')`). Retail packaging
// uses EAN-13/UPC-A/Code128, so on web `onBarcodeScanned` simply never fires
// for a real product barcode: not flaky, structurally dead. Confirmed by
// reading that source before writing this, after an earlier version of this
// file trusted a comment claiming "this works on web" that turned out untrue
// — this doesn't get to be a repeat of that mistake.
//
// ZXing is a pure-JS decoder with no browser barcode API dependency, so it
// works identically in Safari (which has never shipped the native
// BarcodeDetector API) and Chrome. This file is web-only; BarcodeScanner.js
// keeps using expo-camera's CameraView for iOS/Android, where Expo's native
// barcode scanning is the real platform implementation, not the web jsQR
// shim, and already supports these formats.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Ionicons } from "@expo/vector-icons";
import { spacing, radius, type } from "../theme";
import { useTheme } from "../context/ThemeContext";

const FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
];

export default function WebBarcodeScanner({ onScan, onClose }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const scannedRef = useRef(false);
  const [status, setStatus] = useState("requesting"); // requesting | denied | scanning | unsupported

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS);
    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;
    let cancelled = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current,
        (result) => {
          if (result && !scannedRef.current && !cancelled) {
            scannedRef.current = true;
            onScan(result.getText());
          }
        }
      )
      .then(() => {
        if (!cancelled) setStatus("scanning");
      })
      .catch(() => {
        if (!cancelled) setStatus("denied");
      });

    return () => {
      cancelled = true;
      // Stops every track on the underlying stream — otherwise the camera
      // light stays on after leaving this screen.
      try {
        reader.reset();
      } catch (_) {}
    };
  }, [onScan]);

  if (status === "unsupported") {
    return (
      <View style={styles.overlay}>
        <View style={styles.permissionCard}>
          <Ionicons name="camera-outline" size={32} color={colors.textFaint} />
          <Text style={styles.permissionTitle}>Camera not available</Text>
          <Text style={styles.permissionBody}>
            This browser doesn't support camera access for scanning.
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={styles.cancelText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (status === "denied") {
    return (
      <View style={styles.overlay}>
        <View style={styles.permissionCard}>
          <Ionicons name="camera-outline" size={32} color={colors.textFaint} />
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionBody}>
            Allow camera access in your browser to scan a barcode.
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={styles.cancelText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.overlay}>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <video
        ref={videoRef}
        muted
        playsInline
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
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
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000", zIndex: 100 },
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
    hint: {
      color: "#FFFFFF",
      ...type.body,
      backgroundColor: "rgba(0,0,0,0.5)",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
    },
    permissionCard: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.sm },
    permissionTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700", marginTop: spacing.sm },
    permissionBody: { color: "#C4C9C6", textAlign: "center", lineHeight: 20, marginBottom: spacing.sm },
    cancelText: { color: "#C4C9C6", marginTop: spacing.lg, fontWeight: "600" },
  });
}
