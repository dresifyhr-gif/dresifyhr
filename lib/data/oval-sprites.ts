/* AUTOMATSKI GENERIRANO (scratchpad oval/tools/gen-oval.mjs iz oval/sprites/manifest.json) — ne uređuj ručno.
   3D spriteovi dresa na vješalici (Blender Cycles, simulirana tkanina, tekstura = prava fotografija proizvoda) za ?scena=oval.
   kit = ime slike na vješalici (/ormar/hanger/<kit>.webp). back = strana s prezimenom (lice prema kupcu na prednjem luku),
   front = prednja strana (vidi se na stražnjoj polovici ovala). Po kutu (angles, °; >0 desni rub ide od kamere = tyaw):
   [src, širina, visina (px), kuka x, kuka y (px u spriteu)]. mPerPx = metara po px spritea na dubini kuke. */
export type OvalSprite = [src: string, w: number, h: number, hx: number, hy: number];
export const OVAL_SPRITES: { mPerPx: number; angles: number[]; kits: Record<string, { back: OvalSprite[]; front?: OvalSprite[] }> } = {"mPerPx":0,"angles":[],"kits":{}};
