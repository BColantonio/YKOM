import { Image } from 'expo-image';
import { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, UIManager, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { FollowListRow } from '@/lib/follows';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type PlaceholderCompatibility = { label: string; badgeColor: string };

type PaletteSlice = { tint: string; icon: string };

type Props = {
  row: FollowListRow;
  palette: PaletteSlice;
  compatibility: PlaceholderCompatibility;
};

export function ConnectionCard({ row, palette, compatibility }: Props) {
  const theme = useColorScheme() ?? 'light';
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <ThemedView style={styles.card}>
      <Pressable
        style={styles.row}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}>
        {row.avatarUrl ? (
          <Image
            source={{ uri: row.avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: palette.icon + '33' }]} />
        )}
        <ThemedText style={styles.name} numberOfLines={1}>
          {row.username}
        </ThemedText>
        <View style={styles.right}>
          <View style={[styles.compatibilityBadge, { backgroundColor: compatibility.badgeColor + '33' }]}>
            <ThemedText type="defaultSemiBold" style={[styles.compatibilityBadgeText, { color: compatibility.badgeColor }]}>
              {compatibility.label}
            </ThemedText>
          </View>
          <IconSymbol
            name="chevron.right"
            size={18}
            weight="medium"
            color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
            style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
          />
        </View>
      </Pressable>
      {expanded ? (
        <ThemedView style={styles.detailBlock}>
          <ThemedText type="defaultSemiBold" style={styles.detailTitle}>
            Kink compatibility details
          </ThemedText>
          <ThemedText style={[styles.detailBody, { color: palette.icon }]}>
            Detailed kink-by-kink breakdown will appear here once full comparison is enabled.
          </ThemedText>
          <ThemedText style={[styles.detailNote, { color: palette.icon }]}>
            Some kinks may be hidden for privacy.
          </ThemedText>
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#8884',
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  name: { flex: 1, minWidth: 0 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compatibilityBadge: {
    minWidth: 52,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compatibilityBadgeText: { fontSize: 16, letterSpacing: 0.2 },
  detailBlock: {
    marginLeft: 58,
    marginBottom: 8,
    paddingTop: 4,
    gap: 6,
  },
  detailTitle: { fontSize: 14 },
  detailBody: { fontSize: 13, lineHeight: 18 },
  detailNote: { fontSize: 12, lineHeight: 17, fontStyle: 'italic' },
});
