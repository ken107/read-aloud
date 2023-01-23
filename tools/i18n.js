const fsp = require("fs/promises")
const { TranslationServiceClient } = require("@google-cloud/translate").v3beta1

const projectId = "read-aloud-188001"
const translator = new TranslationServiceClient()

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })


async function run() {
  const locales = (await fsp.readdir("_locales")).filter(x => x != "en")
  const template = await fsp.readFile("_locales/en/messages.json", "utf-8")
  for (const locale of locales) {
    console.log("Locale", locale)
    const file = `_locales/${locale}/messages.json`
    const input = JSON.parse(await fsp.readFile(file, "utf-8"))
    const output = JSON.parse(template)
    for (const prop in output) {
      if (prop in input) output[prop] = input[prop]
      else {
        console.log("Translating", prop)
        output[prop] = {message: await translate(output[prop].message, locale)}
      }
    }
    await fsp.writeFile(file, JSON.stringify(output, null, 2))
  }
}

async function translate(text, locale) {
  const lang = locale.replace("_", "-")
  const [{ translations }] = await translator.translateText({
    contents: [text],
    targetLanguageCode: lang,
    parent: `projects/${projectId}/locations/global`
  })
  return translations[0].translatedText
}
