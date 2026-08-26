import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Stack } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition, ZoomIn, ZoomOut } from "react-native-reanimated";

import { DeleteConfirmSheet } from "@/components/library/DeleteConfirmSheet";
import { SegmentedControl } from "@/components/settings/SegmentedControl";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAccentColor } from "@/hooks/useThemePreference";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useVideoLibrary } from "@/hooks/useVideoLibrary";
import { radius, spacing, typography } from "@/theme/tokens";
import type { VideoAsset } from "@/types/video";
import {
  formatDate,
  formatFileSize,
  getFileSize,
} from "@/utils/videoProperties";

type CleanupTab = "largest" | "oldest";

const TAB_OPTIONS: { value: CleanupTab; label: string }[] = [
  { value: "largest", label: "Largest" },
  { value: "oldest", label: "Oldest" },
];

type SizedVideo = VideoAsset & { size: number | null };

export default function StorageCleanupScreen() {
  const { videos, deleteVideos } = useVideoLibrary();
  const accentColor = useAccentColor();
  const surfaceColor = useThemeColor({}, "surface");
  const borderColor = useThemeColor({}, "surfaceBorder");
  const mutedColor = useThemeColor({}, "textMuted");
  const [tab, setTab] = useState<CleanupTab>("largest");
  const [deleteVideo, setDeleteVideo] = useState<SizedVideo | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleteVisible, setBatchDeleteVisible] = useState(false);

  const sized = useMemo<SizedVideo[]>(
    () => videos.map((video) => ({ ...video, size: getFileSize(video.uri) })),
    [videos],
  );

  const totalSize = useMemo(
    () => sized.reduce((sum, v) => sum + (v.size ?? 0), 0),
    [sized],
  );

  const rows = useMemo(() => {
    const copy = [...sized];
    if (tab === "largest") {
      copy.sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
    } else {
      copy.sort(
        (a, b) => (a.creationTime ?? Infinity) - (b.creationTime ?? Infinity),
      );
    }
    return copy.slice(0, 30);
  }, [sized, tab]);

  const enterSelectMode = (video: SizedVideo) => {
    setSelectMode(true);
    setSelectedIds(new Set([video.id]));
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (video: SizedVideo) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(video.id)) {
        next.delete(video.id);
      } else {
        next.add(video.id);
      }
      return next;
    });
  };

  const allSelected = rows.length > 0 && selectedIds.size === rows.length;
  const handleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(rows.map((v) => v.id)));
  };

  const handleConfirmDelete = async () => {
    if (!deleteVideo) {
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setDeleteVideo(null);
    const success = await deleteVideos([deleteVideo.id]);
    if (!success) {
      Alert.alert(
        "Couldn't delete",
        "The video was not deleted. Please try again.",
      );
    }
  };

  const handleConfirmBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setBatchDeleteVisible(false);
    const success = await deleteVideos(ids);
    if (success) {
      exitSelectMode();
    } else {
      Alert.alert(
        "Couldn't delete",
        "Some videos were not deleted. Please try again.",
      );
    }
  };

  const batchDeleteFirstVideo = useMemo(
    () => rows.find((v) => selectedIds.has(v.id)) ?? null,
    [rows, selectedIds],
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: selectMode
            ? `${selectedIds.size} selected`
            : "Storage & cleanup",
          headerLeft: selectMode
            ? () => (
                <Pressable onPress={exitSelectMode} hitSlop={12}>
                  <Ionicons name="close" size={22} color={accentColor} />
                </Pressable>
              )
            : undefined,
          headerRight: selectMode
            ? () => (
                <View style={styles.headerActions}>
                  <Pressable onPress={handleSelectAll} hitSlop={12}>
                    <Ionicons
                      name={allSelected ? "checkbox" : "checkbox-outline"}
                      size={22}
                      color={accentColor}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => setBatchDeleteVisible(true)}
                    hitSlop={12}
                    disabled={selectedIds.size === 0}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={22}
                      color={selectedIds.size === 0 ? mutedColor : accentColor}
                    />
                  </Pressable>
                </View>
              )
            : undefined,
        }}
      />

      <View style={styles.statsBlock}>
        <ThemedText style={styles.statsValue}>
          {formatFileSize(totalSize)}
        </ThemedText>
        <ThemedText style={styles.statsLabel}>
          across {videos.length} video{videos.length === 1 ? "" : "s"}
        </ThemedText>
      </View>

      <View style={styles.tabWrap}>
        <SegmentedControl options={TAB_OPTIONS} value={tab} onChange={setTab} />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <ThemedText style={styles.empty}>No videos found.</ThemedText>
        }
        renderItem={({ item }) => (
          <Animated.View entering={FadeIn} exiting={FadeOut.duration(200)} layout={LinearTransition.duration(220)}>
            <Pressable
              style={[styles.row, { backgroundColor: surfaceColor, borderColor }]}
              onPress={() => (selectMode ? toggleSelect(item) : undefined)}
              onLongPress={() => (selectMode ? undefined : enterSelectMode(item))}
            >
              <View style={styles.thumbnailWrap}>
                {item.thumbnailUri ? (
                  <Image
                    source={{ uri: item.thumbnailUri }}
                    style={styles.thumbnail}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                    <Ionicons name="film-outline" size={20} color={mutedColor} />
                  </View>
                )}
                {selectMode ? (
                  <Animated.View
                    entering={ZoomIn.duration(150)}
                    exiting={ZoomOut.duration(150)}
                    style={[
                      styles.checkCircle,
                      selectedIds.has(item.id)
                        ? { backgroundColor: accentColor, borderColor: accentColor }
                        : null,
                    ]}
                  >
                    {selectedIds.has(item.id) ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : null}
                  </Animated.View>
                ) : null}
              </View>
              <View style={styles.rowInfo}>
                <ThemedText numberOfLines={1} style={styles.filename}>
                  {item.filename}
                </ThemedText>
                <ThemedText style={[styles.meta, { color: mutedColor }]}>
                  {tab === "largest"
                    ? `${item.size !== null ? formatFileSize(item.size) : "Unknown size"} · ${formatDate(item.creationTime)}`
                    : `${formatDate(item.creationTime)} · ${item.size !== null ? formatFileSize(item.size) : "Unknown size"}`}
                </ThemedText>
              </View>
              {selectMode ? null : (
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => setDeleteVideo(item)}
                  hitSlop={10}
                >
                  <Ionicons name="trash-outline" size={20} color={accentColor} />
                </Pressable>
              )}
            </Pressable>
          </Animated.View>
        )}
      />

      <DeleteConfirmSheet
        visible={deleteVideo !== null}
        title={deleteVideo?.filename ?? ""}
        thumbnailUri={deleteVideo?.thumbnailUri}
        onCancel={() => setDeleteVideo(null)}
        onConfirm={handleConfirmDelete}
      />

      <DeleteConfirmSheet
        visible={batchDeleteVisible}
        title={`${selectedIds.size} video${selectedIds.size === 1 ? "" : "s"} selected`}
        subtitle={
          selectedIds.size > 1 && batchDeleteFirstVideo
            ? `${batchDeleteFirstVideo.filename} and ${selectedIds.size - 1} more`
            : (batchDeleteFirstVideo?.filename ?? undefined)
        }
        thumbnailUri={batchDeleteFirstVideo?.thumbnailUri}
        onCancel={() => setBatchDeleteVisible(false)}
        onConfirm={handleConfirmBatchDelete}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  statsBlock: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  statsValue: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
  },
  statsLabel: {
    fontSize: typography.size.meta,
    opacity: 0.6,
    marginTop: 2,
  },
  tabWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 24,
  },
  empty: {
    textAlign: "center",
    opacity: 0.7,
    marginTop: 48,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
  thumbnailWrap: {
    width: 64,
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#1c1f22",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircle: {
    position: "absolute",
    right: 4,
    top: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowInfo: {
    flex: 1,
    gap: 1,
    marginRight: spacing.sm,
  },
  deleteButton: {
    marginRight: spacing.xs,
  },
  filename: {
    fontSize: typography.size.body,
  },
  meta: {
    fontSize: typography.size.micro,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
});
