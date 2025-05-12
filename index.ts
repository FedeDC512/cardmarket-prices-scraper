import * as XLSX from "xlsx"
import * as cheerio from "cheerio"
import { expansions, languages, conditions, rarities } from "./details"
type Card = {
  name: string
  expansion: string
  number: number
  language: string
  rarity: string
  condition: string
}

// Legge il file Excel
const workbook = XLSX.readFile("input.xlsx")

// Il primo foglio contiene i dati
const sheetName = workbook.SheetNames[0]
const sheet = workbook.Sheets[sheetName]

// Conversione in array di oggetti
const data = XLSX.utils.sheet_to_json(sheet)

// Costruisco un array di carte
function buildCard(entry: any): Card | null {
  const name = entry["Card"]?.toString().trim() || null
  const expansion = entry["ID"]?.toString().trim() || null
  const number = entry["Number"]?.toString().trim() || null
  const language = entry["Language"]?.toString().trim() || null
  const rarity = entry["Rarity"]?.toString().trim() || null
  const condition = entry["Condition"]?.toString().trim() || null

  if (!name || !expansion || !number || !language || !rarity || !condition) {
    return null // Se manca qualche informazione, non creo la carta
  }

  return {
    name,
    expansion,
    number: parseInt(number),
    language,
    rarity,
    condition,
  }
}

const cards: Card[] = []

for (const row of data) {
  const card = buildCard(row)
  if (card) cards.push(card)
}

console.log(cards)

function buildCardmarketUrl(card: Card) {
  const expansionName = expansions.get(card.expansion)
  const setName = expansionName ? expansionName.replace(/\s+/g, '-') : null
  if (!setName) {
    console.warn(`Set non trovato per edizione: ${card.expansion}`)
    return null
  }
  const cardName = card.name.replace(/'/g, '').replace(/\s+/g, '-')
  const cardLanguage = languages[card.language as keyof typeof languages]
  const cardCondition = conditions[card.condition as keyof typeof conditions]
  const cardRarity = rarities[card.rarity as keyof typeof rarities]
  //const cardNumber = card.number.toString().padStart(3, '0')

  // https://www.cardmarket.com/it/Pokemon/Products/Singles/EX-Hidden-Legends/Stevens-Advice-HL92?language=5&minCondition=7&isReverseHolo=N
  return `https://www.cardmarket.com/en/Pokemon/Products/Singles/${setName}/${cardName}-${card.expansion}${card.number}?language=${cardLanguage}&minCondition=${cardCondition}&isReverseHolo=${cardRarity}`
}

function parsePrice(priceStr: string): number {
  // Rimuove il simbolo dell'euro e gli spazi, sostituisce la virgola con il punto
  const cleaned = priceStr.replace('€', '').replace(/\s/g, '').replace(',', '.')
  return parseFloat(cleaned)
}

async function fetchPrice(url: string) {
  const html = await fetch(url).then(res => res.text())
  const $ = cheerio.load(html)
  // Selettore per ogni riga di articolo
  const articleRows = $('.article-row')
  console.log(`Fetching ${url}`)
  if (articleRows.length === 0) {
    console.log('Nessun articolo trovato sulla pagina.')
    return
  }

  // Itero sui primi 3 risultati
  let minPrice, averagePrice: number = 0
  for (let i = 0; i < Math.min(3, articleRows.length); i++) {
    const row = articleRows.eq(i)
    // Cerco il prezzo dentro il div specifico
    const priceElement = row.find('.price-container').first()

    if (priceElement.length === 0) {
      console.log(`Prezzo non trovato per l'articolo ${i + 1}`)
    } else {
      if (i === 0) minPrice = parsePrice(priceElement.text())
      const priceText = priceElement.text().trim()
      averagePrice += parsePrice(priceText)
      console.log(`Prezzo ${i + 1}: ${priceText}`)
    }
  }
  averagePrice = Math.round((averagePrice / 3) * 100) / 100
  console.log(`Prezzo minimo: ${minPrice}`)
  console.log(`Prezzo medio: ${averagePrice}`)
}

cards.forEach(async card => {
  const cardmarketUrl = buildCardmarketUrl(card)
  if (cardmarketUrl) {
    await fetchPrice(cardmarketUrl)
    await new Promise(resolve => setTimeout(resolve, 3000)) // Aspetto 3 secondi tra le richieste
  }
})
