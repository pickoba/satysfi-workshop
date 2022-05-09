const fs = require("fs");
const https = require("https");
const path = require("path");

function fetchPrimitiveList() {
  const url = "https://raw.githubusercontent.com/gfngfn/SATySFi/master/tools/gencode/vminst.ml";
  const namePattern = /~name:"(.*)"/g;

  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let str = "";
        res.on("data", (chunk) => {
          str += chunk;
        });
        res.on("end", () => {
          resolve([...str.matchAll(namePattern)].map((p) => p[1]));
        });
      })
      .on("error", (e) => {
        reject(e);
      });
  });
}

function getDefinedRegExp() {
  // load syntax file
  const syntaxFile = path.resolve(__dirname, "../syntaxes/satysfi.tmLanguage.json");
  const repository = JSON.parse(fs.readFileSync(syntaxFile)).repository;

  // extract patterns
  return ["keywords", "function"]
    .map((key) => repository[key].patterns.map((p) => new RegExp(`^${p.match}\$`)))
    .flat();
}

async function main() {
  const primitives = await fetchPrimitiveList();
  const regexps = getDefinedRegExp();

  primitives.sort();

  process.exitCode = 0;

  primitives.forEach((primitive) => {
    const found = regexps.some((r) => r.test(primitive));

    if (!found) {
      console.log(`${primitive}: not found`);
      process.exitCode = 1;
    }
  });

  if (process.exitCode == 0) {
    console.log("All primitives found");
  }
}

main();
