import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import type { CatalogOfferingItem } from "../../lib/interaction";
import { offeringKey } from "../../lib/cart";
import type { CartFlightOrigin } from "./FoodProductCard";
import type { ContextTrayHandle } from "./ContextTrayDock";
import { ProductImage } from "./ProductImage";
import { useReducedMotion } from "./useReducedMotion";

type Flight = {
  id: number;
  uri?: string;
  from: CartFlightOrigin;
  to: CartFlightOrigin;
};
export type CartFlightHandle = {
  fly: (offering: CatalogOfferingItem, from?: CartFlightOrigin) => void;
  clear: () => void;
};

function FlyingProduct({
  flight,
  onLand,
}: {
  flight: Flight;
  onLand: (id: number) => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 620,
      easing: Easing.bezier(0.22, 0.68, 0.3, 1),
      useNativeDriver: Platform.OS !== "web",
      isInteraction: false,
    });
    animation.start(({ finished }) => {
      if (finished) onLand(flight.id);
    });
    return () => animation.stop();
  }, [flight.id, progress]);
  const sx = flight.from.x + flight.from.width / 2 - 34;
  const sy = flight.from.y + flight.from.height / 2 - 34;
  const tx = flight.to.x + flight.to.width / 2 - 34;
  const ty = flight.to.y + flight.to.height / 2 - 34;
  return (
    <Animated.View
      style={[
        styles.product,
        {
          opacity: progress.interpolate({
            inputRange: [0, 0.08, 0.9, 1],
            outputRange: [0.7, 1, 1, 0],
          }),
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 0.2, 1],
                outputRange: [sx, sx + (tx - sx) * 0.08, tx],
              }),
            },
            {
              translateY: progress.interpolate({
                inputRange: [0, 0.2, 0.6, 0.9, 1],
                outputRange: [sy, sy - 46, (sy + ty) / 2 - 35, ty - 8, ty],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 0.2, 1],
                outputRange: [1, 1.12, 0.65],
              }),
            },
            {
              rotate: progress.interpolate({
                inputRange: [0, 0.35, 1],
                outputRange: ["-6deg", "9deg", "0deg"],
              }),
            },
          ],
        },
      ]}
    >
      <ProductImage uri={flight.uri} />
    </Animated.View>
  );
}

export const CartFlightOverlay = forwardRef<
  CartFlightHandle,
  {
    targetRef: React.RefObject<ContextTrayHandle | null>;
  }
>(function CartFlightOverlay({ targetRef }, ref) {
  const root = useRef<View>(null);
  const sequence = useRef(0);
  const epoch = useRef(0);
  const [flights, setFlights] = useState<Flight[]>([]);
  const reduced = useReducedMotion();
  useEffect(
    () => () => {
      epoch.current += 1;
    },
    [],
  );
  useEffect(() => {
    if (reduced) {
      epoch.current += 1;
      setFlights([]);
    }
  }, [reduced]);

  useImperativeHandle(
    ref,
    () => ({
      clear() {
        epoch.current += 1;
        setFlights([]);
      },
      fly(offering, from) {
        if (reduced || !from) {
          targetRef.current?.land();
          return;
        }
        const version = epoch.current;
        // Wait for the first selected thumbnail and composer height to commit.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (version !== epoch.current) return;
            root.current?.measureInWindow((ox, oy) => {
              targetRef.current?.measureTarget(offeringKey(offering), (to) => {
                if (version !== epoch.current || !to.height) return;
                const flight = {
                  id: ++sequence.current,
                  uri: offering.imageUrl,
                  from: { ...from, x: from.x - ox, y: from.y - oy },
                  to: { ...to, x: to.x - ox, y: to.y - oy },
                };
                setFlights((current) => [...current.slice(-7), flight]);
              });
            });
          }),
        );
      },
    }),
    [reduced, targetRef],
  );
  const land = (id: number) => {
    setFlights((current) => current.filter((flight) => flight.id !== id));
    targetRef.current?.land();
  };
  return (
    <View
      ref={root}
      collapsable={false}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.overlay}
    >
      {flights.map((flight) => (
        <FlyingProduct key={flight.id} flight={flight} onLand={land} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 100, elevation: 30 },
  product: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 68,
    height: 68,
    padding: 4,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#B1A2FF",
    backgroundColor: "#20203C",
    shadowColor: "#9078FF",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
});
