# Text chunking for speech

`WordBreaker` and `CharBreaker` in `js/speech.js` turn text into speech requests.
The punctuator supplies paragraph, sentence, phrase, and word boundaries. The
breakers use explicit loops and size checks; no splitting callbacks or recursive
calls are involved. They are file-scope functions so tests can load them without
starting speech playback.

## Word limits

This breaker works around a Chrome built-in TTS extension bug affecting Google
native voices such as Google US English, whether invoked through `chrome.tts` or
the Web Speech API. Playback beyond 15 seconds goes silent without an error or
event. This is a historical workaround, not a Web Speech API specification limit.
The word budget estimates a segment duration of roughly 15 seconds; it
cannot guarantee that duration. A 16-second engine timeout catches overruns.

The base budget is 32 words for German, Russian, Spanish, Portuguese, and
Indonesian, and 36 otherwise. The caller doubles it for East Asian tokenization
and scales it by the speech rate to account for playback speed.

`WordBreaker(wordLimit, punctuator)` handles each sentence independently:

1. Append a phrase if its word count fits, flushing the pending chunk first if
   adding it would exceed the limit.
2. For an oversized phrase, flush the pending chunk and emit word groups of size
   `min(ceil(wordCount / 2), wordLimit)`.
3. Flush at the end of every sentence.

The balancing rule makes 40 words with a limit of 36 produce 20 + 20. Longer
phrases may require more than two groups. Sentences and paragraphs never combine,
and a long individual word is never sliced. Word counts are punctuator token
counts, not necessarily linguistic words. Existing fractional word limits from
speech rate settings retain JavaScript's slice-index truncation behavior.

## Character limits

This is the general chunkifier for synthesis, particularly cloud requests. The
preferred chunk size is 750 characters. Combining small paragraphs reduces the
number of network requests; the default call uses a 200-character paragraph
combining threshold. Google Translate instead has a server limit of 200
characters per chunk, so its call uses a 200-character limit. These two uses of
200 have different purposes: one controls paragraph packing, the other caps
request size.

See [live verification and sources](tts-limit-verification.md) for the dated
evidence, reproduction tools, and limits of what has been verified.

`CharBreaker(charLimit, punctuator, paragraphCombineThreshold)` checks each level
in order: paragraph, sentence, phrase, word. A fitting part is appended; an
oversized part is split at the next boundary. Oversized words are sliced directly.

Every descent flushes the preceding pending group. Finishing that descent also
flushes its children. This keeps a split part's final short chunk separate from
its next neighbor, even if they would fit together.

The optional paragraph threshold controls combining only. For example, a
750-character limit with a 200-character threshold preserves a 500-character
paragraph intact, but does not combine it with another paragraph. An omitted or
zero threshold defaults to the character limit. The intended threshold is no
larger than the character limit; a larger value retains the legacy behavior of
allowing combined paragraphs beyond that limit.

Character sizes use UTF-16 code units (`String.length`), including separators.
Oversized words are split at grapheme boundaries using `Intl.Segmenter`, keeping
vowel marks and multi-code-point emoji together where possible. A grapheme larger
than the entire request limit falls back to code points to honor the hard cap.
Browsers without `Intl.Segmenter` also fall back to code points. A limit of 1
cannot fit a supplementary character and raises a RangeError; production limits
(200 and 750) can fit every individual code point. East Asian word tokenization
still uses code points for the existing Google-native duration estimate, so it
does not guarantee grapheme-safe boundaries.
Use positive limits (at least 1 for direct slicing); invalid limits are not
validated by these internal helpers.

## Packing and punctuation

`createChunkCollector` only appends, flushes, or directly emits chunks. It has no
knowledge of punctuation or splitting. Each `breakText` call gets a fresh
collector. Keeping separators on punctuator tokens lets chunks join without
inserting spaces. All punctuators preserve the original text at every level, including leading
separators and whitespace. East Asian word tokens count Unicode code points,
with whitespace attached to neighboring tokens; space-delimited word tokens retain
leading separators. Sentence endings include closing quotes and brackets, and
East Asian endings include the fullwidth question mark. Latin abbreviation
matching also accepts a zero-width space after the period.

## Language-specific boundaries

`createPunctuator(language)` selects the strategy using the base language tag:

| Strategy | Languages | Behavior |
| --- | --- | --- |
| `SpaceDelimitedPunctuator` (formerly `LatinPunctuator`) | Default, including Arabic, Hebrew, Persian, Urdu, Indic languages, and European languages | Keeps space-separated word tokens and recognizes additional script punctuation. |
| `EastAsianPunctuator` | Chinese, Japanese, Korean | Retains character-based tokens and existing Google-native word budgets. |
| `DictionaryPunctuator` | Thai, Lao, Khmer, Myanmar | Uses locale-aware `Intl.Segmenter` word boundaries and retains intervening spaces and punctuation. |

Shared sentence rules recognize Arabic `؟`, Urdu `۔`, Hebrew sof pasuq `׃`,
Indic danda `।` / `॥`, Myanmar `။`, and Khmer `។` / `៕`. Shared phrase rules
include Arabic/Persian `،` and `؛`, and Myanmar `၊`. Hebrew geresh, gershayim,
and maqaf remain inside word tokens rather than becoming sentence boundaries.
These additions are boundary heuristics, not a full linguistic parser; the
existing abbreviation list is still English-oriented.

Dictionary segmentation depends on the browser's locale data, so exact word
boundaries can vary between browser versions. If `Intl.Segmenter` is unavailable,
these languages fall back to space-delimited tokens and code-point-safe slicing.
Text and the request size cap remain preserved, but word/combining-mark boundaries
are less precise in that fallback.

This support primarily improves `CharBreaker` cloud synthesis. `WordBreaker`
remains exclusive to Google native voices. Its existing space-word and East
Asian character-count strategies and 32/36 budgets have not been recalibrated.

References: [Unicode segmentation guidance](https://unicode.org/reports/tr29/)
and [Intl.Segmenter documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter).

## Tests

Run `npm test` with Node.js 18 or newer. No additional dependencies are required.
The suite loads the browser script in an isolated VM and covers boundary choices,
packing, balancing, paragraph thresholds, oversized parts, punctuation, East Asian
text, UTF-16 counting, repeated calls, and text preservation across varied limits.
