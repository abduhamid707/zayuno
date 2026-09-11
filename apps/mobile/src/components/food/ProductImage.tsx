import React, { memo, useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const ProductImage = memo(function ProductImage({
  uri,
  onUnavailable,
}: {
  uri?: string;
  onUnavailable?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return uri && !failed ? (
    <Image
      source={{ uri }}
      style={styles.image}
      resizeMode="contain"
      onError={() => { setFailed(true); onUnavailable?.(); }}
    />
  ) : (
    <View style={styles.fallback}>
      <Ionicons name="bag-handle-outline" size={26} color="#9E92EC" />
    </View>
  );
});

const styles = StyleSheet.create({
  image: { width: "100%", height: "100%" },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(137,118,255,0.07)",
  },
});
