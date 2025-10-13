const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function findFiles(dir, ext) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(filePath, ext));
    } else if (ext.some(e => file.endsWith(e))) {
      results.push(filePath);
    }
  });

  return results;
}

function checkAndConvert(filePath) {
  try {
    const fileOutput = execSync(`file "${filePath}"`, { encoding: 'utf-8' });

    if (fileOutput.includes('ISO-8859')) {
      console.log(`Converting: ${filePath}`);
      execSync(`iconv -f ISO-8859-1 -t UTF-8 "${filePath}" > "${filePath}.tmp" && mv "${filePath}.tmp" "${filePath}"`);
      return true;
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
  return false;
}

const srcDir = path.join(__dirname, '../src');
const files = findFiles(srcDir, ['.ts', '.tsx']);

console.log(`Found ${files.length} TypeScript files`);

let converted = 0;
files.forEach(file => {
  if (checkAndConvert(file)) {
    converted++;
  }
});

console.log(`\n✅ Converted ${converted} files to UTF-8`);
console.log(`✅ ${files.length - converted} files were already UTF-8`);
