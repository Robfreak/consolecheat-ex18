export const languageOptions = [
  { id: "de", label: "Deutsch" },
  { id: "en", label: "English" },
] as const;

export type Lang = (typeof languageOptions)[number]["id"];

const de = {
  brand: "consolecheat",
  title: "Gaming-Bingo",
  metaDescription:
    "Gaming-Bingo: zufällige 5×5-Karten mit Gaming-Klischees zum Abhaken, teilbar per Link und als PNG. Alles bleibt in diesem Browser. Inoffiziell, nicht von Sony.",
  eyebrow: "Werkzeug · Party",
  lede: "Zufällige 5×5-Karten mit Gaming-Klischees. Beim Spielen oder Zuschauen abhaken, bis eine Reihe, Spalte oder Diagonale voll ist. Mit eigenen Listen, Link zum Teilen und PNG-Export.",
  freeClaim: "Komplett kostenlos. Auf dieser Seite kostet nichts Geld.",
  privacyClaim: "Keine sensiblen Daten werden gespeichert. Karten und Listen bleiben in diesem Browser und werden nicht hochgeladen.",
  unofficial: "Inoffiziell. Nicht von Sony.",
  footerNote: "Die PNG-Datei entsteht auf diesem Gerät. Diese Seite ist nicht Sony.",
  themeDark: "Dunkles Erscheinungsbild",
  themeLight: "Helles Erscheinungsbild",
  language: "Sprache",
  footerNav: "Seitenfuß",
  toolsHeading: "Weitere Werkzeuge",
  merkliste: "Zur Merkliste",
  storageNote: "Eigene Listen, die aktuelle Karte und die Zahl deiner Bingos liegen im localStorage unter consolecheat-bingo-v1.",
  controlsHeading: "Steuerung",
  controls:
    "Pfeiltasten bewegen den Cursor auf der Karte, Pos1 und Ende springen an den Rand der Reihe, Leertaste oder Enter hakt ein Feld ab. Controller: Steuerkreuz bewegt, × hakt ab, △ erzeugt eine neue Karte, Options speichert das PNG. Solange ein Textfeld den Fokus hat, greifen diese Eingaben nicht.",
  listLabel: "Liste",
  builtinName: "Gaming-Klischees",
  sharedName: "Geteilte Liste",
  newCard: "Neue Karte",
  copyLink: "Link kopieren",
  exportPng: "PNG speichern",
  seedLabel: "Seed {seed}",
  cardLabel: "Bingo-Karte, 5 mal 5 Felder",
  free: "Frei",
  freeCell: "Freies Feld, immer abgehakt",
  bingo: "Bingo!",
  bingoLines: "Bingo! {n} volle Linie(n).",
  marked: "{term} abgehakt.",
  unmarked: "{term} nicht mehr abgehakt.",
  bingoCount: "Bingos bisher: {n}",
  linkCopied: "Link kopiert.",
  linkManual: "Kopieren ging nicht automatisch. Markiere den Link und kopiere ihn selbst:",
  linkTooLarge: "Diese Liste ist zu groß für einen Link (höchstens etwa 1800 Zeichen kodiert). Kürze die Begriffe oder nimm weniger Begriffe.",
  linkLabel: "Link zu dieser Karte",
  sharedOpened: "Karte aus dem Link geöffnet.",
  shareErrors: {
    seed: "Der Link enthält keinen gültigen Seed.",
    list: "Der Link nennt eine unbekannte Liste.",
    terms: "Die Begriffe im Link sind ungültig.",
    tooLarge: "Der Link ist zu groß.",
  },
  saveShared: "Als eigene Liste speichern",
  pngDone: "PNG gespeichert.",
  pngSubtitle: "Liste: {list}",
  pngFooter: "consolecheat · Gaming-Bingo · inoffiziell, nicht von Sony",
  listsHeading: "Eigene Listen",
  listsNote: "Ein Begriff pro Zeile. Mindestens 24 verschiedene Begriffe, höchstens 200, je höchstens 60 Zeichen. Doppelte und leere Zeilen werden entfernt.",
  listName: "Name der Liste",
  listTerms: "Begriffe",
  listCount: "{n} gültige Begriffe",
  listSave: "Liste speichern",
  listUpdate: "Änderungen speichern",
  listNew: "Neue Liste",
  listEdit: "Bearbeiten",
  listUse: "Verwenden",
  listDelete: "Löschen",
  listDeleteAsk: "„{name}“ wirklich löschen?",
  cancel: "Abbrechen",
  listSaved: "Liste „{name}“ gespeichert.",
  listDeleted: "Liste „{name}“ gelöscht.",
  listsFull: "Höchstens 20 eigene Listen.",
  noLists: "Noch keine eigenen Listen.",
  listErrors: {
    count: "Zu wenige Begriffe: Es braucht mindestens 24 verschiedene.",
    length: "Ein Begriff ist länger als 60 Zeichen.",
    tooMany: "Zu viele Begriffe: höchstens 200.",
  },
  defaultListName: "Meine Liste",
  storeCorrupt: "Ein Teil der gespeicherten Daten war unlesbar und wurde übersprungen.",
  saveFailed: "Speichern ging nicht. Der Speicher des Browsers ist voll oder gesperrt.",
  deleteAll: "Bingo-Daten löschen",
  deleteAsk:
    "Wirklich die Bingo-Daten in diesem Browser löschen? Nur der Schlüssel consolecheat-bingo-v1. Sprache und Erscheinungsbild bleiben.",
  deleteYes: "Nur die Bingo-Daten löschen",
  deleteNo: "Abbrechen",
  deleted: "Die Bingo-Daten sind aus diesem Browser gelöscht.",
  deleteFailed: "Die Bingo-Daten konnten nicht gelöscht werden.",
};

