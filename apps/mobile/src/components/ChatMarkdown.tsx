import React from "react";
import { Linking, StyleSheet, Text as RNText, View } from "react-native";

type ChatMarkdownProps = {
  content: string;
};

const inlinePattern =
  /(\*\*[^*\n]+\*\*|\[[^\]\n]+\]\((?:https?:\/\/|mailto:|tel:)[^)\s]+\)|https?:\/\/[^\s]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|@[A-Za-z0-9_]{4,}|\+\d[\d\s()-]{7,}\d|(?:www\.)?[A-Za-z0-9-]+\.(?:uz|com|net|org|io|app)(?:\/[^\s]*)?)/g;

type LinkTarget = {
  label: string;
  url: string;
  accessibilityLabel: string;
};

function getLinkTarget(value: string, fullText: string): LinkTarget {
  const markdownLink = value.match(
    /^\[([^\]]+)]\(((?:https?:\/\/|mailto:|tel:)[^)]+)\)$/,
  );
  if (markdownLink) {
    return {
      label: markdownLink[1],
      url: markdownLink[2],
      accessibilityLabel: `${markdownLink[1]} havolasini ochish`,
    };
  }

  const cleanValue = value.replace(/[.,;:!?]+$/, "");
  if (/^https?:\/\//i.test(cleanValue)) {
    return {
      label: cleanValue,
      url: cleanValue,
      accessibilityLabel: "Web sahifani ochish",
    };
  }
  if (/^(?:www\.)?[A-Za-z0-9-]+\.(?:uz|com|net|org|io|app)/i.test(cleanValue)) {
    const url = cleanValue.startsWith("www.")
      ? `https://${cleanValue}`
      : `https://${cleanValue}`;
    return {
      label: cleanValue,
      url,
      accessibilityLabel: "Web sahifani ochish",
    };
  }
  if (/^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/i.test(cleanValue)) {
    return {
      label: cleanValue,
      url: `mailto:${cleanValue}`,
      accessibilityLabel: `${cleanValue} manziliga xat yozish`,
    };
  }
  if (cleanValue.startsWith("@")) {
    const username = cleanValue.slice(1);
    const instagram = /instagram/i.test(fullText);
    return {
      label: cleanValue,
      url: instagram
        ? `https://instagram.com/${username}`
        : `https://t.me/${username}`,
      accessibilityLabel: instagram
        ? `${cleanValue} Instagram profilini ochish`
        : `${cleanValue} Telegram profilini ochish`,
    };
  }

  const phone = cleanValue.replace(/[^\d+]/g, "");
  const whatsapp = /whats\s*app/i.test(fullText);
  return {
    label: cleanValue,
    url: whatsapp
      ? `https://wa.me/${phone.replace(/\D/g, "")}`
      : `tel:${phone}`,
    accessibilityLabel: whatsapp
      ? `${cleanValue} raqamiga WhatsApp orqali yozish`
      : `${cleanValue} raqamiga qo‘ng‘iroq qilish`,
  };
}

async function openLink(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    // The operating system owns the final app choice. A missing handler should
    // not crash or interrupt the conversation.
  }
}

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
      const target = getLinkTarget(value, text);
      nodes.push(
        <RNText
          key={`${index}-link`}
          accessibilityRole="link"
          accessibilityLabel={target.accessibilityLabel}
          onPress={() => void openLink(target.url)}
          style={styles.link}
        >
          {target.label}
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

        const address = line.match(/^(Manzil|Address|Lokatsiya)\s*:\s*(.+)$/i);
        if (address) {
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address[2])}`;
          return (
            <RNText key={`address-${index}`} style={styles.text}>
              {address[1]}:{" "}
              <RNText
                accessibilityRole="link"
                accessibilityLabel={`${address[2]} manzilini xaritada ochish`}
                onPress={() => void openLink(mapsUrl)}
                style={styles.link}
              >
                {address[2]}
              </RNText>
            </RNText>
          );
        }

        const labeledPhone = line.match(
          /^(Telefon|Tel|Call center|WhatsApp)\s*:\s*([+\d][\d\s()-]{6,}\d)$/i,
        );
        if (labeledPhone) {
          const target = getLinkTarget(labeledPhone[2], line);
          return (
            <RNText key={`phone-${index}`} style={styles.text}>
              {labeledPhone[1]}:{" "}
              <RNText
                accessibilityRole="link"
                accessibilityLabel={target.accessibilityLabel}
                onPress={() => void openLink(target.url)}
                style={styles.link}
              >
                {labeledPhone[2]}
              </RNText>
            </RNText>
          );
        }

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
