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
  link?: string
  minPrice?: number
  minPriceText?: string
  averagePrice?: number
}

// Read the Excel file
const workbook = XLSX.readFile(`input.xlsx`)

// The first sheet contains the data
const sheetName = workbook.SheetNames[0]
const sheet = workbook.Sheets[sheetName]

// Convert to array of objects
const data = XLSX.utils.sheet_to_json(sheet)

// Build a card object from a row
function buildCard(entry: any): Card | null {
  const name = entry[`Card`]?.toString().trim() || null
  const expansion = entry[`Set ID`]?.toString().trim() || null
  const number = entry[`Number`]?.toString().trim() || null
  const language = entry[`Language`]?.toString().trim() || null
  const rarity = entry[`Rarity`]?.toString().trim() || null
  const condition = entry[`Condition`]?.toString().trim() || null

  if (!name || !expansion || !number || !language || !rarity || !condition) {
    return null // If any info is missing, do not create the card
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
//console.log(cards)

function buildCardmarketUrl(card: Card) {
  const expansionName = expansions.get(card.expansion)
  const setName = expansionName ? expansionName.replace(/\s+/g, '-') : null
  if (!setName) {
    console.warn(`Set not found for ${card.name} ${card.expansion} ${card.number}\n`)
    return null
  }
  const cardName = card.name.replace(/'/g, '').replace(/\s+/g, '-')
  const cardLanguage = languages[card.language as keyof typeof languages]
  const cardCondition = conditions[card.condition as keyof typeof conditions]
  const cardRarity = rarities[card.rarity as keyof typeof rarities]

  // https://www.cardmarket.com/en/Pokemon/Products/Singles/EX-Hidden-Legends/Stevens-Advice-HL92?language=5&minCondition=7&isReverseHolo=N
  card.link = `https://www.cardmarket.com/en/Pokemon/Products/Singles/${setName}/${cardName}-${card.expansion}${card.number}?language=${cardLanguage}&minCondition=${cardCondition}&isReverseHolo=${cardRarity}`
}

function parsePrice(priceStr: string): number {
  // Remove euro symbol and spaces, replace comma with dot
  const cleaned = priceStr.replace('€', '').replace(/\s/g, '').replace(',', '.')
  return parseFloat(cleaned)
}

async function fetchPrice(card: Card) {
  const url = card.link
  if (!url) return
  const html = await fetch(url).then(res => res.text())
  const $ = cheerio.load(html)
  console.log(`Fetching \x1b]8;;${url}\x07${card.name + ` ` + card.expansion + card.number}\x1b]8;;\x07`)

  // Selector for each article row
  const articleRows = $('.article-row')
  if (articleRows.length === 0) {
    console.warn('No articles found on the page\n')
    return
  }

  let minPrice: number = 0, averagePrice: number = 0
  card.minPriceText = ``
  // Iterate over the first 3 results
  for (let i = 0; i < Math.min(3, articleRows.length); i++) {
    const row = articleRows.eq(i)
    // Find the price inside the specific div
    const priceElement = row.find('.price-container').first()

    if (priceElement.length === 0) {
      card.minPriceText = card.minPriceText + `Price not found for article ${i + 1}\n`
    } else {
      if (i === 0) minPrice = parsePrice(priceElement.text())
      const priceText = priceElement.text().trim()
      averagePrice += parsePrice(priceText)
      card.minPriceText = card.minPriceText + `Price ${i + 1}: ${priceText}`
    }
    if (i !== 2) card.minPriceText += `\n`
  }
  averagePrice = Math.round((averagePrice / 3) * 100) / 100
  card.minPrice = minPrice
  card.averagePrice = averagePrice

  console.log(card.minPriceText)
  console.log(`Minimum price: ${(card.minPrice).toFixed(2)} €`)
  console.log(`Average price: ${(card.averagePrice).toFixed(2)} €\n`)

  await new Promise(resolve => setTimeout(resolve, 3000)) // Wait 3 seconds between requests
}

for (const card of cards) {
  buildCardmarketUrl(card)
  await fetchPrice(card)
}

cards.forEach((row, index) => {
  // Update the original data with the new values
  row[`minPrice`] = cards[index].minPrice
  row[`averagePrice`] = cards[index].averagePrice
  //row[`minPriceText`] = cards[index].minPriceText
  row[`link`] = `=HYPERLINK("${cards[index].link}", "${cards[index].name}")`
});

// Convert the updated data back to a worksheet
const newWorksheet = XLSX.utils.json_to_sheet(cards);

// Add the new worksheet to the workbook
workbook.Sheets[sheetName] = newWorksheet;

// Write the updated workbook to a new file
XLSX.writeFile(workbook, `output.xlsx`);

console.log(`Done!`)