export type Copy = typeof de;

const en: Copy = {
  brand: "consolecheat",
  title: "Gaming bingo",
  metaDescription:
    "Gaming bingo: random 5×5 cards of gaming clichés to tick off, shareable by link and as PNG. Everything stays in this browser. Unofficial, not from Sony.",
  eyebrow: "Tool · Party",
  lede: "Random 5×5 cards of gaming clichés. Tick them off while playing or watching until a row, column, or diagonal is full. With your own lists, share links, and PNG export.",
  freeClaim: "Completely free. This page does not charge anything.",
  privacyClaim: "No sensitive data is stored. Cards and lists stay in this browser and are not uploaded.",
  unofficial: "Unofficial. Not from Sony.",
  footerNote: "The PNG file is made on this device. This page is not Sony.",
  themeDark: "Dark appearance",
  themeLight: "Light appearance",
  language: "Language",
  footerNav: "Footer",
  toolsHeading: "Other tools",
  merkliste: "Back to the backlog",
  storageNote: "Your own lists, the current card, and your Bingo count use the localStorage key consolecheat-bingo-v1.",
  controlsHeading: "Controls",
  controls:
    "Arrow keys move the cursor on the card, Home and End jump to the ends of the row, Space or Enter ticks a square. Controller: the D-pad moves, × ticks, △ makes a new card, Options saves the PNG. While a text field has focus, these inputs are left alone.",
  listLabel: "List",
  builtinName: "Gaming clichés",
  sharedName: "Shared list",
  newCard: "New card",
  copyLink: "Copy link",
  exportPng: "Save PNG",
  seedLabel: "Seed {seed}",
  cardLabel: "Bingo card, 5 by 5 squares",
  free: "Free",
  freeCell: "Free square, always ticked",
  bingo: "Bingo!",
  bingoLines: "Bingo! {n} full line(s).",
  marked: "{term} ticked.",
  unmarked: "{term} unticked.",
  bingoCount: "Bingos so far: {n}",
  linkCopied: "Link copied.",
  linkManual: "Copying did not work automatically. Select the link and copy it yourself:",
  linkTooLarge: "This list is too large for a link (about 1800 encoded characters at most). Shorten the terms or use fewer terms.",
  linkLabel: "Link to this card",
  sharedOpened: "Card opened from the link.",
  shareErrors: {
    seed: "The link has no valid seed.",
    list: "The link names an unknown list.",
    terms: "The terms in the link are invalid.",
    tooLarge: "The link is too large.",
  },
  saveShared: "Save as my own list",
  pngDone: "PNG saved.",
  pngSubtitle: "List: {list}",
  pngFooter: "consolecheat · Gaming bingo · unofficial, not from Sony",
  listsHeading: "Your own lists",
  listsNote: "One term per line. At least 24 different terms, at most 200, each at most 60 characters. Duplicate and empty lines are removed.",
  listName: "List name",
  listTerms: "Terms",
  listCount: "{n} valid terms",
  listSave: "Save list",
  listUpdate: "Save changes",
  listNew: "New list",
  listEdit: "Edit",
  listUse: "Use",
  listDelete: "Delete",
  listDeleteAsk: "Really delete “{name}”?",
  cancel: "Cancel",
  listSaved: "List “{name}” saved.",
  listDeleted: "List “{name}” deleted.",
  listsFull: "At most 20 lists of your own.",
  noLists: "No lists of your own yet.",
  listErrors: {
    count: "Too few terms: at least 24 different ones are needed.",
    length: "A term is longer than 60 characters.",
    tooMany: "Too many terms: at most 200.",
  },
  defaultListName: "My list",
  storeCorrupt: "Part of the saved data could not be read and was skipped.",
  saveFailed: "Saving failed. The browser storage is full or blocked.",
  deleteAll: "Delete bingo data",
  deleteAsk:
    "Really delete the bingo data in this browser? Only the key consolecheat-bingo-v1. Language and appearance stay.",
  deleteYes: "Delete only the bingo data",
  deleteNo: "Cancel",
  deleted: "The bingo data is deleted from this browser.",
  deleteFailed: "The bingo data could not be deleted.",
};

export const copy: Record<Lang, Copy> = { de, en };

const ids = new Set<string>(languageOptions.map((item) => item.id));

export function isLang(value: string | null): value is Lang {
  return value !== null && ids.has(value);
}

export function initialLang(stored: string | null): Lang {
  return isLang(stored) ? stored : "de";
}

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{([A-Za-z0-9]+)\}/g, (all, key: string) => {
    const value = values[key];
    return value === undefined ? all : String(value);
  });
}
