import * as XLSX from "xlsx";

// Legge il file Excel
const workbook = XLSX.readFile("input.xlsx");

// Il primo foglio contiene i dati
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Conversione in array di oggetti
const data = XLSX.utils.sheet_to_json(sheet);

console.log("Carte trovate nel file Excel:");
console.log(data);
