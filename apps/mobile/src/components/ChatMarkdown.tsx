import React from "react";
import { Linking, StyleSheet, Text as RNText, View } from "react-native";

type ChatMarkdownProps = {
  content: string;
};

const inlinePattern =
  /(\*\*[^*\n]+\*\*|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)|https?:\/\/[^\s]+)/g;

function normalizeMarkdown(content: string) {
  return content
    .replace(/\\+([*_`[\]()])/g, "$1")
    .replace(
      /\[([^\]]+)]\(\[(https?:\/\/[^\]]+)]\((https?:\/\/[^)]+)\)\)/g,
      (_match, label, visibleUrl, targetUrl) =>
        `[${label}](${targetUrl || visibleUrl})`,
    )
    .replace(/\[([^\]]+)]\(\s*(https?:\/\/[^)\s]+)\s*\)/g, "[$1]($2)")
    .trim();
}

function InlineContent({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(inlinePattern)) {
    const value = match[0];
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(text.slice(cursor, index));

    if (value.startsWith("**") && value.endsWith("**")) {
      nodes.push(
        <RNText key={`${index}-bold`} style={styles.bold}>
          {value.slice(2, -2)}
        </RNText>,
      );
    } else {
      const markdownLink = value.match(/^\[([^\]]+)]\((https?:\/\/[^)]+)\)$/);
      const label = markdownLink?.[1] || value.replace(/[.,;:!?]+$/, "");
      const url = markdownLink?.[2] || label;
      nodes.push(
        <RNText
          key={`${index}-link`}
          accessibilityRole="link"
          onPress={() => void Linking.openURL(url)}
          style={styles.link}
        >
          {label}
        </RNText>,
      );
    }
    cursor = index + value.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

export function ChatMarkdown({ content }: ChatMarkdownProps) {
  const lines = normalizeMarkdown(content).split(/\r?\n/);

  return (
    <View style={styles.root}>
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();
        if (!line) return <View key={`space-${index}`} style={styles.space} />;

        const bullet = line.match(/^[-*•]\s+(.+)$/);
        if (bullet) {
          return (
            <View key={`bullet-${index}`} style={styles.bulletRow}>
              <RNText style={styles.bulletMark}>•</RNText>
              <RNText style={styles.text}>
                <InlineContent text={bullet[1]} />
              </RNText>
            </View>
          );
        }

        const numbered = line.match(/^(\d+)[.)]\s+(.+)$/);
        if (numbered) {
          return (
            <View key={`number-${index}`} style={styles.bulletRow}>
              <RNText style={styles.numberMark}>{numbered[1]}.</RNText>
              <RNText style={styles.text}>
                <InlineContent text={numbered[2]} />
              </RNText>
            </View>
          );
        }

        const heading = line.match(/^#{1,3}\s+(.+)$/);
        return (
          <RNText
            key={`line-${index}`}
            style={[styles.text, heading && styles.heading]}
          >
            <InlineContent text={heading?.[1] || line} />
          </RNText>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 3 },
  text: { color: "#E8EAF2", fontSize: 14, lineHeight: 21 },
  bold: { color: "#F7F8FC", fontWeight: "700" },
  heading: { marginTop: 2, fontSize: 15, lineHeight: 22, fontWeight: "700" },
  link: { color: "#8FA8FF", textDecorationLine: "underline" },
  space: { height: 5 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  bulletMark: { color: "#8376FF", fontSize: 16, lineHeight: 21 },
  numberMark: {
    minWidth: 18,
    color: "#8FA8FF",
    fontSize: 13,
    lineHeight: 21,
    fontWeight: "600",
  },
});
