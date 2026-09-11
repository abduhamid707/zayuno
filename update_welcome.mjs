
const fs = require('fs');
const path = 'd:/works/DEV/Zayuno/apps/mobile/app/(auth)/welcome.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('ImageBackground,')) {
  content = content.replace(
    'useWindowDimensions,\\n} from "react-native";',
    'useWindowDimensions,\\n  ImageBackground,\\n} from "react-native";'
  );
}

content = content.replace(
  /<View style=\{styles\.brand\}>[\s\S]*?<\/View>/m,
  ''
);

content = content.replace(
  /<View style=\{\[styles\.hero, compact && styles\.heroCompact\]\}>[\s\S]*?<Text style=\{\[styles\.headline, compact && styles\.headlineCompact\]\}>Istagingizni ayting\.\{"\\\\n"\}Qolganini Zayuno qiladi\.<\/Text>\n\s*<\/View>/m,
  '<View style={[styles.hero, compact && styles.heroCompact]}><Text style={[styles.headline, compact && styles.headlineCompact]}>Xizmatlar{"\\\\n"}<Text style={{ color: "#315CFF" }}>yaqinroq.</Text></Text><Text style={styles.subtitle}>Bir so'rov. Ming imkoniyat.</Text></View>'
);

if (!content.includes('bgOnboarding.png')) {
  content = content.replace(
    /<SafeAreaView style=\{styles\.safeArea\}>/m,
    '<View style={styles.container}><Image source={require("../../assets/images/bgOnboarding.png")} style={StyleSheet.absoluteFillObject} resizeMode={"cover"} /><SafeAreaView style={styles.safeArea}>'
  );
  content = content.replace(
    /<\/SafeAreaView>/m,
    '</SafeAreaView>\\n    </View>'
  );
}

content = content.replace(
  /safeArea: \{ flex: 1, backgroundColor: "#141414" \},/m,
  'container: { flex: 1, backgroundColor: "#0A0A0A" },\\n  safeArea: { flex: 1 },'
);

content = content.replace(
  /headline: \{ color: "#F4F3EF", fontFamily: Platform\.select\(\{ ios: "Georgia", android: "serif", web: "Georgia" \}\), fontSize: 32, lineHeight: 40, letterSpacing: -0\.8, textAlign: "center" \},/m,
  'headline: { color: "#F4F3EF", fontSize: 40, fontWeight: "700", lineHeight: 46, letterSpacing: -0.8, textAlign: "center" },\\n  subtitle: { color: "#9CA3AF", fontSize: 16, marginTop: 12, textAlign: "center" },'
);

content = content.replace(
  /headlineCompact: \{ fontSize: 24, lineHeight: 29, letterSpacing: -0\.4 \},/m,
  'headlineCompact: { fontSize: 32, lineHeight: 38 },'
);

content = content.replace(/borderColor: "#AA97F4"/g, 'borderColor: "#315CFF"');
content = content.replace(/backgroundColor: "#8D77DB"/g, 'backgroundColor: "#315CFF"');
content = content.replace(/color: "#AAA2EC"/g, 'color: "#315CFF"');
content = content.replace(/color="#B5A8FF"/g, 'color="#315CFF"');
content = content.replace(/selectionColor="#A798F5"/g, 'selectionColor="#315CFF"');

content = content.replace(
  /codeStage: \{ paddingTop: 60, paddingBottom: 12, gap: 0 \},/m,
  'codeStage: { paddingTop: 20, paddingBottom: 12, gap: 0, flex: 1, justifyContent: "center" },'
);

fs.writeFileSync(path, content, 'utf8');

