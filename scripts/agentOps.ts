import {
    Turbo4, TurboTool,
} from "../src/main/turbo4"
import path from 'path'
import fs from "fs"

const agentOutput = path.join(__dirname, '../', 'data', 'agentOutput')
const duckDBPath = path.join(__dirname, '../', 'data', 'db.duckdb')


function writeFile(params: { contents: string, fileName: string }) {
    const { contents, fileName } = params
    const filePath = path.resolve(agentOutput, fileName)
    fs.writeFileSync(filePath, contents)
    return 'File written'
}

const writeFileToolDef: TurboTool = {
    type: 'function',
    function: {
        name: 'writeFile',
        description: 'Write a file to disk',
        parameters: {
            type: 'object',
            properties: {
                contents: {
                    type: 'string',
                    description: 'The contents of the file',
                },
                fileName: {
                    type: 'string',
                    description: 'The name of the file',
                },
            },
            required: ['contents', 'fileName'],
        },
        function: async (args: { contents: string, fileName: string }) => {
            const result = writeFile(args)
            return result
        },
        parse: (input: string) => {
            console.log(`calling parse with ${input}`)
            return JSON.parse(input)
        }
    },
    callable: writeFile
}


async function main() {
    // knowledge base sources

    const duckdbBlogKnowledgeSource = 'https://rmoff.net/2024/01/03/1%EF%B8%8F%E2%83%A3%EF%B8%8F-1brc-in-sql-with-duckdb/'
    const duckdbDocsKnowledgeSource = 'https://duckdb.org/docs/api/nodejs/overview.html'

    // knowledge base file paths

    const agentSpyFile = path.join(agentOutput, 'agent-spyware.json')
    const blogKnowledgeBasePath = path.join(agentOutput, 'one-billion-row-challenge-duck-db.json')
    const docsKnowledgeBasePath = path.join(agentOutput, 'duck-db-docs.json')

    // assistant

    const turbo4 = await new Turbo4().getOrCreateAssistant('1brc');

    await turbo4.setInstructions("You're a top performing engineer that reads the knowledge bases and generates concise solutions. You specialize in SQL, Typescript, and DuckDB.")

    await turbo4.enableRetrieval()

    await turbo4.collectKnowledge(duckdbBlogKnowledgeSource, blogKnowledgeBasePath)
    await turbo4.collectKnowledge(duckdbDocsKnowledgeSource, docsKnowledgeBasePath)

    const [blogFileId, docsFileId] = await turbo4.upsertFiles([blogKnowledgeBasePath, docsKnowledgeBasePath], false)

    await turbo4.equipTools([writeFileToolDef])

    await turbo4.makeThread()

    await turbo4.addMessage("Read the knowledge base and generate sql that will convert measurements.txt into a duckdb database table called 'brc' with columns 'station', 'min', 'max', and 'mean' with completed calculations.", [blogFileId])
    await turbo4.runThread()
    await turbo4.spyOnAssistant(agentSpyFile)

    await turbo4.addMessage("Use writeFile function to write the sql results to a file called 'generate-table.sql'")
    await turbo4.runThread([writeFileToolDef.function.name!])
    await turbo4.spyOnAssistant(agentSpyFile)

    await turbo4.addMessage("Given the this duckdb table, and the duck-db-docs generate a typescript function where we can page through the results of the 'brc' table using page and size params", [docsFileId])
    await turbo4.runThread()
    await turbo4.spyOnAssistant(agentSpyFile)

    await turbo4.addMessage("Use writeFile function to write the results to a file called 'pageTable.ts'")
    await turbo4.runThread([writeFileToolDef.function.name!])
    await turbo4.spyOnAssistant(agentSpyFile)

    const messages = turbo4.chatMessages

    console.log(`messages`, messages)
}

main().catch(console.error)