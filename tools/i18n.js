const fsp = require("fs/promises")
const { TranslationServiceClient } = require("@google-cloud/translate").v3beta1

const projectId = "read-aloud-188001"
const translator = new TranslationServiceClient()

run()
  .then(() => process.exit(0),
  err => {
    console.error(err)
    process.exit(1)
  })


async function run() {
  const locales = (await fsp.readdir("_locales")).filter(x => x != "en")
  const template = await fsp.readFile("_locales/en/messages.json", "utf-8")
  for (const locale of locales) {
    console.log("Locale", locale)
    const lang = locale.replace("_", "-")
    const batch = makeBatch(lang)
    const file = `_locales/${locale}/messages.json`
    const input = JSON.parse(await fsp.readFile(file, "utf-8"))
    const output = JSON.parse(template)
    for (const prop in output) {
      if (prop in input) output[prop] = input[prop]
      else {
        const tokens = output[prop].message.split(/(\{\w+\}|(?<=])\([a-z-]+\))/)
        const oddTokens = tokens.filter((text, i) => i % 2)
        batch.add(tokens.map((text, i) => i % 2 ? "[1]" : text).join(""))
          .then(result => {
            output[prop] = {
              message: result.split("[1]")
                .flatMap((text, i) => oddTokens[i] ? [text, oddTokens[i]] : text)
                .join("")
            }
          })
      }
    }
    await batch.commit()
    await fsp.writeFile(file, JSON.stringify(output, null, 2) + "\n")
  }
}

function makeBatch(lang) {
  const batch = []
  return {
    add(text) {
      return new Promise(fulfill => batch.push({text, fulfill}))
    },
    async commit() {
      if (batch.length) {
        const results = await translate(batch.map(x => x.text), lang)
        if (results.length != batch.length) throw new Error("Something wrong")
        batch.forEach((entry, i) => entry.fulfill(results[i]))
      }
    }
  }
}

async function translate(texts, lang) {
  const [{ translations }] = await translator.translateText({
    contents: texts,
    targetLanguageCode: lang,
    parent: `projects/${projectId}/locations/global`
  })
  return translations.map(x => x.translatedText)
}
