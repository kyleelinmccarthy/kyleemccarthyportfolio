/**
 * Alt text for imported art, keyed by the slug that scripts/import-art.ts
 * derives from the filename. The importer warns for any file with no entry
 * in the map for its source folder, so new work never ships with an empty alt.
 */
export const artAlt: Record<string, string> = {
  '20211129-180501':
    'An abstract acrylic pour painting in swirling shades of deep blue, teal, and white, resembling ocean waves, photographed on canvas.',
  '20211129-180656':
    'A close-up abstract acrylic pour painting with swirling teal and blue paint cells bordered by warm gold and brown tones in one corner.',
  '20221005-182921-1':
    "A stylized grayscale illustration of an owl's face with sharp, flame-like feather tufts and glaring white eyes, set against a gray gradient background.",
  arcanevi:
    'A digital portrait of Vi from Arcane/League of Legends, with wind-swept magenta hair, a scarred cheek, and gauntleted fists, lit in cool blue tones.',
  bayside:
    'A tattoo-flash-style design of a bird perched among leaves and a bow, rendered in black-and-white line art over a dark teal textured background.',
  characterart:
    'A full-body digital painting of an original blindfolded female character in dark segmented armor and a flower crown, wielding two flaming curved blades.',
  cowboybebop:
    'Grayscale fan art of the Cowboy Bebop crew — Spike, Jet, Faye, Ed, and Ein — standing together beneath the Bebop spaceship.',
  dak: 'A digital render of an armored fantasy warrior in ornate red-and-gold plate armor, wielding a polearm with a red banner and a glowing red axe, styled like a World of Warcraft character.',
  'dak-1':
    'The same armored fantasy warrior in red-and-gold plate armor with a bannered polearm and glowing red axe, shown in a slightly different crop.',
  deku: "Black-and-white manga-style fan art of Deku from My Hero Academia mid-transformation, cloaked in jagged dark energy with lightning arcing from his fist, city buildings in the background.",
  kaneki:
    'A close-up fan art portrait of Ken Kaneki from Tokyo Ghoul in his centipede kagune mask, grinning with a glowing red eye and a hand reaching toward the viewer.',
  mandokatanvalentine:
    'A Valentine\'s Day graphic pairing two split Mandalorian-style helmets with the text "You & Me" and "This Is the Way."',
  'resized-20221014-100739':
    'A marker-and-watercolor portrait of Jinx from Arcane/League of Legends, with teal hair and tattooed skin, set against a pink graffiti-tagged background.',
  togavalentine:
    'A Valentine\'s Day fan art of Toga Himiko from My Hero Academia, grinning wide-eyed with the text "You\'re So Cute! Be My Valentine!"',
}

export const tattooAlt: Record<string, string> = {
  tattooideabrandi:
    'A black-and-white tattoo design of an adjustable wrench entwined with daisies, engraved with a repeating placeholder date.',
}
