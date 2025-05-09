import * as XLSX from "xlsx";
import { expansions, languages, conditions, rarities } from "./details";
type Card = {
  name: string;
  expansion: string;
  number: number;
  language: string;
  rarity: string;
  condition: string;
};

// Legge il file Excel
const workbook = XLSX.readFile("input.xlsx");

// Il primo foglio contiene i dati
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Conversione in array di oggetti
const data = XLSX.utils.sheet_to_json(sheet);

// Costruisco un array di carte
function buildCard(entry: any): Card | null {
  const name = entry["Card"]?.toString().trim() || null;
  const expansion = entry["ID"]?.toString().trim() || null;
  const number = entry["Number"]?.toString().trim() || null;
  const language = entry["Language"]?.toString().trim() || null;
  const rarity = entry["Rarity"]?.toString().trim() || null;
  const condition = entry["Condition"]?.toString().trim() || null;

  if (!name || !expansion || !number || !language || !rarity || !condition) {
    return null; // Se manca qualche informazione, non creo la carta
  }

  return {
    name,
    expansion,
    number: parseInt(number),
    language,
    rarity,
    condition,
  };
}

const cards: Card[] = [];

for (const row of data) {
  const card = buildCard(row);
  if (card) cards.push(card);
}

console.log(cards);

function buildCardmarketUrl(card: Card) {
  const expansionName = expansions.get(card.expansion);
  const setName = expansionName ? expansionName.replace(/\s+/g, '-') : null;
  if (!setName) {
    console.warn(`Set non trovato per edizione: ${card.expansion}`);
    return null;
  }
  const cardName = card.name.replace(/'/g, '').replace(/\s+/g, '-');
  const cardLanguage = languages[card.language as keyof typeof languages];
  const cardCondition = conditions[card.condition as keyof typeof conditions];
  const cardRarity = rarities[card.rarity as keyof typeof rarities];
  //const cardNumber = card.number.toString().padStart(3, '0');

  // https://www.cardmarket.com/it/Pokemon/Products/Singles/EX-Hidden-Legends/Stevens-Advice-HL92?language=5&minCondition=7&isReverseHolo=N
  return `https://www.cardmarket.com/en/Pokemon/Products/Singles/${setName}/${cardName}-${card.expansion}${card.number}?language=${cardLanguage}&minCondition=${cardCondition}&isReverseHolo=${cardRarity}`;
}

cards.forEach(card => {
  console.log(buildCardmarketUrl(card));
});
