import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs"

const CHUNK_SIZE = 1000
const NAMESPACE_ID = "d646b5cb3f0944219d81897d4117e20f"
const OUTPUT_DIR = "generated"

const data = JSON.parse(readFileSync("tagcache.json", "utf-8"))
const sorted = data.sort((a, b) => a.expiration - b.expiration)
const keys = sorted.map((e) => e.name)

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR)
}

const chunkCount = Math.ceil(keys.length / CHUNK_SIZE)

for (let i = 0; i < chunkCount; i++) {
  const chunk = keys.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
  const filename = `${OUTPUT_DIR}/keys_chunk_${i}.json`
  writeFileSync(filename, JSON.stringify(chunk, null, 2))
}

console.log(`Total keys: ${keys.length}`)
console.log(`Chunks: ${chunkCount} (${CHUNK_SIZE}件ずつ)`)
console.log("")
console.log("以下のコマンドを1つずつ実行してください:")
console.log("")
for (let i = 0; i < chunkCount; i++) {
  console.log(
    `npx wrangler kv bulk delete --namespace-id ${NAMESPACE_ID} ${OUTPUT_DIR}/keys_chunk_${i}.json`
  )
}
