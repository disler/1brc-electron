import {
    Turbo4, TurboTool,
} from "../src/main/turbo4"
import path from 'path'
import duckdb from "duckdb"
import fs from "fs"

const agentOutput = path.join(__dirname, '../', 'data', 'agentOutput')
const duckDBPath = path.join(__dirname, '../', 'data', 'db.duckdb')


async function main() {

}

main().catch(console.error)