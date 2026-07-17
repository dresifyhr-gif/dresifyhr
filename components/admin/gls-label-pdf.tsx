import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { absoluteUrl } from "@/lib/utils";

// Font s hrvatskim slovima (č, ć, ž, š, đ) — učitava se s /public/fonts (isti deploy).
Font.register({
  family: "PTSans",
  fonts: [
    { src: absoluteUrl("/fonts/PTSans-Regular.ttf"), fontWeight: "normal" },
    { src: absoluteUrl("/fonts/PTSans-Bold.ttf"), fontWeight: "bold" }
  ]
});
Font.registerHyphenationCallback((word) => [word]);

// 100 × 150 mm u točkama (1 mm = 2.83465 pt) — ista D100 rola kao i adresna naljepnica.
const PAGE: [number, number] = [283.46, 425.2];

const s = StyleSheet.create({
  // Lijevi padding je veći: D100 pisač ima neispisivu lijevu zonu (~2mm).
  page: { fontFamily: "PTSans", color: "#000", paddingTop: 20, paddingBottom: 20, paddingLeft: 28, paddingRight: 14 },
  box: { flex: 1, alignItems: "center" },

  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 34, height: 34 },
  brand: { fontSize: 26, fontWeight: "bold", letterSpacing: 2 },

  // Ime je najveće na naljepnici — po njemu Gazda razlikuje pakete pri pakiranju.
  nameLabel: { fontSize: 9, fontWeight: "bold", letterSpacing: 1.5, color: "#666", textTransform: "uppercase", marginTop: 22 },
  name: { fontSize: 30, fontWeight: "bold", marginTop: 4, textAlign: "center" },
  reference: { fontSize: 11, color: "#666", marginTop: 6 },

  divider: { borderTop: "2 solid #000", marginTop: 20, width: "100%" },

  thanks: { fontSize: 19, fontWeight: "bold", marginTop: 18, textAlign: "center" },
  thanksSub: { fontSize: 11, color: "#444", marginTop: 6, textAlign: "center", lineHeight: 1.4 },

  igBox: { marginTop: "auto", alignItems: "center" },
  qr: { width: 82, height: 82 },
  igHandle: { fontSize: 14, fontWeight: "bold", marginTop: 6 },
  igHint: { fontSize: 9, color: "#666", marginTop: 2 }
});

export type GlsLabelData = {
  recipientName: string;
  reference: string;
  qrDataUrl: string; // QR na Instagram, ugrađen kao data URL (bez vanjskih poziva)
  instagramHandle: string;
};

export function GlsLabelDoc({ recipientName, reference, qrDataUrl, instagramHandle }: GlsLabelData) {
  return (
    <Document>
      <Page size={PAGE} style={s.page}>
        <View style={s.box}>
          <View style={s.brandRow}>
            <Image style={s.logo} src={absoluteUrl("/dresify-robot.png")} />
            <Text style={s.brand}>DRESIFY</Text>
          </View>

          <Text style={s.nameLabel}>Paket za</Text>
          <Text style={s.name}>{recipientName}</Text>
          <Text style={s.reference}>#{reference}</Text>

          <View style={s.divider} />

          {/* Bez emojija — PTSans nema te znakove pa se ispišu kao smeće ("=%"). */}
          <Text style={s.thanks}>Hvala na narudžbi!</Text>
          <Text style={s.thanksSub}>Nadamo se da ćeš uživati u dresu.</Text>

          <View style={s.igBox}>
            <Image style={s.qr} src={qrDataUrl} />
            <Text style={s.igHandle}>{instagramHandle}</Text>
            <Text style={s.igHint}>Skeniraj i zaprati nas</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
