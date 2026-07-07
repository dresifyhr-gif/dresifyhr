import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { absoluteUrl } from "@/lib/utils";

// Font s hrvatskim slovima (č, ć, ž, š, đ) — učitava se s /public/fonts (isti deploy).
Font.register({
  family: "PTSans",
  fonts: [
    { src: absoluteUrl("/fonts/PTSans-Regular.ttf"), fontWeight: "normal" },
    { src: absoluteUrl("/fonts/PTSans-Bold.ttf"), fontWeight: "bold" }
  ]
});
Font.registerHyphenationCallback((word) => [word]); // bez prijeloma riječi crticom

// 100 × 150 mm u točkama (1 mm = 2.83465 pt) — točna dimenzija D100 role.
const PAGE: [number, number] = [283.46, 425.2];

const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")} €`;

const s = StyleSheet.create({
  page: { fontFamily: "PTSans", color: "#000", padding: 14 },
  box: { flex: 1, border: "2 solid #000", borderRadius: 6, padding: 12 },
  label: { fontSize: 9, fontWeight: "bold", letterSpacing: 1, color: "#555", textTransform: "uppercase" },
  senderName: { fontSize: 12, fontWeight: "bold", marginTop: 2 },
  senderLine: { fontSize: 11 },
  divider: { borderTop: "2 solid #000", marginVertical: 12 },
  name: { fontSize: 22, fontWeight: "bold", marginTop: 2 },
  phone: { fontSize: 15, fontWeight: "bold", marginTop: 3 },
  address: { fontSize: 16, marginTop: 3, lineHeight: 1.3 },
  codBox: { marginTop: 14, border: "2 solid #000", borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  codLabel: { fontSize: 12, fontWeight: "bold", textTransform: "uppercase" },
  codValue: { fontSize: 22, fontWeight: "bold" },
  footer: { marginTop: "auto" },
  meta: { flexDirection: "row", justifyContent: "space-between", fontSize: 10, color: "#555" }
});

export type LabelData = {
  sender: { name: string; address: string; city: string };
  recipientName: string;
  phone?: string;
  address?: string;
  cod: number;
  reference: string;
};

export function ShippingLabelDoc({ sender, recipientName, phone, address, cod, reference }: LabelData) {
  return (
    <Document>
      <Page size={PAGE} style={s.page}>
        <View style={s.box}>
          <Text style={s.label}>Šalje</Text>
          <Text style={s.senderName}>{sender.name}</Text>
          <Text style={s.senderLine}>{sender.address}</Text>
          <Text style={s.senderLine}>{sender.city}</Text>

          <View style={s.divider} />

          <Text style={s.label}>Prima</Text>
          <Text style={s.name}>{recipientName}</Text>
          {phone ? <Text style={s.phone}>Tel: {phone}</Text> : null}
          {address ? <Text style={s.address}>{address}</Text> : null}

          {cod > 0 ? (
            <View style={s.codBox}>
              <Text style={s.codLabel}>Otkupnina</Text>
              <Text style={s.codValue}>{eur(cod)}</Text>
            </View>
          ) : null}

          <View style={s.footer}>
            <View style={s.meta}>
              <Text>#{reference}</Text>
              <Text>Pouzeće</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
