import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../primitives/Text';
import { ProviderCardItem } from '../../lib/interaction';

function ProviderLogo({ provider }: { provider: ProviderCardItem }) {
  const uri = provider.logoUrl || provider.iconUrl;
  const [failedUri, setFailedUri] = useState<string>();
  const color = /^#[0-9a-f]{6}$/i.test(provider.brandColor || '') ? provider.brandColor : '#1E243A';
  return <View style={[styles.logo, { backgroundColor: color }]}>
    {uri && uri !== failedUri ? <Image source={{ uri }} style={styles.image} resizeMode="contain"
      onError={() => setFailedUri(uri)} /> : <Ionicons name="business-outline" size={23} color="#FFFFFF" />}
  </View>;
}

export function ProviderPickerCard({ providers, title, subtitle, onSelectProvider, disabled }: {
  providers: ProviderCardItem[]; title?: string; subtitle?: string;
  onSelectProvider: (provider: ProviderCardItem) => void; disabled?: boolean;
}) {
  if (!providers?.length) return null;
  return <View style={styles.root}>
    {title ? <Text style={styles.name}>{title}</Text> : null}
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    {providers.map(provider => <Pressable key={provider.id || provider.slug} accessibilityRole="button"
      accessibilityLabel={`${provider.displayName || provider.name} — tanlash`} disabled={disabled}
      onPress={() => onSelectProvider(provider)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, disabled && { opacity: 0.6 }]}>
      <ProviderLogo provider={provider} />
      <View style={styles.info}>
        <Text numberOfLines={1} style={styles.name}>{provider.displayName || provider.name}</Text>
        {provider.cuisine ? <Text numberOfLines={1} style={styles.subtitle}>{provider.cuisine}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={19} color="#A99CFF" />
    </Pressable>)}
  </View>;
}

const styles = StyleSheet.create({
  root: { marginTop: 8, gap: 9, width: '100%' },
  card: { minHeight: 64, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, borderWidth: 1,
    borderColor: 'rgba(126,134,165,0.24)', backgroundColor: 'rgba(18,23,41,0.92)', flexDirection: 'row', alignItems: 'center', gap: 13 },
  pressed: { borderColor: '#7868F6', backgroundColor: 'rgba(35,33,74,0.96)' },
  logo: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  info: { flex: 1 },
  name: { color: '#F6F7FB', fontSize: 15, fontWeight: '700' },
  subtitle: { color: '#A4ACC1', fontSize: 12, lineHeight: 16, marginTop: 3 },
});
